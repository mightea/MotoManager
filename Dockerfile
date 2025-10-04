FROM node:20-alpine AS base
WORKDIR /app
ENV PNPM_HOME=/app/.pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.2.1 --activate

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
ENV PNPM_HOME=/app/.pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.2.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/build ./build
CMD ["pnpm", "start"]
