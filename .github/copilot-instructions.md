# Repository Guidelines

## Project Structure & Module Organization

MotoManager is a React Router + TypeScript app rooted in `app/`. Route modules live in `app/routes` with their loaders, actions, and screens. Shared UI belongs in `app/components`, persistent providers in `app/contexts`, and reusable hooks or helpers in `app/hooks` and `app/utils`. Database access is centralized in `app/db` via Drizzle ORM. Static assets ship from `public/`, while build and tooling configs sit alongside `package.json`, `vite.config.ts`, and `drizzle.config.ts`.

## Build, Test, and Development Commands

Use pnpm for every workflow:

- `pnpm install` — hydrate dependencies.
- `pnpm dev` — start the React Router dev server with HMR on port 5173.
- `pnpm test` / `pnpm test:watch` — run Vitest once or in watch mode with the configured jsdom environment.
- `pnpm typecheck` — generate route types and execute `tsc` for regressions.
- `pnpm lint` — run oxlint to check for style and correctness issues.
- `pnpm build` / `pnpm start` — produce the SSR bundle and serve it locally.

## General Instructions

- ALWAYS run `pnpm typecheck` and `pnpm lint` before finishing a task to ensure no regressions or style issues were introduced.
- When you generate new TypeScript code, follow the existing coding style.
- Ensure all new functions and classes have JSDoc comments.
- Prefer functional programming paradigms where appropriate.
- Optimize the pages for fast loading times and responsiveness.

## Coding Style & Naming Conventions

- Use 2 spaces for indentation.
- Stick with TypeScript, ES modules, and functional React components.
- Prefer PascalCase for components (`MotorcycleSummaryCard`), camelCase for utilities, and kebab-case route filenames (`motorcycle.tsx`).
- Keep JSX prop order consistent (structural props first, handlers last).
- Tailwind is the primary styling tool, so group utilities logically and avoid inline style drift.
- Commit only formatted, lint-clean code.

## Tools and Libraries

- Use tailwindcss for styling.
- Use pnpm for package management.
- Use drizzle-orm for database interactions.
- Use oxlint for linting.
- Use React Compiler for automatic memoization.

## Testing Guidelines

- Place tests in the `/tests` directory, mirroring the source file structure.
- Place Playwright tests in the `/tests/e2e` directory.
- Vitest with Testing Library is configured. Unit specs use a `*.test.ts(x)` suffix.
- Aim to cover utility logic and critical route loaders first, mocking Drizzle ORM calls when needed.
- Run `pnpm test` for CI-style checks, or `pnpm test:watch` while developing.
- Snapshot or integration helpers should live under `tests/` if they span multiple modules.

## Commit & Pull Request Guidelines

- Commits stay short and imperative in lowercase (e.g., `add storage locations to settings`).
- Group related work and avoid mixing refactors with features.
- For pull requests, summarize the problem, outline the fix, call out schema changes, and reference related issues.
- Attach before/after screenshots or terminal output for UI or data changes so reviewers can validate quickly.

## Database & Configuration Tips

- The SQLite database (`db.sqlite`) is versioned for convenience—avoid committing personal data.
- Keep Drizzle migrations aligned with schema changes.
- Surface any required environment variables (API keys, storage secrets, etc.) in the PR description to keep reviewers unblocked.

## App Structure & Pages

The application is built with React Router 7 and follows a modular route structure:

### Authentication

- **Login/Register (`/auth/login`)**: Entry point for user authentication. Supports first-user registration for admin accounts.

### Main Views

- **Garage/Home (`/`)**: Dashboard displaying all motorcycles in the user's garage with summary statistics and sorting options.
- **Documents (`/documents`)**: Global document management view where users can upload and manage PDF/image files, either privately or publicly.

### Motorcycle Details

- **Overview (`/motorcycle/:slug/:id`)**: Detailed view of a specific motorcycle, including technical data, ownership history, and a list of maintenance records.
- **Service Documents (`/motorcycle/:slug/:id/documents`)**: View and manage documents specifically assigned to a motorcycle.
- **Torque Specs (`/motorcycle/:slug/:id/torque-specs`)**: Reference table for torque specifications, with support for importing values from other motorcycles.

### Settings & Admin

- **User Settings (`/settings`)**: Personal account management, including password changes and storage location configuration.
- **Admin Area (`/settings/admin`)**: System-wide management for administrators, including user roles, currency conversion rates, and maintenance tasks like preview regeneration.
- **Server Stats (`/settings/server-stats`)**: Global instance statistics providing insights into the total number of users, motorcycles, and records.
