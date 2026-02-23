# MotoManager

MotoManager keeps track of your motorcycle fleet: maintenance logs, storage locations, running issues, odometer history, and torque specifications. The app is built with React Router 7, TypeScript, and Tailwind CSS 4, and persists data in SQLite via Drizzle ORM.

## Highlights

- 🔐 **Passkey (WebAuthn) Support:** Secure, biometric-ready login with FaceID, TouchID, or security keys.
- 🏍️ **Fleet Management:** Detailed motorcycle profiles with maintenance history, open issues, and storage tracking.
- 🖨️ **Professional Print View:** High-contrast, clean layouts for torque specifications—perfect for the garage.
- 🛠️ **Drizzle-backed CRUD:** Robust data handling for issues, maintenance, and location records.
- 📊 **Dynamic Dashboards:** Fleet-wide statistics, annual mileage, and condition summaries.
- 🎨 **Modern UI:** Tailwind CSS 4 powered interface with a professional "Motorsport" theme and carbon-fiber accents.
- ✅ **TypeScript-first:** Type-safe codebase with Vitest + Testing Library support.

## Tech Stack

| Layer        | Choice                               |
| ------------ | ------------------------------------- |
| UI / Routing | React 19, React Router 7              |
| Security     | WebAuthn (SimpleWebAuthn), Passkeys   |
| Styling      | Tailwind CSS 4 with custom UI kit     |
| Data         | SQLite + Drizzle ORM                  |
| Tooling      | Vite 6, pnpm, TypeScript 5.9          |
| Testing      | Vitest, Playwright, Testing Library   |

## Requirements

- Node.js 20+
- pnpm 10+

```bash
corepack enable pnpm
```

## Getting Started

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Environment Configuration:**
   For Passkey support to function correctly, ensure the following are set (defaults to localhost for development):
   - `RP_ID`: Relying Party ID (e.g., `localhost` or `app.yourdomain.com`)
   - `ORIGIN`: The full origin URL (e.g., `http://localhost:5173`)

3. **Start the dev server:**
   ```bash
   pnpm dev
   ```

Visit `http://localhost:5173` to view the app.

## Security & Passkeys

MotoManager supports standard password-based authentication and modern **Passkeys**. 

- **Registration:** Log in with your password and navigate to **Settings** to register your current device.
- **Login:** Use the "Passkey-Login" button on the login screen for biometric authentication.
- **Management:** View and delete registered authenticators directly from your account settings.

## Database

MotoManager ships with a versioned SQLite database (`db.sqlite`).

- Apply migrations locally:
  ```bash
  pnpm db:migrate
  ```

- Generate new migrations:
  ```bash
  pnpm drizzle-kit generate
  ```

- Explore the database via Drizzle Studio:
  ```bash
  pnpm studio
  ```

## Common Commands

| Task                        | Command            |
| --------------------------- | ------------------ |
| Start dev server            | `pnpm dev`         |
| Run unit tests              | `pnpm test`        |
| Run E2E tests               | `pnpm test:e2e`    |
| Type checks + route gen     | `pnpm typecheck`   |
| Build for production        | `pnpm build`       |
| Preview SSR build           | `pnpm start`       |
| Generate repo bundle (AI)   | `pnpm repomix`     |

## Project Structure

```
app/
  components/       # Reusable UI building blocks
  db/               # Drizzle schema, migrations, and db client
  routes/           # Route modules with loaders/actions/screens
  services/         # Server-side business logic (Auth, WebAuthn, Images)
  utils/            # Shared helpers (dates, formatting, numbers, ...)
  types/            # Global TypeScript definitions
public/             # Static assets served as-is
tests/              # Vitest & Playwright setup
```

## Deployment

1. Build the production bundle:
   ```bash
   pnpm build
   ```

2. Deploy the generated `build/` folder plus `package.json`, `pnpm-lock.yaml`, and `db.sqlite`. The bundled app runs on any platform that supports Node.js.

---

Happy wrenching! 🧰🏍️
