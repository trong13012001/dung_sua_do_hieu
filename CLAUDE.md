# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

CRM + POS for a luxury-goods repair shop ("Dũng sửa đồ hiệu"). A Next.js 16 / React 19 web app (Supabase backend) that is also wrapped in an Electron shell so the front-counter Windows PC can do **silent thermal printing** (invoices + item labels). UI text is Vietnamese.

The deployed web app (Vercel) is the source of truth; the Electron installer is a thin shell that just loads that URL and adds a print IPC. See `electron/README.md` for the full printing/packaging story (it is unusually detailed and authoritative).

## Commands

Package manager is **Bun** (`bun.lock` is committed), but scripts are invoked via `npm run` / `electron-builder` and work with either.

```bash
npm run dev          # Next dev server on :3000
npm run build        # next build
npm run lint         # eslint (flat config, eslint.config.mjs)
npm run electron     # run the Electron shell (needs the web app reachable — see below)
```

There is **no test suite** and no test runner configured. "Verify" means `npm run lint` + `npm run build`.

### Running Electron locally

`electron/main.cjs` loads a URL chosen in this order: `ELECTRON_START_URL` → `NEXT_PUBLIC_APP_URL` → hardcoded prod default `https://dung-sua-do-hieu.vercel.app`. For local dev, run `npm run dev` in one terminal and `ELECTRON_START_URL=http://localhost:3000 npm run electron` in another. The Electron main process loads `.env`/`.env.local` itself (Next's loader doesn't apply to it) — see `loadElectronEnvFiles` in `main.cjs`.

### Packaging

`npm run dist:electron:win` builds the Windows x64 NSIS installer (the counter PC target) even from macOS. `prepare:electron-icon` copies `public/brand-logo.png` → `electron/build/icon.png` and is chained into every `dist:*` script. Auto-update is via GitHub Releases + `electron-updater`; CI (`.github/workflows/electron-release-win.yml`) publishes on push to `main`. Don't hand-bump `package.json` version — CI sets it to `major.minor.<GITHUB_RUN_NUMBER>`.

## Environment

`.env.local` (not committed). Required:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — client.
- `SUPABASE_SERVICE_ROLE_KEY` — **server only** (`lib/supabase-server.ts`); used by API routes to bypass RLS / create auth users. Never reference it in client code.
- Optional `NEXT_PUBLIC_THERMAL_PRINTER_INVOICE` / `_LABEL` — fallback printer names when shop settings are blank.

## Architecture

### Data layer — Supabase + React Query

- **Two Supabase clients.** `lib/supabase.ts` is the browser client (anon key, custom auth lock + realtime auto-reconnect). `lib/supabase-server.ts`'s `createSupabaseAdmin()` is service-role and **must stay server-side** (API routes / server components only).
- **Schema is managed by hand-applied SQL**, not an ORM or migration tool. `supabase_schema.sql` is the canonical dump; each `supabase_migration_*.sql` is a one-off change applied through the Supabase dashboard. When you change the DB, add a new `supabase_migration_*.sql` file and update `supabase_schema.sql` to match. Business logic partly lives in Postgres functions/triggers (e.g. `increment_order_payment`, `recalculate_customer_debt`, the 11-digit `transaction_code` trigger) — check the SQL before reimplementing such logic in TS.
- **`api/*.ts` are the React Query hook modules** (one per domain: `orders`, `customers`, `payments`, `users`, `roles`, `permissions`, `stats`, `shopSettings`, `orderLogs`). They wrap Supabase calls in `useQuery`/`useMutation`/`useInfiniteQuery`. Components consume these hooks, plus the thin per-domain hooks under `hooks/<domain>/`.
- **Query-key invalidation is centralized and broad.** `invalidateOrderRelatedQueries(qc)` in `api/orders.ts` is the canonical list of order-related keys (`orders`, `orders-infinite`, `orders-page`, `stats`, `payments`, `all-order-items`, `customers`, …). Reuse it after any order/payment mutation rather than invalidating ad hoc, or keys will drift.
- **Realtime.** `hooks/useRealtimeSubscription.ts` (mounted once in the dashboard layout) subscribes to `orders` / `order_details` / `payments` postgres changes and invalidates queries, with a 25s polling fallback + visibility-refetch + auto-reconnect because Realtime drops on phones. Order-status changes also fire `notifyOrderStatusUpdate` (`lib/orderNotification.ts`).

### Auth & permissions

- **Auth = Supabase Auth.** `components/auth/RequireAuth.tsx` gates the whole `(dashboard)` route group (checks `getSession()`, redirects to `/login`).
- **Authorization is role→permission, resolved by email.** A Supabase auth user is matched to a `users` row by **email** (`useCurrentUserPermissions`), then the role's permission names are loaded. There is no RLS-driven UI; gating is client-side.
- **Two gating mechanisms, keep them in sync:**
  - `lib/permissions.ts` — `ROUTE_PERMISSIONS` maps each route to the permission(s) needed; `canAccessRoute()` drives sidebar/nav visibility.
  - `components/auth/Can.tsx` — `<Can permission="..."> / anyOf={[...]}` wraps individual UI elements.
  When you add a route or a gated action, update both the route map and any relevant `<Can>` usage, and ensure the permission name exists in the DB seed (`supabase_schema.sql`).

### Routing & pages

App Router. Real screens live under `app/(dashboard)/` (orders, pos, customers, returns, tasks, my-tasks, employees, roles, permissions, settings, dashboard, profile). `app/login` and `app/reset-password` are outside the group. The only server endpoint is `app/api/users/create/route.ts` (uses the admin client to create an auth user + `users` row). `components/` holds shared UI (`ui/`, `layout/`, `auth/`, `settings/`, `print/`, `providers/`).

### Printing (the non-obvious subsystem)

Browsers can't print silently, so printing fans out across methods. `lib/printSmart.ts` decides between: Electron IPC (`window.electronThermalPrint`, Windows only), a local print agent, or a browser print dialog fallback. `lib/print/` holds the HTML builders and thermal metrics (58mm/80mm `@page` sizing matters — see comments tying `invoiceThermalMetrics.ts` to `main.cjs`). Printer **names** are resolved from shop settings (DB) and synced into a cache (`ShopSettingsSync` provider → `lib/print/shopPrinterCache.ts`); on Windows the device name is fuzzy-matched against `getPrintersAsync()` in `main.cjs`. Two physical printers: invoice (XP-80C) and label (XP-235B). Before touching anything here, read `electron/README.md`.

## Domain model notes

- **Orders** have an aggregate `status` (`New`/`In Progress`/`Ready`/`Paid`/`Delivered`/`DeliveredOwing`/`Completed`) and per-item `order_details` each with their own status and an `assigned_tailor_id`. The "tasks" / "my-tasks" screens are views over `order_details`.
- **`Delivered` vs `DeliveredOwing`** distinguishes an item handed to the customer with its money collected vs. still owed — payment state and handover state are tracked separately. `handed_over_at` is set when an item is delivered.
- **Customer `total_debt`** is a derived aggregate recomputed by the Postgres functions on payment/order changes — don't write it directly from TS.
- `lib/types.ts` is the hand-maintained mirror of the DB schema; keep it aligned when the schema changes.

## Conventions

- Path alias `@/*` → repo root (`tsconfig.json`). TypeScript `strict` is on.
- Comments and UI copy are in Vietnamese; match that when editing existing files.
- `.cursor/rules/karpathy-guidelines.mdc` (always-applied) asks for: surface assumptions/tradeoffs before coding, minimal non-speculative changes, surgical edits that match existing style, and don't delete pre-existing dead code — mention it instead.
