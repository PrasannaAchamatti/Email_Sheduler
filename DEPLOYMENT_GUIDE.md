# ReachInbox Production Deployment Guide
**Architecture: Vercel (Frontend) + Render (Backend API & BullMQ Worker) + Aiven (MySQL Database & Redis)**

This guide walks you through deploying the complete ReachInbox Email Job Scheduler stack across **Aiven**, **Render**, and **Vercel**.

---

## 📌 Architecture Overview

```
┌─────────────────────────────────┐
│     Vercel (Frontend)           │
│     React + Vite Edge CDN       │
│  https://your-app.vercel.app    │
└────────────────┬────────────────┘
                 │ REST API / CORS / Cookies
                 ▼
┌─────────────────────────────────┐
│     Render (Backend Web Service)│
│     Express + BullMQ Worker     │
│  https://backend.onrender.com   │
└───────────┬──────────────┬──────┘
            │              │
            ▼              ▼
┌──────────────────┐  ┌──────────────────┐
│   Aiven MySQL    │  │   Aiven Redis    │
│ Managed Database │  │ Persistent Queue │
└──────────────────┘  └──────────────────┘
```

---

## STEP 1: Set Up Database & Redis on Aiven (aiven.io)

### 1.1 Create Aiven MySQL
1. Go to **[aiven.io](https://aiven.io)** and log in or sign up.
2. In the console, click **"Create service"**.
3. Choose **MySQL**:
   - Cloud Provider: Choose any (e.g. AWS or GCP, nearest region to you).
   - Plan: **Free** (or Starter).
   - Service Name: `reachinbox-mysql` (or any name).
4. Click **"Create service"**.
5. Once running (1–2 minutes), look at the **Connection information** card:
   - Copy the **Service URI**.
   - It looks like:
     ```
     mysql://avnadmin:YOUR_PASSWORD@mysql-xxxx.a.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED
     ```
   - ⚠️ Save this as your `DATABASE_URL`.

### 1.2 Create Aiven Redis / Caching
1. In Aiven, click **"Create service"**.
2. Choose **Redis** (or Valkey / Caching):
   - Cloud Provider: Same region as MySQL.
   - Plan: **Free** (or Starter).
   - Service Name: `reachinbox-redis`.
3. Click **"Create service"**.
4. Once running, copy the **Service URI**:
   - It looks like:
     ```
     rediss://default:YOUR_PASSWORD@redis-xxxx.a.aivencloud.com:12345
     ```
   - ⚠️ Save this as your `REDIS_URL`.
   - *(Note: The `rediss://` protocol uses SSL/TLS encryption. The backend is already configured to connect securely with TLS).*

---

## STEP 2: Deploy Backend & BullMQ Worker on Render (render.com)

1. Go to **[render.com](https://render.com)** and log in with your GitHub account.
2. Click **"New +"** in the top navigation -> Select **"Web Service"**.
3. Select **"Build and deploy from a Git repository"** -> Connect your repository:
   **`PrasannaAchamatti/Email_Sheduler`**.
4. Configure the service settings:
   - **Name**: `reachinbox-backend`
   - **Region**: Nearest to your Aiven database region.
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && npx prisma generate && npm run build
     ```
   - **Start Command**:
     ```bash
     npx prisma db push && npm start
     ```
     *(Note: `npx prisma db push` will automatically create all tables in your Aiven database on the first boot).*

5. Add **Environment Variables** (under *Advanced* or *Environment Variables* tab):

   | Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production optimizations & secure cookies |
   | `DATABASE_URL` | `<Your Aiven MySQL URI>` | e.g. `mysql://avnadmin:pass@host:port/defaultdb?ssl-mode=REQUIRED` |
   | `REDIS_URL` | `<Your Aiven Redis URI>` | e.g. `rediss://default:pass@host:port` |
   | `SESSION_SECRET` | `reachinbox_super_secret_jwt_key_2026_production` | Strong random secret for authentication JWT |
   | `ENCRYPTION_KEY` | `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef` | 32-byte hex key for encrypting SMTP passwords |
   | `FRONTEND_URL` | `https://your-frontend.vercel.app` | Set initially or update after deploying Vercel |
   | `WORKER_CONCURRENCY` | `5` | BullMQ concurrent workers |
   | `MIN_DELAY_BETWEEN_EMAILS_MS` | `2000` | Minimum spacing delay between email sends |
   | `MAX_EMAILS_PER_HOUR_PER_SENDER` | `200` | Hourly rate limit |

6. Click **"Create Web Service"**.
7. Render will build the TypeScript code, push the schema to Aiven MySQL, start the Express API and BullMQ worker.
8. Once the deployment says **Live**, copy your Render URL:
   `https://reachinbox-backend.onrender.com`
9. Test your live backend:
   - Health check: `https://<your-render-url>/api/health`
   - Bull Board Live Queues: `https://<your-render-url>/admin/queues/`

---

## STEP 3: Deploy Frontend on Vercel (vercel.com)

1. Go to **[vercel.com](https://vercel.com)** and log in with GitHub.
2. Click **"Add New..."** -> **"Project"**.
3. Import **`PrasannaAchamatti/Email_Sheduler`**.
4. Configure Project:
   - **Framework Preset**: **Vite** (auto-detected).
   - **Root Directory**: Click **Edit** -> select **`frontend`** -> Click **Continue**.
   - **Build Command**: `npm run build` (default).
   - **Output Directory**: `dist` (default).
5. Add **Environment Variable**:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://<your-render-url>/api` *(Your Render backend URL with `/api`)*
6. Click **"Deploy"**.
7. In ~30 seconds, Vercel will deploy your frontend and assign a live HTTPS domain:
   `https://email-sheduler.vercel.app`

---

## STEP 4: Final Connection (Link Frontend Domain in Render)

1. Copy your Vercel domain: `https://<your-app>.vercel.app`.
2. Go back to your **Render dashboard** -> Click **`reachinbox-backend`** -> **Environment**.
3. Update or set:
   - `FRONTEND_URL` = `https://<your-app>.vercel.app`
4. Render will automatically redeploy with the updated CORS and cross-domain HTTP-only cookie configuration.

---

## ✅ Live Verification Checklist

Once completed:
1. Open your Vercel URL: `https://<your-app>.vercel.app`.
2. Sign in with your real Gmail address.
3. Check the Dashboard metrics (loaded from your live Aiven MySQL database).
4. Go to **Queue Monitor** in the sidebar to view your live Bull Board (powered by Aiven Redis).
5. Click **"Compose New Email"** -> Schedule an outreach campaign -> Watch BullMQ process the jobs live!

