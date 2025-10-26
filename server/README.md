# Auth server

Small Express server that exposes a secure POST /api/login endpoint. It queries the `users` table in Supabase
using the service role key and returns a signed JWT when credentials are valid.

Setup

1. Copy `.env.example` to `.env` and fill the values (do NOT commit real secrets):

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
PORT=4000
```

2. Install dependencies and run:

```bash
cd server
npm install
npm start
```

Notes
- This server expects a `users` table with columns `id`, `user`, and `pass`.
- If `pass` contains a bcrypt hash it will be compared securely; otherwise it falls back to plaintext (for legacy/testing).
- For production, prefer storing password hashes only and never plaintext.
