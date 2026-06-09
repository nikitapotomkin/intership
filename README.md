# Intership — Online Game Platform API

A **NestJS** backend for an online gaming platform. Supports authentication, wallet transactions, Stripe deposits, live roulette, slot machine, and real-time PvP battles.

## Features

| Module | Description |
|--------|-------------|
| **Auth** | Registration, login, email verification, password recovery, Google OAuth |
| **User** | Profile, address, password management |
| **Wallet** | Balance, transaction history, withdrawal requests |
| **Payment** | Deposits via payment providers, Stripe webhooks |
| **Live Roulette** | Live rooms, bets, spin, provably fair (server/client seed) |
| **Slot** | 3×5 slot, 20 paylines, WILD and SCATTER symbols |
| **Battle** | PvP duels over WebSocket (`/battle`) |
| **Admin** | User management, bans, roles, withdrawals, live rooms |

## Tech Stack

- **Runtime:** Node.js 22+
- **Framework:** NestJS 11
- **Database:** PostgreSQL 16 + Prisma ORM
- **Cache / Sessions:** Redis 7
- **Real-time:** Socket.IO with Redis adapter
- **Payments:** Stripe
- **API Docs:** Swagger

## Requirements

- Node.js 22+
- Docker & Docker Compose (for containerized setup)
- PostgreSQL and Redis (if running locally without Docker)

## Quick Start

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd intership
npm install
```

### 2. Environment setup

Create a `.env` file in the project root:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=online_game
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_game?schema=public

REDIS_HOST=redis
REDIS_PORT=6379

NODE_ENV=production
PORT=2345

COOKIES_SECRET=game123
SESSION_SECRET=game123
SESSION_NAME=Session
SESSION_MAX_AGE_30DAYS=2592000000
SESSION_HTTP_ONLY=true
SESSION_SECURE=false
SESSION_FOLDER=sessions:

ALLOWED_ORIGIN =http://localhost:3000

STRIPE_SECRET_KEY=sk_test_51
STRIPE_WEBHOOK_SECRET=whsec_6

MAIL_HOST =test
MAIL_PORT =587
MAIL_LOGIN =test
MAIL_PASSWORD =test
MAIL_FROM =test

GOOGLE_CLIENT_ID =test
GOOGLE_CLIENT_SECRET =test
GOOGLE_CALLBACK_URL = https://d2e3-185-130-54-156.ngrok-free.app/api/v1/auth/google/callback
```

> **Note:** `COOKIES_SECRET` and `SESSION_SECRET` must be long random strings. For Google OAuth, the callback URL must match the settings in Google Cloud Console.

### 3. Database

```bash
npx prisma generate
npx prisma migrate dev
```

### 4. Run the app

```bash
# Development mode (hot-reload)
npm run start:dev

# Production
npm run build
npm run start:prod
```

The server will be available at `http://localhost:2345`.

## Docker

Start all services (PostgreSQL, Redis, app):

```bash
docker-compose up --build -d
```

Stop:

```bash
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

In Docker mode, `DATABASE_URL` and `REDIS_HOST` are overridden automatically via `docker-compose.yml`.

## API Documentation

Swagger UI: **http://localhost:2345/api/docs**

Authentication uses cookie-based sessions (`connect.sid`). After `POST /api/v1/auth/login`, the cookie is sent automatically with subsequent requests.

### Main endpoints

| Prefix | Description |
|--------|-------------|
| `/api/v1/auth` | Registration, login, logout, Google OAuth |
| `/api/v1/users` | Profile, address |
| `/api/v1/wallets` | Balance, withdrawals, history |
| `/api/v1/payments` | Deposits, webhooks |
| `/api/v1/live-roulette/rooms` | Live roulette rooms |
| `/api/v1/slots` | Spin, history, paytable |
| `/api/v1/battles` | PvP duels (REST) |
| `/api/v1/admin` | Admin panel (ADMIN role) |

### WebSocket namespaces

| Namespace | Description |
|-----------|-------------|
| `/live-roulette` | Live roulette: join room, place bets, spin results |
| `/battle` | PvP battles: moves, battle status |

WebSocket connections require an active session (cookie is passed during handshake).

## Database

```bash
# Create a migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy
```

## User Roles

- `USER` — regular player
- `MODERATOR` — moderation access
- `ADMIN` — full access to admin endpoints

---
