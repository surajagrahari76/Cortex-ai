# Cortex AI – Multi-Agent AI Platform

A full-stack, microservice-based AI chat platform built with the **MERN stack**. A **LangGraph** workflow routes each user request to one of 9 specialised agents (chat, web search, coding, PDF/PPT generation, document RAG with **Qdrant**, image analysis and image generation), with responses streamed to a React UI.

## Features

- **Multi-agent orchestration**: a LangGraph `StateGraph` with a router agent that sends each prompt (and any attached file) to the right agent
- **9 specialised agents**
  - Chat: general conversation and explanations
  - Search: live web search through Tavily
  - Coding: architecture, debugging and code generation with structured file artifacts
  - PDF generator: creates PDFs (PDFKit) and stores them on AWS S3
  - PowerPoint generator: creates `.pptx` decks (pptxgenjs) and stores them on AWS S3
  - PDF RAG and PowerPoint RAG: chunking, Gemini embeddings and semantic Q&A over uploaded files using Qdrant
  - Image analyzer: multimodal image understanding with Gemini
  - Vision: text-to-image generation
- **Multiple LLM backends** selectable in the UI: Groq (GPT), Google Gemini, OpenRouter (DeepSeek)
- **Streaming responses**, Markdown rendering, syntax-highlighted code with copy button
- **Artifact drawer**: preview, inspect and copy generated multi-file code, with a live iframe preview for web apps
- **File uploads**: PDF, PowerPoint and images
- **Authentication**: Firebase email/password and Google sign-in; server-side token verification, HTTP-only cookie sessions stored in Redis (7 days)
- **Billing**: Free / Pro / Enterprise plans with credit quotas, Razorpay checkout and HMAC signature verification
- **Conversation history**: create, search, rename and delete chats, persisted in MongoDB; Redis cache for conversational memory

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React (Vite), Redux Toolkit, Tailwind CSS, Framer Motion, Prism.js |
| Backend | Node.js, Express.js (microservices + API gateway) |
| AI | LangGraph, LangChain, Groq, Google Gemini, OpenRouter, Tavily |
| Databases | MongoDB, Redis, Qdrant (vector DB) |
| Auth / Payments | Firebase Auth + Admin SDK, JWT/session cookies, Razorpay |
| Storage / DevOps | AWS S3, Docker, GitHub Actions |

## Architecture

```
React (Vite, :5173)
        |
   API Gateway (:8000)  ── cookie auth check against Redis
        |
 ┌──────┼───────────┬───────────────┬────────────────┐
 Auth   Chat        Agent           Billing
 :8001  :8002       :8003           :8004
 (Firebase,         (LangGraph,     (Razorpay)
  MongoDB,           9 agents,
  Redis)             Qdrant, S3)
```

| Service | Port | Responsibility |
|---|---|---|
| Gateway | 8000 | Reverse proxy, session check, routes `/api/auth`, `/api/chat`, `/api/agent`, `/api/billing`, `/api/me` |
| Auth | 8001 | Firebase token verification, user and credits, sessions |
| Chat | 8002 | Conversations and message history |
| Agent | 8003 | LangGraph agent execution, RAG, file generation, streaming |
| Billing | 8004 | Razorpay orders and payment verification |

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for Redis)
- A MongoDB instance (local or Atlas)
- A Qdrant instance (local or Qdrant Cloud)
- Accounts and keys for: Firebase, Groq, Google AI Studio, OpenRouter, Tavily, AWS S3, Razorpay

### 1. Clone and install

```bash
git clone https://github.com/surajagrahari76/Cortex-ai.git
cd Cortex-ai
```

Run `npm install` inside `backend/gateway`, each folder in `backend/services/*`, and `frontend`.

### 2. Start Redis

```bash
cd backend
docker compose up -d
```

### 3. Configure environment variables

Create a `.env` file in each service (names only are listed here; use your own values). `.env` files are git-ignored.

| Location | Variables |
|---|---|
| `backend/gateway` | `PORT`, `FRONTEND_URL`, `AUTH_SERVICE`, `CHAT_SERVICE`, `AGENT_SERVICE`, `BILLING_SERVICE`, `REDIS_URL` |
| `backend/services/auth` | `PORT`, `MONGODB_URI`, `REDIS_URL` |
| `backend/services/chat` | `PORT`, `MONGODB_URI` |
| `backend/services/agent` | `PORT`, `MONGODB_URI`, `REDIS_URL`, `AUTH_SERVICE`, `CHAT_SERVICE`, `GROQ_API_KEY`, `GOOGLE_API_KEY`, `OPENROUTER_API_KEY`, `TAVILY_API_KEY`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_KEY`, `AWS_BUCKET_NAME`, `QDRANT_URL`, `QDRANT_API_KEY` |
| `backend/services/billing` | `PORT`, `MONGODB_URI`, `AUTH_SERVICE`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |
| `frontend` | `VITE_SERVER_URL`, `VITE_FIREBASE_API_KEY`, `VITE_RAZORPAY_KEY_ID` |

**Firebase Admin key:** download a service account key from your Firebase project and save it as `backend/services/auth/serviceAccountKey.json`. This file is git-ignored; never commit it.

### 4. Run the services

Use a separate terminal for each:

```bash
cd backend/gateway && npm run dev            # :8000
cd backend/services/auth && npm run dev      # :8001
cd backend/services/chat && npm run dev      # :8002
cd backend/services/agent && npm run dev     # :8003
cd backend/services/billing && npm run dev   # :8004
cd frontend && npm run dev                   # :5173
```

Open http://localhost:5173.

## Project Structure

```
Cortex-ai/
├── backend/
│   ├── gateway/            # API gateway
│   ├── services/
│   │   ├── auth/
│   │   ├── chat/
│   │   ├── agent/          # LangGraph graph, agents, RAG
│   │   └── billing/
│   ├── shared/redis/
│   └── docker-compose.yml
├── frontend/               # React + Vite app
└── .github/workflows/      # CI/CD
```

## Screenshots

_Add screenshots here (chat UI, RAG answer, PPT/PDF generation, billing)._

## Author

**Suraj Agrahari**: [GitHub](https://github.com/surajagrahari76) · [LinkedIn](https://www.linkedin.com/in/suraj-agrahari01)
