from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["model"] == "tfidf-hybrid-ranker"


def test_rank_endpoint_requires_configured_service_key(monkeypatch) -> None:
    monkeypatch.setenv("SCREENING_SERVICE_API_KEY", "test-secret")
    response = client.post("/v1/rank", json={})
    assert response.status_code == 401


def test_matching_candidate_ranks_first_and_excludes_identity() -> None:
    payload = {
        "job": {
            "id": "job-1",
            "title": "Supply Chain Analyst",
            "description": "Analyze inventory, supplier performance, demand planning, and procurement data.",
            "required_skills": ["inventory", "procurement", "python"],
            "preferred_skills": ["forecasting"],
            "min_years_experience": 2,
            "education_level": "bachelor",
        },
        "applications": [
            {
                "application_id": "strong",
                "resume_text": "Five years analyzing inventory and procurement using Python with forecasting projects.",
                "declared_skills": ["Python", "Inventory", "Procurement", "Forecasting"],
                "years_experience": 5,
                "education_level": "bachelor",
            },
            {
                "application_id": "weak",
                "resume_text": "Two years of general office coordination and calendar administration experience.",
                "declared_skills": ["Scheduling"],
                "years_experience": 2,
                "education_level": "bachelor",
            },
        ],
    }
    response = client.post("/v1/rank", json=payload)
    assert response.status_code == 200
    rankings = response.json()["rankings"]
    assert rankings[0]["application_id"] == "strong"
    assert rankings[0]["overall_score"] > rankings[1]["overall_score"]
    assert "fairness" in rankings[0]["explanation"]


def test_stop_word_only_documents_fall_back_to_structured_signals() -> None:
    payload = {
        "job": {
            "id": "job-2",
            "title": "The And",
            "description": "the and or but if then the and or but if then",
            "required_skills": [],
            "preferred_skills": [],
            "min_years_experience": 3,
            "education_level": "any",
        },
        "applications": [
            {
                "application_id": "application-1",
                "resume_text": "the and or but if then the and or but if then",
                "years_experience": 4,
                "education_level": "any",
            }
        ],
    }
    response = client.post("/v1/rank", json=payload)
    assert response.status_code == 200
    assert response.json()["rankings"][0]["semantic_score"] == 0
