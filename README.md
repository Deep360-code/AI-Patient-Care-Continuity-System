#  AI Healthcare Assistant

An AI-powered healthcare assistant designed to improve patient follow-ups, automate communication, and provide intelligent medical support using Retrieval-Augmented Generation (RAG) and real-time workflows.
---
## 🎥 Demo Video

This demo showcases the AI Healthcare Assistant, including patient-specific chat, RAG-based memory, and automated follow-up workflows.

▶️ [Watch the full demo](https://youtu.be/zL95JaHT4p0)
---

##  Features

* **AI Chat Assistant**
  Conversational AI for patient interaction and medical query support.

*  **RAG-based Patient Memory**
  Maintains individual patient context using retrieval-augmented generation for personalized responses.

*  **Automated Follow-up Alerts**
  Tracks patient schedules and sends reminders via WhatsApp.

*  **Human-in-the-Loop System**
  Ensures reliability by allowing doctors to review or intervene in AI-generated responses.

*  **Scalable Backend Architecture**
  Built with modular APIs and async processing for real-world deployment.

---

##  Tech Stack

**Frontend**

* Next.js
* TypeScript

**Backend**

* FastAPI
* Python

**AI & Integrations**

* OpenRouter (LLMs)
* RAG Pipeline
* Twilio (WhatsApp API)

**Database**

* Supabase / PostgreSQL

**Deployment**

* Vercel (Frontend)
* Render (Backend)

---

##  System Architecture

1. User interacts via chat interface
2. Request sent to FastAPI backend
3. RAG pipeline retrieves patient-specific context
4. LLM generates response using OpenRouter
5. Alerts and follow-ups handled via workflow engine
6. WhatsApp notifications sent using Twilio

---

## v Installation

```bash
# Clone the repo
git clone https://github.com/your-username/ai-healthcare-assistant.git

# Navigate to project
cd ai-healthcare-assistant

# Install frontend
cd frontend
npm install

# Install backend
cd ../backend
pip install -r requirements.txt
```

---

## Running Locally

```bash
# Run backend
uvicorn main:app --reload

# Run frontend
npm run dev
```

---

##  Environment Variables

Create `.env` files in both frontend and backend:

```env
OPENROUTER_API_KEY=your_key
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
SUPABASE_URL=your_url
SUPABASE_KEY=your_key
JWT_SECRET=your_secret
```

---

##  Deployment

* Frontend deployed on **Vercel**
* Backend deployed on **Render**
* Ensure environment variables are configured properly

---

##  Future Improvements

* Multi-language support
* Advanced patient analytics
* Integration with hospital systems (EHR)
* Voice-based assistant

---

## 🤝Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

---

##  License

This project is licensed under the MIT License.

---
