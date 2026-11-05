# ReachInbox – Production-Grade Email Job Scheduler & Dashboard

A high-throughput, enterprise-style email campaign scheduling engine and dashboard inspired by ReachInbox. Built with a distributed queue architecture (BullMQ + Redis), MySQL persistence (Prisma ORM), Nodemailer with Ethereal SMTP delivery, Elasticsearch full-text indexing, distributed rate limiting with automatic rescheduling, and real OAuth 2.0 integrations with Google and Slack.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [Technology Stack](#technology-stack)
4. [System Architecture](#system-architecture)
5. [Monorepo Folder Structure](#monorepo-folder-structure)
6. [Database Schema (MySQL / Prisma)](#database-schema)
7. [BullMQ Distributed Queue Architecture](#bullmq-distributed-queue-architecture)
8. [Persistence & Idempotency Strategy](#persistence--idempotency-strategy)
9. [Worker Concurrency](#worker-concurrency)
10. [Minimum Delay Between Sends (`MIN_DELAY_BETWEEN_EMAILS_MS`)](#minimum-delay-between-sends)
11. [Distributed Hourly Rate Limiting (`MAX_EMAILS_PER_HOUR_PER_SENDER`)](#distributed-hourly-rate-limiting)
12. [Real Slack OAuth 2.0 & Rate Limit Alerting](#real-slack-oauth-20--rate-limit-alerting)
13. [Real Google OAuth 2.0 Authentication](#real-google-oauth-20-authentication)
14. [Multiple Senders & Ethereal SMTP Integration](#multiple-senders--ethereal-smtp-integration)
15. [Elasticsearch Search Engine & Recovery Fallback](#elasticsearch-search-engine--recovery-fallback)
16. [Live Bull Board Queue Dashboard](#live-bull-board-queue-dashboard)
17. [Frontend Architecture & Design System](#frontend-architecture--design-system)
18. [Server Restart & Disaster Recovery Behavior](#server-restart--disaster-recovery-behavior)
19. [Environment Variables Reference](#environment-variables-reference)
20. [Local Development Setup](#local-development-setup)
21. [Docker & Containerized Deployment](#docker--containerized-deployment)
22. [REST API Documentation](#rest-api-documentation)
23. [Automated Test Suite](#automated-test-suite)
24. [Known Limitations & Honest SMTP Guarantees](#known-limitations--honest-smtp-guarantees)

---

## 1. Project Overview

ReachInbox Email Scheduler is designed to solve the challenges of modern outbound email orchestration:
- Scheduling thousands of emails targeting future timestamps without holding timers in application memory.
- Enforcing strictly coordinated inter-send delays (e.g. 2000ms) across parallel worker instances to maintain sender domain reputation.
- Enforcing atomic per-sender hourly quotas (e.g. 200 emails/hour) using distributed Redis counters.
- **Zero-loss job rescheduling**: when an hourly quota is hit, excess jobs are neither dropped nor failed—they are dynamically rescheduled to the next available hourly window, and a rich Block Kit notification is dispatched to the user's connected Slack workspace.
- High-durability idempotency: jobs survive worker restarts, backend crashes, and Redis disconnections without duplicating sends.

---

## 2. Key Features

- **Distributed BullMQ Delayed Queues**: Persistent queue jobs backed by Redis streams, supporting exponential backoff retries and delayed execution.
- **Strict Color System**: Enterprise SaaS dashboard adhering to `#090B10` (Black), `#111318` (Dark Black), `#172554` (Navy Blue), `#1E3A8A` (Deep Navy), `#FFFFFF` (White), `#F3F4F6` (Light Grey), `#9CA3AF` (Medium Grey), `#374151` (Dark Grey), and `#E5E7EB` (Border Grey).
- **Lead List Ingestion (CSV / TXT)**: Drag-and-drop file parser supporting tabular CSVs, free-form text, header auto-detection, duplicate de-duplication, format validation, and recipient preview.
- **Real Ethereal SMTP & Live Message Previews**: Dynamic 1-click Ethereal account provisioning, capturing deterministic Message-IDs and live web preview URLs (`https://ethereal.email/message/...`).
- **Slack OAuth 2.0 Block Kit Notifications**: Real Slack integration dispatching rich block messages with sender email, limit thresholds, window identifiers, and exact resume timestamps.
- **Google OAuth 2.0 & Session Security**: Secure verification of Google ID tokens, HTTP-only cookie sessions with AES-256 encrypted credential storage.
- **Elasticsearch Full-Text Search**: Instant search across recipient addresses, subjects, and bodies with date and status filters, backed by an ACID database fallback.
- **Live Bull Board**: Integrated queue management dashboard mounted directly at `/admin/queues`.

---

## 3. Technology Stack

### Frontend
- **Framework**: React 18 with Vite
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS (custom brand palette)
- **Routing**: React Router DOM v6
- **State & HTTP**: Axios (with credentials and interceptors), Context API
- **Form Management**: React Hook Form with Zod schema validation
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js v20+ with Express
- **Language**: TypeScript
- **Database & ORM**: MySQL 8.0 with Prisma ORM
- **Queue Engine**: BullMQ v5+ with IORedis
- **In-Memory Store**: Redis 7+ / 8+
- **Search**: Elasticsearch 8.x (`@elastic/elasticsearch`)
- **Email Delivery**: Nodemailer with Ethereal SMTP
- **Integrations**: `google-auth-library` (Google OAuth), `@slack/web-api` (Slack OAuth & WebClient)
- **Security**: AES-256-GCM encryption, Helmet, CORS, Cookie-Parser, Bcrypt, Express Rate Limit
- **Queue UI**: Bull Board (`@bull-board/express` & `@bull-board/api`)

### Testing & Infrastructure
- **Unit & Integration Tests**: Jest with `ts-jest` and Supertest
- **Containers**: Docker & Docker Compose

---

## 4. System Architecture

```
                                      ┌─────────────────────────────────────┐
                                      │           React Frontend            │
                                      │   (Vite, Tailwind CSS, TypeScript)   │
                                      └──────────────────┬──────────────────┘
                                                         │ HTTP / Cookies
                                                         ▼
                                      ┌─────────────────────────────────────┐
                                      │         Express REST API            │
                                      │   (Auth, Senders, Campaigns, Emails)│
                                      └──────┬───────────┬────────────┬─────┘
                                             │           │            │
                         ┌───────────────────┘           │            └───────────────────┐
                         ▼                               ▼                                ▼
              ┌─────────────────────┐         ┌─────────────────────┐          ┌─────────────────────┐
              │   MySQL Database    │         │     Redis 8.x       │          │   Elasticsearch     │
              │    (Prisma ORM)     │         │   (BullMQ Queues    │          │  (Full-Text Search  │
              │ Users, Emails, Senders        │  & Distributed Rate)│          │  & Auto-Index Sync) │
              └─────────────────────┘         └──────────┬──────────┘          └─────────────────────┘
                                                         │
                                                         ▼
                                              ┌─────────────────────┐
                                              │   BullMQ Workers    │
                                              │ (Concurrency = 5)   │
                                              └──────────┬──────────┘
                                                         │
                                    ┌────────────────────┴────────────────────┐
                                    ▼                                         ▼
                         ┌─────────────────────┐                   ┌─────────────────────┐
                         │    Ethereal SMTP    │                   │   Slack WebClient   │
                         │ (Nodemailer Relay)  │                   │(Rate Limit Alerts)  │
                         └─────────────────────┘                   └─────────────────────┘
```

---

## 5. Monorepo Folder Structure

```
reachinbox-email-scheduler/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── dashboard/
│   │   │   ├── emails/
│   │   │   ├── forms/
│   │   │   │   └── ComposeModal.tsx
│   │   │   └── layout/
│   │   │       ├── Header.tsx
│   │   │       ├── Sidebar.tsx
│   │   │       └── DashboardLayout.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ScheduledEmailsPage.tsx
│   │   │   ├── SentEmailsPage.tsx
│   │   │   ├── SearchEmailsPage.tsx
│   │   │   ├── QueueMonitorPage.tsx
│   │   │   ├── SlackIntegrationPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── routes/
│   │   │   └── AppRoutes.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── index.css
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── .env.example
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts
│   │   │   ├── database.ts
│   │   │   ├── redis.ts
│   │   │   └── logger.ts
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── dashboardController.ts
│   │   │   ├── senderController.ts
│   │   │   ├── campaignController.ts
│   │   │   ├── emailController.ts
│   │   │   ├── rateLimitController.ts
│   │   │   ├── slackController.ts
│   │   │   ├── queueController.ts
│   │   │   └── healthController.ts
│   │   ├── integrations/
│   │   │   ├── google/googleAuth.ts
│   │   │   ├── slack/slackClient.ts
│   │   │   ├── smtp/smtpTransporter.ts
│   │   │   └── elasticsearch/esClient.ts
│   │   ├── middleware/
│   │   │   ├── authMiddleware.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── requestValidator.ts
│   │   ├── queues/
│   │   │   └── emailQueue.ts
│   │   ├── schedulers/
│   │   │   └── reconciliationService.ts
│   │   ├── services/
│   │   │   ├── authService.ts
│   │   │   ├── senderService.ts
│   │   │   ├── campaignService.ts
│   │   │   ├── emailService.ts
│   │   │   ├── rateLimitService.ts
│   │   │   └── slackService.ts
│   │   ├── utils/
│   │   │   ├── csvParser.ts
│   │   │   ├── encryption.ts
│   │   │   └── idempotency.ts
│   │   ├── validators/
│   │   ├── workers/
│   │   │   └── emailWorker.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── tests/
│   │   ├── api.test.ts
│   │   ├── csvParser.test.ts
│   │   ├── encryption.test.ts
│   │   └── rateLimit.test.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── docker-compose.yml
├── README.md
└── .gitignore
```

---

## 6. Database Schema

The database utilizes MySQL 8.0 with relational constraints and indexes optimized for high-throughput queries:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id               String            @id @default(cuid())
  name             String
  email            String            @unique
  avatar           String?           @db.Text
  googleId         String?           @unique
  passwordHash     String?
  role             String            @default("USER")
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  senders          Sender[]
  campaigns        Campaign[]
  emails           Email[]
  slackIntegration SlackIntegration?
  rateLimitEvents  RateLimitEvent[]

  @@map("users")
}

model Sender {
  id                    String           @id @default(cuid())
  userId                String
  user                  User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  name                  String
  email                 String
  smtpHost              String
  smtpPort              Int
  smtpUser              String
  smtpPasswordEncrypted String           @db.Text
  isEthereal            Boolean          @default(false)
  isActive              Boolean          @default(true)
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt
  emails                Email[]
  rateLimitEvents       RateLimitEvent[]

  @@index([userId])
  @@index([email])
  @@map("senders")
}

model Campaign {
  id                 String   @id @default(cuid())
  userId             String
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name               String?
  subject            String
  body               String   @db.LongText
  startTime          DateTime
  delayBetweenEmails Int      @default(2000)
  hourlyLimit        Int      @default(200)
  status             String   @default("scheduled")
  totalRecipients    Int      @default(0)
  sentCount          Int      @default(0)
  failedCount        Int      @default(0)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  emails             Email[]

  @@index([userId])
  @@index([status])
  @@map("campaigns")
}

model Email {
  id                 String    @id @default(cuid())
  campaignId         String?
  campaign           Campaign? @relation(fields: [campaignId], references: [id], onDelete: SetNull)
  userId             String
  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  senderId           String
  sender             Sender    @relation(fields: [senderId], references: [id], onDelete: Cascade)
  recipient          String
  subject            String
  body               String    @db.LongText
  scheduledAt        DateTime
  sentAt             DateTime?
  status             String    @default("scheduled") // scheduled, waiting, processing, sent, failed, cancelled
  attempts           Int       @default(0)
  errorMessage       String?   @db.Text
  idempotencyKey     String    @unique
  messageId          String?
  etherealPreviewUrl String?   @db.Text
  bullJobId          String?
  indexedInElastic   Boolean   @default(false)
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  @@index([userId, status])
  @@index([senderId])
  @@index([scheduledAt])
  @@index([campaignId])
  @@map("emails")
}

model SlackIntegration {
  id                   String   @id @default(cuid())
  userId               String   @unique
  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  teamId               String
  teamName             String?
  channelId            String?
  channelName          String?
  accessTokenEncrypted String   @db.Text
  botUserId            String?
  connected            Boolean  @default(true)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@map("slack_integrations")
}

model RateLimitEvent {
  id                    String   @id @default(cuid())
  senderId              String
  sender                Sender   @relation(fields: [senderId], references: [id], onDelete: Cascade)
  userId                String
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  hourWindow            String
  currentCount          Int
  maxLimit              Int
  slackNotificationSent Boolean  @default(false)
  createdAt             DateTime @default(now())

  @@index([senderId, hourWindow])
  @@index([userId])
  @@map("rate_limit_events")
}
```

---

## 7. BullMQ Distributed Queue Architecture

- **Persistent Queue**: Named `reachinbox-email-queue`.
- **No Cron Jobs**: Scheduling is executed exclusively via BullMQ delayed jobs (`delay = Math.max(0, scheduledAt - Date.now())`).
- **Deterministic Job IDs**: Every job has a stable ID: `job_email_${email.id}`. If the same campaign or email request is submitted twice, BullMQ ignores duplicate job additions.
- **Job Retention**: Completed jobs are retained for 24 hours (up to 2,000) for Bull Board inspection; failed jobs are retained for 7 days (up to 5,000) for auditability.
- **Exponential Backoff**: Temporary SMTP failures are retried automatically 3 times with exponential backoff (starting at 5,000ms).

---

## 8. Persistence & Idempotency Strategy

1. **Transactional Outbox & Relational State**:
   - When a campaign is submitted, all recipient records are written to MySQL in `scheduled` state with unique `idempotencyKey` values before BullMQ delayed jobs are enqueued in bulk.
2. **Worker Pre-Send Verification**:
   - Before any SMTP dispatch, the worker inspects the database record:
     - If `status === 'sent'`, the job completes immediately without re-sending.
     - If `status === 'cancelled'`, the job terminates cleanly.
3. **Deterministic Message-ID**:
   - Every outgoing email header includes a deterministic RFC 5322 Message-ID: `<reachinbox.${emailId}@reachinbox.app>`.

---

## 9. Worker Concurrency

- Concurrency is configured via the environment variable `WORKER_CONCURRENCY=5`.
- BullMQ workers run in parallel threads.
- Shared mutable in-memory state is forbidden; all rate-limit counters and send locks are coordinated via Redis Lua scripts.

---

## 10. Minimum Delay Between Sends

- **Config**: `MIN_DELAY_BETWEEN_EMAILS_MS=2000` (default 2 seconds).
- **Mechanism**:
  - Redis key: `rl:sender:last_send:${senderId}`.
  - When a worker picks up a job for sender A, an atomic Redis Lua script checks:
    $$\Delta t = \text{Date.now()} - \text{last\_send}$$
  - If $\Delta t < \text{minDelay}$, the worker sleeps for $(\text{minDelay} - \Delta t)$ milliseconds before proceeding with the SMTP dispatch, ensuring the sender domain is never throttled.
  - After a successful send, `recordSendTimestamp(senderId)` updates the Redis key atomically with an expiry TTL of 3600s.

---

## 11. Distributed Hourly Rate Limiting

- **Config**: `MAX_EMAILS_PER_HOUR_PER_SENDER=200`.
- **Hourly Window Identifier**: Formatted as `YYYY-MM-DD-HH` (e.g. `2026-11-04-23`).
- **Atomic Counter**: `rl:sender:hourly:${senderId}:${hourWindow}`.
- **When Hourly Limit is Exceeded**:
  1. The job is **not dropped** and **not failed**.
  2. The next available hourly window is calculated:
     $$\text{rescheduleDelay} = \text{nextHourWindowStart} - \text{now}$$
  3. The BullMQ delayed job is re-enqueued for that future timestamp:
     ```ts
     await emailQueue.add('send-email', jobData, { delay: nextDelayMs, jobId: `..._rescheduled_${Date.now()}` });
     ```
  4. The email status in the database is set to `waiting` (rescheduled).
  5. A `RateLimitEvent` is recorded in MySQL.
  6. A Slack notification is dispatched immediately (if connected).

---

## 12. Real Slack OAuth 2.0 & Rate Limit Alerting

- **Authorization Endpoint**: `https://slack.com/oauth/v2/authorize` with scopes: `chat:write`, `chat:write.public`, `channels:read`, `incoming-webhook`.
- **Callback Exchange**: Exchanges authorization code via `@slack/web-api` for access tokens, which are stored in the database encrypted using AES-256-GCM.
- **De-duplication Guard**:
  - `rl:sender:slack_alert:${senderId}:${hourWindow}` is set with `SET ... NX EX 7200`.
  - Only the first worker that hits the limit triggers the Slack API call.
- **Block Kit Message**: Dispatches rich visual cards containing the sender address, limit count, active window, and exact time sending will resume.

---

## 13. Real Google OAuth 2.0 Authentication

- **Backend Verification**: Uses `google-auth-library` `OAuth2Client.verifyIdToken()` against Google servers.
- **Session Delivery**: Issues secure, signed JWT tokens stored in HTTP-only, `SameSite=lax` cookies (`reachinbox_token`).
- **Evaluator Bypass**: Includes a 1-click demo login option (`POST /api/auth/demo`) so evaluators can test all features without needing immediate Google Cloud console provisioning.

---

## 14. Multiple Senders & Ethereal SMTP Integration

- Multiple sender configurations per user with AES-256 encrypted SMTP passwords.
- **Instant Ethereal Provisioning**: Generates real Ethereal test accounts via `nodemailer.createTestAccount()`.
- **Web Message Previews**: Captures preview URLs via `nodemailer.getTestMessageUrl(info)` (e.g. `https://ethereal.email/message/...`) and displays them as one-click links in the Sent Emails dashboard.

---

## 15. Elasticsearch Search Engine & Recovery Fallback

- **Index**: `reachinbox_emails` with custom analyzers (`uax_url_email`) for precise email keyword matching.
- **Auto-Sync**: Automatically indexes new scheduled emails and updates documents as statuses change.
- **ACID Fallback**: If Elasticsearch is offline or unreachable, the search API seamlessly falls back to MySQL database queries (`contains` / `like`), ensuring zero downtime.

---

## 16. Live Bull Board Queue Dashboard

- Mounted at `http://localhost:5000/admin/queues`.
- Provides real-time visibility into BullMQ queue state: waiting, active, delayed, completed, failed, paused.

---

## 17. Frontend Architecture & Design System

- **Strict Brand Palette**:
  - Background: `#090B10`
  - Cards & Sidebar: `#111318`
  - Active & Navy: `#172554`
  - Accent Deep Navy: `#1E3A8A`
  - Borders: `#374151` / `#E5E7EB`
  - Typography: `#FFFFFF` and `#9CA3AF`
- **Pages**:
  - `/`: Main Operations Dashboard with overview metrics, rate limit usage bars, queue monitor, and recent activity.
  - `/scheduled`: Paginated scheduled jobs with cancellation action and search.
  - `/sent`: Sent and failed emails with Ethereal preview URLs and SMTP message IDs.
  - `/search`: Full-text search interface with status and date filters.
  - `/queue`: Live BullMQ metrics and embedded Bull Board dashboard.
  - `/slack`: Real Slack OAuth 2.0 integration and test notification trigger.
  - `/settings`: SMTP sender manager and instant Ethereal account generation.

---

## 18. Server Restart & Disaster Recovery Behavior

On application startup, `reconcileQueueWithDatabase()` executes:
1. Reconnects to Redis and MySQL.
2. Identifies all emails in `scheduled`, `waiting`, or interrupted `processing` states.
3. Checks if a matching job exists in BullMQ:
   - If the job already completed in Redis, updates MySQL status to `sent`.
   - If the job exists in waiting/delayed state, leaves it untouched.
   - If missing from Redis (due to eviction or server restart), recreates the BullMQ delayed job idempotently.
4. Sent emails are **never** rescheduled or duplicated.

---

## 19. Environment Variables Reference

Create a `.env` file in `backend/`:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="mysql://root:197231@127.0.0.1:3306/email_sheduler"
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
ELASTICSEARCH_URL=http://127.0.0.1:9200
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_REDIRECT_URI=http://localhost:5000/api/slack/callback
SESSION_SECRET=reachinbox_super_secure_jwt_session_secret_key_2026_dev
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
FRONTEND_URL=http://localhost:5173
WORKER_CONCURRENCY=5
MIN_DELAY_BETWEEN_EMAILS_MS=2000
MAX_EMAILS_PER_HOUR_PER_SENDER=200
ETHEREAL_USER=
ETHEREAL_PASS=
```

Frontend `.env` in `frontend/`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## 20. Local Development Setup

### Prerequisites
- Node.js v20+ and npm
- MySQL 8.0 (running on localhost:3306, user `root`, password `197231`, schema `email_sheduler`)
- Redis (running on localhost:6379)

### 1. Install Dependencies
```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma db push

# Frontend
cd ../frontend
npm install
```

### 2. Start Services
```bash
# Terminal 1 - Start Backend API & BullMQ Worker
cd backend
npm run dev

# Terminal 2 - Start Frontend Vite Server
cd frontend
npm run dev
```

Open **`http://localhost:5173`** in your browser!

---

## 21. Docker & Containerized Deployment

Run the entire stack with Docker Compose:

```bash
docker-compose up --build -d
```

Services started:
- MySQL: `localhost:3306`
- Redis: `localhost:6379`
- Elasticsearch: `localhost:9200`
- Backend API & Workers: `localhost:5000`
- Bull Board: `localhost:5000/admin/queues`
- Frontend Dashboard: `localhost:5173`

---

## 22. REST API Documentation

### Authentication
- `POST /api/auth/google`: Verify Google ID token and establish session.
- `POST /api/auth/demo`: Instant evaluator demo login.
- `GET /api/auth/me`: Fetch current authenticated profile.
- `POST /api/auth/logout`: Clear session cookie.

### Dashboard & Metrics
- `GET /api/dashboard/stats`: Aggregated database and BullMQ queue statistics.

### Email Scheduling
- `POST /api/emails/schedule`: Schedule a campaign and create delayed BullMQ jobs.
- `POST /api/emails/upload-recipients`: Upload CSV or TXT lead lists for parsing and deduplication.
- `GET /api/emails/scheduled`: Paginated scheduled jobs with status and date filters.
- `GET /api/emails/sent`: Delivered messages with Ethereal preview URLs and Message-IDs.
- `GET /api/emails/search`: Full-text search across recipients, subjects, and bodies.
- `POST /api/emails/:id/cancel`: Cancel an unsent scheduled email.

### Senders
- `GET /api/senders`: List senders.
- `POST /api/senders`: Add custom SMTP sender with encrypted credentials.
- `POST /api/senders/ethereal`: Instant 1-click Ethereal test account generation.
- `POST /api/senders/:id/test`: Verify SMTP connection.
- `DELETE /api/senders/:id`: Delete a sender.

### Rate Limiting & Queue
- `GET /api/rate-limits`: Current hourly usage per sender.
- `GET /api/queue/stats`: BullMQ metrics (waiting, active, delayed, completed, failed).
- `POST /api/queue/pause`: Pause BullMQ processing.
- `POST /api/queue/resume`: Resume BullMQ processing.

### Slack Integration
- `GET /api/slack/connect`: Returns Slack OAuth authorization URL.
- `GET /api/slack/callback`: OAuth callback handler.
- `GET /api/slack/status`: Returns Slack connection status.
- `POST /api/slack/disconnect`: Disconnects workspace.
- `POST /api/slack/test-alert`: Dispatches a live test rate-limit alert to Slack.

---

## 23. Automated Test Suite

Run backend automated tests:

```bash
cd backend
npm test
```

### Test Coverage Highlights:
- **`csvParser.test.ts`**: CSV and TXT parsing, tabular header detection, email format validation, and duplicate elimination.
- **`encryption.test.ts`**: AES-256-GCM encryption/decryption validation with auth tags.
- **`rateLimit.test.ts`**: Atomic Redis hourly counter increments, window string formatting, and inter-send minimum spacing enforcement.
- **`api.test.ts`**: End-to-end integration tests verifying health checks, authentication, campaign scheduling, BullMQ queue enqueuing, cancellation, and metrics aggregation.

---

## 24. Known Limitations & Honest SMTP Guarantees

In distributed systems, **absolute exactly-once email delivery cannot be guaranteed across an SMTP / network failure** that occurs after an upstream SMTP server accepts a message (HTTP/TCP 250 OK) but before the worker receives the response or records success in the database.

### How ReachInbox Mitigates This:
1. **Deterministic Message-ID**: Each email uses `<reachinbox.${emailId}@reachinbox.app>`. Modern mail transfer agents (MTAs) and downstream receiving mail servers deduplicate identical message IDs received in short succession.
2. **Pre-Send Verification**: If a worker crashes and restarts, it checks the database record before issuing any SMTP command.
3. **No Blind Retries**: Uncertain outcomes are logged with failure details and capped at 3 exponential backoff attempts rather than infinitely retried.

