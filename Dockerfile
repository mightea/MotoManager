FROM node:26-alpine AS builder
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

FROM caddy:2-alpine AS runtime
ARG APP_VERSION=0.0.0
ENV APP_VERSION=$APP_VERSION
COPY --from=builder /app/build/client /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
