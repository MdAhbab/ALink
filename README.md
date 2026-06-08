<p align="center">
  <img src="https://img.shields.io/badge/ALink-Alumni%20%C3%97%20Student%20Network-7C5CFF?style=for-the-badge" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
</p>

# 🔗 ALink — Alumni-to-Student Career Network

> **ALink** is a full-stack networking platform that bridges the gap between alumni and students.  
> Students discover alumni mentors, request warm referrals, book career-guidance sessions, engage with job posts, and grow through community-driven activity — all in one place.

---

## ✨ Key Features

### 🎓 For Students
- **Alumni Discovery** — search and filter alumni by role, industry, university, and skills
- **Connection Requests** — send warm-intro requests with personal messages
- **Warm Referrals** — request referrals to top companies with resume uploads
- **Mentorship Booking** — schedule 1-on-1 sessions with alumni mentors
- **Job Board** — browse, like, and comment on opportunities posted by alumni
- **Verification** — submit ID cards to verify your student identity
- **Career Goals** — track your progress toward internship and networking milestones
- **Achievements** — earn badges for networking activity (Common → Legendary)

### 🏢 For Alumni
- **Job Posting** — share opportunities at your company with the student community
- **Mentorship Programs** — create structured mentoring tracks with limited spots
- **Referral Management** — review and forward referral requests
- **Success Stories** — share your career journey to inspire students

### 🛡️ For Admins
- **Dashboard Analytics** — real-time user, booking, referral, and verification stats
- **Verification Queue** — approve or reject student identity verification requests
- **Job Moderation** — approve, flag, or manage all job postings
- **User Management** — view, filter, and manage all platform users

### 💬 Shared Features
- **Real-time Chat** — DMs, group threads, and an AI assistant
- **Events** — RSVP to panels, mixers, workshops, and career fairs
- **Notifications** — stay informed about connections, bookings, and referrals
- **Settings** — email preferences, privacy toggles, theme customization
- **File Uploads** — upload ID cards, resumes, and avatars directly

---

## 🏗️ Architecture

```
Frontend & backend/
├── run.py                  ← One-command setup + launch (backend + frontend)
├── README.md               ← This file
│
├── run_onVM.py             ← Native GCP-VM deployment (nginx + systemd + TLS)
│
├── backend/                ← FastAPI REST API + event-driven workers
│   ├── app/
│   │   ├── main.py         ← FastAPI app, CORS, lifespan, static mount
│   │   ├── config.py       ← Pydantic-settings (env-driven, prod-safe)
│   │   ├── database.py     ← SQLAlchemy engine (SQLite WAL / PostgreSQL)
│   │   ├── models.py       ← ORM models (User, Job, Chat, etc.)
│   │   ├── schemas.py      ← Pydantic request/response contracts
│   │   ├── security.py     ← bcrypt hashing + JWT encode/decode
│   │   ├── deps.py         ← Auth dependency injection
│   │   ├── seed.py         ← Demo data seeder
│   │   ├── routers/        ← REST endpoint modules (incl. recommendations)
│   │   ├── events/         ← RabbitMQ event bus + contracts + handlers
│   │   ├── workers/        ← notifications / ai / achievements microservices
│   │   └── ml/             ← recommenders (TF-IDF) + AI intent classifier
│   ├── uploads/            ← User-uploaded files (auto-created)
│   ├── alink.db            ← SQLite database (local; PostgreSQL in prod)
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/               ← React + Vite + TypeScript
    ├── src/
    │   ├── app/
    │   │   ├── App.tsx
    │   │   ├── components/
    │   │   ├── routes/
    │   │   └── lib/
    │   └── main.tsx
    ├── package.json
    └── vite.config.ts
```

---

## 🛠️ Tech Stack

| Layer      | Technology                                              |
| ---------- | ------------------------------------------------------- |
| Frontend   | React 18, Vite 6, TypeScript, Tailwind CSS 4, Radix UI |
| Backend    | FastAPI, SQLAlchemy 2, Pydantic v2, python-jose (JWT)   |
| Database   | **SQLite** (local) · **PostgreSQL** (production)        |
| Messaging  | **RabbitMQ** (event-driven workers, in-process fallback)|
| ML         | **scikit-learn** (TF-IDF recommenders + intent model)   |
| Auth       | bcrypt password hashing + HS256 JWT bearer tokens       |
| Serving    | gunicorn + uvicorn workers, nginx, systemd, Let's Encrypt|
| Charts     | Recharts                                                |
| Animations | Motion (Framer Motion)                                  |

---

## 🗃️ Database — SQLite

ALink uses **SQLite** as its database — no external server required.

| Setting         | Default                     |
| --------------- | --------------------------- |
| Connection URL  | `sqlite:///./alink.db`      |
| File Location   | `backend/alink.db`          |
| Config File     | `backend/.env`              |
| Auto-seed       | Yes (on first empty boot)   |

The database is automatically created and seeded with demo data on the first run. To reset:

```bash
python run.py --reset
```

---

## 📡 API Endpoints

