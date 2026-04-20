# SkillBridge AI (AI Career Connect)

An AI-powered sustainable hiring platform connecting talent with opportunity through intelligent resume analysis and match-making.

## 🚀 Key Features

### 1. AI Resume Analysis
-   **Skill Gap Analysis**: Automatically detects missing critical skills for your target role.
-   **Course Recommendations**: Suggests specific courses to bridge identified skill gaps.
-   **Local AI Engine**: Powered by a custom local NLP engine (no external API costs).

### 2. Recruiter Dashboard
-   **Shortlisted Candidates**: Automatically filters and highlights top candidates (Match Score > 80%).
-   **Job Posting**: Recruiters can create and manage job listings dynamically.
-   **Applicant Tracking**: View stats on active jobs and applications.
f
### 3. Authentication & Roles
-   **Dual Roles**: Separate flows for **Candidates** and **Recruiters**.
-   **Firebase-backed Auth**: Registration uses email OTP verification and login uses Firebase email/password authentication.

## 🛠️ Tech Stack
-   **Frontend**: React, TypeScript, Vite, Tailwind CSS, Shadcn UI
-   **Backend (AI)**: Python (FastAPI/Flask equivalent logic), Local NLP
-   **State Management**: React Query, LocalStorage (Mock DB)

## 🏃‍♂️ How to Run

### Frontend
1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Start the development server:
    ```bash
    npm run dev
    ```

### Backend (AI Engine)
1.  Navigate to `model/` directory.
2.  Install Python dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Create `model/.env` and set at least:
    ```bash
    FIREBASE_WEB_API_KEY=your_firebase_web_api_key
    FIREBASE_SERVICE_ACCOUNT_PATH=ai-career-connect-firebase-adminsdk.json
    ```
4.  Optional for real email OTP delivery:
    ```bash
    SMTP_HOST=...
    SMTP_PORT=587
    SMTP_USERNAME=...
    SMTP_PASSWORD=...
    SMTP_FROM=...
    ```
5.  Run the API server:
    ```bash
    python main.py
    ```

## 📸 Screenshots
(Add screenshots of Dashboard and Analysis here)

---
*Built for the Future of Work.*
