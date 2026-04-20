# AI Resume Analyzer API

A production-ready FastAPI backend that analyzes resumes using AI (OpenAI or Anthropic) to extract insights, predict roles, and provide improvement suggestions.

## Features

✅ **PDF Text Extraction** - Clean text extraction using `pypdf`  
✅ **LLM Analysis** - Support for both Anthropic Claude and OpenAI GPT models  
✅ **Structured Output** - Pydantic-validated JSON responses  
✅ **Error Handling** - Comprehensive validation and error messages  
✅ **Production Ready** - CORS, logging, health checks included  

## API Response Structure

```json
{
  "candidate_details": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-234-567-8900",
    "location": "San Francisco, CA",
    "linkedin": "https://linkedin.com/in/johndoe"
  },
  "predicted_role": "Senior Full Stack Engineer",
  "technical_skills": [
    "Python",
    "FastAPI",
    "React",
    "PostgreSQL",
    "Docker",
    "AWS",
    "TypeScript",
    "Redis",
    "GraphQL",
    "Kubernetes"
  ],
  "match_score": 85,
  "improvement_suggestions": [
    "Add quantifiable metrics to achievements (e.g., 'Improved performance by 40%')",
    "Include certifications section with relevant industry credentials",
    "Expand on leadership experience and team management skills"
  ]
}
```

## Installation

### 1. Clone or Create Project

```bash
mkdir resume-analyzer
cd resume-analyzer
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Set Up Environment Variables

```bash
cp .env.example .env
# Edit .env and add your API key(s)
```

Required environment variables:
- `ANTHROPIC_API_KEY` - For using Claude (recommended)
- `OPENAI_API_KEY` - For using GPT-4

You only need one, but can set both for flexibility.

For OTP email delivery (2FA), set:
- `SMTP_HOST` (example: `smtp.gmail.com`)
- `SMTP_PORT` (example: `587`)
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM` (sender email)

## Usage

### Start the Server

```bash
python main.py
```

Or with uvicorn directly:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### API Endpoints

#### 1. Analyze Resume (Main Endpoint)

**POST** `/analyze-resume`

**Parameters:**
- `file` (required): PDF file upload
- `provider` (optional): `anthropic` or `openai` (default: `anthropic`)

**Example with cURL:**

```bash
curl -X POST "http://localhost:8000/analyze-resume?provider=anthropic" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@resume.pdf"
```

**Example with Python:**

```python
import requests

url = "http://localhost:8000/analyze-resume"
files = {'file': open('resume.pdf', 'rb')}
params = {'provider': 'anthropic'}

response = requests.post(url, files=files, params=params)
print(response.json())
```

**Example with JavaScript/Fetch:**

```javascript
const formData = new FormData();
formData.append('file', pdfFile);

const response = await fetch('http://localhost:8000/analyze-resume?provider=anthropic', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result);
```

#### 2. Health Check

**GET** `/health`

```bash
curl http://localhost:8000/health
```

#### 3. API Documentation

FastAPI provides automatic interactive documentation:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

#### 4. Send 2FA OTP Email

**POST** `/send-otp-email`

**Body:**

```json
{
  "email": "candidate@example.com",
  "name": "Candidate Name",
  "otp_code": "123456"
}
```

## Scoring Methodology

The `match_score` (0-100) is calculated based on:

| Criteria | Weight | Description |
|----------|--------|-------------|
| Clarity & Formatting | 20% | Resume structure, readability, professional formatting |
| Experience & Achievements | 30% | Relevant work history, quantifiable results |
| Technical Skills | 20% | Breadth and depth of technical expertise |
| Education & Certifications | 15% | Academic credentials, professional certifications |
| Overall Presentation | 15% | Grammar, consistency, completeness |

## Error Handling

The API provides detailed error responses:

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Invalid request (wrong file type, file too large, invalid PDF) |
| 500 | Server error (API key missing, LLM failure) |
| 502 | LLM API error (external service issue) |

**Example Error Response:**

```json
{
  "detail": "Only PDF files are supported"
}
```

## Configuration

### File Size Limit

Default: 10MB. Modify in `main.py`:

```python
max_size = 10 * 1024 * 1024  # 10MB
```

### CORS Settings

For production, restrict allowed origins in `main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Specific domains
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)
```

### LLM Model Selection

**Anthropic (default):**
```python
model="claude-sonnet-4-20250514"  # Fast, cost-effective
```

**OpenAI:**
```python
model="gpt-4-turbo-preview"  # High quality, slower
```

## Testing

### Test with Sample Resume

```bash
# Using the provided test endpoint
curl -X POST "http://localhost:8000/analyze-resume" \
  -F "file=@test_resume.pdf" \
  --output result.json

# View results
cat result.json | jq
```

## Deployment

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:

```bash
docker build -t resume-analyzer .
docker run -p 8000:8000 \
  -e ANTHROPIC_API_KEY=your_key \
  resume-analyzer
```

### Environment Variables in Production

Use secure methods to inject API keys:
- AWS Secrets Manager
- Google Cloud Secret Manager
- Kubernetes Secrets
- Environment variables in hosting platform

## Performance Considerations

- **PDF Processing**: ~100-500ms depending on resume length
- **LLM Analysis**: ~2-5 seconds for Anthropic, ~3-8 seconds for OpenAI
- **Total Response Time**: ~3-8 seconds typical

## Limitations

- PDF only (no DOCX support yet)
- Single file per request
- Text-based extraction (images/charts ignored)
- English language optimized

## Troubleshooting

### "ANTHROPIC_API_KEY environment variable not set"
Solution: Create `.env` file or export variable:
```bash
export ANTHROPIC_API_KEY=your_key_here
```

### "Invalid PDF file"
Solution: Ensure PDF is not password-protected and contains selectable text

### "LLM returned invalid JSON response"
Solution: This is rare but can happen. Retry the request or switch providers.

## License

MIT License - Feel free to use in your projects!

## Contributing

Contributions welcome! Please open an issue or PR.
