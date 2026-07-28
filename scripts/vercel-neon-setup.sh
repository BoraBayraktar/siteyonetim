#!/usr/bin/env bash
set -euo pipefail

# Site Yönetimi — yalnızca Vercel team: siteyonetim (beemmb-arge değil)
SCOPE="siteyonetim"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ Vercel team: $SCOPE"
npx vercel@58 teams switch "$SCOPE" >/dev/null

echo "→ Neon (Frankfurt) — önce şartları onaylayın gerekirse:"
echo "   https://vercel.com/siteyonetim/~/integrations/accept-terms/neon?source=cli"
npx vercel@58 integration add neon -n siteyonetim-db -m region=fra1 -m auth=false --plan free_v3 -S "$SCOPE"

echo "→ Ortam değişkenleri…"
npx vercel@58 env pull "$ROOT/.env.vercel.production" --environment=production --yes -S "$SCOPE"

echo "→ Migration + demo seed (production DB)…"
set -a
# shellcheck disable=SC1090
source "$ROOT/.env.vercel.production"
set +a
npm run migrate:deploy -w @siteyonetim/db
npm run db:seed

echo "→ Production deploy…"
npx vercel@58 deploy --prod --yes -S "$SCOPE"

echo "Tamam. Panel: https://vercel.com/siteyonetim/siteyonetim"
echo "Demo giriş (seed sonrası): admin@demo.local / Demo123!"
