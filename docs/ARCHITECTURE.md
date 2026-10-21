# Architecture

This document describes how the storefront, API and database fit together, and where the important business rules live.

## 1. System overview

```
                        ┌──────────────────────────────┐
  Browser  ───────────► │  Storefront / Admin (Next.js) │  SSR pages, client React Query
                        │  web/                         │  /api/* → rewrite (or nginx)
                        └──────────────┬───────────────┘
                                       │ HTTPS, same origin
                        ┌──────────────▼───────────────┐        ┌──────────────────┐
  Stripe / Airtel /  ──►│  API (Express 5)              │ ─────► │ MongoDB 7         │
  Mpamba webhooks       │  server/                      │        │ (Atlas or local)  │
                        │  routes → services → models   │        └──────────────────┘
                        └──────────────┬───────────────┘
                                       │
                 Stripe API · mobile money APIs · Cloudinary · SMTP
```

Two deployable units, one database:

| Unit | Source | Runtime | Typical host |
| --- | --- | --- | --- |
| Storefront and admin | `web/` | Next.js 16, React 19, Node 22 | Vercel (root directory `web/`) or the `web` container |
| API | `server/` | Express 5, Mongoose 8, Node 22 | Render (`render.yaml`) or the `api` container |
| Database | — | MongoDB 7 | Atlas or the `mongo` container |

**Same-origin by design.** The browser only ever calls its own origin. In Vercel, Next.js rewrites `/api/*` to `API_INTERNAL_URL`. In Docker, nginx routes `/api/*` straight to the API. Auth cookies are therefore first-party, CSRF rules are simple, and there is no CORS surface for browsers in normal use.

## 2. API layers

```
HTTP request
  → helmet, cors (allowlist), pino-http, compression, cookie-parser
  → webhooks: express.raw, 256 KB  (mounted BEFORE express.json so signatures see the raw bytes)
  → express.json, 100 KB limit
  → sanitizeInput (strips $-operator and __proto__ keys; Express 5 req.query is a getter, so it is redefined)
  → apiLimiter (300 requests/minute per IP)
  → csrfProtection (unsafe methods from browsers; bearer-token clients and webhooks exempt)
  → router (src/routes/*) → Zod validation → service (src/services/*) → Mongoose model (src/models/*)
  → errorHandler (uniform JSON envelope: { error: { code, message, details? } })
```

| Folder | Responsibility |
| --- | --- |
| `routes/` | HTTP surface only: parse input with a Zod schema, call one service, shape the response. |
| `services/` | Business rules and transactions: `orders`, `paymentService`, `payments/*` adapters, `inventory`, `loyalty`, `catalog`, `reviews`, `analytics`, `notifications`, `settings`, `counter`. |
| `models/` | Mongoose schemas and indexes. Fourteen collections, including `counters` for order numbers. |
| `validators/` | Zod schemas, one file per domain, shared primitives in `common.ts`. |
| `middleware/` | Authentication, CSRF, rate limits, sanitisation, error handling. |
| `lib/` | Pure helpers: pricing, coupons, fuzzy matching, WhatsApp message builder, JWT, password hashing, crypto, mailer, logger. |
| `config/` | Environment validation (Zod, fails fast), constants (order status machine, shipping rules, loyalty rates), database connection. |

Routes mounted under `/api`: `auth`, `products`, `categories`, `orders`, `payments` (methods, initiate, webhooks), `reviews`, `wishlist`, `coupons`, `blog`, `admin`, plus public `health`, `settings`, `contact` and `analytics/events`.

## 3. Authentication and sessions

- **Access token**: JWT, 15 minutes, in the `tl_access` cookie (path `/`) or an `Authorization: Bearer` header.
- **Refresh token**: JWT, 30 days, in the `tl_refresh` cookie, scoped to `/api/auth`, `httpOnly`, `SameSite=Lax`. Only a SHA-256 hash is stored, in `user.refreshSessions` (at most 10 per user).
- **Rotation with reuse detection**: each refresh issues a new refresh token and retires the old one. Presenting a retired token revokes every session for that user.
- **CSRF**: `tl_csrf` is readable by JavaScript and must be echoed in the `x-csrf-token` header on unsafe requests. The storefront client reads it automatically and fetches `/api/health` once if the cookie is missing.
- **Roles**: `customer`, `admin`, `super_admin`. Staff-only routes use `requireAdmin`; refunds, staff management, roles and settings require `requireSuperAdmin`.
- **Anti-enumeration**: password reset always returns the same message. Login runs a password check even for unknown emails.
- **Rate limits**: login 10/15 min, registration 10/hour, password reset 5/hour, checkout 20/10 min, payment initiation 30/10 min, contact form 10/hour.

## 4. Catalogue and search

