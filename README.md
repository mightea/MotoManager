# MotoManager

MotoManager keeps track of your motorcycle fleet: maintenance logs, storage locations, running issues, odometer history, and torque specifications. The app features a modern **React Router 7** frontend and communicates with a high-performance **Rust** backend.

## Highlights

- 🔐 **Passkey (WebAuthn) Support:** Secure, biometric-ready login with FaceID, TouchID, or security keys.
- 🏍️ **Fleet Management:** Detailed motorcycle profiles with maintenance history, open issues, and storage tracking.
- 🖨️ **Professional Print View:** High-contrast, clean layouts for torque specifications—perfect for the garage.
- 📶 **Offline First:** Robust offline support via **IndexedDB (Dexie)** ensuring your data is always accessible.
- 📊 **Dynamic Dashboards:** Fleet-wide statistics, annual mileage, and condition summaries.
- 🎨 **Modern UI:** Tailwind CSS 4 powered interface with a professional "Motorsport" theme and carbon-fiber accents.
- ✅ **TypeScript-first:** Type-safe codebase with Vitest + Testing Library support.

## Tech Stack

| Layer        | Choice                               |
| ------------ | ------------------------------------- |
| Frontend     | React 19, React Router 7 (SSR)        |
| Backend      | Rust (Rocket/Axum based API)          |
| Security     | WebAuthn (SimpleWebAuthn), Passkeys   |
| Styling      | Tailwind CSS 4 with custom UI kit     |
| Offline      | IndexedDB + Dexie.js                  |
| Tooling      | Vite 6, pnpm, TypeScript 5.9          |
| Testing      | Vitest, Playwright, Testing Library   |

## Requirements

- Node.js 22+
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
   Create a `.env` file or set environment variables:
   - `BACKEND_URL`: The public URL of your Rust backend (e.g., `https://api.yourdomain.com`).
   - `INTERNAL_BACKEND_URL`: (Optional) Internal Docker network URL for server-to-server proxying (e.g., `http://backend:3001`).
   - `RP_ID`: Relying Party ID for Passkeys (e.g., `app.yourdomain.com`).
   - `ORIGIN`: The full origin URL (e.g., `https://app.yourdomain.com`).

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
  routes/           # Route modules with loaders/actions/screens
  services/         # Client-side API services
  utils/            # Shared helpers (offline sync, formatting, ...)
  types/            # Global TypeScript definitions
public/             # Static assets served as-is
tests/              # Vitest & Playwright setup
```

## Deployment

MotoManager is container-ready. Use the provided `Dockerfile` to build your image:

1. Build the production bundle:
   ```bash
   pnpm build
   ```

2. The application runs as a Node.js server (SSR). Ensure `BACKEND_URL` is set in your production environment so the server-side proxy can reach the API.

---

Happy wrenching! 🧰🏍️
