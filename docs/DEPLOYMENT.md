# G-MAPS INDUSTRIAL INTELLIGENCE: DEPLOYMENT & INFRASTRUCTURE GUIDE

**Document Version:** 1.0.0  
**Target:** 24/7 Autonomous Online Operation  
**Primary Platform:** Cloudflare Workers + Cloudflare D1 / Cloudflare Pages OR Standard Node.js VPS / Docker Container

---

## 1. Architecture Overview

The transformed platform consists of three core layers:
1. **Frontend Client (`/client`):** High-performance React 19 SPA bundled with Vite and Tailwind CSS.
2. **Backend Server (`/server`):** TypeScript REST API powered by Hono with built-in durable background workers.
3. **Database Layer (`/migrations`):** Versioned relational SQL schema compatible with Cloudflare D1 and SQLite 3.

---

## 2. Option A: Local Development Setup

To run the application locally on your workstation:

### Prerequisites:
- Node.js >= 20.0.0 (v22.15.0 tested)
- npm >= 10.0.0

### Steps:
1. Clone the repository and navigate to root:
   ```bash
   cd "d:/Desktop/G-MAPS DATA"
   ```
2. Copy environment variables:
   ```bash
   copy .env.example .env
   ```
3. Install dependencies across packages:
   ```bash
   npm --prefix shared install
   npm --prefix server install
   npm --prefix client install
   ```
4. Build shared and server libraries:
   ```bash
   npm --prefix shared run build
   npm --prefix server run build
   ```
5. Start the backend server (on `http://localhost:3001`):
   ```bash
   npm --prefix server start
   ```
6. In a separate terminal, launch the frontend dev server (on `http://localhost:5173`):
   ```bash
   npm --prefix client run dev
   ```

---

## 3. Option B: Cloudflare Free-Tier Online Deployment (24/7 Cloud)

For 24/7 autonomous operation without requiring a personal laptop to remain powered on:

### 1. Database Deployment (Cloudflare D1)
1. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```
2. Create D1 database instance:
   ```bash
   wrangler d1 create gmaps-production-db
   ```
3. Execute SQL schema migrations:
   ```bash
   wrangler d1 execute gmaps-production-db --file=migrations/0001_initial_schema.sql
   ```

### 2. Backend Worker Deployment (Cloudflare Workers)
1. Set encrypted secrets via Wrangler:
   ```bash
   wrangler secret put GEMINI_API_KEY
   wrangler secret put META_WA_ACCESS_TOKEN
   wrangler secret put META_WA_PHONE_NUMBER_ID
   wrangler secret put META_WA_WEBHOOK_VERIFY_TOKEN
   wrangler secret put SMTP_HOST
   wrangler secret put SMTP_USER
   wrangler secret put SMTP_PASS
   wrangler secret put GOOGLE_PLACES_API_KEY
   ```
2. Deploy the Hono backend worker:
   ```bash
   wrangler deploy
   ```

### 3. Frontend Deployment (Cloudflare Pages)
1. Build the production React bundle:
   ```bash
   npm --prefix client run build
   ```
2. Deploy the `client/dist` directory:
   ```bash
   wrangler pages deploy client/dist --project-name=gmaps-industrial
   ```

---

## 4. Option C: Docker Container Deployment (VPS / Cloud Server)

For standard Linux servers (AWS EC2, DigitalOcean, Hetzner, etc.):

```dockerfile
# Multi-stage Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
RUN npm --prefix shared install && npm --prefix shared run build
RUN npm --prefix server install && npm --prefix server run build
RUN npm --prefix client install && npm --prefix client run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/migrations ./migrations

EXPOSE 3001
CMD ["node", "server/dist/index.js"]
```

---

## 5. Background Queue & Durable Job Processing

The backend incorporates an autonomous, durable job worker (`jobWorker.ts`):
- **Atomic Lease Duration:** 60 seconds per job batch.
- **Orphan Recovery:** Automatically recovers jobs if a worker node crashes mid-send.
- **Exponential Backoff:** Retries transient failures with $30 \times 2^{\text{attempts}}$ seconds backoff.
- **Dead-Letter State:** Safely parks jobs exceeding 5 retries without blocking active queues.
