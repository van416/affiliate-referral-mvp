# FirstLink

Single-level affiliate / referral commission MVP.

A new account can be bound to the person who invited them. When that account places a simulated order, only the direct referrer earns a commission. There is no second tier, no inventory, and no payout.

## Stack

- Next.js App Router
- Prisma + PostgreSQL
- Email and password sessions (HMAC JWT in an httpOnly cookie)

## Prerequisites

- Node.js 20+
- Docker, for the bundled Postgres, or your own Postgres 16 database

## Environment

Copy the example env file:

```bash
cp .env.example .env
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string Prisma uses |
| `AUTH_SECRET` | yes | HMAC secret for session cookies. At least 16 characters. |
| `NEXT_PUBLIC_APP_URL` | no | Fallback origin for referral links if a request has no Host header. Links normally use the request host. |

Example local URL, matching `docker-compose.yml`:

```text
postgresql://affiliate:affiliate@localhost:5432/affiliate?schema=public
```

## Local Postgres

```bash
docker compose up -d
```

Wait until the `postgres` service is healthy (`docker compose ps`), then install, migrate, and seed:

```bash
npm install
npm run db:setup
```

`db:setup` runs `prisma migrate deploy` and the seed. The seed creates the default 10% commission rate and an admin user:

- email: `admin@example.com`
- password: `admin123456`

That password is for local demos only.

## Run

```bash
npm run dev
```

Open http://localhost:3000.

Other commands:

```bash
npm test          # commission math
npm run lint
npm run build
npm run acceptance   # API checklist; requires the app to be running
```

## Data model

- `User` — account, unique referral code, optional direct `referredById`
- `Order` — simulated purchase in integer cents
- `Commission` — one row per referred order, with the rate snapshotted in basis points
- `Setting` — singleton `default` row holding `commissionRateBps` (1000 = 10%)

Commission is `floor(orderAmountCents * rateBps / 10000)`. Changing the rate affects future orders only.

## API

| Method | Path | Who |
| --- | --- | --- |
| `POST` | `/api/auth/register` | public. Optional `referralCode` binds the direct referrer |
| `POST` | `/api/auth/login` | public |
| `POST` | `/api/auth/logout` | session |
| `GET` | `/api/me` | session |
| `GET` | `/api/referrals/lookup?code=` | public. Returns the referrer's name only |
| `GET` | `/api/dashboard` | session. Invite link, totals, commissions |
| `POST` | `/api/orders` | session. Body: `{ "amountCents": 10000 }` |
| `GET` | `/api/admin/referrals` | admin |
| `GET` | `/api/admin/commissions` | admin |
| `GET` / `PUT` | `/api/admin/settings` | admin. PUT body: `{ "commissionRatePercent": 10 }` |

## Acceptance checklist

1. Start Postgres, migrate, seed, and run the app.
2. Register Alice. On her dashboard, copy the invite link (`/register?ref=...`).
3. Log out, open that link, and register Bob. Bob's account should name Alice as the referrer.
4. While logged in as Bob, place a simulated order for `$100`. The response should credit Alice `$10` at the default 10% rate.
5. Log in as Alice. The dashboard should list that commission and a `$10.00` total. Bob should show as her only direct invite.
6. Register Cara with Bob's invite link and place a `$100` order as Cara. Bob earns `$10`. Alice's total stays `$10`.
7. Log in as `admin@example.com` / `admin123456`. Confirm the referral table shows Cara → Bob → Alice as direct links only, and that both commissions are listed.
8. Change the commission rate to 20% and place another order as Cara. The new commission uses 20%. The earlier rows stay at 10%.

`npm run acceptance` exercises this path against `BASE_URL` (default `http://localhost:3000`) and restores the rate to 10% afterward.

## Limitations

This is a local MVP. It does not verify email, reset passwords, rate-limit logins, paginate lists, edit a referral after signup, or pay anyone out. The seeded admin password is public. Do not deploy it as a production affiliate program.
