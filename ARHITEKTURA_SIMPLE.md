# 🏗️ ARHITEKTURA - PravoLes

Jednostavna dokumentacija e-commerce arhitekture za lesene proizvode.

---

## 🎯 Pregled

```
Frontend (React/Next.js)
    ↓
API (Express/Node.js)
    ↓
Database (PostgreSQL)
    ↓
Storage (Cloudinary)
```

---

## 🛠️ Tech Stack

| Sloj | Tehnologija | Razlog |
|------|------------|--------|
| **Frontend** | Next.js + React | SSR, SEO optimiziran |
| **Backend** | Node.js + Express | Brz, fleksibilan |
| **Database** | PostgreSQL | ACID transakcije (važno za orders) |
| **Cache** | Redis | Brža iskanja, sessions |
| **Auth** | NextAuth.js | OAuth, JWT, easy setup |
| **Payment** | Stripe | Jednostavna integracija |
| **Email** | SendGrid | za order confirmations |
| **Storage** | Cloudinary | Slike + CDN |
| **Deploy** | Vercel + Railway | Brzo, cheap, scalable |

---

## 📊 Baza Podataka (11 Tablica)

```sql
1. users              -- Kupci i admini
2. categories         -- Kategorije proizvoda
3. products           -- Leseni artikli
4. product_variants   -- Varijacije (boje, veličine)
5. reviews            -- Ocjene korisnika
6. orders             -- Naročila
7. order_items        -- Što je u naročilu
8. payments           -- Stripe transakcije
9. cart                -- Privremena košarica
10. newsletters       -- Email lista
11. settings          -- Konfiguracija
```

---

## 🔗 API Endpoints (Glavne)

