# Repository Guidelines

## Project Structure & Module Organization
Motobase is a React Router + TypeScript app rooted in `app/`. Route modules live in `app/routes` with their loaders, actions, and screens. Shared UI belongs in `app/components`, persistent providers in `app/contexts`, and reusable hooks or helpers in `app/hooks` and `app/utils`. Database access is centralized in `app/db` via Drizzle ORM. Static assets ship from `public/`, while build and tooling configs sit alongside `package.json`, `vite.config.ts`, and `drizzle.config.ts`.

## Build, Test, and Development Commands
Use pnpm for every workflow:
- `pnpm install` — hydrate dependencies.
- `pnpm dev` — start the React Router dev server with HMR on port 5173.
- `pnpm test` / `pnpm test:watch` — run Vitest once or in watch mode with the configured jsdom environment.
- `pnpm typecheck` — generate route types and execute `tsc` for regressions.
- `pnpm build` / `pnpm start` — produce the SSR bundle and serve it locally.
- `pnpm studio` — launch Drizzle Studio against the checked-in SQLite database.

## Coding Style & Naming Conventions
Stick with TypeScript, ES modules, and functional React components. Prefer PascalCase for components (`MotorcycleSummaryCard`), camelCase for utilities, and kebab-case route filenames (`motorcycle.tsx`). Keep JSX prop order consistent (structural props first, handlers last). Tailwind is the primary styling tool, so group utilities logically and avoid inline style drift. Use 2-space indentation, and commit only formatted, lint-clean code.

## Testing Guidelines
Vitest with Testing Library is configured. Unit specs reside beside the code they cover using a `*.test.ts(x)` suffix. Aim to cover utility logic and critical route loaders first, mocking Drizzle ORM calls when needed. Run `pnpm test` for CI-style checks, or `pnpm test:watch` while developing. Snapshot or integration helpers should live under `tests/` if they span multiple modules, and document any required fixtures in the PR.

## Commit & Pull Request Guidelines
Commits stay short and imperative in lowercase (e.g., `add storage locations to settings`). Group related work and avoid mixing refactors with features. For pull requests, summarize the problem, outline the fix, call out schema changes, and reference related issues. Attach before/after screenshots or terminal output for UI or data changes so reviewers can validate quickly.

## Database & Configuration Tips
The SQLite database (`db.sqlite`) is versioned for convenience—avoid committing personal data. Keep Drizzle migrations aligned with schema changes, and surface any required environment variables (API keys, storage secrets, etc.) in the PR description to keep reviewers unblocked.
