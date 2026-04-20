"""
AI Resume Analyzer API
FastAPI backend for analyzing resumes using LLM (OpenAI/Anthropic)
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional
import pypdf
import io
import os
import logging
import smtplib
import ssl
import time
import random
from enum import Enum
from email.message import EmailMessage
from pathlib import Path
import json
import anthropic
import openai
import requests
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth, firestore

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_local_env_file():
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


load_local_env_file()


def get_cors_origins() -> List[str]:
    configured = os.getenv("CORS_ORIGINS", "").strip()
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]
    return [
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

# Initialize FastAPI app
app = FastAPI(
    title="AI Resume Analyzer",
    description="Analyze resumes using AI to extract insights and provide recommendations",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== Pydantic Models ==============

class CandidateDetails(BaseModel):
    """Candidate basic information"""
    name: str = Field(..., description="Full name of the candidate")
    email: Optional[EmailStr] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    location: Optional[str] = Field(None, description="City, State or Country")
    linkedin: Optional[str] = Field(None, description="LinkedIn profile URL")


class ResumeAnalysisResponse(BaseModel):
    """Complete resume analysis output"""
    candidate_details: CandidateDetails
    predicted_role: str = Field(..., description="Most likely job role based on experience")
    technical_skills: List[str] = Field(
        ..., 
        min_items=0, 
        max_items=10,
        description="Top 10 verified technical skills"
    )
    match_score: int = Field(
        ..., 
        ge=0, 
        le=100,
        description="Overall resume quality score (0-100)"
    )
    improvement_suggestions: List[str] = Field(
        ...,
        min_items=3,
        max_items=3,
        description="Three actionable improvement suggestions"
    )
    missing_skills: List[str] = Field(
        default=[],
        description="Skills relevant to the role but missing from resume"
    )
    recommended_courses: List[str] = Field(
        default=[],
        description="Suggested courses to bridge skill gaps"
    )
    
    @validator('match_score')
    def validate_score(cls, v):
        if not 0 <= v <= 100:
            raise ValueError('Score must be between 0 and 100')
        return v


class LLMProvider(str, Enum):
    """Supported LLM providers"""
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    GEMINI = "gemini"
    LOCAL = "local"


class SendOtpEmailRequest(BaseModel):
    email: EmailStr = Field(..., description="Recipient email address")
    otp_code: str = Field(..., min_length=4, max_length=12, description="One-time password code")
    name: Optional[str] = Field(None, description="Recipient display name")


class RegisterOtpRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: str = Field(..., pattern="^(candidate|recruiter)$")
    company: Optional[str] = Field(None, max_length=160)


class VerifyRegisterOtpRequest(BaseModel):
    email: EmailStr
    otpCode: str = Field(..., min_length=4, max_length=12)


class FirebaseLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    skills: Optional[List[str]] = None
    matchScore: Optional[int] = Field(None, ge=0, le=100)
    resumeUploaded: Optional[bool] = None
    detectedRole: Optional[str] = None


class CreateJobRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=160)
    company: str = Field(..., min_length=1, max_length=160)
    location: str = Field(..., min_length=1, max_length=160)
    type: str = Field(..., min_length=1, max_length=80)
    tags: List[str] = Field(default_factory=list)


class CreateApplicationRequest(BaseModel):
    jobId: str = Field(..., min_length=1, max_length=120)
    role: str = Field(..., min_length=1, max_length=160)
    company: str = Field(..., min_length=1, max_length=160)


# ============== Firebase Auth Helpers ==============

FIREBASE_OTP_TTL_SECONDS = 5 * 60
pending_registration_otps = {}


def normalize_email(email: str) -> str:
    return email.strip().lower()


def get_firebase_service_account_path() -> Path:
    configured = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "ai-career-connect-firebase-adminsdk.json")
    path = Path(configured)
    if not path.is_absolute():
        path = Path(__file__).resolve().parent / path
    return path


def get_firebase_app():
    try:
        return firebase_admin.get_app()
    except ValueError:
        service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
        if service_account_json:
            cred = credentials.Certificate(json.loads(service_account_json))
            return firebase_admin.initialize_app(cred)

        service_account_path = get_firebase_service_account_path()
        if not service_account_path.exists():
            raise HTTPException(status_code=500, detail="Firebase service account file not found")
        cred = credentials.Certificate(str(service_account_path))
        return firebase_admin.initialize_app(cred)


def get_firestore_client():
    get_firebase_app()
    return firestore.client()


def serialize_timestamp(value):
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def build_default_profile(user_payload: dict) -> dict:
    return {
        "name": user_payload["name"],
        "email": user_payload["email"],
        "role": user_payload["role"],
        "skills": [],
        "matchScore": 0,
        "resumeUploaded": False,
        "detectedRole": None,
    }


def persist_user_document(user_payload: dict):
    db = get_firestore_client()
    profile = build_default_profile(user_payload)
    db.collection("users").document(user_payload["email"]).set(
        {
            "email": user_payload["email"],
            "name": user_payload["name"],
            "role": user_payload["role"],
            "company": user_payload.get("company"),
            "emailVerified": user_payload["emailVerified"],
            "profile": profile,
            "updatedAt": firestore.SERVER_TIMESTAMP,
            "createdAt": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )


def get_safe_error_detail(exc: Exception) -> str:
    message = str(exc).strip()
    return message or exc.__class__.__name__


def verify_request_user(authorization: Optional[str]) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Firebase auth token")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing Firebase auth token")

    try:
        get_firebase_app()
        decoded_token = firebase_auth.verify_id_token(token, check_revoked=False)
        email = normalize_email(str(decoded_token.get("email", "")))
        if not email:
            raise HTTPException(status_code=401, detail="Invalid Firebase auth token")

        claims = decoded_token if isinstance(decoded_token, dict) else {}
        role = claims.get("role", "candidate")
        name = str(claims.get("name") or decoded_token.get("name") or email.split("@")[0]).strip()
        company = claims.get("company")
        email_verified = bool(decoded_token.get("email_verified", False))
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Firebase auth verification failed: %s", str(exc))
        raise HTTPException(status_code=401, detail="Invalid Firebase auth token")

    return {
        "email": email,
        "name": name,
        "role": role,
        "company": company,
        "emailVerified": email_verified,
    }


def build_auth_user_payload(user: "firebase_auth.UserRecord") -> dict:
    claims = user.custom_claims or {}
    role = claims.get("role", "candidate")
    company = claims.get("company")
    return {
        "email": user.email,
        "name": user.display_name or user.email.split("@")[0],
        "role": role,
        "company": company,
        "emailVerified": user.email_verified,
    }


def generate_email_otp() -> str:
    return f"{random.randint(0, 999999):06d}"


def is_smtp_configured() -> bool:
    return all([
        os.getenv("SMTP_HOST"),
        os.getenv("SMTP_USERNAME"),
        os.getenv("SMTP_PASSWORD"),
        os.getenv("SMTP_FROM") or os.getenv("SMTP_USERNAME"),
    ])


def send_email_message(recipient_email: str, subject: str, body: str):
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM", smtp_username)

    if not is_smtp_configured():
        raise HTTPException(
            status_code=500,
            detail="SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM."
        )

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = smtp_from
    message["To"] = recipient_email
    message.set_content(body)

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
            server.starttls(context=context)
            server.login(smtp_username, smtp_password)
            server.send_message(message)
    except Exception as exc:
        logger.error(f"Failed to send email to {recipient_email}: {str(exc)}")
        raise HTTPException(status_code=502, detail="Failed to send email")


def request_firebase_sign_in(email: str, password: str) -> dict:
    api_key = os.getenv("FIREBASE_WEB_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="FIREBASE_WEB_API_KEY not set. Add it to model/.env, then restart python main.py."
        )

    response = requests.post(
        f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}",
        json={
            "email": email,
            "password": password,
            "returnSecureToken": True,
        },
        timeout=20,
    )

    if not response.ok:
        try:
            error_payload = response.json()
            firebase_error = error_payload.get("error", {}).get("message", "INVALID_LOGIN_CREDENTIALS")
        except Exception:
            firebase_error = "INVALID_LOGIN_CREDENTIALS"
        raise HTTPException(status_code=401, detail=firebase_error)

    return response.json()


def lookup_firebase_user_by_token(id_token: str) -> dict:
    api_key = os.getenv("FIREBASE_WEB_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="FIREBASE_WEB_API_KEY not set. Add it to model/.env, then restart python main.py."
        )

    response = requests.post(
        f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={api_key}",
        json={"idToken": id_token},
        timeout=20,
    )

    if not response.ok:
        logger.error("Firebase token lookup failed: %s", response.text)
        raise HTTPException(status_code=401, detail="Invalid Firebase auth token")

    data = response.json()
    users = data.get("users", [])
    if not users:
        raise HTTPException(status_code=401, detail="Invalid Firebase auth token")

    return users[0]


# ============== PDF Processing ==============

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extract text from PDF using pypdf
    
    Args:
        pdf_bytes: PDF file as bytes
        
    Returns:
        Extracted text as string
        
    Raises:
        ValueError: If PDF is invalid or text extraction fails
    """
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        pdf_reader = pypdf.PdfReader(pdf_file)
        
        if len(pdf_reader.pages) == 0:
            raise ValueError("PDF has no pages")
        
        # Extract text from all pages
        text_parts = []
        for page_num, page in enumerate(pdf_reader.pages):
            try:
                text = page.extract_text()
                if text.strip():
                    text_parts.append(text)
            except Exception as e:
                logger.warning(f"Failed to extract text from page {page_num}: {str(e)}")
                continue
        
        if not text_parts:
            raise ValueError("No text could be extracted from PDF")
        
        full_text = "\n\n".join(text_parts)
        
        # Basic cleaning
        full_text = full_text.strip()
        
        if len(full_text) < 50:
            raise ValueError("Extracted text is too short to be a valid resume")
        
        return full_text
        
    except pypdf.errors.PdfReadError as e:
        raise ValueError(f"Invalid PDF file: {str(e)}")
    except Exception as e:
        raise ValueError(f"Failed to process PDF: {str(e)}")


