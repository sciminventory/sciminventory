# Applicant Screening Service

This private Python service ranks applications for one job at a time using scikit-learn TF-IDF similarity plus explicit skills, experience, and education signals. It does not receive applicant identity fields or make hiring decisions.

## Run locally

```bash
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Set `SCREENING_SERVICE_URL=http://127.0.0.1:8000` in the Next.js `.env.local` file. In production, also set the same strong `SCREENING_SERVICE_API_KEY` value for both the web application and this service. Keep the service on a private network.

## Test

```bash
pytest
```
