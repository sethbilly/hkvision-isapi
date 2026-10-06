# Energy Ltd · Attendance Management (Frontend)

React + Vite + Tailwind UI that consumes the Hikvision ISAPI bridge running at
`http://localhost:3000`.

## Pages

| Route | Purpose |
|---|---|
| `/devices` | Enroll Hikvision terminals (host, credentials), list and remove |
| `/users` | Add / edit / delete users on the selected terminal |
| `/enroll` | 4-step fingerprint enrollment wizard (capture + bind to user) |
| `/attendance` | Filter access events by employee + date range |

A device picker in the top-bar selects which terminal pages 2/3/4 operate
against. Selection persists via `localStorage`.

## Setup

```powershell
# from the repo root
cd web
npm install
npm run dev
```

The dev server runs on `http://localhost:5173`. Vite proxies `/api/*` to the
Node backend on `:3000`, so make sure that's running too:

```powershell
# in another terminal at repo root
npm run dev
```

## Tech

- **Vite + React 18 + TypeScript**
- **Tailwind CSS** with a custom palette matching the design (cream canvas,
  dark sidebar, brand red/green/amber)
- **TanStack Query** for server state, caching, and mutations
- **react-router-dom** for routing
- **lucide-react** icons
- **Inter** for body, **Instrument Serif** for italic accents

## Build

```powershell
npm run build
npm run preview
```

Built assets go to `dist/`. You can serve them statically from any host or
behind the existing Express backend if you proxy `/` to the static files.
