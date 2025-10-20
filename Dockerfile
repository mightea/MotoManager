FROM node:25-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN mkdir -p $PNPM_HOME && corepack enable && corepack prepare pnpm@10.2.1 --activate
WORKDIR /app

FROM base AS builder
ARG APP_VERSION=0.0.0
ENV APP_VERSION=$APP_VERSION
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
RUN pnpm prune --prod

FROM node:25-alpine AS runtime
ARG APP_VERSION=0.0.0
ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN mkdir -p $PNPM_HOME \
  && corepack enable \
  && corepack prepare pnpm@10.2.1 --activate \
  && apk add --no-cache poppler-utils
WORKDIR /app
ENV APP_VERSION=$APP_VERSION
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
EXPOSE 3000
CMD ["pnpm", "start"]
