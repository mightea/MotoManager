# Security notes

## Session token storage

The API issues an **opaque Bearer session token**. The webapp stores it in
`localStorage` (`moto_auth_token`) and sends it as `Authorization: Bearer …`.

### Why not an HttpOnly cookie?

An `HttpOnly` cookie is the textbook way to keep a session token out of reach of
JavaScript (and thus XSS). It is **not used here** because the API is deployed on a
**separate origin** from the webapp (e.g. app at `moto.example.com`, API at
`moto-api.herrmann.ltd`). A cookie set by the API origin is therefore a
**third-party cookie**, which is blocked by Safari (ITP) and being phased out by
Chrome — it would silently break login and log users out.

An HttpOnly cookie only becomes viable if the API is served **same-origin** with
the app (e.g. reverse-proxied under `moto.example.com/api`). If you move to that
topology, switch to: backend `Set-Cookie: session=…; HttpOnly; Secure;
SameSite=Lax; Path=/`, backend reading the cookie, the frontend sending
`credentials: "include"` and dropping the token from `localStorage` entirely.

### The mitigation we ship instead: Content-Security-Policy

Because the token stays in `localStorage`, the realistic threat is an XSS payload
reading it and exfiltrating it. A CSP is the primary defense: even if a script is
injected, a tight `connect-src` prevents it from sending the token anywhere, and a
strict `script-src` (nonces, no `'unsafe-inline'`) stops the injection running at
all.

`app/root.tsx` ships a **baseline meta CSP in production builds** (`import.meta.env.PROD`).
It enforces the directives that are safe and effective from a static document:

- `default-src 'self'`, `base-uri 'self'`, `object-src 'none'`, `form-action 'self'`
- scoped `img-src` / `font-src` / `style-src` / `frame-src`

It is **deliberately dev-disabled** (a strict `connect-src` would block Vite's HMR
websocket) and is only a **baseline**, because a static single-page app cannot:

- drop `'unsafe-inline'` from `script-src` — the built `index.html` contains inline
  hydration scripts, and per-request **nonces require a server/edge**;
- pin the exact backend / analytics / geocoder origins — they are **runtime config**
  (`window.ENV`), so the meta falls back to `https:` for `script-src`/`connect-src`.

## Recommended: enforce the strict CSP at the edge

Set this as a real **HTTP response header** on the host/CDN/reverse proxy that
serves the app's `index.html`, generating a fresh `nonce` per response and adding
it to the inline hydration scripts. Replace the placeholder origins with yours.

```
Content-Security-Policy:
  default-src 'self';
  base-uri 'self';
  object-src 'none';
  form-action 'self';
  frame-ancestors 'none';
  frame-src 'self' https://www.openstreetmap.org;
  img-src 'self' data: blob: https://<API_ORIGIN> https://*.tile.openstreetmap.org;
  font-src 'self' https://fonts.gstatic.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  script-src 'self' 'nonce-<PER_REQUEST_NONCE>' https://<UMAMI_ORIGIN>;
  connect-src 'self' https://<API_ORIGIN> https://nominatim.openstreetmap.org https://<UMAMI_ORIGIN>;
```

`frame-ancestors` and a per-request nonce are only possible via a header (not a
`<meta>`) — hence the edge layer. Pinning `connect-src` to the exact origins is
what actually closes the token-exfiltration channel.

### Origins the app talks to (pin these)

| Purpose | Origin | Directive |
|---|---|---|
| Backend API + images | `window.ENV.BACKEND_URL` | `connect-src`, `img-src` |
| Reverse geocoding | `https://nominatim.openstreetmap.org` | `connect-src` |
| Map tiles | `https://*.tile.openstreetmap.org` | `img-src` |
| Map embed (iframe) | `https://www.openstreetmap.org` | `frame-src` |
| Web fonts | `https://fonts.googleapis.com` (css), `https://fonts.gstatic.com` (files) | `style-src`, `font-src` |
| Analytics (optional) | `window.ENV.UMAMI_SCRIPT_URL` origin | `script-src`, `connect-src` |

> If Umami analytics is enabled, add its origin to `script-src` (the tracker is an
> external script) and `connect-src`. It is disabled by default.
