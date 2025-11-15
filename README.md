# MotoManager

MotoManager keeps track of your motorcycle fleet: maintenance logs, storage locations, running issues, odometer history, and key registration details. The app is built with React Router, TypeScript, and Tailwind, and persists data in SQLite via Drizzle ORM.

## Highlights

- 🏍️ Motorcycle profile pages with maintenance history, open issues, and storage tracking
- 🛠️ Drizzle-backed CRUD actions for issues, maintenance, and location records
- 📊 Dynamic dashboards showing annual mileage and condition summaries
- 🎨 Tailwind-powered UI components with reusable dialog, card, and table patterns
- 🔁 Server-side data loaders and actions wired to React Router v7
- ✅ TypeScript-first codebase with Vitest + Testing Library support

## Tech Stack

| Layer        | Choice                               |
| ------------ | ------------------------------------- |
| UI / Routing | React 19, React Router 7              |
| Styling      | Tailwind CSS 4 with custom UI kit     |
| Data         | SQLite + Drizzle ORM                  |
| Tooling      | Vite 6, pnpm, TypeScript 5.8          |
| Testing      | Vitest, @testing-library/react        |

## Requirements

- Node.js 20+
- pnpm 9+

```bash
corepack enable pnpm
```

## Getting Started

Install dependencies after cloning:

```bash
pnpm install
```

Start the dev server (HMR on port 5173):

```bash
pnpm dev
```

Visit `http://localhost:5173` to view the app.

## Database

MotoManager ships with a versioned SQLite database (`db.sqlite`). All schema changes must go through Drizzle migrations.

- Apply migrations locally:

  ```bash
  pnpm drizzle-kit push
  ```

- Explore the database via Drizzle Studio:

  ```bash
  pnpm studio
  ```

> **Note:** Migration `0001_add_odometer_to_location_records.sql` introduces an `odometer` column that is required for accurate mileage calculations. Apply it before relying on storage-location data.

## Common Commands

| Task                        | Command            |
| --------------------------- | ------------------ |
| Start dev server            | `pnpm dev`         |
| Run unit tests              | `pnpm test`        |
| Watch tests                 | `pnpm test:watch`  |
| Type checks + route gen     | `pnpm typecheck`   |
| Build for production        | `pnpm build`       |
| Preview SSR build           | `pnpm start`       |
| Generate repo bundle (AI)   | `pnpm repomix`     |

## Project Structure

```
app/
  components/       # Reusable UI building blocks
  contexts/         # React context providers (Motorcycle, Settings, ...)
  db/               # Drizzle schema, migrations, and db client
  hooks/            # Custom hooks
  routes/           # Route modules with loaders/actions/screens
  utils/            # Shared helpers (dates, formatting, numbers, ...)
public/             # Static assets served as-is
tests/              # Vitest setup and cross-cutting helpers
```

## Conventions

- **Routing:** Each file in `app/routes` owns its loader, action, and screen.
- **State:** Use providers under `app/contexts` for cross-route state (e.g. `MotorcycleProvider`).
- **Styling:** Prefer Tailwind classes; compose higher-order patterns through the UI component library.
- **Forms:** Use `react-hook-form` + Zod schemas to validate user input.
- **Database:** Keep all queries inside loaders/actions via the shared Drizzle client (`~/db`).

## Testing

- Co-locate tests with implementation using the `*.test.ts(x)` suffix.
- Mock Drizzle when testing business logic that talks to the database.
- Use Testing Library for component behavior and interactions.

```bash
pnpm test        # run once
pnpm test:watch  # during development
```

## Deployment

1. Apply migrations and run the test/typecheck suites.
2. Build the production bundle:

   ```bash
   pnpm build
   ```

3. Deploy the generated `build/` folder plus `package.json`, the lockfile, and `db.sqlite` (or configure an external database). The bundled app runs on any platform that supports Node.js, including Render, Fly.io, Railway, traditional VPS, or container hosts.

## Repomix

Use the bundled Repomix configuration (`repomix.config.ts`) to produce an AI-friendly snapshot of the codebase. The command below writes a Markdown bundle to `tmp/repomix-output.md`, automatically ignoring build artifacts, binaries, and database files:

```bash
pnpm repomix
```

This is useful when sharing context with AI assistants or collaborators who need an at-a-glance view of the repository.

---

Happy wrenching! 🧰🏍️
