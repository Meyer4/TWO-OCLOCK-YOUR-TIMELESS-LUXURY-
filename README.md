# Timeless Luxury Two O'Clock · World of Kiki Kicks

E-commerce storefront, customer accounts, and admin studio for luxury watches, sneakers, accessories and designer fashion, built for Malawi (MWK pricing, Airtel Money and TNM Mpamba, WhatsApp ordering) with international card payments through Stripe.

- **Storefront** (`web/`): Next.js 16 (App Router) with server-rendered product pages, SEO metadata, JSON-LD and a sitemap.
- **API** (`server/`): Express 5 + MongoDB (Mongoose), with Zod validation, cookie-based auth with refresh rotation, CSRF protection, rate limiting, and idempotent payment webhooks.
- **Admin studio** (`/admin` in the web app): orders and fulfilment, products, inventory, reviews moderation, coupons, customers, analytics, and store settings.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the design, data model and order lifecycle.

### Live demo (GitHub Pages)

`.github/workflows/pages.yml` builds a **static demo** of the storefront and publishes it to GitHub Pages on every push to the session branch. The demo uses the seed catalogue (6 products, 4 categories) bundled into the build. Browsing, search, filters, product pages and the bag work. Sign-in, checkout, wishlists, reviews and admin are disabled and show a "demo only" message, because they need the API and MongoDB.

One-time setup for the repository owner: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The site is then served at `https://<owner>.github.io/<repository>/`. Build it locally with `cd web && npm run build:pages` (set `NEXT_PUBLIC_BASE_PATH` to `/<repository>` to match the Pages path).

## Features

| Area | What is included |
| --- | --- |
| Catalogue | Categories, products with sizes, colours, specifications, sale prices and stock; faceted search (brand, price, rating, size, colour, stock) with typo-tolerant fallback; featured and trending rails; related and similar products. |
| Shopping | Persistent bag with per-line stock limits, save for later, recently viewed, wishlist, product gallery with zoom and video. |
| Checkout | Five steps: contact, delivery address, delivery method, payment (with coupons and loyalty points), review. Prices are recalculated on the server. |
| Payments | Stripe Payment Element (card, Apple Pay, Google Pay), Airtel Money and TNM Mpamba (webhook-driven), WhatsApp order hand-off, and manual payment confirmation by staff. |
| Accounts | Register, sign in, email verification, password reset, profile, addresses, order history with live status, referral code and loyalty points. |
| Reviews | Only verified buyers can review; reviews are moderated before they appear. |
| Journal | Markdown blog with SEO metadata and article JSON-LD. |
| Admin | Dashboard, sales analytics (daily, weekly, monthly and yearly), order status workflow with tracking, refunds (super admin), Cloudinary image uploads, coupon management, and settings. |
| Ops | Health endpoint, structured logs (pino), graceful shutdown, a job every 15 minutes that cancels unpaid orders past their 24-hour window and releases their stock, security headers, Docker and nginx configs, Render blueprint, Vercel config. |

## Repository layout

```
.
├── web/                 Next.js storefront and admin (deploy to Vercel, root directory = web/)
│   ├── app/             Routes (App Router): shop, products, cart, checkout, account, admin, blog, auth
│   ├── components/      UI primitives and feature components
│   ├── hooks/           TanStack Query hooks for the API
│   ├── store/           Zustand stores (bag, recently viewed, toasts), persisted in localStorage
│   └── lib/             API client, formatting, types, pricing estimates
├── server/              Express API (deploy to Render or Docker)
│   ├── src/routes/      HTTP endpoints
│   ├── src/services/    Business logic: orders, payments, inventory, loyalty, catalogue, analytics
│   ├── src/models/      Mongoose schemas
│   ├── src/validators/  Zod schemas for every input
│   ├── src/seed/        Idempotent seed data (categories, sample products, store settings)
│   └── tests/           Unit, security and HTTP tests (no database required)
├── nginx/nginx.conf     Reverse proxy for the Docker deployment
├── docker-compose.yml   MongoDB + API + storefront + nginx on one host
├── render.yaml          Render Blueprint for the API
└── docs/ARCHITECTURE.md
```

