# ReachInbox Production Deployment Guide
**Stack: Vercel (Frontend) + Railway (Backend, Redis & MySQL Database)**

Your repository has already been pushed with the production configurations:
**GitHub Repository**: `https://github.com/PrasannaAchamatti/Email_Sheduler`

---

## PART 1: Deploy Backend, Database & Redis on Railway

Railway will host your Express API server, BullMQ background worker, MySQL database, and Redis broker in a single project.

### Step 1: Create a Railway Project
1. Go to [railway.app](https://railway.app) and sign in (using GitHub).
2. Click **"+ New Project"** -> Select **"Deploy from GitHub repo"**.
3. Choose your repository: `PrasannaAchamatti/Email_Sheduler`.
4. Railway will create a service from the repo. Do not deploy yet — first configure root directory:
   - Click on the newly created service.
   - Go to **Settings** -> **Source Directory**.
   - Change from `/` to `/backend`.

### Step 2: Add MySQL Database
1. In your Railway project canvas, click **"+ New"** (or press `Ctrl+K`).
2. Select **"Database"** -> **"Add MySQL"**.
3. Railway will provision a managed MySQL 8.0 instance within 10 seconds.

### Step 3: Add Redis Broker
1. In your Railway project canvas, click **"+ New"**.
2. Select **"Database"** -> **"Add Redis"**.
3. Railway will provision a managed Redis instance.

### Step 4: Configure Backend Environment Variables
1. Click on your **Backend service** -> Go to the **Variables** tab.
2. Click **"New Variable"** (or **"Add Reference"**):
   - `DATABASE_URL`: Click *Add Reference* -> Select `${{MySQL.DATABASE_URL}}`
   - `REDIS_URL`: Click *Add Reference* -> Select `${{Redis.REDIS_URL}}`
   - `NODE_ENV`: `production`
   - `SESSION_SECRET`: `reachinbox_super_secret_jwt_key_2026_production`
   - `ENCRYPTION_KEY`: `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`
   - `WORKER_CONCURRENCY`: `5`
   - `MIN_DELAY_BETWEEN_EMAILS_MS`: `2000`
   - `MAX_EMAILS_PER_HOUR_PER_SENDER`: `200`
   - `FRONTEND_URL`: `https://your-app.vercel.app` *(update once frontend is created)*

### Step 5: Generate Public Domain
1. In the backend service, go to **Settings** -> **Networking** -> **Public Networking**.
2. Click **"Generate Domain"**.
3. Railway gives you a public HTTPS URL like:
   `https://email-sheduler-production.up.railway.app`
4. Copy this backend URL! You can verify it immediately at:
   `https://<your-backend-url>/api/health`
   `https://<your-backend-url>/admin/queues/`

---

## PART 2: Deploy Frontend on Vercel

### Step 1: Import Project into Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **"Add New..."** -> **"Project"**.
3. Find and import `PrasannaAchamatti/Email_Sheduler`.

### Step 2: Configure Project Settings
1. **Framework Preset**: Select **Vite** (detected automatically).
2. **Root Directory**: Click **Edit** and set it to `frontend`.
3. **Environment Variables**:
   - Name: `VITE_API_URL`
   - Value: `https://<your-railway-backend-url>/api` *(your Railway backend URL from Part 1 with `/api`)*

### Step 3: Click "Deploy"
1. Vercel will build the React application and deploy it to a global edge network in ~30 seconds.
2. Vercel gives you a live URL like:
   `https://email-sheduler.vercel.app`

### Step 4: Link URLs
1. Copy your Vercel URL (`https://email-sheduler.vercel.app`).
2. Go back to your **Railway Backend service** -> **Variables**.
3. Set `FRONTEND_URL` = `https://email-sheduler.vercel.app`.
4. Railway will automatically redeploy the backend with the new CORS domain.

---

## Verification Checklist

Once both are deployed, check the following:
- [ ] Visit `https://<your-vercel-domain>/login`
- [ ] Sign in with your Gmail address
- [ ] Verify Dashboard statistics load from `https://<your-railway-domain>/api/dashboard/stats`
- [ ] Open Queue Monitor or visit `https://<your-railway-domain>/admin/queues/` to see Bull Board live
- [ ] Schedule a new email campaign and see BullMQ execute the delayed jobs
