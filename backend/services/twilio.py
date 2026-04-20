import os
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_NUMBER = os.environ.get("TWILIO_WHATSAPP_NUMBER", "whatsapp:+919058265834")

def send_whatsapp_message(to_number: str, message: str):
    if not TWILIO_ACCOUNT_SID or TWILIO_ACCOUNT_SID == "YOUR_TWILIO_ACCOUNT_SID":
        print(f"[MOCK WHATSAPP] To: {to_number} | Message: {message}")
        return {"status": "mock_sent", "message": message}
        
    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    
    if not to_number.startswith("whatsapp:"):
        to_number = f"whatsapp:{to_number}"
        
    try:
        msg = client.messages.create(
            body=message,
            from_=TWILIO_WHATSAPP_NUMBER,
            to=to_number
        )
        return {"status": "sent", "sid": msg.sid}
    except Exception as e:
        print(f"[TWILIO ERROR] {e}")
        return {"status": "failed", "error": str(e)}