| Domain          | Endpoints                                                    |
| --------------- | ------------------------------------------------------------ |
| **Auth**        | `POST /auth/register`, `POST /auth/login`                    |
| **Users**       | `GET/PATCH /users/me`, `GET /users`, `GET /users/:id`        |
| **Connections** | `GET/POST /connections/requests`, accept/decline, remove      |
| **Bookings**    | CRUD at `/bookings`                                          |
| **Referrals**   | CRUD at `/referrals`                                         |
| **Jobs**        | CRUD + like/unlike, comments/replies, engagement stats        |
| **Events**      | `GET /events`, RSVP/cancel with capacity checks              |
| **Mentorship**  | `GET /mentorship/programs`, apply                            |
| **Chat**        | Threads, messages, AI auto-reply, pin/unpin, mark-read       |
| **Stories**     | `GET /stories`                                               |
| **Achievements**| `GET /achievements`                                          |
| **Goals**       | CRUD at `/goals`                                             |
| **Notifications**| list, mark-read, mark-all-read, clear                       |
| **Settings**    | `GET/PUT/PATCH /settings/prefs`                              |
| **Uploads**     | `POST /uploads/id-card`, `/uploads/resume`, `/uploads/avatar`|
| **Verifications**| request, submit docs, view status (student) + approve/reject (admin) |
| **Admin**       | stats, user management, job moderation                       |

Full Swagger docs available at `http://127.0.0.1:8000/docs` after starting the backend.

---

## 🔐 Auth Model

- **Registration** → returns JWT + user profile
- **Login** → returns JWT + user profile
- **Token format** — HS256 JWT with `sub` (user ID), `role`, `iat`, `exp`
- **Frontend storage** — `localStorage` under `alink:token`
- **All API requests** — `Authorization: Bearer <token>` header

---

## 🚀 How to Run

### Prerequisites

- **Python 3.11+** — [python.org](https://www.python.org/downloads/)
- **Node.js 18+** — [nodejs.org](https://nodejs.org/)

### Quick Start

From the project root (`Frontend & backend/`):

```bash
python run.py
```

That's it! The script will automatically:

1. ✅ Create `backend/.venv` (Python virtual environment)
2. ✅ Install/update backend dependencies from `requirements.txt`
3. ✅ Install/update frontend dependencies from `package-lock.json`
4. ✅ Create `backend/.env` from template (if missing)
5. ✅ Start the **backend** (FastAPI + Uvicorn) on `http://127.0.0.1:8000`
6. ✅ Start the **frontend** (Vite dev server) on `http://127.0.0.1:5173`
7. ✅ Auto-seed the database with demo data on first boot

### Demo Accounts

| Email                | Password      | Role    |
| -------------------- | ------------- | ------- |
| `student@alink.app`  | `password123` | Student |
| `alumni@alink.app`   | `password123` | Alumni  |
| `admin@alink.app`    | `password123` | Admin   |
| `alex@stanford.edu`  | `password`    | Student |
| `maya@stanford.edu`  | `password`    | Alumni  |

> The three `@alink.app` accounts back the landing page's one-click "Try the demo" buttons.

### Custom Ports

```bash
BACKEND_PORT=9000 FRONTEND_PORT=3000 python run.py
```

### Reset Database

```bash
python run.py --reset
```

### Stop

Press **`Ctrl + C`** to gracefully shut down both services.

---

## 🐇 Event-Driven Architecture (RabbitMQ)

User actions publish **domain events** to a durable `alink.events` topic exchange.
Independent **worker microservices** consume them — so notifications, achievements,
and AI replies happen off the request path:

```
 routers ──publish──▶  RabbitMQ (alink.events)  ──▶  notifications_worker  →  Notification + Activity
 (connection.requested,                          ├─▶  achievements_worker   →  awards badges
  booking.created, referral.*,                   └─▶  ai_worker             →  async ALink-AI reply
  job.approved, chat.message.created, …)
```

- **Producers:** `app/events/publish(...)` (non-blocking, called after commit).
- **Consumers:** `python -m app.workers.{notifications_worker,ai_worker,achievements_worker}`.
- **Graceful fallback:** if `rabbitmq_url` is unset/unreachable (local dev), events are
  handled **in-process** so notifications/activity/achievements/AI still work without a broker.

## 🤖 Machine Learning

| # | Feature | Algorithm | Endpoint / Surface |
|---|---------|-----------|--------------------|
| 1 | **People recommender** | Content-based **TF-IDF + cosine similarity** over profile documents, blended with a collaborative signal (mutual-connection Jaccard) + university/industry/mentor boosts | `GET /recommendations/people` → Finder "Top matches", Dashboards "For you" |
| 2 | **Job recommender** | TF-IDF/cosine of student profile vs job document + popularity prior (likes/comments) + recency | `GET /jobs/recommended` → Dashboard "Jobs for you" |
| 3 | **AI intent classifier** | TF-IDF over **word + character** n-grams (char n-grams absorb typos) with nearest-example cosine + confidence threshold | powers the chat assistant in `ai_worker` |

All three degrade gracefully (heuristic fallback) if scikit-learn is absent.

## 🚀 Deploy to a VM (native, no Docker)

`run_onVM.py` provisions the entire stack on a Debian/Ubuntu GCP VM — system
packages, PostgreSQL, RabbitMQ, the backend venv, the production frontend build,
nginx (SPA + `/api` proxy), systemd services (API + 3 workers), and HTTPS via
certbot:

```bash
# DNS A record for the domain must already point at the VM's external IP
sudo python3 run_onVM.py --domain aLink.ahbab.dev --email you@example.com
```

Useful flags: `--no-tls`, `--skip-system`, `--reset-db`, `--db sqlite`.
After it finishes, the app is live at `https://aLink.ahbab.dev` (API docs at `/api/docs`).

---

## 📜 License

This project is for educational and demonstration purposes.
