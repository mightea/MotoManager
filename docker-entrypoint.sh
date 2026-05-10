#!/bin/sh
set -e

cat > /usr/share/caddy/config.js <<EOF
window.ENV = {
  BACKEND_URL: "${BACKEND_URL:-http://localhost:3001}",
  ENABLE_REGISTRATION: "${ENABLE_REGISTRATION:-true}",
  APP_VERSION: "${APP_VERSION:-0.0.0}",
  UMAMI_WEBSITE_ID: "${UMAMI_WEBSITE_ID:-}",
  UMAMI_SCRIPT_URL: "${UMAMI_SCRIPT_URL:-}"
};
EOF

exec caddy run --config /etc/caddy/Caddyfile
