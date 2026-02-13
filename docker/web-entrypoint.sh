#!/bin/sh
set -eu

echo "[web] waiting for database schema sync..."
npx prisma db push

echo "[web] seeding baseline data..."
npm run data:seed

echo "[web] starting next server..."
exec npm run start -- --port 3000