`GET /api/products` runs one aggregation with `$facet` for results and count:

- Text search: regex over name, brand, tags and description. When the regex returns nothing, a fuzzy fallback ranks candidates by similarity (score ≥ 0.5) and the response is marked `fuzzy: true`.
- Filters: category, brand, price range (applied to the effective sale price with `$expr`), minimum rating, in stock, size, colour.
- Sorting: featured, price ascending or descending, newest, rating, best selling.
- Pagination: `page` and `limit` (max 60).

Suggestions (`/products/suggest`) use the same regex and fuzzy pipeline with a stricter threshold (≥ 0.6). Facets are computed with `distinct` on brand, sizes and colours, plus min and max price.

## 5. Money, pricing and loyalty

The client never decides a price. `services/orders.ts` recalculates everything from the database when an order is created:

1. Each line uses the product's **current** price, or the sale price when it is lower.
2. Shipping: standard MWK 3,000 (free at MWK 150,000 or more), express MWK 8,000, pickup free.
3. Coupon: percentage coupons are floored and capped at the subtotal. Fixed coupons are capped the same way. Usage is recorded with a conditional update.
4. Loyalty points: 1 point per MWK 1,000 spent, worth MWK 10 each. Redemption is capped by the balance and by 50% of the payable amount. Points are deducted with a conditional update and restored if the order is cancelled or refunded.
5. Totals are floored at zero.

Pricing rules are covered by `server/tests/pricing.test.ts`. The web app mirrors them in `web/lib/pricing.ts` **for display only**; the server result is what the customer is charged.

Stripe does not settle MWK. Card payments are converted at `STRIPE_MWK_RATE` into `STRIPE_CURRENCY`.

## 6. Order lifecycle

```
                 ┌──────────┐   card / mobile money / manual   ┌────────┐  fulfil  ┌────────────┐  pack   ┌─────────┐  ship   ┌──────────┐  deliver  ┌───────────┐
 checkout ─────► │ pending  │ ───────────────────────────────► │  paid  │ ───────► │ processing │ ──────► │ packing │ ──────► │ shipped  │ ────────► │ delivered │
                 └────┬─────┘                                   └───┬────┘          └─────┬──────┘         └────┬────┘         └────┬─────┘           └───────────┘
                      │ awaiting_payment (mobile money pending)     │                     │                     │                   │
                      │                                              ▼ refund (super admin)                 ▼ refund            ▼ refund
                      ▼ cancel / expire after 24h               ┌──────────┐                                ┌──────────┐
                 ┌───────────┐                                  │ refunded │ ◄──────────────────────────────┘          │
                 │ cancelled │                                  └──────────┘ ◄────────────────────────────────────────┘
                 └───────────┘
```

Allowed transitions are defined once, in `config/constants.ts` (`ORDER_TRANSITIONS`), and enforced by the order service. `cancelled` and `refunded` are terminal. Customers can only cancel while an order is unpaid.

**Inventory** is reserved at checkout (`reservedStock`), converted to a sale when payment is confirmed (`soldCount`), released on cancellation or expiry, and restocked on refund. Reservations are made with compensating rollback: if any line fails, earlier reservations are undone.

**Idempotency.** `markOrderPaid` uses a conditional update, so duplicate webhooks or double clicks do not double-credit. Cancellation and refund decide which compensations to run from the document state before the update (`findOneAndUpdate` with `new: false`), so each compensation runs once. A payment that arrives after cancellation is flagged `refund_required` rather than silently accepted.

**Expiry.** A job every 15 minutes cancels unpaid orders older than 24 hours (up to 200 per run), releasing stock and failing pending payments.

**Referrals.** When a referred customer's first order is paid, the friend receives 200 points and the referrer receives 500 points. Rewards are granted once.

## 7. Payments

| Method | Flow |
| --- | --- |
| Card, Apple Pay, Google Pay (Stripe) | Order created as `pending` → `POST /api/payments/initiate` creates a PaymentIntent → storefront mounts the Payment Element and confirms → Stripe webhook (`payment_intent.succeeded`) marks the order paid, and `payment_intent.payment_failed` records the failure. The webhook is verified against `STRIPE_WEBHOOK_SECRET`, with a timestamp tolerance. |
| Airtel Money, TNM Mpamba | Order → initiate returns a reference and instructions (or a push request) → provider webhook with HMAC-SHA256 signature → the status is mapped to succeeded or failed. The HMAC is required; unsigned callbacks are rejected. |
| WhatsApp | Order is created and `wa.me` link is returned with a pre-filled message. Staff confirm the payment in chat and mark it paid in the admin studio. |
| Manual | Staff use **Confirm payment** in the admin studio, with a reference. Recorded in the order's status history. |

