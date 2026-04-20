import google.generativeai as genai
import os

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    # Try to load from .env file just in case
    try:
        from dotenv import load_dotenv
        load_dotenv()
        api_key = os.getenv("GEMINI_API_KEY")
    except ImportError:
        pass

print(f"Checking key: {api_key[:4]}...{api_key[-4:] if api_key else 'None'}")

if not api_key:
    print("ERROR: GEMINI_API_KEY not found in environment.")
    exit(1)

genai.configure(api_key=api_key)

print("\nListing available models...")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
            
    print("\nAttempting test generation with 'gemini-1.5-flash'...")
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("Hello, can you hear me?")
    print(f"Success! Response: {response.text}")
    
except Exception as e:
    print(f"\nERROR: {str(e)}")
