#!/usr/bin/env bash
set -euo pipefail

app_dir="$HOME/school-os"
mkdir -p "$app_dir"
tar -xf "$HOME/deploy-src.tar" -C "$app_dir"
cd "$app_dir"

if [ ! -f .env.production ]; then
  umask 077
  secret="$(openssl rand -hex 32)"
  cat > .env.production <<EOF
APP_HOST=os.digmio.app
APP_URL=https://os.digmio.app
AUTH_SECRET=$secret
AUTH_DATABASE_PATH=data/auth.sqlite
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-20b
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
EOF
  unset secret
fi

sudo docker compose --env-file .env.production up -d --build
sudo docker compose --env-file .env.production ps