# ============== LLM Integration ==============

SYSTEM_PROMPT = """You are an expert HR analyst and resume reviewer. Analyze the provided resume text and extract structured information.

You must respond with ONLY valid JSON matching this exact structure:

{
  "candidate_details": {
    "name": "Full Name",
    "email": "email@example.com or null",
    "phone": "phone number or null",
    "location": "City, State/Country or null",
    "linkedin": "LinkedIn URL or null"
  },
  "predicted_role": "Most likely job title based on experience (e.g., 'Senior Software Engineer', 'Data Scientist')",
  "technical_skills": ["skill1", "skill2", "skill3", "skill4", "skill5", "skill6", "skill7", "skill8", "skill9", "skill10"],
  "match_score": 75,
  "improvement_suggestions": [
    "First actionable suggestion",
    "Second actionable suggestion",
    "Third actionable suggestion"
  ]
}

Guidelines:
- Extract ONLY information explicitly stated in the resume
- For candidate_details, use null if information is not found
- predicted_role: Infer the most appropriate role based on experience and skills
- technical_skills: List up to 10 verified technical skills (programming languages, frameworks, tools, technologies)
- match_score: Rate 0-100 based on:
  * Clarity and formatting (20 points)
  * Relevant experience and achievements (30 points)
  * Technical skills depth (20 points)
  * Education and certifications (15 points)
  * Overall presentation (15 points)
- improvement_suggestions: Provide 3 specific, actionable recommendations

Respond with ONLY the JSON object, no additional text or markdown formatting."""


