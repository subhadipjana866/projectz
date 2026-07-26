# CollabHub — Backend (Express + Supabase)

Node/Express API for CollabHub. It handles the pieces that need server-side
secrets or third-party OAuth; the frontend talks to **Supabase directly** for
auth and most CRUD (users, creators, brands, projects, campaigns).

## What this server does

- **S3 uploads** — issues presigned PUT URLs so the browser can upload images.
- **YouTube OAuth + analytics** — connects a channel, caches analytics (24h).
- **Collaborations & chat** — send/accept/reject requests, list inbox/sent,
  chat messages (realtime is delivered by Supabase, not this server).
- **Profile provisioning** — `POST /api/profile/me/initialize` ensures the
  signed-in user has the `creators`/`brands` row their role requires.

Uses the Supabase **service-role** key ([db.js](db.js)), so it bypasses RLS —
keep it server-side only.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Environment variables
Copy `.env.example` to `.env` and fill in:
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` — Supabase project + service-role key
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — for YouTube OAuth
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_NAME`
- `FRONTEND_URL` (default `http://localhost:3000`), `PORT` (default `8000`)

### 3. Database migrations
Run these in the Supabase SQL editor, in order:
1. `core_tables_migration.sql` — provisioning triggers + integrity fixes for
   `creators`/`brands` (the app breaks without this).
2. `collaboration_migration.sql` — `collaboration_requests` + `chat_messages`
   (+ realtime publication).
3. `youtube_connections_migration.sql` — YouTube tokens + cached analytics.

### 4. Run
```bash
node server.js
```
API on `http://localhost:8000`. In dev the Vite frontend proxies `/api` here
(see `frontend/vite.config.js`), so no CORS setup is needed locally.

## Endpoints

| Method | Path | Purpose |
| ------ | ---- | ------- |
| POST | `/api/signUploadUrl` | Presigned S3 upload URL |
| POST | `/api/profile/me/initialize` | Provision creators/brands row (Bearer token) |
| GET | `/api/youtube/auth-url` | Start YouTube OAuth |
| GET | `/api/youtube/callback` | OAuth redirect target |
| GET | `/api/youtube/status` | Connection status |
| GET | `/api/youtube/analytics` | Cached/fresh analytics |
| DELETE | `/api/youtube/disconnect` | Disconnect channel |
| POST | `/api/collaborations` | Send a request |
| GET | `/api/collaborations/inbox` \| `/sent` \| `/chats` \| `/partners` | Lists |
| PATCH | `/api/collaborations/:id/accept` \| `/reject` | Update status |
| GET/POST | `/api/collaborations/:id/messages` | Chat messages |

## Notes / known limitations

- Most endpoints trust the `userId` query/body param (MVP). `initialize`
  verifies the Supabase access token. Adding shared auth middleware is a
  follow-up.
- Never commit `.env`. Use the service-role key on the server only.
