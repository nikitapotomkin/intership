set -e

npx prisma generate

npx prisma migrate deploy

exec node dist/src/main.js