def analyze_with_anthropic(resume_text: str, api_key: str) -> dict:
    """
    Analyze resume using Anthropic Claude API
    
    Args:
        resume_text: Extracted resume text
        api_key: Anthropic API key
        
    Returns:
        Parsed JSON response as dictionary
    """
    try:
        client = anthropic.Anthropic(api_key=api_key)
        
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            temperature=0,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"Analyze this resume:\n\n{resume_text}"
                }
            ]
        )
        
        response_text = message.content[0].text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])
        
        # Parse JSON
        import json
        result = json.loads(response_text)
        
        return result
        
    except anthropic.APIError as e:
        logger.error(f"Anthropic API error: {str(e)}")
        raise HTTPException(status_code=502, detail=f"LLM API error: {str(e)}")
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM response: {response_text}")
        raise HTTPException(status_code=500, detail="LLM returned invalid JSON response")
    except Exception as e:
        logger.error(f"Unexpected error in Anthropic analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


def analyze_with_openai(resume_text: str, api_key: str) -> dict:
    """
    Analyze resume using OpenAI API
    
    Args:
        resume_text: Extracted resume text
        api_key: OpenAI API key
        
    Returns:
        Parsed JSON response as dictionary
    """
    try:
        client = openai.OpenAI(api_key=api_key)
        
        response = client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Analyze this resume:\n\n{resume_text}"}
            ],
            temperature=0,
            response_format={"type": "json_object"}
        )
        
        response_text = response.choices[0].message.content.strip()
        
        # Parse JSON
        import json
        result = json.loads(response_text)
        
        return result
        
    except openai.APIError as e:
        logger.error(f"OpenAI API error: {str(e)}")
        raise HTTPException(status_code=502, detail=f"LLM API error: {str(e)}")
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM response: {response_text}")
        raise HTTPException(status_code=500, detail="LLM returned invalid JSON response")
    except Exception as e:
        logger.error(f"Unexpected error in OpenAI analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


# ============== Local NLP Engine (Free) ==============

def analyze_locally(resume_text: str) -> dict:
    """
    Analyze resume using local keyword extraction and heuristic scoring.
    No API keys required. 100% Free and Fast.
    """
    from collections import Counter
    import re

    text_lower = resume_text.lower()

    # 1. Define Keyword Knowledge Base
    roles_keywords = {
        "Frontend Developer": ["react", "vue", "angular", "javascript", "typescript", "html", "css", "redux", "tailwind", "frontend", "ui/ux", "web design"],
        "Backend Developer": ["node", "express", "python", "django", "flask", "java", "spring", "go", "golang", "sql", "postgresql", "mongodb", "aws", "backend", "api"],
        "Data Analyst": ["python", "pandas", "numpy", "sql", "mysql", "excel", "tableau", "power bi", "visualization", "statistics", "data analysis", "etl"],
        "Data Scientist": ["machine learning", "deep learning", "pytorch", "tensorflow", "scikit-learn", "nlp", "computer vision", "ai", "modeling"],
        "DevOps Engineer": ["docker", "kubernetes", "jenkins", "ci/cd", "aws", "azure", "linux", "bash", "terraform", "cloud"],
        "Product Designer": ["figma", "sketch", "adobe", "wireframing", "prototyping", "user research", "ui", "ux", "design system"]
    }

    all_skills = set(skill for skills in roles_keywords.values() for skill in skills)

    # 2. Extract Skills
    found_skills = []
    for skill in all_skills:
        # Regex for whole word matching to avoid partial matches (e.g., "go" in "good")
        if re.search(r'\b' + re.escape(skill) + r'\b', text_lower):
            found_skills.append(skill.title())
    
    # Limit to top 10 unique skills
    found_skills = sorted(list(set(found_skills)))[:10]

    # 3. Detect Role
    role_scores = {role: 0 for role in roles_keywords}
    for role, keywords in roles_keywords.items():
        for keyword in keywords:
            if re.search(r'\b' + re.escape(keyword) + r'\b', text_lower):
                role_scores[role] += 1
    
    # Get role with max score, default to "Software Engineer" if low confidence
    best_role = max(role_scores, key=role_scores.get)
    if role_scores[best_role] < 2:
        best_role = "Software Engineer"

    # 4. Extract Candidate Details (Regex)
    # Email
    email_match = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', resume_text)
    email = email_match.group(0) if email_match else None

    # Phone (Simple heuristic for various formats)
    phone_match = re.search(r'(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', resume_text)
    phone = phone_match.group(0) if phone_match else None

    # Name (Heuristic: First lines usually contain name)
    lines = [line.strip() for line in resume_text.split('\n') if line.strip()]
    name = lines[0] if lines else "Candidate"
    
    # 5. Calculate Score
    # Base score 50. Add points for sections and skills.
    score = 50
    if len(found_skills) > 5: score += 20
    if len(found_skills) > 2: score += 10
    if email: score += 5
    if phone: score += 5
    if "education" in text_lower: score += 5
    if "experience" in text_lower: score += 5
    
    score = min(score, 100)

    # 6. Generate Suggestions
    suggestions = []
    if len(found_skills) < 5:
        suggestions.append(f"Add more technical skills related to {best_role}.")
    else:
        suggestions.append("Good technical skill coverage.")
        
    if not "linkedin" in text_lower:
        suggestions.append("Add a link to your LinkedIn profile.")
    
    if not "projects" in text_lower:
        suggestions.append("Include a 'Projects' section to showcase practical work.")
        
    if len(suggestions) < 3:
        suggestions.append("Ensure your formatting is consistent throughout the document.")

    # 7. Construct Response
    return {
        "candidate_details": {
            "name": name,
            "email": email,
            "phone": phone,
            "location": "Not detected",
            "linkedin": None
        },
        "predicted_role": best_role,
        "technical_skills": found_skills,
        "match_score": score,
        "improvement_suggestions": suggestions[:3],
        "missing_skills": [],
        "recommended_courses": []
    }

    # 8. Skill Gap Analysis
    if best_role in roles_keywords:
        expected_skills = set(roles_keywords[best_role])
        # simple normalization for comparison
        found_skills_normalized = {s.lower() for s in found_skills}
        
        missing = [
            skill.title() for skill in expected_skills 
            if skill.lower() not in text_lower # Check against full text, not just extracted skills
        ]
        
        # Prioritize important missing skills (limit to 5)
        response["missing_skills"] = missing[:5]
        
        # 9. Course Recommendations
        course_catalog = {
            "React": "Advanced React Patterns (Frontend Masters)",
            "TypeScript": "Total TypeScript (Matt Pocock)",
            "AWS": "AWS Certified Solutions Architect (Udemy)",
            "Docker": "Docker & Kubernetes: The Complete Guide (Udemy)",
            "Python": "100 Days of Code: Python (Udemy)",
            "Machine Learning": "Machine Learning Specialization (Coursera/Andrew Ng)",
            "System Design": "System Design Interview (Alex Xu)",
            "Figma": "Figma UI UX Design Essentials (Udemy)",
            "SQL": "The Complete SQL Bootcamp (Udemy)"
        }
        
        courses = []
        for skill in response["missing_skills"]:
            # Find a course that matches the skill name loosely
            for key, course in course_catalog.items():
                if key.lower() in skill.lower():
                    courses.append(course)
        
        # logical dedup
        response["recommended_courses"] = sorted(list(set(courses)))[:3]

    return response


def analyze_with_gemini(resume_text: str, api_key: str) -> dict:
    """
    Analyze resume using Google Gemini API (Free Tier available)
    
    Args:
        resume_text: Extracted resume text
        api_key: Google API key
        
    Returns:
        Parsed JSON response as dictionary
    """
    import google.generativeai as genai
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash-lite-preview-02-05')
        
        prompt = f"{SYSTEM_PROMPT}\n\nAnalyze this resume:\n\n{resume_text}"
        
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            # Handle case where first line is ```json
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            response_text = "\n".join(lines)
            
        # Parse JSON
        import json
        result = json.loads(response_text)
        
        return result
        
    except Exception as e:
        logger.error(f"Gemini API error: {str(e)}")
        raise HTTPException(status_code=502, detail=f"Gemini API error: {str(e)}")


# ============== API Endpoints ==============

@app.post("/analyze-resume", response_model=ResumeAnalysisResponse)
async def analyze_resume(
    file: UploadFile = File(..., description="Resume PDF file"),
    provider: LLMProvider = LLMProvider.LOCAL
):
    """
    Analyze a resume PDF and return structured insights
    
    Args:
        file: PDF file upload
        provider: LLM provider to use (anthropic or openai)
        
    Returns:
        ResumeAnalysisResponse with candidate details, predictions, and suggestions
        
    Raises:
        HTTPException: For various error conditions
    """
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )
    
    # Validate file size (10MB limit)
    max_size = 10 * 1024 * 1024  # 10MB
    contents = await file.read()
    if len(contents) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds limit of {max_size // (1024*1024)}MB"
        )
    
    logger.info(f"Processing resume: {file.filename} ({len(contents)} bytes)")
    
    try:
        # Step 1: Extract text from PDF
        resume_text = extract_text_from_pdf(contents)
        logger.info(f"Extracted {len(resume_text)} characters from PDF")
        
        # Step 2: Get API key from environment
        # Step 2: Get API key from environment
        if provider == LLMProvider.ANTHROPIC:
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")
            analysis_result = analyze_with_anthropic(resume_text, api_key)
        elif provider == LLMProvider.OPENAI:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set")
            analysis_result = analyze_with_openai(resume_text, api_key)
        elif provider == LLMProvider.GEMINI:
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                raise HTTPException(status_code=500, detail="GEMINI_API_KEY not set")
            analysis_result = analyze_with_gemini(resume_text, api_key)
        else: # LOCAL
            logger.info("Using Local NLP Engine (Free)")
            analysis_result = analyze_locally(resume_text)
        
        # Step 3: Validate and return response
        response = ResumeAnalysisResponse(**analysis_result)
        logger.info(f"Successfully analyzed resume for: {response.candidate_details.name}")
        
        return response
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.post("/auth/register/request-otp")
async def request_register_otp(payload: RegisterOtpRequest):
    get_firebase_app()
    normalized_email = normalize_email(payload.email)

    try:
        firebase_auth.get_user_by_email(normalized_email)
        raise HTTPException(status_code=409, detail="A Firebase account already exists for this email")
    except firebase_auth.UserNotFoundError:
        pass

    otp_code = generate_email_otp()
    pending_registration_otps[normalized_email] = {
        "name": payload.name.strip(),
        "email": normalized_email,
        "password": payload.password,
        "role": payload.role,
        "company": payload.company.strip() if payload.company else None,
        "otp_code": otp_code,
        "expires_at": time.time() + FIREBASE_OTP_TTL_SECONDS,
    }

    otp_delivery = "email_sent"
    if is_smtp_configured():
        send_email_message(
            normalized_email,
            "SkillBridgeAI registration OTP",
            (
                f"Hello {payload.name},\n\n"
                f"Your SkillBridgeAI registration OTP is: {otp_code}\n\n"
                f"This code expires in {FIREBASE_OTP_TTL_SECONDS // 60} minutes."
            ),
        )
    else:
        otp_delivery = "dev_fallback"
        logger.warning("SMTP is not configured. Returning development OTP fallback for %s", normalized_email)

    return {
        "success": True,
        "email": normalized_email,
        "expiresInSeconds": FIREBASE_OTP_TTL_SECONDS,
        "otpDelivery": otp_delivery,
        "devOtp": otp_code if otp_delivery == "dev_fallback" else None,
    }


