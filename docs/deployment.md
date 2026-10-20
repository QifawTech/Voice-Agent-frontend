# Frontend Deployment & Operations Guide (DevOps)

Audience: the engineer deploying the Voice Agent **admin console** (React 19 +
Vite + TypeScript). The output is a **static SPA** — a folder of HTML/JS/CSS with
no Node.js runtime required in production.

> Backend deployment (API + LiveKit worker + infra) is documented separately in
> `../../Voice-Agent-backend/docs/deployment.md`.

---

## 1. What you are deploying

- `npm run build` produces a static bundle in **`dist/`**.
- Serve `dist/` from any static host (nginx, S3+CloudFront, Netlify, Vercel,
  Cloudflare Pages, GitHub Pages, …).
- It is a **single-page app**: the host must fall back to `index.html` for
  unknown routes, or client-side routing (React Router) 404s on refresh/deep link.

---

## 2. The one thing that trips everyone up: build-time env

Vite inlines `import.meta.env.VITE_*` values **at build time**, not runtime.
The app reads `VITE_API_URL` (`src/lib/constants.ts`). Consequences:

- You must set `VITE_API_URL` **before** `npm run build`. Changing it later means
  rebuilding — you cannot flip the backend URL by editing a file on the server.
- The value ends up in the shipped JS. Only put **public** URLs there, never
  secrets.

Two valid strategies:

| Strategy | `VITE_API_URL` | Backend routing |
|----------|----------------|-----------------|
| **Same origin** (recommended) | leave **empty** | reverse proxy forwards `/api` + `/ws` to the backend. App uses relative paths, no CORS. |
| **Separate API domain** | `https://api.example.com` | backend `CORS_ORIGINS` must list the console origin. |

---

## 3. Build

```bash
cd Voice-Agent-frontend

# Reproducible install from the lockfile (CI-friendly)
npm ci

# Same-origin build (proxy handles /api, /ws):
npm run build

# OR cross-origin build (API on its own domain):
VITE_API_URL=https://api.example.com npm run build
```

`npm run build` runs `tsc` first (type-check) then `vite build`. A type error
fails the build — that is intended; fix it rather than skipping the check.

Output lands in `dist/`. Preview the production bundle locally with:
```bash
npm run preview        # serves dist/ (default on the Vite preview port)
```

---

## 4. Hosting options

### A. nginx (same host as API — recommended)

Build with an **empty** `VITE_API_URL`, copy `dist/` to the web root, and let
nginx proxy `/api` + `/ws` to the backend. The full server block (TLS + SPA
fallback + proxy) is in the backend guide, §9. The essential SPA rule:

```nginx
root /var/www/voice-agent-frontend/dist;
location / {
    try_files $uri $uri/ /index.html;   # SPA fallback — required
}
```

Cache hashed assets hard, never cache `index.html`:
```nginx
location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
location = /index.html { add_header Cache-Control "no-cache"; }
```

### B. Docker (nginx static image)

No Dockerfile ships in the repo. A minimal multi-stage one:

```dockerfile
# Dockerfile  (place in Voice-Agent-frontend/)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=""              # pass at build: --build-arg VITE_API_URL=...
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Provide an nginx.conf with the SPA try_files fallback (see option A)
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

Build:
```bash
docker build --build-arg VITE_API_URL=https://api.example.com -t voice-agent-frontend .
```

### C. Managed static hosts (Netlify / Vercel / Cloudflare Pages / S3+CloudFront)

- **Build command:** `npm run build` — **Output dir:** `dist`
- Set `VITE_API_URL` in the provider's build-time environment variables.
- Add an SPA rewrite so all paths serve `index.html`:
  - Netlify `_redirects`: `/*  /index.html  200`
  - Vercel `vercel.json`: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
  - S3+CloudFront: set the custom error response for 403/404 → `/index.html` (200)
- These hosts cannot proxy `/api` to your backend, so use the **separate API
  domain** strategy (§2) and configure backend CORS.

---

## 5. CI build sketch

```yaml
# e.g. GitHub Actions
- uses: actions/setup-node@v4
  with: { node-version: 20, cache: npm }
- run: npm ci
- run: npm run build
  env:
    VITE_API_URL: ${{ vars.VITE_API_URL }}   # empty for same-origin deploys
- # upload ./dist to your host / artifact store
```

---

## 6. Runtime notes & checklist

- **No server process.** Nothing to keep alive, no port to open — it's static
  files. "Restarting the frontend" = redeploying `dist/`.
- **WebSocket voice** goes through `/ws` — if you proxy it, keep a long
  `proxy_read_timeout` (see backend guide) or calls drop.
- **Health:** there's no `/health` on the frontend; monitor that `index.html`
  and `/assets/*` return 200 via your uptime check.

**Deploy checklist**
- [ ] Decided same-origin vs. separate-API-domain (§2)
- [ ] Built with the correct `VITE_API_URL` (empty for same-origin)
- [ ] `npm ci` used (lockfile), build type-check passed
- [ ] `dist/` deployed to the static host
- [ ] SPA fallback to `index.html` configured (no 404 on refresh/deep link)
- [ ] `index.html` not cached; hashed `/assets/*` cached long
- [ ] If cross-origin: backend `CORS_ORIGINS` includes the console origin
- [ ] TLS valid; `/`, `/api`, `/ws` all resolve
