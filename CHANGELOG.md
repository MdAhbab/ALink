# Changelog

All notable changes to ALink are documented here.

## [Unreleased] — 2026-06-16

A performance, footprint, and reliability pass: eliminated database N+1
patterns, removed dead dependencies and code, and made persisted preferences
actually take effect.

### Performance

- **Eliminated serialization-time N+1 across every list endpoint.** Job,
  booking, referral, mentorship, story, connection-request, comment, and chat
  list responses embed related users but previously loaded them lazily per
  row. They now eager-load relationships (`selectinload`), so each list is a
  small, fixed number of queries regardless of row count.
- **Recommenders.** `recommend_jobs` replaced 2×N per-job `COUNT` queries with
  two grouped aggregates and eager-loads the job poster; `recommend_people`
  replaced per-candidate connection lookups with a single adjacency-map build.
- **Job engagement folded into the `/jobs` payload** (likes/comments/likedByMe
  via three aggregate queries), removing the per-card
  `GET /jobs/{id}/engagement` request the client fired for every rendered card.
- **`chat/threads` batched** — members, last message, and unread counts are now
  fetched in three queries total instead of three per thread.

### Frontend footprint

- **Removed 29 unused runtime dependencies** (the entire MUI/Emotion stack,
  react-slick, react-responsive-masonry, react-dnd, react-popper/@popperjs, and
  18 Radix primitives backing unused wrappers); npm pruned 90 packages total. A
  reachability analysis confirmed only 28 runtime packages are actually used.
- **Deleted 27 dead `components/ui` wrappers** that nothing imported.
- **Lazy-loaded the admin route group**, moving Recharts out of the initial
  bundle: `index` chunk 1064 kB → 622 kB (313 kB → 195 kB gzipped).

### Reliability

- **Global session handling** — a token-bearing request that returns 401
  (revoked/expired token) now signs the user out instead of leaving a broken
  half-authenticated UI; persisted sessions are revalidated against `/users/me`
  on mount. `AuthProvider` memoizes its context value.
- **Chat unread counts now include AI replies.** AI messages have a NULL sender,
  which the `sender_id != me` filter silently dropped, so they never counted as
  unread and were never marked read. A shared predicate now treats them like any
  other incoming message across the serializer, thread list, and mark-read.

### UX

- **Appearance preferences now apply globally.** The "Reduce motion", "Density",
  and **accent** settings were persisted but never took effect; a
  `PreferencesGate` applies them at boot and on change (incl. Framer
  `MotionConfig` so JS animations honour reduce-motion). The accent picker now
  drives `data-accent`; "violet" keeps the theme-tuned default (lighter primary
  in dark mode). List entry-stagger delays are capped so long lists no longer
  animate in for seconds.

### Tooling & security

- **TypeScript is now type-checked.** The repo was configured for strict TS but
  never installed or ran it, so type errors shipped silently. Added `typescript`
  + the missing `@types/*`, a `vite-env.d.ts`, a `typecheck` script, and wired
  `tsc --noEmit` into `build`; fixed the 30 real errors it surfaced.
- **Patched dependency advisories** — react-router 7.13 → 7.17 (XSS / open
  redirect / DoS) and vite 6.3.5 → 6.4.3, both within their major ranges. The
  remaining esbuild advisory is dev-only and Deno-specific (only fixable via a
  vite v8 major bump) and is deliberately deferred.

### Cleanup

- Removed the cosmetic `app/controllers` and `app/views` MVC shims (pure
  re-exports); routers are included directly.
- Stopped tracking the transient SQLite WAL sidecar files (`*.db-wal`,
  `*.db-shm`).

## [Released] — 2026-06-08

A platform-wide pass that took ALink from a working prototype to a deployable,
event-driven product: fixed critical wiring bugs, eliminated static/mock data in
favour of the backend, added a RabbitMQ event architecture with worker
microservices, three machine-learning features, security hardening, and a
one-command native VM deployment for `https://aLink.ahbab.dev`.

### Added

**Event-driven architecture (RabbitMQ).**
- `backend/app/events/` — a durable topic exchange (`alink.events`) event bus
  (`pika`) with a non-blocking background publisher and a **graceful in-process
  fallback** when no broker is configured (local dev needs no RabbitMQ).
- `EventType` contracts + `DomainEvent` envelope (`events/contracts.py`).
- Event handlers (`events/handlers/`) for notifications/activity, achievements,
  and AI replies — shared by both the workers and the in-process fallback.
- Three worker microservices (`backend/app/workers/`): `notifications_worker`,
  `ai_worker`, `achievements_worker`, each binding its own durable queue.
- 14 producer events wired across the routers (connection/booking/referral/job/
  verification/mentorship/event/chat/registration).
- **Notifications, activity, and achievements are now generated by real user
  actions** (previously they only existed in seed data).

**Machine learning (`backend/app/ml/`, scikit-learn).**
- **ML‑1 People recommender** — content-based TF‑IDF + cosine similarity over
  profile documents, blended with a collaborative signal (mutual-connection
  Jaccard) and university/industry/mentor/verified boosts; returns `matchScore`
  + human-readable `reasons`. Surfaced at `GET /recommendations/people`.
- **ML‑2 Job recommender** — TF‑IDF/cosine of the student profile vs job
  documents + popularity prior (likes/comments) + recency decay; returns
  `matchScore` + `matchedSkills`. Surfaced at `GET /jobs/recommended`.