## Requirements

- Node.js **22** for the API (`server/package.json` engines) and **20.9+** for the web app.
- MongoDB **7** (local, Docker, or MongoDB Atlas).
- Docker and Docker Compose, optional, for the self-hosted deployment.

## Quick start (local development)

```bash
# 1. API
cd server
cp .env.example .env          # set JWT secrets (see below) and MONGODB_URI
npm install
npm run dev                   # http://localhost:4000

# 2. Storefront (in a second terminal)
cd web
cp .env.example .env.local    # API_INTERNAL_URL=http://localhost:4000 is the default
npm install
npm run dev                   # http://localhost:3000
```

Generate the JWT secrets with `openssl rand -hex 48` and use a different value for each secret.

The browser only talks to the storefront origin. Requests to `/api/*` are rewritten to the API (`API_INTERNAL_URL`), which keeps auth cookies first-party and avoids cross-origin configuration.

### Seed sample data (optional)

```bash
cd server
# Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD in .env first to create a super admin.
npm run seed
```

The seed is idempotent. It creates four categories (Watches, Sneakers, Accessories, Designer Fashion), six sample products with placeholder images, store settings, and the bootstrap admin when none exists.

## Configuration

All variables are documented in [`server/.env.example`](server/.env.example) and [`web/.env.example`](web/.env.example). The API validates its environment at startup and refuses to boot on invalid values (for example, JWT secrets shorter than 32 characters).

Key settings:

| Variable | Where | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | API | MongoDB connection string. |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | API | Signing secrets, at least 32 characters, different from each other. |
| `CLIENT_ORIGIN` | API | Public storefront origin (comma-separated for several). Used in email links and the CORS allowlist. |
| `TRUST_PROXY` | API | `1` when behind nginx, Render, or another proxy. |
| `STORE_WHATSAPP_NUMBER` | API | Digits only, international format (e.g. `265…`). Enables WhatsApp ordering. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | API | Stripe API key and webhook signing secret. |
| `STRIPE_CURRENCY`, `STRIPE_MWK_RATE` | API | Stripe does not settle MWK, so card charges are converted at this rate. |
| `AIRTEL_MONEY_*`, `MPAMBA_*` | API | Mobile money provider credentials and webhook secrets. |
| `CLOUDINARY_*` | API | Product and review image uploads (signed uploads from the admin studio). |
| `SMTP_*`, `MAIL_FROM` | API | Transactional email. If `SMTP_HOST` is empty, emails are logged instead of sent. |
| `API_INTERNAL_URL` | Web | Where the storefront sends `/api/*` requests and server-side data fetches. |
| `NEXT_PUBLIC_SITE_URL` | Web | Canonical public URL for SEO, sitemap and social tags. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Web | Stripe publishable key (`pk_…`). Required for card payments. |
| `NEXT_PUBLIC_HERO_VIDEO_URL` | Web | Optional hero film. Falls back to a still image. |

`NEXT_PUBLIC_*` values are compiled into the web build, so change them and rebuild.

## Testing and checks

```bash
# API: 38 tests covering pricing, order formatting, search, WhatsApp messages, security (injection stripping, JWT, webhook signatures, password policy) and HTTP behaviour (CSRF, validation envelope, headers, 404s). No database needed.
cd server && npm test && npm run typecheck && npm run build

# Storefront
cd web && npm run typecheck && npm run lint && npm run build
```

Integration tests against a live MongoDB are not included yet. The order, payment and inventory flows are written to be safe under retries (conditional updates and compensating actions), but they should be exercised against a real database before go-live.

## Deployment

### Option A: Vercel (storefront) + Render (API) + MongoDB Atlas

