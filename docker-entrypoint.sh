#!/bin/sh
set -e

# Auto-generate secrets if not provided
if [ -z "$JWT_SECRET" ]; then
  export JWT_SECRET=$(head -c 32 /dev/urandom | base64)
  echo "[entrypoint] Generated random JWT_SECRET"
fi

if [ -z "$ENCRYPTION_KEY" ]; then
  export ENCRYPTION_KEY=$(head -c 32 /dev/urandom | base64)
  echo "[entrypoint] Generated random ENCRYPTION_KEY"
fi

# Ensure data directory exists
mkdir -p /app/data

exec node server.js
