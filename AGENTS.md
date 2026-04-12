# Repository Guidelines

## Project Structure & Module Organization

MotoManager is a React Router + TypeScript app rooted in `app/`. Route modules live in `app/routes` with their loaders, actions, and screens. Shared UI belongs in `app/components`, and reusable hooks or helpers live in `app/utils`. The frontend communicates with a separate Rust backend via a server-side proxy (`app/routes/api.proxy.ts`). Client-side persistence and offline synchronization are handled via Dexie.js in `app/utils/db.client.ts`. Static assets ship from `public/`, while build and tooling configs sit alongside `package.json` and `vite.config.ts`.

## Build, Test, and Development Commands

Use pnpm for every workflow:

- `pnpm install` — hydrate dependencies.
- `pnpm dev` — start the React Router dev server with HMR on port 5173.
- `pnpm test` / `pnpm test:watch` — run Vitest once or in watch mode with the configured jsdom environment.
- `pnpm typecheck` — generate route types and execute `tsc` for regressions.
- `pnpm build` / `pnpm start` — produce the SSR bundle and serve it locally.

## Coding Style & Naming Conventions

Stick with TypeScript, ES modules, and functional React components. Prefer PascalCase for components (`MotorcycleSummaryCard`), camelCase for utilities, and kebab-case route filenames (`motorcycle.tsx`). Keep JSX prop order consistent (structural props first, handlers last). Tailwind is the primary styling tool, so group utilities logically and avoid inline style drift. Use 2-space indentation, and commit only formatted, lint-clean code.

## Testing Guidelines

Vitest with Testing Library is configured. Unit specs reside in the test directory with the same folder structure as the code they cover using a `*.test.ts(x)` suffix. Aim to cover utility logic and critical route loaders first. Run `pnpm test` for CI-style checks, or `pnpm test:watch` while developing. Snapshot or integration helpers should live under `tests/` if they span multiple modules, and document any required fixtures in the PR.

## Database & Configuration Tips

Persistence is split between the Rust backend and client-side Dexie.js. Local caching and offline edits are handled in IndexedDB. Surface any required environment variables (BACKEND_URL, RP_ID, etc.) in the PR description to keep reviewers unblocked.
