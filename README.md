# Staylo

Multi-tenant SaaS hotel ERP for Indian hotels — PMS, CRM, finance, analytics, web check-in/out,
OTA distribution and a super-admin panel.

- Project rules and architecture: [CLAUDE.md](CLAUDE.md)
- Phase-by-phase build plan: [staylo_build_plan.md](staylo_build_plan.md)

## Repo layout

| Path                    | What it is                                               |
| ----------------------- | -------------------------------------------------------- |
| `apps/web`              | Next.js (App Router) staff app, guest portal, API routes |
| `apps/worker`           | Background jobs and schedules (pg-boss)                  |
| `packages/core`         | Domain logic + Zod schemas (money, tax, permissions)     |
| `packages/db`           | Generated Supabase types and DB helpers                  |
| `packages/ui`           | Design tokens + shared shadcn/ui components              |
| `packages/integrations` | Adapters for payments, messaging, KYC, channel manager   |
| `supabase/`             | Local Supabase config, migrations, seed                  |

## Prerequisites

- **Node.js 24+** (see `.nvmrc`)
- **pnpm** — `npm install -g pnpm` (newer Node versions no longer ship corepack)
- **Git**
- **Docker Desktop** — on Windows enable the WSL 2 backend. It must be running for local Supabase.

## First-time setup

```bash
pnpm install

# Start local Supabase (Postgres, Auth, Storage, Studio) in Docker.
# First run downloads images and takes a few minutes.
pnpm supabase start

# Copy env templates and paste the keys printed by `pnpm supabase status`
cp apps/web/.env.example apps/web/.env.local
cp apps/worker/.env.example apps/worker/.env
```

On Windows PowerShell use `Copy-Item` instead of `cp`.

`pnpm supabase status` shows the local URLs and keys:

- API: http://127.0.0.1:54321
- DB: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- Studio: http://127.0.0.1:54323
- Mailpit (test emails): http://127.0.0.1:54324

## Running

```bash
pnpm dev                    # web + worker together
pnpm --filter web dev       # web only → http://localhost:3000
pnpm --filter worker dev    # worker only (needs Supabase running)
```

The worker logs a `hello` job on startup and a `heartbeat` line every minute.

## Quality checks

```bash
pnpm lint          # ESLint in every package
pnpm typecheck     # tsc in every package
pnpm test          # Vitest in every package
pnpm format        # Prettier write (CI runs format:check)
pnpm build         # production build
```

CI (GitHub Actions) runs install, lint, format check, typecheck and tests on every push and pull request.

## Supabase commands

```bash
pnpm supabase start         # start local stack
pnpm supabase stop          # stop it (data kept)
pnpm supabase db reset      # re-apply migrations + seed.sql
pnpm supabase migration new <name>
```

## Adding shadcn/ui components

Shared components go in `packages/ui`:

```bash
cd packages/ui
pnpm dlx shadcn@latest add <component>
```

> Known issue (shadcn 4.23): the generated file may import `cn` from `"cn"` and add an unrelated
> `cn` npm package. Fix the import to `@staylo/ui/lib/utils` and run `pnpm remove cn`.

## Troubleshooting

- **`supabase start` fails to connect to Docker** — start Docker Desktop and wait until it says
  "Engine running".
- **Ports 54321–54324 in use** — `pnpm supabase stop`, or stop the other project using them.
- **pnpm blocks a package's build script** — approve it with `pnpm approve-builds <pkg>`
  (recorded under `allowBuilds` in `pnpm-workspace.yaml`).