@app.post("/auth/register/verify-otp")
async def verify_register_otp(payload: VerifyRegisterOtpRequest):
    app_instance = get_firebase_app()
    normalized_email = normalize_email(payload.email)
    pending = pending_registration_otps.get(normalized_email)
    if not pending:
        raise HTTPException(status_code=404, detail="No pending registration found for this email")

    if pending["expires_at"] < time.time():
        pending_registration_otps.pop(normalized_email, None)
        raise HTTPException(status_code=400, detail="OTP expired. Request a new one.")

    if pending["otp_code"] != payload.otpCode.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP code")

    try:
        user = firebase_auth.create_user(
            app=app_instance,
            email=normalized_email,
            password=pending["password"],
            display_name=pending["name"],
            email_verified=True,
        )
        firebase_auth.set_custom_user_claims(
            user.uid,
            {
                "role": pending["role"],
                "company": pending["company"],
            },
            app=app_instance,
        )
        created_user = firebase_auth.get_user(user.uid, app=app_instance)
    except firebase_auth.EmailAlreadyExistsError:
        raise HTTPException(status_code=409, detail="A Firebase account already exists for this email")
    finally:
        pending_registration_otps.pop(normalized_email, None)

    user_payload = build_auth_user_payload(created_user)
    persist_user_document(user_payload)

    return {
        "success": True,
        "user": user_payload,
    }