1. **Database.** Create a MongoDB Atlas cluster and copy its connection string.
2. **API on Render.** Create a Blueprint from this repository (`render.yaml`). It builds `server/` with `npm ci && npm run build` and starts `npm start`. Set the secrets marked `sync: false` in the dashboard, and set `CLIENT_ORIGIN` to your storefront URL. Health check: `/api/health`.
3. **Seed once** from a Render shell: `node dist/seed/seed.js`.
4. **Storefront on Vercel.** Import the repository and set **Root Directory** to `web`. `web/vercel.json` configures the install and build commands. Set `API_INTERNAL_URL` to the Render service URL (for example `https://two-oclock-api.onrender.com`), `NEXT_PUBLIC_SITE_URL` to your domain, and the `NEXT_PUBLIC_*` values listed above.
5. **Stripe.** Add a webhook endpoint at `https://<api-host>/api/payments/webhooks/stripe` and put its signing secret in `STRIPE_WEBHOOK_SECRET`. Mobile money providers call `/api/payments/webhooks/airtel_money` and `/api/payments/webhooks/mpamba`.

Because the storefront rewrites `/api/*` to `API_INTERNAL_URL`, the browser keeps using a same-origin API, and the refresh cookie is scoped to `/api/auth`.

### Option B: Docker Compose on one host (MongoDB, API, storefront, nginx)

```bash
cp server/.env.example server/.env        # fill in secrets, CLIENT_ORIGIN=https://your-domain
# Optional: web build values
export NEXT_PUBLIC_SITE_URL=https://your-domain
export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
docker compose up -d --build
docker compose run --rm api node dist/seed/seed.js
```

nginx listens on port 80 and routes `/api/*` to the API and everything else to the storefront. Put a TLS terminator (for example Caddy, a cloud load balancer, or certbot on the host) in front of it for HTTPS, and enable HSTS there.

The Dockerfiles and compose file were validated by inspection only in this environment (no Docker daemon was available). Run `docker compose config` and `docker compose up --build` once on your host before relying on them.

## Security

- Passwords are hashed with bcrypt (cost 12 by default). Login is rate limited (10 per 15 minutes per IP) and runs a dummy hash check for unknown accounts to reduce timing differences.
- Access tokens are short-lived (15 minutes). Refresh tokens are rotated on every use and stored only as hashes. Replaying a rotated token revokes every session for that user.
- CSRF protection uses a double-submit token on all state-changing requests from the browser. Bearer-token API clients are exempt.
- Every request body, query and parameter goes through a Zod schema. Mongo operator keys (`$…`) and `__proto__` keys are stripped.
- Prices, shipping, coupons and loyalty points are always recalculated on the server. The client never sets a price.
- Payment webhooks verify signatures before touching state, check the amount is within 1 MWK of the order total, and are idempotent.
- Helmet security headers on the API. CORS is an allowlist taken from `CLIENT_ORIGIN` (comma-separated), with credentials enabled. `x-powered-by` is disabled, and the storefront sends its own security headers.

## Known limitations

- **Mobile money** (`server/src/services/payments/mobileMoney.ts`): the push-request path and body are documented placeholders. Confirm them against the Airtel Money and TNM Mpamba API documentation, and test in their sandboxes before enabling in production.
- **Live database tests** are not included yet. See the testing section above.
- **Lint tooling audit.** `eslint-config-next` brings in a transitive dev dependency chain (`fast-glob`, `micromatch`, `braces`) flagged by npm audit. These are build-time lint tools and are not shipped to users. Production dependencies report zero vulnerabilities. Revisit when `eslint-config-next` publishes a release that resolves them.
- **Bootstrap admin** is created only when no super admin exists. Remove `BOOTSTRAP_ADMIN_PASSWORD` from the environment after the first start.
- **Analytics** are first-party and anonymous (a random session ID in localStorage). Retention is 180 days.

## Contributing

Work on a feature branch, keep `npm run typecheck`, `npm test` and `npm run lint` green, and describe any change to money, order status or payment handling in the pull request, since those paths have their own tests and invariants.
