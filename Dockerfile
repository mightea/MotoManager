# Lint: droast --skip DF062 --skip DF007 --skip DF031 Dockerfile
#   DF062: ARG->ENV APP_VERSION promotion is valid Docker (droast can't see the ARG)
#   DF007: .dockerignore exists; droast flags COPY . regardless
#   DF031: substring FP on `pnpm install`; the corepack global install is intentional

# Alpine 3.23 is the latest Alpine with node image variants (checked 2026-07);
# pinned explicitly so base-OS bumps are deliberate rather than surprise rebuilds.
FROM node:25-alpine3.23 AS builder
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN mkdir -p $PNPM_HOME && npm install -g corepack@latest --force && corepack enable && corepack prepare pnpm@10.2.1 --activate
WORKDIR /app
ARG APP_VERSION=0.0.0
ENV APP_VERSION=$APP_VERSION
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# caddy publishes no alpine-versioned tags; 2-alpine tracks the latest
# Alpine automatically (3.23 as of 2026-07).
FROM caddy:2-alpine AS runtime
ARG APP_VERSION=0.0.0
ENV APP_VERSION=$APP_VERSION
COPY --from=builder /app/build/client /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile
COPY docker-entrypoint.sh /docker-entrypoint.sh
# Non-root: the entrypoint writes config.js into the web root, and caddy keeps
# state under /config and /data (XDG dirs set by the base image).
RUN chmod +x /docker-entrypoint.sh && \
    addgroup -g 10001 web && adduser -D -u 10001 -G web web && \
    chown -R web:web /usr/share/caddy /config /data
USER web

# 8080 instead of 80: unprivileged users can't bind ports below 1024.
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost:8080/ || exit 1
ENTRYPOINT ["/docker-entrypoint.sh"]