@app.post("/auth/login")
async def firebase_login(payload: FirebaseLoginRequest, background_tasks: BackgroundTasks):
    normalized_email = normalize_email(payload.email)
    sign_in_result = request_firebase_sign_in(normalized_email, payload.password)
    user_payload = verify_request_user(f"Bearer {sign_in_result.get('idToken', '')}")
    background_tasks.add_task(persist_user_document, user_payload)

    return {
        "user": user_payload,
        "idToken": sign_in_result.get("idToken"),
        "refreshToken": sign_in_result.get("refreshToken"),
    }


@app.get("/db/profile")
async def get_profile(authorization: Optional[str] = Header(default=None)):
    try:
        user_payload = verify_request_user(authorization)
        db = get_firestore_client()
        snapshot = db.collection("users").document(user_payload["email"]).get()
        if snapshot.exists:
            data = snapshot.to_dict() or {}
            profile = data.get("profile") or build_default_profile(user_payload)
        else:
            persist_user_document(user_payload)
            profile = build_default_profile(user_payload)
        return profile
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to load Firestore profile")
        raise HTTPException(status_code=500, detail=f"Profile lookup failed: {get_safe_error_detail(exc)}")


@app.put("/db/profile")
async def update_profile(payload: UpdateProfileRequest, authorization: Optional[str] = Header(default=None)):
    try:
        user_payload = verify_request_user(authorization)
        db = get_firestore_client()
        doc_ref = db.collection("users").document(user_payload["email"])
        snapshot = doc_ref.get()
        current = (snapshot.to_dict() or {}).get("profile") if snapshot.exists else build_default_profile(user_payload)
        current = current or build_default_profile(user_payload)

        updates = payload.model_dump(exclude_unset=True)
        profile = {**current, **updates}
        doc_ref.set(
            {
                "email": user_payload["email"],
                "name": user_payload["name"],
                "role": user_payload["role"],
                "company": user_payload.get("company"),
                "emailVerified": user_payload["emailVerified"],
                "profile": profile,
                "updatedAt": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )
        return profile
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to update Firestore profile")
        raise HTTPException(status_code=500, detail=f"Profile update failed: {get_safe_error_detail(exc)}")


@app.get("/db/jobs")
async def list_jobs(authorization: Optional[str] = Header(default=None), mine: bool = False):
    try:
        user_payload = verify_request_user(authorization) if authorization else None
        db = get_firestore_client()
        documents = db.collection("jobs").stream()
        jobs = []
        for doc in documents:
            data = doc.to_dict() or {}
            if mine and user_payload and data.get("postedBy") != user_payload["email"]:
                continue
            jobs.append(
                {
                    "id": doc.id,
                    "title": data.get("title"),
                    "company": data.get("company"),
                    "location": data.get("location"),
                    "type": data.get("type"),
                    "tags": data.get("tags", []),
                    "postedBy": data.get("postedBy"),
                    "createdAt": serialize_timestamp(data.get("createdAt")),
                }
            )
        jobs.sort(key=lambda job: job.get("createdAt") or "", reverse=True)
        for job in jobs:
            job.pop("createdAt", None)
        return jobs
    except Exception as exc:
        logger.exception("Failed to list Firestore jobs")
        raise HTTPException(status_code=500, detail=f"Jobs lookup failed: {get_safe_error_detail(exc)}")


@app.get("/db/recruiter/stats")
async def recruiter_stats(authorization: Optional[str] = Header(default=None)):
    try:
        user_payload = verify_request_user(authorization)
        if user_payload["role"] != "recruiter":
            raise HTTPException(status_code=403, detail="Only recruiters can view recruiter stats")

        db = get_firestore_client()
        recruiter_jobs = []
        for doc in db.collection("jobs").stream():
            data = doc.to_dict() or {}
            if data.get("postedBy") == user_payload["email"]:
                recruiter_jobs.append({"id": doc.id, **data})

        recruiter_job_ids = {job["id"] for job in recruiter_jobs}
        total_applicants = 0
        for doc in db.collection("applications").stream():
            data = doc.to_dict() or {}
            if data.get("jobId") in recruiter_job_ids:
                total_applicants += 1

        return {
            "activeJobs": len(recruiter_jobs),
            "totalApplicants": total_applicants,
            "interviewsScheduled": 0,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to load recruiter stats")
        raise HTTPException(status_code=500, detail=f"Recruiter stats failed: {get_safe_error_detail(exc)}")


@app.post("/db/jobs")
async def create_job(payload: CreateJobRequest, authorization: Optional[str] = Header(default=None)):
    try:
        user_payload = verify_request_user(authorization)
        if user_payload["role"] != "recruiter":
            raise HTTPException(status_code=403, detail="Only recruiters can post jobs")

        db = get_firestore_client()
        doc_ref = db.collection("jobs").document()
        record = {
            "title": payload.title,
            "company": payload.company,
            "location": payload.location,
            "type": payload.type,
            "tags": payload.tags,
            "postedBy": user_payload["email"],
            "createdAt": firestore.SERVER_TIMESTAMP,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        }
        doc_ref.set(record)
        return {
            "id": doc_ref.id,
            "title": payload.title,
            "company": payload.company,
            "location": payload.location,
            "type": payload.type,
            "tags": payload.tags,
            "postedBy": user_payload["email"],
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to create Firestore job")
        raise HTTPException(status_code=500, detail=f"Job creation failed: {get_safe_error_detail(exc)}")


@app.get("/db/applications")
async def list_applications(authorization: Optional[str] = Header(default=None)):
    try:
        user_payload = verify_request_user(authorization)
        db = get_firestore_client()
        documents = db.collection("applications").where("candidateEmail", "==", user_payload["email"]).stream()
        applications = []
        for doc in documents:
            data = doc.to_dict() or {}
            applications.append(
                {
                    "id": doc.id,
                    "jobId": data.get("jobId"),
                    "role": data.get("role"),
                    "company": data.get("company"),
                    "status": data.get("status", "Applied"),
                    "date": data.get("date"),
                    "createdAt": serialize_timestamp(data.get("createdAt")),
                }
            )
        applications.sort(key=lambda application: application.get("createdAt") or "", reverse=True)
        for application in applications:
            application.pop("createdAt", None)
        return applications
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to list Firestore applications")
        raise HTTPException(status_code=500, detail=f"Applications lookup failed: {get_safe_error_detail(exc)}")


@app.post("/db/applications")
async def create_application(payload: CreateApplicationRequest, authorization: Optional[str] = Header(default=None)):
    try:
        user_payload = verify_request_user(authorization)
        if user_payload["role"] != "candidate":
            raise HTTPException(status_code=403, detail="Only candidates can apply to jobs")

        db = get_firestore_client()
        existing = (
            db.collection("applications")
            .where("candidateEmail", "==", user_payload["email"])
            .where("jobId", "==", payload.jobId)
            .limit(1)
            .stream()
        )
        if any(True for _ in existing):
            raise HTTPException(status_code=409, detail="You have already applied to this job")

        doc_ref = db.collection("applications").document()
        record = {
            "jobId": payload.jobId,
            "role": payload.role,
            "company": payload.company,
            "status": "Applied",
            "date": time.strftime("%Y-%m-%d"),
            "candidateEmail": user_payload["email"],
            "createdAt": firestore.SERVER_TIMESTAMP,
        }
        doc_ref.set(record)
        return {
            "id": doc_ref.id,
            "jobId": payload.jobId,
            "role": payload.role,
            "company": payload.company,
            "status": "Applied",
            "date": record["date"],
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to create Firestore application")
        raise HTTPException(status_code=500, detail=f"Application creation failed: {get_safe_error_detail(exc)}")


@app.get("/db/shortlisted-candidates")
async def list_shortlisted_candidates(authorization: Optional[str] = Header(default=None)):
    try:
        user_payload = verify_request_user(authorization)
        if user_payload["role"] != "recruiter":
            raise HTTPException(status_code=403, detail="Only recruiters can view shortlisted candidates")

        db = get_firestore_client()
        documents = db.collection("users").stream()
        candidates = []
        for doc in documents:
            data = doc.to_dict() or {}
            if data.get("role") != "candidate":
                continue
            profile = data.get("profile") or {}
            if profile.get("matchScore", 0) >= 80:
                candidates.append(profile)

        candidates.sort(key=lambda candidate: candidate.get("matchScore", 0), reverse=True)
        return candidates
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to list shortlisted Firestore candidates")
        raise HTTPException(status_code=500, detail=f"Shortlisted candidates lookup failed: {get_safe_error_detail(exc)}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "AI Resume Analyzer",
        "version": "1.0.0"
    }


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "AI Resume Analyzer API",
        "docs": "/docs",
        "health": "/health",
        "analyze_endpoint": "/analyze-resume"
    }


@app.post("/send-otp-email")
async def send_otp_email(payload: SendOtpEmailRequest):
    """
    Send a 2FA OTP code to the user's registered email using SMTP.
    """
    recipient_name = payload.name or "User"
    send_email_message(
        payload.email,
        "Your SkillBridgeAI 2FA Code",
        f"Hello {recipient_name},\n\n"
        f"Your one-time 2FA code is: {payload.otp_code}\n\n"
        "This code expires in 5 minutes.\n"
        "If you did not request this login, please ignore this email."
    )

    return {"success": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