### Autentifikacija
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
```

### Proizvodi
```
GET    /api/products           -- Svi ("filter, sort, page)
GET    /api/products/:id       -- Jedan proizvod
GET    /api/categories         -- Kategorije
```

### Košarica
```
GET    /api/cart              -- Moja košarica
POST   /api/cart              -- Dodaj proizvod
DELETE /api/cart/:itemId      -- Ukloni
```

### Naročila
```
POST   /api/checkout          -- Kreiraj naročilo
GET    /api/orders            -- Moja naročila
GET    /api/orders/:id        -- Jedno naročilo
```

### Ocjene
```
GET    /api/products/:id/reviews    -- Ocjene proizvoda
POST   /api/products/:id/reviews    -- Dodaj ocjenu
```

---

## 🎨 Frontend Struktura

```
src/
├── pages/
│   ├── index.jsx           -- Domača
│   ├── products.jsx        -- Katalog
│   ├── [id].jsx            -- Detalji proizvoda
│   ├── cart.jsx            -- Košarica
│   ├── checkout.jsx        -- Checkout
│   └── profile.jsx         -- Moj profil
├── components/
│   ├── ProductCard.jsx
│   ├── Cart.jsx
│   ├── Navbar.jsx
│   └── Footer.jsx
├── hooks/
│   ├── useProducts.js      -- GET /api/products
│   ├── useOrders.js        -- GET /api/orders
│   └── useCart.js          -- Cart operations
├── store/                  -- Redux state
└── styles/
```

---

## 🔐 Varnost (Glavne Točke)

✅ **Autentifikacija**: NextAuth + JWT (15 min expiry)
✅ **Šifriranje**: PostgreSQL za sensitive data
✅ **Payments**: Stripe tokenization (nikad raw card data)
✅ **Rate Limiting**: 100 req/min per IP
✅ **HTTPS**: Automatski na Vercelu
✅ **CORS**: Samo dozvoljene domene
✅ **SQL Injection**: Parameterized queries (Prisma)
✅ **XSS Protection**: Content Security Policy headers

---

## 📈 Deployment (4 Koraka)

### 1. Development
```bash
npm install
npx prisma migrate dev
npm run dev
# http://localhost:3000
```

### 2. Staging (Test prije deploy-a)
```
GitHub → Vercel (auto deploy)
https://staging.pravoles.vercel.app
```

### 3. Production
```
GitHub main branch → Vercel
https://pravoles.si
```

### 4. Database
```
Supabase (PostgreSQL backup)
Railway (ako trebas dedicated server)
```

---

## 💰 Mjesečni Troškovi (MVP)

| Usluga | Cijena |
|--------|--------|
| Vercel | Free (do 100GB) |
| Supabase | Free (500MB DB) |
| Cloudinary | Free (10GB storage) |
| SendGrid | Free (100 emails/dan) |
| Stripe | 2.9% + €0.30 po transakciji |
| Domain | €5/god |
| **UKUPNO** | **~€50/месец** |

---

## 🚀 MVP Timeline (4-6 tjedana)

| Tjedan | Što Trebam Napraviti |
|--------|----------------------|
| 1-2 | Setup + Database + Auth |
| 2-3 | Produkti + Pretraživanje |
| 3-4 | Košarica + Checkout |
| 4-5 | Stripe integracija + Testiranje |
| 5-6 | Deploy + Launch |

---

## 🔍 Monitoring

### Što pratimo?
- API response time < 200ms
- Error rate < 0.1%
- Uptime > 99%
- Database connections

### Alati
- Vercel Analytics (built-in)
- Sentry (error tracking, free tier)
- Datadog (future, kada se skalira)

---

## 📧 Email Events

```
1. Registracija → Welcome email
2. Naročilo → Order confirmation
3. Shipping → Tracking number
4. Review → Thank you
5. Newsletter → Novosti i popusti
```

---

## 🧪 Testing Priorities

### Kritično testira:
✅ Authentifikacija
✅ Add to cart
✅ Checkout & payment
✅ Order creation

### Nice-to-have:
- Reviews
- Search filters
- Notifications

---

## 📱 Responsive Design

```
Desktop (1200px+)   → Normalno
Tablet (768px)      → 2 stupca proizvoda
Mobilni (320px)     → 1 stupac, burger menu
```

---

## 🔄 Kako Startati Project

### 1. Clone repo
```bash
git clone https://github.com/yourusername/PravoLes.git
cd PravoLes
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup database
```bash
# Kreiraj .env.local
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=random-string

# Run migrations
npx prisma migrate dev
```

### 4. Run dev server
```bash
npm run dev
# http://localhost:3000
```

### 5. Setup Stripe (plačanja)
```bash
# Kreiraj account na stripe.com
# Dodaj keys u .env.local
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

---

## 📝 Environment Variables

### Development (.env.local)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/pravoles
REDIS_URL=redis://localhost:6379
NEXTAUTH_SECRET=abc123def456abc123def456abc123def456
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
SENDGRID_API_KEY=SG.xxx
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=pravoles
```

### Production
```
Sve isto, samo production credentials
DATABASE_URL=postgresql://...@supabase.co
NEXTAUTH_URL=https://pravoles.si
```

---

## 🛑 Česta Pitanja

**P: Gdje se čuvaju slike?**
A: Cloudinary (CDN, auto optimize)

**P: Gdje se čuva database?**
A: Supabase PostgreSQL (backup, skalabilnost)

**P: Kako funkcionira plačanje?**
A: Stripe frontend token → Backend → Stripe API

**P: Što ako baza padne?**
A: Supabase automatski backup

**P: Kako dodati novi proizvod?**
A: Admin panel → POST /api/admin/products

---

## 📞 Kontakt & Support

- Info: info@pravoles.si
- Telefonski: +386 1 234 5678
- GitHub: https://github.com/yourusername/PravoLes

---

## 🔗 Važne Dokumentacije

- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Stripe Integration](https://stripe.com/docs)
- [Next.js Guide](https://nextjs.org/docs)
- [Prisma ORM](https://www.prisma.io/docs)
- [NextAuth Docs](https://next-auth.js.org/)

---

**Verzija**: 1.0
**Status**: Ready for MVP
**Zadnja Update**: April 2, 2026