- **ML‑3 AI intent classifier** — TF‑IDF over **word + character** n-grams
  (char n-grams absorb typos) with nearest-example cosine + a confidence
  threshold; powers the async chat assistant. Optional Claude upgrade via
  `ANTHROPIC_API_KEY`.
- All ML modules degrade gracefully to heuristics if scikit-learn is absent.

**Deployment.**
- `run_onVM.py` — idempotent, native (no Docker) GCP-VM provisioner: system
  packages, PostgreSQL, RabbitMQ, backend venv, production frontend build,
  nginx (SPA + `/api` and `/static` reverse proxy), systemd units (API + 3
  workers), and HTTPS via certbot. Flags: `--domain`, `--email`, `--no-tls`,
  `--skip-system`, `--reset-db`, `--db`.

**Security & ops.**
- JWT **token-version revocation**: `User.token_version` is bumped on password
  change; old tokens are rejected (`/users/me/password` returns a fresh token).
- In-process **rate limiting** on `/auth/login` and `/auth/register`
  (10/min/IP, honouring `X-Forwarded-For`).
- **Upload magic-byte validation** (PNG/JPEG/GIF/WebP/PDF) — the real content
  type is sniffed instead of trusting the client `Content-Type`.
- `GET /health/ready` readiness probe (DB connectivity + broker status).

**Data / config.**
- `MentorApplication` model (records who applied; enables idempotent applies).
- PostgreSQL support (production), with new env vars: `environment`,
  `rabbitmq_url`, `events_exchange`, `anthropic_api_key`, `anthropic_model`.
- Canonical demo accounts seeded: `student@alink.app`, `alumni@alink.app`,
  `admin@alink.app` (password `password123`).
- This `CHANGELOG.md`.

### Changed

- **Frontend API base is environment-driven** (`VITE_API_URL`); a shared
  `apiUpload()` multipart helper replaces ad-hoc `fetch` calls.
- Database layer: SQLite now runs in **WAL mode with `foreign_keys=ON`**;
  PostgreSQL uses a pooled, pre-pinged engine.
- The chat AI reply is now produced **asynchronously** by `ai_worker` (off the
  request path) instead of a synchronous inline keyword function.
- Event attendance (`attending`) is **derived from RSVP rows on top of the seed
  base**, so it can no longer drift from reality.
- Mentorship "apply" is **idempotent** and preserves the seeded `filled` base.
- Config validates the runtime and **refuses to boot in production with the
  default JWT secret**.
- README rewritten to document the event-driven design, ML, and VM deployment.

### Fixed

- **Finder "Connect" button** threw `ReferenceError` (`apiRequest` was used but
  not imported).
- **Verification document upload** hit a non-existent `/api/uploads/...` path on
  a hardcoded `localhost` host → now uses the shared API base and correct path.
- **Demo login** used non-existent credentials and fabricated a fake token that
  broke every subsequent request → now logs into real seeded accounts.
- **Notifications** read/clear state was never persisted → the popover now calls
  the backend with optimistic updates.
- **Privacy leak**: `GET /users` exposed every user's GPA and phone → removed
  from the public schema (kept on `/users/me`).
- Student→alumni auto-reclassification was off-by-one (`<=` → `<`) and is no
  longer triggered by unrelated profile edits.
- Booking creation with `date`+`time` only (no `startsAt`) returned a hard 400 →
  now interpreted in the client's timezone.
- Bookings **Cancel / Reschedule / Withdraw / Feedback** buttons were dead →
  now wired to the API.
- Inbox "Conversations" showed fabricated data → now real `/chat/threads`.
- Raw ISO timestamps rendered as "2026‑…T… ago" → shared `timeAgo()` helper.
- Directory ignored the `showInDirectory` privacy preference → now respected.
- `graduation_year` was unvalidated → constrained to 1950–2035.
- Nullable FKs (`Job.posted_by_id`, `Referral.referrer_id`) lacked `ondelete` →
  now `SET NULL`.
- **Seed referential-integrity bug** (parents inserted after children) surfaced
  by enabling FK enforcement → fixed with ordered `flush()`es (would also have
  broken PostgreSQL).
- `mark_thread_read` now requires thread membership.
- Referral authorization precedence clarified with explicit parentheses.
- Removed a duplicate import and stale `mock.ts` docstrings; dropped the dead
  `setRole` destructure.

### Removed

- `frontend/src/app/lib/mock.ts` — all static demo data; every route now reads
  from the backend.
- Dead frontend code: `initialThreads`, `aiReply`, and the mock import in
  `chat.ts` (replaced with API-accurate types).
- Dead backend `_ai_reply` keyword function (superseded by the ML `ai_worker`).
- `AUDIT.md` — its findings are resolved and recorded in this changelog.

### Security

- JWT secret enforced in production; token revocation on password change.
- Auth rate limiting; upload content sniffing; GPA/phone privacy; directory
  visibility preference enforced.

### Known follow-ups (intentionally deferred)

- Server-side search pagination metadata (lists currently cap at 200; relevance
  ranking is handled by the recommenders).
- Alembic migrations (schema is currently managed by `create_all` + a small
  compatibility migration).
- Automated test suite and structured request logging.
