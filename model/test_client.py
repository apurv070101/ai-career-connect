"""
Test client for AI Resume Analyzer API
Demonstrates how to interact with the API
"""

import requests
import json
from pathlib import Path


def analyze_resume(pdf_path: str, provider: str = "anthropic", base_url: str = "http://localhost:8000"):
    """
    Send a resume PDF to the API for analysis
    
    Args:
        pdf_path: Path to PDF file
        provider: 'anthropic' or 'openai'
        base_url: API base URL
    
    Returns:
        Analysis results as dictionary
    """
    
    # Check if file exists
    if not Path(pdf_path).exists():
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")
    
    # Prepare the request
    url = f"{base_url}/analyze-resume"
    params = {"provider": provider}
    
    # Open and send the file
    with open(pdf_path, 'rb') as f:
        files = {'file': (Path(pdf_path).name, f, 'application/pdf')}
        
        print(f"📄 Analyzing resume: {pdf_path}")
        print(f"🤖 Using provider: {provider}")
        print(f"⏳ Please wait...\n")
        
        try:
            response = requests.post(url, files=files, params=params, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            
            # Pretty print results
            print("✅ Analysis Complete!\n")
            print("=" * 60)
            print("CANDIDATE DETAILS")
            print("=" * 60)
            details = result['candidate_details']
            print(f"Name:     {details['name']}")
            print(f"Email:    {details.get('email', 'N/A')}")
            print(f"Phone:    {details.get('phone', 'N/A')}")
            print(f"Location: {details.get('location', 'N/A')}")
            print(f"LinkedIn: {details.get('linkedin', 'N/A')}")
            
            print("\n" + "=" * 60)
            print("PREDICTED ROLE")
            print("=" * 60)
            print(f"{result['predicted_role']}")
            
            print("\n" + "=" * 60)
            print("TECHNICAL SKILLS")
            print("=" * 60)
            for i, skill in enumerate(result['technical_skills'], 1):
                print(f"{i:2d}. {skill}")
            
            print("\n" + "=" * 60)
            print(f"MATCH SCORE: {result['match_score']}/100")
            print("=" * 60)
            
            # Visual score bar
            filled = int(result['match_score'] / 5)
            empty = 20 - filled
            print(f"[{'█' * filled}{'░' * empty}] {result['match_score']}%")
            
            print("\n" + "=" * 60)
            print("IMPROVEMENT SUGGESTIONS")
            print("=" * 60)
            for i, suggestion in enumerate(result['improvement_suggestions'], 1):
                print(f"\n{i}. {suggestion}")
            
            print("\n" + "=" * 60)
            
            return result
            
        except requests.exceptions.Timeout:
            print("❌ Error: Request timed out. The API might be processing a large file.")
            raise
        except requests.exceptions.RequestException as e:
            print(f"❌ Error: {e}")
            if hasattr(e.response, 'json'):
                try:
                    error_detail = e.response.json()
                    print(f"Details: {error_detail.get('detail', 'Unknown error')}")
                except:
                    pass
            raise


def test_health_check(base_url: str = "http://localhost:8000"):
    """Test the health check endpoint"""
    try:
        response = requests.get(f"{base_url}/health")
        response.raise_for_status()
        print("✅ API is healthy!")
        print(json.dumps(response.json(), indent=2))
        return True
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False


if __name__ == "__main__":
    import sys
    
    print("AI Resume Analyzer - Test Client")
    print("=" * 60)
    
    # First, check if API is running
    if not test_health_check():
        print("\n⚠️  Make sure the API is running:")
        print("   python main.py")
        sys.exit(1)
    
    print("\n")
    
    # Example usage
    if len(sys.argv) > 1:
        pdf_file = sys.argv[1]
        provider = sys.argv[2] if len(sys.argv) > 2 else "anthropic"
        
        try:
            result = analyze_resume(pdf_file, provider)
            
            # Optionally save to JSON file
            output_file = f"analysis_result_{Path(pdf_file).stem}.json"
            with open(output_file, 'w') as f:
                json.dump(result, f, indent=2)
            print(f"\n💾 Results saved to: {output_file}")
            
        except Exception as e:
            print(f"\n❌ Analysis failed: {e}")
            sys.exit(1)
    else:
        print("Usage:")
        print("  python test_client.py <resume.pdf> [provider]")
        print("\nExamples:")
        print("  python test_client.py resume.pdf")
        print("  python test_client.py resume.pdf anthropic")
        print("  python test_client.py resume.pdf openai")
        print("\nNote: Make sure to set ANTHROPIC_API_KEY or OPENAI_API_KEY")
