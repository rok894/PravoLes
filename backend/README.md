# PravoLes (Next.js backend)

This folder (`backend/`) is a standalone Next.js app that provides:
- PostgreSQL + Prisma models for products, carts, orders, payments
- Cart persisted in DB and linked to a HttpOnly cookie
- Stripe Checkout + webhook endpoints (optional)

## Local setup

1) Start Postgres:
```bash
docker compose up -d
```

2) Create `.env`:
- copy `backend/.env.example` to `backend/.env`
- adjust `DATABASE_URL` if needed

3) Run Prisma + seed:
```bash
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
```

4) Start the app:
```bash
npm run dev
```

Open `http://localhost:3000`.

## Stripe setup (optional)

Add to `web/.env`:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_BASE_URL` (e.g. `http://localhost:3000`)

Webhook endpoint:
- `POST /api/webhooks/stripe`

If you use Stripe CLI, you can forward events to local dev and copy the `whsec_...`:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
