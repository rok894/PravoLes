# Brezplačni deploy: Vercel + Turso + Vercel Blob

Ta vodič te pripelje od lokalnega projekta do javno dostopne stran v ~30-45 min. Vse je na brezplačnih tier-jih.

## Kaj uporabljamo

| Kaj | Kje | Free tier |
|---|---|---|
| Backend (Next.js 16) | Vercel | Unlimited hobby |
| Frontend (Vite + React) | Vercel | Unlimited hobby |
| Baza (SQLite → Turso libsql) | turso.tech | 9 GB skupaj, 1B row reads/mes |
| Slike (custom orders) | Vercel Blob | 1 GB |
| Email | tvoj obstoječi SMTP | — |
| Stripe | stripe.com | pay-per-transaction |

---

## 1. Turso — kloniraj bazo v cloud

Turso uporablja isto SQLite shemo kot imamo lokalno. Ne potrebujemo spremeniti migracij.

### 1.1 Registracija + CLI

1. Pojdi na https://turso.tech/ → **Sign up** (GitHub)
2. Ustvari nov **Database**:
   - Ime: `pravoles`
   - Regija: `fra1` (Frankfurt — najbližje Sloveniji)
3. Namesti CLI (Windows PowerShell):
   ```powershell
   iwr -useb https://get.tur.so/install.ps1 | iex
   turso auth login
   ```

### 1.2 Potegni URL in token

```bash
turso db show pravoles --url
# npr. libsql://pravoles-<your-org>.turso.io

turso db tokens create pravoles
# eyJhbGciOi... (to je DATABASE_AUTH_TOKEN)
```

Zapiši oba — potrebuješ ju pri Vercel env varih.

### 1.3 Uporabi migracije na Turso bazo

```bash
cd backend

# Nastavi začasno env za migracijo
set DATABASE_URL=libsql://pravoles-<your-org>.turso.io
set DATABASE_AUTH_TOKEN=<token-iz-prejšnjega-koraka>

# Prisma migrate deploy aplicira vse obstoječe migracije
npx prisma migrate deploy
```

> **Opomba**: Če `migrate deploy` pri libsql:// ne deluje, lahko kot alternativo izvoziš lokalni SQL in ga naložiš:
> ```bash
> turso db shell pravoles < prisma/dev.db.sql
> ```
> Oziroma uporabi `turso db shell pravoles` interaktivno in izvedeš SQL ročno.

### 1.4 Ustvari admin uporabnika v Turso

Potrebuješ bcrypt hash za svoje geslo. Najlažje preko Node:

```bash
node -e "console.log(require('bcryptjs').hashSync('TVOJE_GESLO', 10))"
# kopiraj izhod
```

Potem:
```bash
turso db shell pravoles

# znotraj shella
INSERT INTO User (id, createdAt, updatedAt, email, passwordHash, role)
VALUES ('admin_seed', datetime('now'), datetime('now'), 'rok.otolani@gmail.com', '<bcrypt-hash>', 'ADMIN');
.exit
```

---

## 2. Vercel Blob — storage za custom order slike

1. Pojdi na https://vercel.com/dashboard/stores → **Create Database** → **Blob**
2. Ime: `pravoles-uploads`
3. Po kreaciji klikni **.env.local** tab in skopiraj `BLOB_READ_WRITE_TOKEN`

Ta token boš dal kot env var v backend projektu (korak 3.3).

---

## 3. Backend na Vercel

### 3.1 Push repo na GitHub

```bash
git add .
git commit -m "Prep for Vercel deploy"
git push
```

### 3.2 Import v Vercel

1. https://vercel.com/new → izberi svoj GitHub repo **PravoLes**
2. **Root Directory**: `backend`
3. **Framework Preset**: Next.js (auto-detected)
4. **Build Command**: `prisma generate && next build` (auto iz package.json)
5. Pred klikom **Deploy**, razširi **Environment Variables** in dodaj spodnje.

### 3.3 Environment Variables (backend)

| Ključ | Vrednost | Opomba |
|---|---|---|
| `DATABASE_URL` | `libsql://pravoles-...turso.io` | iz Turso |
| `DATABASE_AUTH_TOKEN` | `eyJ...` | iz Turso |
| `BLOB_READ_WRITE_TOKEN` | `vercel_blob_rw_...` | iz Vercel Blob |
| `CROSS_SITE_COOKIES` | `true` | **obvezno** — sicer login ne bo šel |
| `STRIPE_SECRET_KEY` | `sk_live_...` ali `sk_test_...` | |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | postavimo v koraku 5 |
| `NEXT_PUBLIC_BASE_URL` | `https://pravoles-api.vercel.app` | **po prvem deployu** posodobi z resničnim URL-jem |
| `FRONTEND_ORIGIN` | `https://pravoles.vercel.app` | URL frontenda (korak 4) |
| `NEXT_PUBLIC_FRONTEND_URL` | `https://pravoles.vercel.app` | isti URL |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | tvoji SMTP podatki | za emaile strankam |

Klikni **Deploy**. Po ~2 min imaš `https://pravoles-<nekaj>.vercel.app`.

