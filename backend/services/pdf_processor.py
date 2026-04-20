import io
import json
import logging
import pdfplumber
from services.openrouter import call_openrouter

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract all text from a PDF file given its raw bytes."""
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            pages = [page.extract_text() or "" for page in pdf.pages]
        text = "\n".join(pages).strip()
        if not text:
            logging.warning("[PDF] PDF extracted but no text found (may be image-based)")
        return text
    except Exception as e:
        logging.error(f"[PDF] Extraction failed: {e}")
        raise ValueError(f"Could not extract text from PDF: {e}")

def analyze_pdf_with_ai(text: str) -> dict:
    """
    Send extracted PDF text to the LLM.
    Ask for structured JSON with: disease, medicines, summary.
    Returns a validated Python dict.
    """
    truncated = text[:6000]  # Keep within token limits

    system_prompt = (
        "You are a medical report analysis assistant. "
        "Analyze the text and return a JSON object ONLY — no extra commentary. "
        "Format: {\"disease\": \"...\", \"medicines\": [\"...\"], \"summary\": \"...\", \"anomalies\": \"...\"}"
    )
    prompt = f"Analyze this medical report:\n\n{truncated}"

    try:
        raw_response = call_openrouter(prompt, system_prompt=system_prompt)

        # Handle mock mode
        if "Mock response" in raw_response or "API key is missing" in raw_response:
            return {
                "disease": "Unknown (mock mode)",
                "medicines": [],
                "summary": "AI analysis unavailable — please configure your OpenRouter API key.",
                "anomalies": "N/A"
            }

        # Parse JSON from LLM response
        # Strip any markdown code blocks the LLM may have added
        clean = raw_response.strip()
        if clean.startswith("```"):
            clean = "\n".join(clean.split("\n")[1:])
        if clean.endswith("```"):
            clean = "\n".join(clean.split("\n")[:-1])

        result = json.loads(clean)

        # Validate expected keys exist
        for key in ("disease", "medicines", "summary"):
            if key not in result:
                result[key] = "Not identified"

        return result
    except json.JSONDecodeError:
        logging.warning("[PDF AI] Could not parse JSON from LLM response, returning plain summary")
        return {
            "disease": "See summary",
            "medicines": [],
            "summary": raw_response[:1000],
            "anomalies": "Could not parse structured data"
        }
    except Exception as e:
        raise ValueError(f"AI analysis failed: {e}")

def answer_report_question(extracted_text: str, question: str) -> str:
    """Answer a question about a report using stored extracted text."""
    truncated = extracted_text[:5000]
    prompt = (
        f"Based on the following medical report, answer this question: {question}\n\n"
        f"Report text:\n{truncated}\n\n"
        "Be concise. If the answer isn't in the report, say so."
    )
    system_prompt = "You are a helpful medical report Q&A assistant. Do not give diagnoses. Refer to a doctor for decisions."
    return call_openrouter(prompt, system_prompt=system_prompt)
