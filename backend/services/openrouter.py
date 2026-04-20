import os
import logging
import requests
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")

# Debug log — confirm key status on startup
if OPENROUTER_API_KEY and OPENROUTER_API_KEY != "YOUR_OPENROUTER_API_KEY":
    logging.info(f"[OPENROUTER] API key loaded ✓ (starts with: {OPENROUTER_API_KEY[:8]}...)")
else:
    logging.warning("[OPENROUTER] API key NOT set — responses will use mock mode.")

def call_openrouter(prompt: str, system_prompt: str = "You are a helpful medical assistant.", model: str = "meta-llama/llama-3-8b-instruct"):
    if not OPENROUTER_API_KEY or OPENROUTER_API_KEY == "YOUR_OPENROUTER_API_KEY":
        return "Mock response from OpenRouter: API key is missing."
        
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "AI Patient Care System",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]
    }
    
    response = requests.post(url, headers=headers, json=payload)
    if response.status_code == 200:
        return response.json()["choices"][0]["message"]["content"]
    else:
        raise Exception(f"OpenRouter API Error: {response.text}")

def generate_reminder(patient_name: str, condition: str):
    prompt = f"Write a friendly WhatsApp reminder for {patient_name} who has {condition}. Ensure it is short, simple, and patient-friendly. Do NOT give medical advice."
    return call_openrouter(prompt)

def analyze_report(report_text: str):
    prompt = f"Summarize the following medical report text in simple terms. Highlight abnormal values only. Do NOT provide a diagnosis.\n\n{report_text}"
    return call_openrouter(prompt, model="meta-llama/llama-3-8b-instruct")

def explain_medicine(medicine_name: str, side_effects: str = None):
    prompt = f"Explain the purpose, usage, and precautions for the medicine: {medicine_name}."
    if side_effects:
        prompt += f" The patient reported experiencing these side effects: {side_effects}. Flag any severe side effects and advise them to consult their doctor immediately. Do not suggest replacing the medicine."
    return call_openrouter(prompt, model="meta-llama/llama-3-8b-instruct")
