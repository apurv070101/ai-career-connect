# SkillBridge AI

SkillBridge AI is a hiring platform with:

- a React + Vite frontend
- a FastAPI backend
- Firebase-backed authentication
- candidate resume analysis and recruiter dashboards

## Local Setup

### Frontend

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` from `.env.example`:
   ```bash
   VITE_API_BASE_URL=http://localhost:8000
   ```
3. Start the frontend:
   ```bash
   npm run dev
   ```

### Backend

1. Go to the backend folder:
   ```bash
   cd model
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create `model/.env` from `model/.env.example`
4. Start the API:
   ```bash
   python main.py
   ```

## Render Deployment

This repo includes [render.yaml](/C:/Users/Apurv/Videos/ai-career-connect/ai-career-connect/render.yaml) for deploying:

- `ai-career-connect-api` as a Python web service
- `ai-career-connect-web` as a static site

### Backend env vars

Set these on the Render backend service:

- `FIREBASE_WEB_API_KEY`
- `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_PATH`
- `CORS_ORIGINS`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM`
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY` if you use hosted AI providers

### Frontend env vars

Set this on the Render static site:

- `VITE_API_BASE_URL`

Example:
```bash
VITE_API_BASE_URL=https://ai-career-connect-api.onrender.com
```

### Production recommendations

- Set `CORS_ORIGINS` to your frontend Render URL, for example:
  ```bash
  CORS_ORIGINS=https://ai-career-connect-web.onrender.com
  ```
- Prefer `FIREBASE_SERVICE_ACCOUNT_JSON` on Render so you do not need to upload a credential file.
- After the backend is live, update the frontend `VITE_API_BASE_URL` to point to it.

## Deployment Notes

- The frontend now reads the API base URL from `VITE_API_BASE_URL` instead of hardcoding `localhost`.
- The FastAPI app now supports Render’s `PORT` environment variable.
- Backend CORS is controlled with `CORS_ORIGINS`.
- Firebase admin credentials can now be provided through `FIREBASE_SERVICE_ACCOUNT_JSON`.
