# PravoLes

Monorepo:
- `frontend/` — Vite + React SPA
- `backend/` — Next.js app router + Prisma (API + admin)

## Local dev

Backend (API on `http://localhost:3001`):
- `cd backend`
- `npm.cmd run dev`

Frontend (UI on `http://localhost:5173`):
- `cd frontend`
- set `VITE_BACKEND_URL=http://localhost:3001` (optional, defaults to same-origin)
- `npm.cmd run dev`