### 3.4 Po deployu

Preveri `https://<backend-url>/api/health` — mora vrniti `{"ok":true}`.

---

## 4. Frontend na Vercel

### 4.1 Import

1. https://vercel.com/new → **Add New Project** → isti repo
2. **Root Directory**: `frontend`
3. **Framework**: Vite (auto)
4. **Output Directory**: `dist` (auto)

### 4.2 Environment Variables (frontend)

| Ključ | Vrednost |
|---|---|
| `VITE_BACKEND_URL` | `https://pravoles-api.vercel.app` (URL iz koraka 3) |

Deploy. Dobiš `https://pravoles-<nekaj>.vercel.app`.

### 4.3 Update backend `FRONTEND_ORIGIN`

Ko imaš frontend URL, se vrni v backend projekt:
**Settings → Environment Variables** → posodobi `FRONTEND_ORIGIN` in `NEXT_PUBLIC_FRONTEND_URL` na pravi frontend URL → **Redeploy** backend.

Če imaš več URL-jev (glavni + git branch previews), daj comma-separated list:
```
FRONTEND_ORIGIN="https://pravoles.vercel.app,https://pravoles-git-main-you.vercel.app"
```

---

## 5. Stripe webhook

Stripe mora pošiljati notifikacije na tvoj production backend URL.

1. https://dashboard.stripe.com/webhooks → **Add endpoint**
2. **Endpoint URL**: `https://pravoles-api.vercel.app/api/webhooks/stripe`
3. **Events to send**: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Po kreaciji skopiraj **Signing secret** (`whsec_...`) in ga vpiši v `STRIPE_WEBHOOK_SECRET` na backend Vercel projektu → **Redeploy**.

---

## 6. Test produkcije

1. Odpri frontend URL (`https://pravoles.vercel.app`)
2. **Kot gost**: oddaj custom order z sliko → preveri da se slika pojavi v Vercel Blob dashboardu
3. **Kot admin**: pojdi na `/admin` → prijavi se z emailom in geslom iz koraka 1.4
4. Postavi ceno na eno povpraševanje → kupec dobi email (če je SMTP nastavljen)
5. **Plačilo**: odpri čisto okno, prijavi se kot gost → odpri "Moja naročila" → "Sprejmi in plačaj" → Stripe test kartica `4242 4242 4242 4242`

---

## Custom domena (opcija, brezplačno)

Če imaš svojo domeno (npr. `pravoles.si`):

1. V frontend projektu: **Settings → Domains** → `pravoles.si`
2. V backend projektu: **Settings → Domains** → `api.pravoles.si`
3. Pri registrarju dodaj DNS zapise po navodilih Vercela (A + CNAME)
4. Posodobi env vars:
   - backend: `NEXT_PUBLIC_BASE_URL=https://api.pravoles.si`, `FRONTEND_ORIGIN=https://pravoles.si`, `NEXT_PUBLIC_FRONTEND_URL=https://pravoles.si`
   - frontend: `VITE_BACKEND_URL=https://api.pravoles.si`
5. Redeploy oba projekta
6. Posodobi Stripe webhook URL na `https://api.pravoles.si/api/webhooks/stripe`

---

## Znane omejitve brezplačnega tier-ja

- **Rate limiter** (`backend/src/lib/rateLimit.ts`) je in-memory → vsak serverless invoke ima svoj števec. Za hobby traffic je to ok, sicer je treba preseliti v Turso/Upstash.
- **Vercel Blob free 1 GB** — ~200-400 slik custom orderjev preden zmanjka. Redno čisti stare.
- **Turso free** — 9 GB in 1B row reads/mes je ogromno za to stran; ne boš imel težav.
- **Vercel hobby** — ne sme imeti komercialne rabe "podjetja". Če brat uporablja to kot podjetje, kasneje upgrade na Pro ($20/mes) ali prestavi na Hetzner/VPS (~4€/mes).

---

## Troubleshooting

**Login ne deluje, ni cookie-ja**
→ Preveri `CROSS_SITE_COOKIES=true` je v backend env. Odpri DevTools → Network → `/api/auth/login` → Response Headers → `Set-Cookie` mora imeti `SameSite=None; Secure`.

**CORS error pri fetchu**
→ Preveri `FRONTEND_ORIGIN` na backendu se popolnoma ujema z URL-jem v browserju (brez `/` na koncu, vključno s `https://`).

**Stripe webhook 400 `Invalid signature`**
→ `STRIPE_WEBHOOK_SECRET` mora biti iz **prav tega endpointa** v Stripe dashboardu (ne iz CLI). Po spremembi tega env vara — redeploy.

**Prisma napaka "The table X does not exist"**
→ Migracije niso bile aplicirane na Turso. Zaženi `npx prisma migrate deploy` z nastavljenima `DATABASE_URL` + `DATABASE_AUTH_TOKEN`.

**Upload slike vrne 503**
→ `BLOB_READ_WRITE_TOKEN` ni nastavljen ali napačen. Poglej Vercel → Storage → Blob → `.env.local` in skopiraj veljaven token.
