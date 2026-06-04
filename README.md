# hw-10

---

## Requirements

- Node.js 22+
- Docker & Docker Compose

## Environment

Create `.env` file in the root directory:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=online_game
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_game?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# App
NODE_ENV=production
PORT=2345
ALLOWED_ORIGIN=http://localhost:3000

# Session
COOKIES_SECRET=
SESSION_SECRET=
SESSION_NAME=Session
SESSION_DOMAIN=localhost
SESSION_MAX_AGE_30DAYS=2592000000
SESSION_HTTP_ONLY=true
SESSION_SECURE=false
SESSION_FOLDER=sessions:

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

MAIL_HOST =
MAIL_PORT =587
MAIL_LOGIN =
MAIL_PASSWORD =
MAIL_FROM =

GOOGLE_CLIENT_ID = 
GOOGLE_CLIENT_SECRET =
GOOGLE_CALLBACK_URL = https://d2e3-185-130-54-156.ngrok-free.app/api/v1/auth/google/callback
```

## Local Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start in watch mode
npm run start:dev
```

## Docker

```bash
# Build and start all services
docker-compose up --build

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Database

```bash
# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio
```

## API Docs

Swagger UI available at: `http://localhost:2345/api/docs`