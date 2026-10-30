# Cortex AI – Deployment Guide

This document outlines the step-by-step production deployment process for the Cortex AI platform:
- **Backend**: 5 Docker web services on **Render** (via Render Blueprint `render.yaml` or manual setup)
- **Frontend**: Single Page Application (SPA) on **Vercel**

---

## 1. Deployment Order

To ensure all dependencies and inter-service endpoints are available when needed, follow this exact sequence:

```
[Phase 1: Cloud Databases & Keys]
  MongoDB Atlas ──► Upstash Redis ──► Qdrant Cloud ──► Firebase & AI APIs
                             │
                             ▼
[Phase 2: Render Backend Services]
  1. cortex-auth
  2. cortex-chat
  3. cortex-billing
  4. cortex-agent
  5. cortex-gateway
                             │
                             ▼
[Phase 3: Vercel Frontend]
  frontend (React + Vite)
                             │
                             ▼
[Phase 4: Post-Deployment Linking]
  Update FRONTEND_URL on gateway ──► Add Vercel domain to Firebase
```

---

## 2. Phase 1: External Databases & Services Setup

Set up your external providers before deploying any container:

1. **MongoDB Atlas**:
   - Create a cluster and database user.
   - Whitelist Render's IP addresses (or `0.0.0.0/0` for initial setup).
   - Obtain connection URI: `mongodb+srv://<user>:<password>@cluster.mongodb.net/cortexai?retryWrites=true&w=majority`.
   - Used by: `cortex-auth`, `cortex-chat`, `cortex-agent`, `cortex-billing`.

2. **Upstash Redis**:
   - Create a Redis database with TLS enabled.
   - Obtain connection URL (starts with `rediss://...`).
   - Used by: `cortex-gateway`, `cortex-auth`, `cortex-agent`.