Webhook routes are mounted before the JSON body parser, so the HMAC or Stripe signature is computed over the exact bytes received. Each webhook looks up the payment by our reference or the provider's reference, checks that the amount is within MWK 1 of the order total, and only then changes state.

> The mobile money request paths and bodies in `services/payments/mobileMoney.ts` are placeholders until confirmed against provider documentation.

## 8. Reviews

Only customers with a paid order containing the product can review it (`hasVerifiedPurchase`). One review per customer per product (unique index). Reviews start as `pending`. Approval triggers `recalculateProductRating`, which averages approved reviews only.

## 9. Storefront

- **Rendering.** Product pages, the journal, the sitemap and robots are server rendered and cacheable (ISR: articles and the journal revalidate every five minutes, the sitemap hourly, and product pages every 60 seconds). Account, cart, checkout and admin are client-rendered behind a route guard (`RequireAuth`).
- **Data.** TanStack Query for server state. Zustand stores for the bag (persisted as `tl-cart`), recently viewed and toasts. Persisted state is read after hydration (`useHydrated`) to avoid mismatches.
- **Bag reconciliation.** On cart and checkout, `useCartSync` fetches current prices and stock for the bag's products, so stale prices or stock are corrected before the order is placed.
- **SEO.** Metadata per route, canonical URLs, Open Graph and Twitter cards, `Product`, `Article` and `AggregateRating` JSON-LD (with `<` escaped), sitemap and robots (admin, account, checkout and cart are disallowed).
- **Images.** Next.js image optimisation with Cloudinary as the only remote host. Placeholder SVGs ship in `public/placeholders/`.
- **Journal.** Markdown is rendered by `lib/markdown.ts`, which escapes all HTML before applying formatting, so authors cannot inject scripts.

## 10. Admin studio

Routes under `/admin` require `admin` or `super_admin`. Surfaces:

- Dashboard: today's revenue, orders to fulfil, awaiting payment, low stock, customers.
- Analytics: revenue, orders, average order value, new customers, conversion (paid orders over product-view sessions), best sellers, status breakdown. Buckets use the `Africa/Blantyre` timezone.
- Orders: filter and search, advance the status (with courier and tracking), confirm payment, refund (super admin only).
- Products: create and edit, archive (soft delete), stock adjustments, images via signed Cloudinary uploads.
- Inventory, reviews moderation, coupons, customers, store settings (super admin).

Staff management and role changes are API-only for now.

## 11. Observability and operations

- **Health**: `GET /api/health` (excluded from request logs).
- **Logs**: pino JSON. Set `LOG_LEVEL` to `debug` for troubleshooting.
- **Shutdown**: SIGTERM stops the expiry timer, drains HTTP connections, closes MongoDB and exits. A 10-second hard timeout applies.
- **Startup**: the API connects to MongoDB before listening, so a bad connection string fails fast instead of serving errors.
- **Analytics events** (`product_view`, `add_to_cart`, `checkout_started`) are stored with a 180-day TTL.

## 12. Testing

| Suite | What it covers | Needs DB |
| --- | --- | --- |
| `pricing.test.ts` | Sale price rule, shipping thresholds, coupon floors and caps, points caps, zero floors. | No |
| `orders-format.test.ts` | Order number format, MWK formatting, URL-safe slugs, regex escaping of search input, coupon validity rules. | No |
| `search.test.ts` | Regex and fuzzy matching behaviour. | No |
| `whatsapp.test.ts` | Message builder and `wa.me` link encoding. | No |
| `security.test.ts` | Sanitisation of operator and prototype keys, password policy, JWT tampering, Stripe and mobile money signatures and status mapping. | No |
| `http.test.ts` | CSRF rules, validation envelope, protected routes, 404 envelope, security headers, webhook signature rejection. | No (in-process app) |

Not yet covered by automated tests: end-to-end checkout against MongoDB, webhook replay against a database, concurrency on stock reservation, and browser flows. These are the next priorities before go-live.

## 13. Decisions and trade-offs

- **Modular monolith API** instead of microservices: one deployable, one database, transactions where needed (conditional updates in MongoDB), and clear module boundaries.
- **Mongo conditional updates instead of multi-document transactions** for inventory, points and coupons, so the design works on a standalone MongoDB and on Atlas without replica-set configuration. Compensating actions cover partial failures.
- **Cookies over local storage for tokens** so scripts cannot read the refresh token, with CSRF protection for the cookie-based flow.
- **Prices recalculated on the server**, and the client mirrors the rules only for display.
- **Stripe charges in USD through a configured MWK rate**, because Stripe does not settle MWK. Revisit when a local acquirer is available.
- **No ORM-specific framework on the web side**: plain `fetch` through a small client keeps auth refresh and CSRF in one place.
