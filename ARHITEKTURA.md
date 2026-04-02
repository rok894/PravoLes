# 🏗️ ARHITEKTURA - PravoLes

Dokumentacija celotne arhitekture sistema za spletno trgovino PravoLes.

---

## 📋 Vsebina

1. [Sistemska Arhitektura](#sistemska-arhitektura)
2. [Technology Stack](#technology-stack)
3. [Podatkovni Model](#podatkovni-model)
4. [API Endpoints](#api-endpoints)
5. [Frontend Struktura](#frontend-struktura)
6. [Diagrame](#diagrame)
7. [Tokovi Podatkov](#tokovi-podatkov)
8. [Varnost](#varnost)
9. [Performance & Caching](#-performance--caching)
10. [Database Optimization](#-database-optimization)
11. [Error Handling](#-error-handling--status-codes)
12. [Monitoring & Logging](#-monitoring--logging)
13. [Backup & Disaster Recovery](#-backup--disaster-recovery)
14. [CI/CD Pipeline](#-cicd-pipeline)
15. [Email & Notifications](#-email--notifications)
16. [Testing Strategy](#-testing-strategy)
17. [File Upload & CDN](#-file-upload--cdn)
18. [Analytics & Tracking](#-analytics--tracking)
19. [Rate Limiting](#-rate-limiting)
20. [Third-Party Integrations](#-third-party-integrations)
21. [Mobile App Strategy](#-mobile-app-strategy-future)
22. [Deployment Timeline](#-deployment-timeline)
23. [Cost Estimation](#-cost-estimation)
24. [Architecture Decision Records](#-architecture-decision-records-adr)
25. [Security Checklist](#-security-checklist)

---

## 🛠️ Technology Stack

### Backend

```
Runtime: Node.js 18+
Framework: Express.js 4.x
Database: PostgreSQL 14+
Cache: Redis 7.x
ORM: Prisma 5.x
Validacija: Zod / Joi
Authentikacija: NextAuth.js / JWT
Payment: Stripe API v10
Email: SendGrid / Resend
```

### Frontend

```
Framework: React 18+ / Next.js 14+
State Management: Redux Toolkit / Zustand
UI Library: Tailwind CSS 3.x
HTTP Client: Axios / TanStack Query
Forms: React Hook Form
Validacija: Zod
Testing: Jest / React Testing Library
E2E: Cypress / Playwright
Build Tool: Webpack (Next.js)
```

### DevOps

```
Version Control: Git / GitHub
CI/CD: GitHub Actions
Containerization: Docker (future)
Orchestration: Kubernetes (future)
Monitoring: Datadog / New Relic / Sentry
Logging: Winston / Pino
Process Manager: PM2 (production)
```

### Alternative Technologies

| Sloj | Izbor | Alternativa 1 | Alternativa 2 |
|------|-------|---------------|---------------|
| Backend | Express.js | Fastify | NestJS |
| Database | PostgreSQL | MySQL 8 | MongoDB |
| Cache | Redis | Memcached | Varnish |
| ORM | Prisma | TypeORM | Sequelize |
| State Mgmt | Redux Toolkit | Zustand | MobX |
| Frontend | React | Vue 3 | Svelte |
| CDN | Cloudinary | AWS S3 | Azure Blob |

---

## 🏛️ Sistemska Arhitektura

### Arhitekturni Vzorec: Monolithic → Microservices

**Phase 1 (MVP):** Monolithic (Frontend + Backend skupaj)
```
┌─────────────────────────────────────────┐
│         VERCEL/HOSTING                  │
├─────────────────────────────────────────┤
│         Frontend (Next.js)              │
│  - HTML, CSS, JavaScript                │
│  - User Interface                       │
├─────────────────────────────────────────┤
│    Backend (API Routes / Express)       │
│  - Business Logic                       │
│  - Database Queries                     │
│  - Authentication                       │
├─────────────────────────────────────────┤
│    Database (PostgreSQL / Supabase)     │
│  - Users                                │
│  - Products                             │
│  - Orders                               │
│  - Reviews                              │
└─────────────────────────────────────────┘
```

**Phase 2 (Scale):** Microservices
```
┌──────────────────────────────────────────────────────┐
│     Frontend (React SPA)                             │
└──────────────────────────────────────────────────────┘
           │                │                │
    ┌──────┴──────┐   ┌──────────┐   ┌──────┴──────┐
    ↓             ↓   ↓          ↓   ↓             ↓
┌────────┐  ┌────────┐  ┌─────────┐  ┌─────────┐
│Products│  │Orders  │  │Payments │  │Reviews  │
│Service │  │Service │  │Service  │  │Service  │
└────────┘  └────────┘  └─────────┘  └─────────┘
    │             │          │            │
    └─────────────┴──────────┴────────────┘
            │
    ┌───────┴──────────┐
    ↓                  ↓
┌─────────────┐  ┌──────────────┐
│ PostgreSQL  │  │ Redis Cache  │
└─────────────┘  └──────────────┘
```

---

## 📊 Podatkovni Model

### 1. **USERS** (Uporabniki)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,          -- Hashed
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(10),
    country VARCHAR(100),
    role ENUM('customer', 'admin', 'seller') DEFAULT 'customer',
    newsletter_subscribed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

### 2. **CATEGORIES** (Kategorije)

```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    parent_id UUID REFERENCES categories(id),
    display_order INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. **PRODUCTS** (Izdelki)

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    sku VARCHAR(50) UNIQUE,
    description TEXT,
    detailed_description TEXT,            -- Long description
    category_id UUID NOT NULL REFERENCES categories(id),
    
    -- Pricing
    price DECIMAL(10, 2) NOT NULL,
    cost_price DECIMAL(10, 2),           -- Stroški proizvodnje
    discount_price DECIMAL(10, 2),       -- Akcijska cena
    discount_percent INT,                -- Procent popusta
    
    -- Physical Info
    length DECIMAL(8, 2),
    width DECIMAL(8, 2),
    height DECIMAL(8, 2),
    weight DECIMAL(8, 2),
    material VARCHAR(100),               -- Les, barva, itd
    color VARCHAR(50),
    
    -- Inventory
    stock_quantity INT DEFAULT 0,
    low_stock_threshold INT DEFAULT 5,
    
    -- Media
    featured_image VARCHAR(500),
    images JSON,                         -- Array slik
    
    -- Metadata
    rating DECIMAL(3, 2) DEFAULT 0,
    review_count INT DEFAULT 0,
    view_count INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Eco/Info
    is_eco_friendly BOOLEAN DEFAULT TRUE,
    handmade BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4. **PRODUCT_VARIANTS** (Različice)

```sql
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    variant_name VARCHAR(100),           -- "Small", "Oak Wood", itd
    variant_value VARCHAR(100),
    
    sku VARCHAR(50),
    price DECIMAL(10, 2),
    stock_quantity INT,
    images JSON,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. **REVIEWS** (Ocene)

```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    user_id UUID NOT NULL REFERENCES users(id),
    
    rating INT CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT,
    helpful_count INT DEFAULT 0,
    
    verified_purchase BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 6. **ORDERS** (Naročila)

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Status
    status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    
    -- Amounts
    subtotal DECIMAL(10, 2),
    shipping_cost DECIMAL(10, 2),
    tax DECIMAL(10, 2),
    discount DECIMAL(10, 2),
    total_amount DECIMAL(10, 2) NOT NULL,
    
    -- Shipping
    shipping_address TEXT NOT NULL,
    shipping_method VARCHAR(50),
    tracking_number VARCHAR(100),
    
    -- Notes
    customer_notes TEXT,
    admin_notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    delivered_at TIMESTAMP,
    cancelled_at TIMESTAMP
);
```

### 7. **ORDER_ITEMS** (Postavke Naročila)

```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    
    product_name VARCHAR(200),           -- Snapshot
    product_sku VARCHAR(50),
    unit_price DECIMAL(10, 2),
    quantity INT NOT NULL,
    total_price DECIMAL(10, 2),
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 8. **PAYMENTS** (Plačila)

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    
    payment_method ENUM('stripe', 'paypal', 'bank_transfer') NOT NULL,
    stripe_payment_intent_id VARCHAR(255),
    
    amount DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'EUR',
    
    status ENUM('pending', 'succeeded', 'failed', 'refunded'),
    
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);
```

### 9. **CART** (Košarica - za seje)

```sql
CREATE TABLE cart (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),             -- Za anonimne
    
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    quantity INT NOT NULL,
    
    added_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, product_id)
);
```

### 10. **NEWSLETTERS** (Naročila na Novice)

```sql
CREATE TABLE newsletters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    subscribed_at TIMESTAMP DEFAULT NOW(),
    unsubscribed_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

### 11. **SETTINGS** (Nastavitve)

```sql
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔗 API Endpoints

### Authentication
```
POST   /api/auth/register           # Registracija
POST   /api/auth/login              # Prijava
POST   /api/auth/logout             # Odjava
POST   /api/auth/refresh            # Osvežitev tokena
GET    /api/auth/me                 # Trenutni uporabnik
```

### Products
```
GET    /api/products                # Vsi izdelki (filter, sort, paginate)
GET    /api/products/:id            # Podrobnosti izdelka
GET    /api/products/slug/:slug     # Izdelek po slug-u
POST   /api/products                # Novo (admin)
PUT    /api/products/:id            # Uredi (admin)
DELETE /api/products/:id            # Izbriši (admin)

GET    /api/categories              # Vse kategorije
GET    /api/categories/:id          # Kategorija
```

### Cart
```
GET    /api/cart                    # Moja košarica
POST   /api/cart                    # Dodaj v košarico
PUT    /api/cart/:itemId            # Uredi količino
DELETE /api/cart/:itemId            # Odstrani iz košarice
DELETE /api/cart                    # Počisti košarico
```

### Orders
```
GET    /api/orders                  # Moja naročila
GET    /api/orders/:id              # Podrobnosti naročila
POST   /api/checkout                # Kreiraj naročilo
PUT    /api/orders/:id/cancel       # Prekliči naročilo
GET    /api/orders/:id/track        # Sledenje
```

### Payments
```
POST   /api/payment/intent          # Kreiraj Stripe intent
POST   /api/payment/webhook         # Stripe webhook
```

### Reviews
```
GET    /api/products/:id/reviews    # Ocene za izdelek
POST   /api/products/:id/reviews    # Dodaj oceno
DELETE /api/reviews/:id             # Izbriši oceno
```

### Users
```
GET    /api/users/profile           # Moj profil
PUT    /api/users/profile           # Uredi profil
POST   /api/users/newsletter        # Naročam se
DELETE /api/users/newsletter        # Odnaročam se
```

### Admin
```
GET    /api/admin/dashboard         # Dashboard
GET    /api/admin/orders            # Vsa naročila
PUT    /api/admin/orders/:id        # Uredi naročilo
GET    /api/admin/products          # Vsi izdelki (admin)
POST   /api/admin/products          # Novo
GET    /api/admin/analytics         # Statistika
```

---

## 🎨 Frontend Struktura

```
frontend/
├── src/
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Header.jsx
│   │   │   ├── Footer.jsx
│   │   │   └── Navbar.jsx
│   │   ├── Products/
│   │   │   ├── ProductCard.jsx
│   │   │   ├── ProductGrid.jsx
│   │   │   └── ProductDetail.jsx
│   │   ├── Cart/
│   │   │   ├── CartList.jsx
│   │   │   └── CartSummary.jsx
│   │   ├── Checkout/
│   │   │   ├── ShippingForm.jsx
│   │   │   ├── PaymentForm.jsx
│   │   │   └── OrderConfirm.jsx
│   │   └── Common/
│   │       ├── Button.jsx
│   │       ├── Modal.jsx
│   │       └── Notification.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Products.jsx
│   │   ├── ProductDetail.jsx
│   │   ├── Cart.jsx
│   │   ├── Checkout.jsx
│   │   ├── Profile.jsx
│   │   ├── Orders.jsx
│   │   └── Admin/
│   │       ├── Dashboard.jsx
│   │       ├── Products.jsx
│   │       └── Orders.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useProducts.js
│   │   ├── useCart.js
│   │   └── useOrders.js
│   ├── services/
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── products.js
│   │   ├── orders.js
│   │   └── payment.js
│   ├── store/
│   │   ├── authSlice.js
│   │   ├── cartSlice.js
│   │   └── productsSlice.js
│   ├── styles/
│   │   ├── global.css
│   │   └── variables.css
│   └── App.jsx
├── public/
│   └── index.html
└── package.json
```

---

## 📈 Diagrame

### ERD (Entity-Relationship Diagram)

```
┌──────────────────┐
│     USERS        │
│──────────────────│
│ id (PK)          │
│ email            │
│ password         │
│ role             │
│ created_at       │
└──────────────────┘
       │     │
       │     └─────────────────────┐
       │                           │
       ↓                           ↓
┌──────────────────┐    ┌──────────────────┐
│    ORDERS        │    │    REVIEWS       │
│──────────────────│    │──────────────────│
│ id (PK)          │    │ id (PK)          │
│ user_id (FK)     │    │ product_id (FK)  │
│ status           │    │ user_id (FK)     │
│ total_amount     │    │ rating           │
│ created_at       │    │ comment          │
└──────────────────┘    └──────────────────┘
       │
       ↓
┌──────────────────┐
│  ORDER_ITEMS     │
│──────────────────│
│ id (PK)          │
│ order_id (FK)    │
│ product_id (FK)  │
│ quantity         │
│ unit_price       │
└──────────────────┘
       │
       ↓
┌──────────────────┐
│   PRODUCTS       │
│──────────────────│
│ id (PK)          │
│ name             │
│ category_id (FK) │
│ price            │
│ stock_quantity   │
│ created_at       │
└──────────────────┘
       │
       ↓
┌──────────────────┐
│  CATEGORIES      │
│──────────────────│
│ id (PK)          │
│ name             │
│ parent_id (FK)   │
└──────────────────┘
```

### Use Case Diagram

```
┌─────────────────┐
│   CUSTOMER      │
└─────────────────┘
        │
        ├─── Browse Products
        ├─── View Details
        ├─── Add to Cart
        ├─── View Cart
        ├─── Checkout
        ├─── Pay
        ├─── Track Order
        ├─── Write Review
        └─── Manage Profile

┌─────────────────┐
│   ADMIN         │
└─────────────────┘
        │
        ├─── Manage Products
        ├─── Manage Categories
        ├─── View Orders
        ├─── Update Orders
        ├─── View Analytics
        └─── Manage Users
```

---

## 🔄 Tokovi Podatkov

### Tok 1: Nakupovanje

```
1. User Browse (GET /api/products)
   ↓
2. View Product (GET /api/products/:id)
   ↓
3. Add to Cart (POST /api/cart)
   ↓
4. View Cart (GET /api/cart)
   ↓
5. Checkout (POST /api/checkout)
   ↓
6. Payment (POST /api/payment/intent)
   ↓
7. Order Confirmation (Email + DB)
   ↓
8. Track Order (GET /api/orders/:id/track)
```

### Tok 2: Admin Management

```
1. Login (POST /api/auth/login)
   ↓
2. Dashboard (GET /api/admin/dashboard)
   ↓
3. View Orders (GET /api/admin/orders)
   ↓
4. Update Order Status (PUT /api/admin/orders/:id)
   ↓
5. Send Email Notification
```

---

## 🔐 Varnost

### Authentication & Authorization

```
Frontend                          Backend
   │                                │
   ├─ POST /auth/login ─────────→  │
   │                                ├─ Verify email/password
   │                                ├─ Generate JWT Token
   │  ←─────── JWT Token ──────────┤
   │                                │
   │ Store in localStorage          │
   │                                │
   ├─ GET /products                 │
   │  (Header: Authorization: Bearer JWT)
   │                                ├─ Verify JWT
   │                                ├─ Get user info
   │  ←─────── Data ────────────────┤
```

### Security Headers

```javascript
// Middleware na backendu
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});
```

### Password Hashing

```javascript
// bcrypt za hash gesel
const hashedPassword = await bcrypt.hash(password, 10);

// Primerjava geslà
const isPasswordValid = await bcrypt.compare(password, hashedPassword);
```

### Payment Security (Stripe)

```javascript
// Never store raw credit card data!
// Use Stripe Elements for secure tokenization

const { stripeToken } = await stripe.createPaymentMethod({
    type: 'card',
    card: cardElement
});

// Send token to backend, not card data
```

---

## 🚀 Deployment Architecture

### Development
```
Local Machine
├─ Frontend: http://localhost:3000
├─ Backend: http://localhost:5000
└─ Database: Local PostgreSQL
```

### Production
```
Domain: pravoles.si

Frontend:
├─ Vercel (pravoles.si)
├─ CDN: Vercel Edge
└─ SSL: Automatic

Backend:
├─ Railway / Render / AWS
├─ Node.js Server
├─ Auto-scaling
└─ SSL: Let's Encrypt

Database:
├─ Supabase / AWS RDS
├─ PostgreSQL
├─ Backup: Daily
└─ Monitoring: DataDog

Storage:
├─ Images: Cloudinary
├─ CDN: Cloudinary Edge
└─ Auto-optimization
```

---

## ⚡ Performance & Caching

### Redis Cache Strategy

```javascript
// Primeri cache-anja
1. Product List (30 min TTL)
   GET /api/products?category=mize
   → Check Redis cache
   → If miss: Query DB + cache result

2. Product Detail (1 hour TTL)
   GET /api/products/:id
   → Check Redis
   → Cache product + reviews

3. Category List (24 hour TTL)
   GET /api/categories
   → Rarely changes, long cache

4. User Cart (Session based)
   GET /api/cart
   → Redis session store
   → Fast retrieval
```

### HTTP Caching Headers

```javascript
// Frontend resources
Cache-Control: public, max-age=31536000, immutable  // JS/CSS

// API responses
Cache-Control: private, max-age=300, must-revalidate  // 5 min

// Images
Cache-Control: public, max-age=604800, immutable  // 1 week
ETag: "abc123"
```

### Frontend Optimization

```
- Code Splitting: Lazy loading komponent
- Image Optimization: WebP, responsive images
- Minification: CSS, JS, HTML
- Gzip Compression
- Service Worker: Offline support
```

---

## 🗄️ Database Optimization

### SQL Indexes

```sql
-- Products Table
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_price ON products(price) WHERE is_active = TRUE;
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_active_featured ON products(is_active, is_featured);

-- Orders Table
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Reviews Table
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- Cart Table
CREATE INDEX idx_cart_user_id ON cart(user_id);
CREATE INDEX idx_cart_session_id ON cart(session_id);

-- Full-text search
CREATE INDEX idx_products_search ON products USING GIN(
    to_tsvector('english', name || ' ' || description)
);
```

### Query Optimization

```sql
-- Slaba (N+1 problem)
SELECT * FROM orders;
-- Then loop: SELECT * FROM order_items WHERE order_id = ...

-- Dobra (Join)
SELECT o.*, oi.* 
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.user_id = $1;

-- Very Dobra (с agregacijo)
SELECT o.id, COUNT(oi.id) as item_count, SUM(oi.total_price) as total
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id;
```

---

## ⚠️ Error Handling & Status Codes

### HTTP Status Codes

```javascript
200 - OK                          // Uspešno
201 - Created                     // Novo kreirano
204 - No Content                  // Uspešno, no content

400 - Bad Request                 // Napačni parametri
401 - Unauthorized                // Niste prijavljeni
403 - Forbidden                   // Nimate pravic
404 - Not Found                   // Ne obstaja
409 - Conflict                    // Že obstaja (duplicate)
422 - Unprocessable Entity        // Validacija failed

500 - Internal Server Error       // Napaka na serverju
503 - Service Unavailable         // Server down
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_EMAIL",
    "message": "Email je nepravilen",
    "details": {
      "field": "email",
      "expected": "valid email format"
    }
  }
}
```

### Validacija (Frontend + Backend)

```javascript
// Frontend validacija
const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Backend validacija (vedno!)
app.post('/api/users', (req, res) => {
  const { email } = req.body;
  
  if (!email || !validateEmail(email)) {
    return res.status(400).json({
      error: 'Invalid email format'
    });
  }
  // Procesiraj...
});
```

---

## 📊 Monitoring & Logging

### Logging Strategy

```javascript
// Logger Setup
const logger = require('winston');

logger.info('Server started', { port: 5000 });
logger.warn('Low stock', { product_id: 123, quantity: 2 });
logger.error('Payment failed', { order_id: 'abc', error: err.message });

// Log Levels
- debug: Development info
- info: General info
- warn: Warnings
- error: Errors
```

### Monitoring Stack

```
┌─────────────────────────────────┐
│  Application Logs               │
├─────────────────────────────────┤
│ Winston/Pino → LogRocket/Sentry │
│              ↓                  │
│          Datadog/New Relic       │
└─────────────────────────────────┘

Metrics:
- Response time
- Error rate
- CPU/Memory usage
- Database connections
- Active users
```

### Alert Rules

```
- Error rate > 1% → Alert
- Response time > 2s → Alert
- Server down → Immediate alert
- Database CPU > 80% → Alert
- Disk space < 20% → Alert
```

---

## 💾 Backup & Disaster Recovery

### Backup Strategy

```
Database Backups:
├─ Hourly: Last 24 hours (Supabase automated)
├─ Daily: Last 7 days
├─ Weekly: Last 4 weeks
└─ Monthly: Last 12 months

File Backups (Cloudinary):
├─ Automatic versioning
├─ CDN redundancy
└─ Multi-region replication
```

### Disaster Recovery Plan

```
Recovery Time Objective (RTO): < 15 minutes
Recovery Point Objective (RPO): < 1 hour

Failover:
1. Database: Master-slave replication
2. Frontend: Multi-region Vercel
3. Files: Cloudinary CDN
4. Email: SendGrid backup
```

---

## 🚀 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
name: Deploy PravoLes

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run linter
        run: npm run lint
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: vercel/action@v5
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

### Deployment Stages

```
Local Dev → GitHub Push → Tests & Lint → Deploy Staging → Deploy Production

✓ Unit Tests
✓ Integration Tests
✓ E2E Tests
✓ Code Review (PR)
✓ Build Check
✓ Performance Check
→ Merge & Deploy
```

---

## 📧 Email & Notifications

### Email Service (SendGrid / Resend)

```javascript
// Primeri emailov
- Registracija: Potrdi email
- Naročilo: Potrdilo naročila
- Shipping: Skladišče + tracking
- Review: Povabilo za oceno
- Newsletter: Novice
- Account: Password reset
```

### Email Templates

```
emails/
├── welcome.html
├── order-confirmation.html
├── shipping-notification.html
├── review-request.html
├── newsletter.html
└── password-reset.html
```

### Notification Stack

```
Trigger Event
    ↓
- Order Created → Send email + SMS
- Payment Success → Email + In-app notification
- Review Posted → Admin alert + Author notification
- Inventory Low → Admin alert
- Newsletter → Bulk send (SendGrid)
```

---

## 🧪 Testing Strategy

### Test Types

```
Unit Tests (Jest)
├── Services: api calls, business logic
├── Utilities: helper functions
├── Validators: email, phone, etc
└── Hooks: React hooks (react-testing-library)

Integration Tests
├── Database queries
├── API endpoints
├── Authentication flow
└── Payment process

E2E Tests (Cypress / Playwright)
├── Full user journey
├── Search & filter
├── Add to cart
├── Checkout process
└── Order tracking
```

### Test Coverage Goals

```
- Services: 90%+ coverage
- Components: 70%+ coverage
- Overall: 80%+ coverage

Critical paths (100%):
- Authentication
- Payment flow
- Order creation
- Database operations
```

---

## 🖼️ File Upload & CDN

### Image Upload Flow

```
Frontend
    ↓
Cloudinary Upload Widget
    ↓
Cloudinary (Process & Optimize)
    ├─ Resize: 1200x1200, 600x600, 300x300
    ├─ Format: WebP (primary), JPEG (fallback)
    ├─ Quality: Auto-optimize
    └─ Compression
    ↓
CDN Distribution (Global)
    ↓
Frontend (Fast delivery)
```

### Image URLs

```javascript
// Original upload
https://res.cloudinary.com/pravoles/image/upload/v1234/miza.jpg

// Optimized variants
// Thumbnail: 300x300
https://res.cloudinary.com/pravoles/image/upload/w_300,h_300,c_fill/v1234/miza.jpg

// Main: 600x600
https://res.cloudinary.com/pravoles/image/upload/w_600,h_600,c_fill/v1234/miza.jpg

// WebP format
https://res.cloudinary.com/pravoles/image/upload/w_600,f_webp/v1234/miza.jpg
```

---

## 📈 Analytics & Tracking

### Google Analytics Events

```javascript
// Add to cart
gtag('event', 'add_to_cart', {
  product_id: '123',
  product_name: 'Lesena miza',
  price: 599
});

// Purchase
gtag('event', 'purchase', {
  transaction_id: 'order-123',
  value: 599,
  currency: 'EUR',
  items: [...]
});

// View product
gtag('event', 'view_item', {
  product_id: '123',
  product_name: 'Lesena miza'
});
```

### Custom Dashboards

```
Metrics za sledenje:
- Visits & Page Views
- Bounce Rate
- Conversion Rate (Users → Buyers)
- Average Order Value
- Top Products
- Traffic Sources
- Mobile vs Desktop
- Device/Browser stats
```

---

## 🛡️ Rate Limiting

### API Rate Limits

```javascript
// Per IP
- 100 requests / minute (general)
- 10 requests / minute (search)
- 5 requests / minute (login)

// Per User
- 1000 requests / hour (authenticated)
- 500 requests / hour (checkout)

// Per Endpoint
GET /api/products → 1000/hour
POST /api/checkout → 50/hour
POST /api/auth/login → 5/minute
```

### Implementation

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,      // 15 minutes
  max: 100,                        // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});

app.use('/api/', limiter);
```

---

## 🔄 Third-Party Integrations

### Payment Processing (Stripe)

```
Stripe API
├─ Create payment intent
├─ Handle webhooks
├─ Dispute management
├─ Refunds
└─ Analytics
```

### Email Service (SendGrid)

```
SendGrid API
├─ Send emails
├─ Email templates
├─ Bounce handling
├─ Unsubscribe management
└─ Analytics
```

### Analytics (Google Analytics)

```
GA4
├─ Event tracking
├─ User tracking
├─ Ecommerce events
├─ Conversion tracking
└─ Custom dashboards
```

### Social Media

```
Facebook Pixel
- Add to cart event
- Purchase event
- Custom conversions

Instagram
- Product tags
- Shopping features
- Stories ads
```

---

## 📱 Mobile App Strategy (Future)

### React Native App

```
Reuse:
- API clients (shared code)
- Business logic
- State management (Redux)

Platform-specific:
- Navigation (React Navigation)
- UI components (Native components)
- Storage (AsyncStorage)
- Camera/Gallery
- Notifications (Push)
```

---

## � Deployment Timeline

### Phase 1: MVP (4-6 tednov)
```
Week 1-2: Setup & Development
├─ Project setup (Next.js, Supabase)
├─ Database schema creation
├─ Authentication implementation
└─ CI/CD pipeline setup

Week 2-4: Core Features
├─ Product catalog & search
├─ Shopping cart
├─ Stripe integration
└─ Order management

Week 4-5: Polish & Testing
├─ UI/UX refinement
├─ Performance optimization
├─ Security audit
└─ E2E testing

Week 6: Launch
├─ Staging deployment
├─ Soft launch (friends & family)
└─ Production release
```

### Phase 2: Enhancement (8-12 tednov)
```
├─ Admin dashboard
├─ Advanced analytics
├─ Email notifications
├─ Newsletter system
└─ Mobile app (React Native)
```

---

## 💰 Cost Estimation

### Monthly Costs (MVP)

| Storitev | Starter | Growth | Pro |
|----------|---------|--------|-----|
| **Hosting** | | | |
| Vercel | Free | $20 | $150 |
| Railway/Render | $5 | $50 | $500 |
| | | | |
| **Database** | | | |
| Supabase | Free | $25 | $150+ |
| | | | |
| **Storage** | | | |
| Cloudinary | Free | $84 | $500+ |
| | | | |
| **Email** | | | |
| SendGrid | Free | $30 | $300 |
| | | | |
| **Payment** | | | |
| Stripe | 2.9% + €0.30 per transaction | | |
| | | | |
| **Monitoring** | | | |
| Sentry | Free | $29 | $500+ |
| | | | |
| **Other** | | | |
| Domain | €5 | €5 | €5 |
| SSL | Free | Free | Free |
| | | | |
| **TOTAL** | €30-50 | €200-300 | €1,500+ |

### One-time Costs

```
- Development: 200-300 hours @ €50/h = €10,000-15,000
- Design: Minimal (template) or €3,000-5,000
- Domain registration: €10-20
- Legal/Setup: €200-500
```

---

## 🏗️ Architecture Decision Records (ADR)

### ADR-001: Monolithic MVP → Microservices

**Problem**: Scale početnog sistema bez velikih refaktoriranja

**Decision**: Start with monolithic (Next.js), plan microservices

**Rationale**:
- ✅ Brže zajedničke lansiranje
- ✅ Lakša debugging i development
- ✅ Jednostavnije upravljanje dependencijama
- ⚠️ Potencijalni bottlenecks na scaling

**Timeline**: Microservices nakon 10-20k MRR

---

### ADR-002: PostgreSQL vs MongoDB

**Problem**: Izbor baze podataka

**Decision**: PostgreSQL

**Rationale**:
- ✅ ACID transactions (važno za orders/payments)
- ✅ Complex queries & joins
- ✅ Strong data integrity
- ✅ Better for financial data
- ⚠️ Less flexible schema

---

### ADR-003: Authentication: NextAuth vs JWT

**Problem**: Izbor authentication strategije

**Decision**: NextAuth.js (OAuth2 + JWT)

**Rationale**:
- ✅ Built-in social login (Google, GitHub)
- ✅ Type-safe
- ✅ No need to manage tokens manually
- ✅ CSRF protection out of box

---

### ADR-004: Frontend State Management

**Problem**: Upravljanje aplikacijskom stanjem

**Decision**: Redux Toolkit + React Query

**Rationale**:
- Redux: Global state (auth, settings)
- React Query: Server state (products, orders)
- ✅ Separation of concerns
- ✅ Better performance
- ✅ Easier caching

---

## 🔒 Security Checklist

### Authentication & Authorization
- [ ] Gesla su hashana (bcrypt, min 10 rounds)
- [ ] JWT token ima expiration (15 min access, 7 day refresh)
- [ ] Rate limiting na login (5 attempts / 15 min)
- [ ] Secure password reset (token + email verification)
- [ ] Role-based access control (RBAC)
- [ ] Admin endpoints su zaštićeni

### API Security
- [ ] SSL/TLS na svim komunikacijama
- [ ] CORS je pravilno konfiguriran
- [ ] API rate limiting (100 req/min per IP)
- [ ] Input validation na svim endpoints
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection (Content Security Policy)
- [ ] CSRF tokens na forms
- [ ] API versioning (/api/v1/)

### Data Protection
- [ ] Osjetljivi podatki su encrypted (PII, payments)
- [ ] Database backups su encrypted
- [ ] Logs ne sadrže sensitive data
- [ ] PII se briše nakon retention period
- [ ] GDPR compliance (right to delete)

### Payment Security
- [ ] Nikad ne sprema raw credit card data
- [ ] Koristi Stripe tokenization
- [ ] PCI DSS compliance
- [ ] Webhook signatures se provjeravaju
- [ ] SSL pinning (future mobile app)

### Infrastructure Security
- [ ] WAF (Web Application Firewall)
- [ ] DDoS protection
- [ ] Server firewall properly configured
- [ ] SSH keys instead of passwords
- [ ] Environment variables (ne u kodu)
- [ ] Regular security updates
- [ ] Penetration testing quarterly

### Monitoring & Incident Response
- [ ] Security logs su centralizirani
- [ ] Alerts za suspicious activity
- [ ] Incident response plan postoji
- [ ] Regular security audits
- [ ] Vulnerability scanning (OWASP)

---

## 🗣️ Komunikacija med Teamom

### Documentation
```
- API docs: OpenAPI 3.0 / Swagger UI
- Architecture: This document + Wiki
- Database: SQL schema + ER diagrams
- Frontend: Storybook + Component library
- Deployment: Runbooks + Wiki
- Decisions: ADRs (Architecture Decision Records)
```

### Code Quality
```
- Linting: ESLint (.eslintrc.json)
- Formatting: Prettier (.prettierrc)
- Pre-commit: Husky + lint-staged
- Code Review: GitHub PRs (min 1 approval)
- Branch protection: Main branch (tests required)
- Commit convention: Conventional Commits
```

### Frontend State Management Detail

#### Redux Store Structure
```javascript
store/
├── slices/
│   ├── authSlice.js         // user, isLoggedIn, role
│   ├── cartSlice.js         // items, total
│   ├── uiSlice.js           // theme, notifications
│   └── settingsSlice.js     // preferences
├── hooks/
│   ├── useAppDispatch.js
│   └── useAppSelector.js
└── store.js                  // configureStore
```

#### React Query Usage
```javascript
// Server state (from API)
hooks/
├── useProducts.js           // GET /api/products
├── useProductById.js        // GET /api/products/:id
├── useOrders.js            // GET /api/orders
├── useCreateOrder.js       // POST /api/orders
├── useReviews.js           // GET /api/reviews
└── useCreateReview.js      // POST /api/reviews
```

---

## 🔑 Environment Variables

### Development (.env.local)
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pravoles_dev

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
NEXTAUTH_SECRET=your-secret-key-here-min-32-chars
NEXTAUTH_URL=http://localhost:3000

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx

# Email
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@pravoles.local

# Storage
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=pravoles-dev
```

### Production (.env.production)
```bash
# All keys with production values
DATABASE_URL=postgresql://user:password@db.supabase.co:5432/pravoles
NEXT_PUBLIC_API_URL=https://api.pravoles.si
```

---

## 📚 API Documentation

### Success Response (200 OK)
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "Product" },
  "pagination": { "page": 1, "total": 100 }
}
```

### Error Response (4xx)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Email je nepravilen"
  }
}
```

---

## 🔄 Database Migrations

```bash
# Kreiraj novo migraciju
npx prisma migrate dev --name add_products_table

# Primijeni (production)
npx prisma migrate deploy
```

---

## 📊 Performance Benchmarks

| Metrika | Target | Alert | Critical |
|---------|--------|-------|----------|
| API Response (p95) | 200ms | 500ms | 1s |
| Page Load | 2s | 3s | 5s |
| Error Rate | <0.01% | 0.1% | 1% |
| Cache Hit Rate | >80% | 60% | 40% |
| Uptime | >99.9% | 99% | 99% |

---

## 🎯 Deployment Checklist

Pre-deployment:
- [ ] All tests passing
- [ ] Code reviewed & merged
- [ ] Staging tested
- [ ] Database migrations prepared
- [ ] Environment variables set
- [ ] Backups scheduled

Deployment:
- [ ] Deploy frontend
- [ ] Run migrations
- [ ] Deploy backend
- [ ] Verify endpoints

Post-deployment:
- [ ] Check dashboards
- [ ] Monitor logs
- [ ] No alerts triggered

---

## 📞 Kontakt

Za vprašanja glede arhitekture, piši na info@pravoles.si

---

**Zadnja sprememba**: April 2026
**Status**: V razvoju
**Verzija**: 1.0