3. **Qdrant Cloud**:
   - Create a cluster on [cloud.qdrant.io](https://cloud.qdrant.io).
   - Obtain `QDRANT_URL` (https://...) and `QDRANT_API_KEY`.
   - Used by: `cortex-agent`.

4. **Firebase Project**:
   - In Firebase Console > Project Settings > Service Accounts, generate a private key.
   - Compact the downloaded JSON into a single-line string for `FIREBASE_SERVICE_ACCOUNT` (used by `cortex-auth`).
   - In Project Settings > General, copy Web API Key for `VITE_FIREBASE_API_KEY` (used by `frontend`).

5. **Generate Internal Key**:
   - Generate a strong random secret token (e.g. `openssl rand -hex 32`).
   - All 5 backend services **must share this exact same `INTERNAL_API_KEY`** value.

6. **Third-Party API Keys**:
   - Groq (`GROQ_API_KEY`), Google AI Studio (`GOOGLE_API_KEY`), OpenRouter (`OPENROUTER_API_KEY`), Tavily (`TAVILY_API_KEY`).
   - AWS S3 (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_KEY`, `AWS_BUCKET_NAME`).
   - Razorpay (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`).

---

## 3. Phase 2: Deploy Backend Services on Render

Deploy the 5 backend services as Docker Web Services. You can use the included `render.yaml` Blueprint or create them manually with:
- **Runtime**: Docker
- **Build Context**: `./backend`
- **Health Check Path**: `/health`
- **Plan**: Free

### Recommended Service Deployment Order:

1. **`cortex-auth`** (`./backend/services/auth/Dockerfile`)
   - Environment variables: `NODE_ENV=production`, `PORT=8001`, `MONGODB_URI`, `REDIS_URL`, `FIREBASE_SERVICE_ACCOUNT`, `INTERNAL_API_KEY`.
   - Copy deployed service URL (e.g., `https://cortex-auth.onrender.com`).

2. **`cortex-chat`** (`./backend/services/chat/Dockerfile`)
   - Environment variables: `NODE_ENV=production`, `PORT=8002`, `MONGODB_URI`, `INTERNAL_API_KEY`.
   - Copy deployed service URL (e.g., `https://cortex-chat.onrender.com`).

3. **`cortex-billing`** (`./backend/services/billing/Dockerfile`)
   - Environment variables: `NODE_ENV=production`, `PORT=8004`, `MONGODB_URI`, `AUTH_SERVICE`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `INTERNAL_API_KEY`.
   - Copy deployed service URL (e.g., `https://cortex-billing.onrender.com`).

4. **`cortex-agent`** (`./backend/services/agent/Dockerfile`)
   - Environment variables: `NODE_ENV=production`, `PORT=8003`, `MONGODB_URI`, `REDIS_URL`, `AUTH_SERVICE`, `CHAT_SERVICE`, `INTERNAL_API_KEY`, AI keys (`GROQ_API_KEY`, `GOOGLE_API_KEY`, `OPENROUTER_API_KEY`, `TAVILY_API_KEY`), AWS S3 credentials, and Qdrant credentials.
   - Copy deployed service URL (e.g., `https://cortex-agent.onrender.com`).

5. **`cortex-gateway`** (`./backend/gateway/Dockerfile`)
   - Environment variables: `NODE_ENV=production`, `PORT=8000`, `REDIS_URL`, `INTERNAL_API_KEY`, `AUTH_SERVICE`, `CHAT_SERVICE`, `AGENT_SERVICE`, `BILLING_SERVICE`, `FRONTEND_URL` (temporarily set or update after Phase 3).
   - Copy deployed gateway URL (e.g., `https://cortex-gateway.onrender.com`).

> [!IMPORTANT]
> **Service URLs Formatting**: All service URL variables (`AUTH_SERVICE`, `CHAT_SERVICE`, `AGENT_SERVICE`, `BILLING_SERVICE`) must be **full `https://` URLs without a trailing slash** (e.g. `https://cortex-auth.onrender.com`).

---

## 4. Phase 3: Deploy Frontend on Vercel

1. Import the repository in Vercel.
2. Set the **Root Directory** to `frontend`.
3. Set the Framework Preset to **Vite**.
4. Configure Environment Variables:
   - `VITE_SERVER_URL`: Full URL of your deployed `cortex-gateway` (e.g. `https://cortex-gateway.onrender.com` or custom domain).
   - `VITE_FIREBASE_API_KEY`: Your Firebase project Web API key.
   - `VITE_RAZORPAY_KEY_ID`: Your Razorpay Key ID.
5. Deploy. The included `frontend/vercel.json` ensures all SPA routes (e.g., `/chat`, `/auth`) route cleanly to `index.html`.

---

## 5. Phase 4: Post-Deployment Linking

1. **Update Gateway CORS**:
   - In Render, open `cortex-gateway` environment settings.
   - Set `FRONTEND_URL` to your live Vercel URL (e.g. `https://cortex-ai-frontend.vercel.app` or your custom domain).
2. **Authorize Vercel Domain in Firebase**:
   - Go to [Firebase Console](https://console.firebase.google.com/) > Your Project > **Authentication** > **Settings** > **Authorized domains**.
   - Add your Vercel domain (e.g. `cortex-ai-frontend.vercel.app`) and any custom domains.

---

## 6. Critical Warning: Custom Domain & Third-Party Cookie Policy

> [!WARNING]
> **Avoid Cross-Site Cookie Blocking with a Custom Domain**:
>
> In production (`NODE_ENV=production`), the session cookie is set with `SameSite=None` and `Secure=true`.
>
> If your frontend is hosted on `*.vercel.app` and your gateway on `*.onrender.com`, browsers treat the session cookie as a **cross-site (third-party) cookie** because `.vercel.app` and `.onrender.com` are distinct public suffixes. Modern browsers (including Chrome Third-Party Cookie Restrictions and Apple Safari Intelligent Tracking Prevention) frequently block third-party cookies by default, causing user login sessions to fail or disappear on refresh.
>
> **Recommended Solution**:
> Place both frontend and gateway under the **same root custom domain** using subdomains:
> - Frontend: `https://app.yourdomain.com` (or `https://yourdomain.com`) on Vercel
> - Gateway: `https://api.yourdomain.com` on Render
>
> Because both share the registrable domain (`yourdomain.com`), cookies are treated as first-party (same-site) and will work reliably across all browsers.
