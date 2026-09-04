from __future__ import annotations

import re
import os
import secrets
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field, field_validator
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

MODEL_NAME = "tfidf-hybrid-ranker"
MODEL_VERSION = "1.0.0"
EDUCATION_LEVELS = {
    "any": 0,
    "high_school": 1,
    "associate": 2,
    "bachelor": 3,
    "master": 4,
    "doctorate": 5,
}


class JobProfile(BaseModel):
    id: str
    title: Annotated[str, Field(min_length=2, max_length=160)]
    description: Annotated[str, Field(min_length=20, max_length=20_000)]
    required_skills: list[str] = Field(default_factory=list, max_length=100)
    preferred_skills: list[str] = Field(default_factory=list, max_length=100)
    min_years_experience: float = Field(default=0, ge=0, le=60)
    education_level: str = "any"

    @field_validator("education_level")
    @classmethod
    def valid_education(cls, value: str) -> str:
        if value not in EDUCATION_LEVELS:
            raise ValueError("Unsupported education level")
        return value


class ApplicationProfile(BaseModel):
    application_id: str
    resume_text: Annotated[str, Field(min_length=40, max_length=100_000)]
    declared_skills: list[str] = Field(default_factory=list, max_length=200)
    years_experience: float = Field(default=0, ge=0, le=60)
    education_level: str = "any"

    @field_validator("education_level")
    @classmethod
    def valid_education(cls, value: str) -> str:
        if value not in EDUCATION_LEVELS:
            raise ValueError("Unsupported education level")
        return value


class ScoreWeights(BaseModel):
    semantic: float = Field(default=0.40, ge=0, le=1)
    skills: float = Field(default=0.35, ge=0, le=1)
    experience: float = Field(default=0.15, ge=0, le=1)
    education: float = Field(default=0.10, ge=0, le=1)


class RankRequest(BaseModel):
    job: JobProfile
    applications: Annotated[list[ApplicationProfile], Field(min_length=1, max_length=500)]
    weights: ScoreWeights = Field(default_factory=ScoreWeights)


class RankedApplication(BaseModel):
    application_id: str
    rank: int
    overall_score: float
    semantic_score: float
    skills_score: float
    experience_score: float
    education_score: float
    matched_skills: list[str]
    missing_skills: list[str]
    explanation: dict[str, str]


class RankResponse(BaseModel):
    model_name: str
    model_version: str
    weights: dict[str, float]
    rankings: list[RankedApplication]


app = FastAPI(
    title="Applicant Screening Service",
    version=MODEL_VERSION,
    description="Explainable, job-specific applicant ranking using TF-IDF and structured fit signals.",
)


def verify_service_key(x_screening_key: str | None = Header(default=None)) -> None:
    expected = os.getenv("SCREENING_SERVICE_API_KEY")
    if expected and (not x_screening_key or not secrets.compare_digest(x_screening_key, expected)):
        raise HTTPException(status_code=401, detail="Invalid screening service key")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy", "model": MODEL_NAME, "version": MODEL_VERSION}


@app.post("/v1/rank", response_model=RankResponse)
def rank_applicants(request: RankRequest, _: Annotated[None, Depends(verify_service_key)]) -> RankResponse:
    del _
    weights = request.weights.model_dump()
    weight_total = sum(weights.values())
    if weight_total <= 0:
        weights = ScoreWeights().model_dump()
        weight_total = 1.0
    weights = {key: value / weight_total for key, value in weights.items()}

    job_document = " ".join(
        [request.job.title, request.job.description, *request.job.required_skills, *request.job.preferred_skills]
    )
    applicant_documents = [
        " ".join([application.resume_text, *application.declared_skills])
        for application in request.applications
    ]
    vectorizer = TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        ngram_range=(1, 2),
        sublinear_tf=True,
        max_features=12_000,
    )
    try:
        matrix = vectorizer.fit_transform([job_document, *applicant_documents])
        semantic_scores = cosine_similarity(matrix[0:1], matrix[1:]).flatten()
    except ValueError:
        # Valid inputs can still contain only stop words or punctuation. Structured
        # qualifications continue to provide a deterministic score in that case.
        semantic_scores = [0.0] * len(request.applications)

    ranked: list[RankedApplication] = []
    for application, semantic_raw in zip(request.applications, semantic_scores, strict=True):
        searchable = normalize_text(" ".join([application.resume_text, *application.declared_skills]))
        required = unique_skills(request.job.required_skills)
        preferred = unique_skills(request.job.preferred_skills)
        matched_required = [skill for skill in required if skill_in_text(skill, searchable)]
        matched_preferred = [skill for skill in preferred if skill_in_text(skill, searchable)]
        missing_required = [skill for skill in required if skill not in matched_required]

        required_score = len(matched_required) / len(required) if required else 1.0
        preferred_score = len(matched_preferred) / len(preferred) if preferred else 1.0
        skills_score = (required_score * 0.8 + preferred_score * 0.2) * 100
        experience_score = (
            min(application.years_experience / request.job.min_years_experience, 1.0) * 100
            if request.job.min_years_experience > 0
            else 100.0
        )
        required_education = EDUCATION_LEVELS[request.job.education_level]
        applicant_education = EDUCATION_LEVELS[application.education_level]
        education_score = 100.0 if required_education == 0 else min(applicant_education / required_education, 1.0) * 100
        semantic_score = float(semantic_raw) * 100
        overall = (
            semantic_score * weights["semantic"]
            + skills_score * weights["skills"]
            + experience_score * weights["experience"]
            + education_score * weights["education"]
        )

        ranked.append(
            RankedApplication(
                application_id=application.application_id,
                rank=1,
                overall_score=round(overall, 2),
                semantic_score=round(semantic_score, 2),
                skills_score=round(skills_score, 2),
                experience_score=round(experience_score, 2),
                education_score=round(education_score, 2),
                matched_skills=sorted(set(matched_required + matched_preferred)),
                missing_skills=missing_required,
                explanation={
                    "semantic": "Similarity between the job description and résumé content.",
                    "skills": f"Matched {len(matched_required)} of {len(required)} required skills.",
                    "experience": f"Candidate reports {application.years_experience:g} years; role requires {request.job.min_years_experience:g}.",
                    "education": f"Candidate level: {application.education_level}; requested level: {request.job.education_level}.",
                    "fairness": "Name, email, phone, age, gender, ethnicity, and address were not supplied to the model.",
                },
            )
        )

    ranked.sort(key=lambda item: (-item.overall_score, -item.skills_score, item.application_id))
    for index, result in enumerate(ranked, start=1):
        result.rank = index
    return RankResponse(model_name=MODEL_NAME, model_version=MODEL_VERSION, weights=weights, rankings=ranked)


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9+#.\- ]", " ", value.lower())).strip()


def unique_skills(skills: list[str]) -> list[str]:
    return list(dict.fromkeys(normalize_text(skill) for skill in skills if normalize_text(skill)))


def skill_in_text(skill: str, searchable: str) -> bool:
    return re.search(rf"(?<![a-z0-9]){re.escape(skill)}(?![a-z0-9])", searchable) is not None
