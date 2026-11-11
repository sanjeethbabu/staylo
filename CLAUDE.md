# CLAUDE.md — Staylo

Staylo is a multi-tenant SaaS hotel ERP for Indian hotels: PMS, CRM, finance, analytics, web check-in/out,
OTA distribution via a channel manager, and a super-admin panel. The phase-by-phase plan lives in
`staylo_build_plan.md`. Read both files before starting any work.

## Tech stack

- **Monorepo:** pnpm workspaces (`apps/*`, `packages/*`), TypeScript strict everywhere.
- **Web:** Next.js (App Router, Server Components, Server Actions), Tailwind CSS v4, shadcn/ui, lucide icons.
- **Database / auth / storage / realtime:** Supabase (Postgres). Local dev via the Supabase CLI (Docker).
- **Background jobs:** `apps/worker` — Node + TypeScript, pg-boss on the same Postgres.
- **Validation:** Zod at every boundary (forms, server actions, API routes, webhooks, job payloads).
- **Tests:** Vitest (unit + DB/RLS tests against the local Supabase).
- **Hosting (later):** Vercel (web, Mumbai), Railway (worker), Supabase (Mumbai), Sentry.

## Repo layout

```
apps/web               Next.js staff app, guest portal, public pages, API routes / webhooks
apps/worker            pg-boss worker: jobs, schedules (night audit, reminders, syncs)
packages/core          Pure domain logic + Zod schemas (money, tax, pricing, permissions). No I/O.
packages/db            Generated Supabase types, DB client helpers, query functions
packages/ui            Design tokens, shared React components (shadcn-based), cn() helper
packages/integrations  Adapters: payments, messaging, email, KYC, channel manager (interface + mock + real)
supabase/              config.toml, migrations/, seed.sql, tests
```

Packages are consumed as TypeScript source (`@staylo/<name>`), no build step in dev.

## Hard rules

1. **Tenant isolation:** every tenant table has `hotel_id uuid not null`, `created_at`, `updated_at`.
   RLS is enabled on **every** table, with policies based on `current_hotel_ids()` and the user's role.
   No table ships without RLS tests.
2. **Service-role key** only in the worker and in specific server-only code that truly needs it
   (webhooks, jobs). Never in client code, never `NEXT_PUBLIC_*`.
3. **Money** is integer **paise** (`bigint` in Postgres, `number` integer in TS validated by Zod).
   Never floats for money. Percentages for config may be `numeric`.
4. **Time:** store `timestamptz` in UTC; hotel business logic uses the hotel's timezone
   (default `Asia/Kolkata`) and the hotel's business date, never the server clock date.
5. **Validation:** all external input is parsed with Zod before use.
6. **Audit:** every create/update/delete of business data writes an `audit_logs` row (actor, before, after).
7. **Transactions** around anything touching inventory or money; DB constraints (e.g. exclusion
   constraints) as the final guard against double booking.
8. **Webhooks:** verify signatures, store raw event with an idempotency key, process in a job, ignore duplicates.
9. **Personal data:** no guest PII or secrets in logs. ID documents in private storage, accessed via
   short-lived signed URLs, every view audited. Store only the last 4 digits of Aadhaar.
10. **Secrets** only in `.env*` files (git-ignored) or hosting dashboards. Only `.env.example` is committed.
11. **Integrations** go through an adapter interface in `packages/integrations` with a mock implementation;
    the real provider is selected by env.
12. **Migrations** are SQL files in `supabase/migrations`; never edit an applied migration — add a new one.
    Regenerate types into `packages/db` after schema changes.
13. **UI:** use design tokens from `packages/ui`; every screen has loading, empty and error states;
    works on mobile.
14. Before finishing any task: `pnpm lint && pnpm typecheck && pnpm test` must pass.

## Commands

```
pnpm install                 install everything
pnpm supabase start          start local Supabase (Docker must be running)
pnpm supabase db reset       re-apply migrations + seed
pnpm dev                     run web + worker
pnpm --filter web dev        run only the web app
pnpm --filter worker dev     run only the worker
pnpm lint | typecheck | test | build
```

## Conventions

- **Next.js 16 changes often:** before writing Next.js code, read `apps/web/AGENTS.md` and the docs in
  `apps/web/node_modules/next/dist/docs/`.

- Files: kebab-case. React components: PascalCase exports. Server actions in `actions.ts` next to the route.
- Domain logic goes in `packages/core` with unit tests, not inside React components or route handlers.
- Commit per phase/step: `Phase N: <name>`.

## Decisions log

| Date       | Decision                                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-11 | pnpm installed globally via npm (Node 26 no longer bundles corepack).                                                                  |
| 2026-11-11 | Tailwind v4 + shadcn/ui; shared ESLint flat config at repo root; no Turborepo yet.                                                     |
| 2026-11-11 | Internal packages consumed as TS source (`transpilePackages` in Next.js).                                                              |
| 2026-11-11 | Money as integer paise from day one (`moneyPaiseSchema` in `packages/core`).                                                           |
| 2026-11-11 | TypeScript pinned to ~6.0 (typescript-eslint does not support TS 7 yet). Avoid `baseUrl` (deprecated in TS 6).                         |
| 2026-11-11 | pnpm 12 blocks dependency build scripts; approved ones are listed under `allowBuilds` in `pnpm-workspace.yaml`.                        |
| 2026-11-11 | shadcn 4.23 bug: `add` writes `import { cn } from "cn"` and installs npm `cn`. Fix import to `@staylo/ui/lib/utils`, `pnpm remove cn`. |
| 2026-11-11 | pg-boss uses its own `pgboss` schema in the Supabase Postgres. Scheduled jobs pass an explicit `tz`.                                   |
