# Staylo — End-to-End Build Plan (Claude Code, phase by phase)

Staylo is a multi-tenant SaaS hotel ERP for Indian hotels: PMS, CRM, finance, analytics, web check-in/out,
OTA distribution through a channel manager, and a super-admin panel for the Staylo team.

This file is the master plan. Keep it in the repo root next to `CLAUDE.md`. Work through the phases in order.

---

## 0. Before you start (one time)

**Install:** VS Code · Node.js (current LTS) · pnpm (`npm install -g pnpm`) · Git · Docker Desktop (Windows: enable WSL 2) · a GitHub account.

**Install Claude Code:** VS Code → Extensions (Ctrl+Shift+X) → search "Claude Code" (publisher: Anthropic) → Install.
CLI alternative on Windows PowerShell: `irm https://claude.ai/install.ps1 | iex` (other OS: see https://code.claude.com/docs/en/quickstart).

**Project folder:**
1. Create an empty folder `staylo`, open it in VS Code.
2. Put `CLAUDE.md` and this file (`STAYLO_BUILD_PLAN.md`) in it.
3. `git init`, create a private GitHub repo, connect it.

**Accounts you will need later (only you can create these):** Supabase · Vercel · Railway · Razorpay · Meta WhatsApp Business (or a BSP) · KYC provider (HyperVerge / IDfy / Didit) · channel manager partner (STAAH / AxisRooms / eZee …) · Sentry · domain name.

---

## 1. The working loop (repeat for every phase)

1. In Claude Code type `/clear` (fresh context for each phase).
2. Switch to **Plan mode** (Shift+Tab until it shows plan mode, or type `/plan`).
3. Paste the **standard header** below + the phase prompt.
4. Read the plan. Check tables, RLS, screens. Ask "why?" for anything unclear. Then approve.
5. Let Claude implement and run `pnpm lint && pnpm typecheck && pnpm test`.
6. Test it yourself in the browser with the demo hotel, using the phase's **Done when** checklist.
7. Problems → paste the exact error / describe expected vs actual. Don't say "it's not working".
8. `git add . && git commit -m "Phase X: <name>"` and push.
9. Add any new decisions to the **Decisions log** in `CLAUDE.md`.

### Standard header (paste at the top of every phase prompt)
```
Read CLAUDE.md and STAYLO_BUILD_PLAN.md first and follow all hard rules.
We are on Phase <N>: <name>. Phases 1–<N-1> are complete.
Work in plan mode: explore the existing code, then show me a plan (files to add/change, DB tables and
RLS policies, components, jobs, tests). Wait for my approval before writing code.
After implementing, run lint, typecheck and tests, fix all failures, then give me a short summary
and step-by-step instructions to test it manually.
```

### Golden rules for you
- Never skip Phase 2 and 3 (database + multi-tenancy). Everything depends on them.
- Commit after every working step — Git is your undo button.
- Read every migration and RLS policy before approving.
- Never paste real secrets or real guest data into prompts. Put keys in `.env` files yourself.
- One phase per conversation. If a session gets long, use `/compact` or finish the phase and `/clear`.
- Every 3–4 phases, run the review prompt in Phase 17 on what exists so far.

---

## STAGE A — FOUNDATION

### Phase 1 — Monorepo skeleton
```
Goal: Set up the Staylo monorepo exactly as described in CLAUDE.md.

Requirements:
- pnpm workspaces: apps/web, apps/worker, packages/core, packages/db, packages/ui, packages/integrations
- apps/web: Next.js App Router, TypeScript strict, Tailwind, shadcn/ui initialised, ESLint + Prettier
- apps/worker: Node + TypeScript, tsx for dev, pg-boss connected to the local Supabase Postgres,
  one example job ("hello") and one example scheduled job running every minute (logs only)
- packages/core: Zod installed, an example schema + function + unit test
- Local Supabase (supabase CLI as a root dev dependency), supabase/config, empty seed.sql
- Root scripts: dev, build, lint, typecheck, test (run across all packages)
- Test runner: Vitest
- .env.example files for web and worker (no real secrets), .gitignore covering all env files
- GitHub Actions CI: install, lint, typecheck, test on every push and pull request
- README with local setup steps
```
**Done when:** `pnpm supabase start` works · `pnpm --filter web dev` shows the Next.js page · worker logs the scheduled job · `pnpm lint && pnpm typecheck && pnpm test` pass · CI is green on GitHub.

### Phase 2 — Core database + multi-tenancy
```
Goal: Create the foundational schema with strict tenant isolation.

Tables (all tenant tables have hotel_id, created_at, updated_at):
- hotels (name, slug/subdomain, legal_name, gstin, address, state, timezone default 'Asia/Kolkata',
  currency 'INR', check_in_time, check_out_time, logo_url, status)
- profiles (1:1 with auth.users: full_name, phone)
- hotel_memberships (user_id, hotel_id, role: owner|manager|front_desk|housekeeping|accounts, status)
- room_types (name, code, base_occupancy, max_adults, max_children, max_occupancy, amenities jsonb)
- rooms (number, floor, room_type_id, status enum: vacant_clean|vacant_dirty|occupied|inspected|
  out_of_order|out_of_service, is_active)
- tax_rules (name, rate_percent as numeric for config, applies_to, slab rules jsonb)
- audit_logs (hotel_id, actor_user_id, entity, entity_id, action, before jsonb, after jsonb, created_at)
- platform_admins (separate from hotel users; user_id, role: super_admin|support|sales|finance)

Rules:
- RLS on every table. Helper SQL function current_hotel_ids() based on hotel_memberships.
- Role-aware policies (e.g. housekeeping can update room status but not see finance tables later).
- Indexes on hotel_id and common lookups.
- RLS tests (pgTAP or Vitest against local DB) proving: user of hotel A cannot select/insert/update/delete
  rows of hotel B; a user with no membership sees nothing.
- seed.sql: two demo hotels ("Grand Palace Chennai" with 20 rooms across 4 room types, "Sea Breeze Goa"
  with 10 rooms), one owner user for each, plus staff users for each role.
- Generate TypeScript types into packages/db.
```
**Done when:** `pnpm supabase db reset` runs clean · Studio shows seeded data · all RLS tests pass · you've read every policy.

### Phase 3 — Authentication, tenant resolution, roles
```
Goal: Hotel signup, staff login, subdomain-based tenancy and role-based access.

Requirements:
- Public signup page: hotel name, subdomain (validated, unique), owner name, email, phone, password.
  Creates hotel + owner membership in one transaction, starts a 14-day trial (store trial_ends_at).
- Login, logout, forgot/reset password (Supabase Auth). Email verification.
- Middleware: resolve hotel from subdomain ({slug}.localhost:3000 in dev; document how to test locally),
  verify the logged-in user is a member of that hotel, otherwise redirect.
- If a user belongs to multiple hotels, a hotel switcher.
- Role guard helper in packages/core (can(user, action)) used by server actions and UI.
- Staff management page (owner/manager only): invite by email with role, resend/revoke invite,
  change role, deactivate user. Invite acceptance flow.
- Audit log entries for signup, invites, role changes.
```
**Done when:** you can sign up a new hotel, invite a front-desk user, log in as them, and confirm they cannot access the staff page · a Grand Palace user cannot open Sea Breeze's subdomain.

### Phase 4 — Premium app shell
```
Goal: Build the premium UI shell for the staff app.

Requirements:
- Collapsible left sidebar with modules: Dashboard, Reservations, Front Desk, Rooms & Housekeeping,
  Guests (CRM), Billing & Finance, Reports, Channel Manager, Settings. Items filtered by role.
- Top bar: hotel name/logo + switcher, business date, global search, notifications bell, user menu.
- Ctrl+K command palette: navigate to modules, search guests/bookings (stub search for now), quick actions.
- Light/dark mode with persisted preference. Define design tokens (colours incl. room-status colours,
  radius, spacing) in packages/ui and use them everywhere.
- Each module has a placeholder page with a proper empty state (icon, title, description, primary action).
- Reusable components: PageHeader, DataTable (sorting, filters, pagination), Drawer form wrapper,
  StatCard, StatusBadge, ConfirmDialog, loading skeletons, error boundary.
- Fully responsive: sidebar becomes a sheet on mobile.
- Premium, clean look (reference: Zoho / Linear) — consistent spacing, subtle borders, no clutter.
```
**Done when:** the shell looks premium in light and dark mode, works on a phone-sized screen, and the sidebar changes by role.

---

## STAGE B — PMS CORE

### Phase 5 — Property setup (rooms, rate plans, taxes, policies)
```
Goal: Owners can fully configure their hotel.

Requirements:
- Settings → Property: hotel details, GSTIN, address, timezone, check-in/out times, logo upload.
- Room types CRUD and Rooms CRUD (bulk add rooms e.g. 101–120 on floor 1).
- Rate plans: name, code, room type, meal plan (EP/CP/MAP/AP), base rate per night (paise),
  extra adult/child charges, min stay, cancellation policy reference, active flag.
- Seasonal/date-range rate overrides and day-of-week pricing.
- Taxes: GST slabs configurable as rules (rate depends on per-night room tariff); calculation function in
  packages/core with thorough unit tests (boundary values).
- Policies: cancellation policies, no-show policy, child policy, ID requirements for web check-in
  (accepted ID types, selfie required yes/no, ID retention days).
- All changes audited.
```
**Done when:** you can configure Grand Palace from scratch and the tax function tests pass for slab boundaries.

### Phase 6 — Reservations + tape chart
```
Goal: Create and manage reservations with a fast, interactive tape chart.

Data:
- guests (hotel_id, name, phone, email, nationality, address, notes, vip flag)
- reservations (code e.g. GP-000123, source: direct|walk_in|phone|ota|booking_engine, ota_name,
  status: tentative|confirmed|checked_in|checked_out|cancelled|no_show, arrival, departure,
  adults, children, special_requests, booker info)
- reservation_rooms (reservation_id, room_type_id, room_id nullable until assigned, stay daterange,
  rate_plan_id, nightly rates jsonb, status)
- Postgres exclusion constraint so the same room cannot have overlapping active stays.

Features:
- Tape chart: rooms as rows grouped by room type, 14/30-day columns, bookings as bars coloured by status,
  today marker, horizontal scroll, sticky room column.
- Click empty cell → New reservation drawer (guest search/create, dates, room type, room, rate plan,
  occupancy, price breakdown with taxes, payment/deposit note).
- Drag a bar to move room/dates; resize to change dates; re-check availability and price; confirm dialog.
- Availability panel per room type per date.
- Reservation detail page: summary, guests, rooms, timeline of changes (from audit log), cancel / no-show.
- Group booking: multiple rooms in one reservation.
- Realtime: changes appear in other open browsers instantly (Supabase Realtime).
- Tests: overlapping booking is rejected at DB level; price calculation; cancellation.
```
**Done when:** create, move, resize, cancel bookings · a second browser window updates live · double booking is impossible even if two users try at once.

### Phase 7 — Front desk + housekeeping
```
Goal: Run the daily arrival → stay → departure operations.

Requirements:
- Front Desk page: today's Arrivals, In-house, Departures tabs with counts and quick actions.
- Check-in flow (desk version): verify guest details, assign/change room (only clean/inspected rooms
  suggested), capture ID details manually (web check-in comes in Phase 10), collect deposit note,
  mark checked_in → room becomes occupied. Early check-in flag.
- Check-out flow: shows folio balance placeholder (real folio in Phase 8), mark checked_out → room becomes
  vacant_dirty. Late check-out flag.
- Room status board: grid of all rooms with status colours, filters by floor/type/status, room status
  summary chart (donut) and counts. Bulk status updates.
- Housekeeping: tasks table (room, type: checkout clean|stay-over|inspection|deep clean, assignee,
  status, priority, notes). Auto-create a checkout-clean task on check-out.
  Mobile-first housekeeping view: "My tasks", tap to start/complete, mark room clean;
  supervisor marks inspected.
- Maintenance: out-of-order/out-of-service with reason and date range; blocks the room on the tape chart.
- No-show handling: action on arrivals not checked in after a cutoff.
- Everything audited and realtime.
```
**Done when:** you can run a full day for the demo hotel: arrival, check-in, check-out, housekeeping cleans the room on a phone, supervisor inspects, room is available again.

### Phase 8 — Folio, payments, invoices, night audit
```
Goal: Correct billing and the end-of-day close.

Data:
- folios (reservation_id, guest/company payer, status open|settled|closed)
- folio_lines (type: room|tax|food|laundry|minibar|misc|discount|adjustment, description, qty,
  unit_amount_paise, tax_paise, total_paise, business_date, posted_by, voided flag + reason)
- payments (method: cash|upi|card|bank|ota_prepaid|razorpay, amount_paise, reference, status)
- invoices (number per hotel sequence, GST breakup CGST/SGST/IGST, B2B GSTIN, pdf path)
- companies (corporate accounts with GSTIN, credit limit) and accounts-receivable ledger
- business_dates (hotel_id, current business date)

Features:
- Folio screen inside the reservation: post charges, discounts, adjustments, void with reason
  (permission-controlled), split folio, route charges to a company.
- Record payments and refunds; balance always derived from lines minus payments.
- Invoice generation (PDF via the worker) with hotel GSTIN, guest/company GSTIN, HSN/SAC, tax breakup;
  CGST+SGST for intra-state, IGST for inter-state B2B. Invoice numbering format from Decisions log.
- Check-out now requires zero balance (or transfer to company AR).
- Night audit job (worker, per hotel at configured time in hotel timezone): post room + tax charges
  for in-house guests, mark no-shows per policy, roll business date, store a daily snapshot
  (occupancy, revenue by category) for reports. Manual "run night audit" button for managers.
- Cashier shift report (payments by method per user per shift).
- Tests: folio totals, GST split, invoice numbering is gap-free per hotel, night audit idempotent
  (running twice does not double-post).
```
**Done when:** a 3-night stay posts correct nightly charges, the invoice PDF has correct GST, and running the night audit twice changes nothing the second time.

### Phase 9 — Dashboard + reports
```
Goal: Professional analytics with real data.

Dashboard (role-aware):
- KPI cards: Occupancy %, ADR, RevPAR, Revenue today/MTD vs last year, Arrivals/Departures/In-house today,
  rooms out of order.
- Charts: occupancy trend (30 days), revenue by source (Direct vs each OTA), revenue by category,
  room status donut, booking pace / pickup for next 30 days, room-type performance.
- Click-through: clicking a chart segment opens the filtered list.

Reports (date range filters, export to CSV/Excel and PDF):
- Arrivals, Departures, In-house, No-shows, Cancellations
- Daily revenue report, Occupancy report, Source/channel report with commission estimate
- GST report (invoice-wise, rate-wise summary) ready for filing
- Payments by method, Cashier report, AR ageing
- Housekeeping productivity
- Guest register / police report export; Form C data list for foreign guests

Rules: compute from daily snapshots + live data; use SQL views or materialised views for heavy queries;
no hardcoded numbers. Read-only reports allowed for accounts role.
```
**Done when:** every number on the dashboard can be traced to real seeded/created data and exports open correctly.

---

## STAGE C — GUEST EXPERIENCE & INTEGRATIONS

### Phase 10 — Web check-in / check-out portal (with mock KYC)
```
Goal: Guest self check-in and check-out via a secure link, with verification behind an adapter.

Requirements:
- On reservation confirmation, create a check-in token (random, linked to reservation, expiry after
  departure). Link: {hotel}.staylo.app/g/{token}. "Copy link" and "Resend" on the reservation page.
- Guest portal (mobile-first, hotel branding):
  1. OTP verification to the booking phone/email (OTP via a messaging adapter; console/mock in dev)
  2. Confirm booking details, ETA, special requests, purpose of visit, arriving from / going to
  3. Add each adult guest
  4. ID step per adult:
     - Indian: Aadhaar via DigiLocker/secure QR path (adapter) OR other ID upload (DL, voter ID, passport)
     - Foreign: passport + visa upload, Form C fields
     - Client-side image quality checks (blur/size) before upload; uploads go straight to private
       storage ids/{hotel_id}/{reservation_id}/...
     - Store only last 4 digits of Aadhaar
  5. Live selfie via front camera; liveness + face match through the KYC adapter
  6. Separate, purpose-specific consent screen (DPDP) + house rules + digital signature
  7. Payment step placeholder (Razorpay in Phase 11)
  8. Optional upsells (early check-in, upgrade, breakfast) as requests
  9. Confirmation with QR arrival pass
- KYC adapter interface in packages/integrations with a MOCK implementation (configurable pass/fail/
  needs-review results). Processing runs as worker jobs; results update via Realtime.
- Status machine: link_sent → in_progress → submitted → verified | needs_review | rejected → checked_in.
- Staff "Verification queue": list of submissions, view documents via short-lived signed URLs,
  approve/reject with reason, every view audited.
- Arrival: scan QR or open reservation → staff confirms face → check-in in one click.
- Web check-out: link on departure morning shows live folio, dispute a line, minibar declaration,
  late check-out request, GST details, pay balance (placeholder), feedback rating;
  "check-out requested" creates an inspection task; staff completes settlement.
- Retention job deletes ID images after the hotel's configured retention days.
- Rate limiting on OTP and token endpoints. Token cannot access any other reservation.
```
**Done when:** you complete check-in on your phone with the mock adapter, the verification queue shows it, front desk checks the guest in from the QR, and web check-out creates the inspection task.

### Phase 11 — Razorpay payments
```
Goal: Real online payments in test mode.

Requirements:
- payments adapter in packages/integrations with Razorpay implementation (test keys from env).
- Payment links for advance/balance from reservation and folio; payment step in web check-in/out.
- Security deposit / pre-authorisation where supported; capture or release.
- Webhook endpoint /api/webhooks/razorpay: verify signature, store raw event with idempotency key,
  enqueue job; job posts payment to folio and updates status. Duplicate events ignored.
- Refunds from the folio screen (permission-controlled).
- Reconciliation report: Razorpay payments vs folio payments.
- Each hotel connects its own Razorpay account (keys stored encrypted per hotel), so guest money settles
  to the hotel, not to Staylo. Document the setup steps for hotels.
```
**Done when:** a test payment from the guest portal appears on the folio within seconds, and replaying the webhook does not duplicate it.

### Phase 12 — WhatsApp + email notifications
```
Goal: Automated guest and staff messaging through the worker.

Requirements:
- messaging adapter (WhatsApp Cloud API implementation + console mock) and email adapter.
- Templates table per hotel with variables; default templates: booking confirmation, web check-in link,
  reminders (72h/24h/3h before arrival), check-in welcome, check-out link, invoice, feedback request,
  payment link, staff invite.
- Scheduler queues reminders per hotel timezone; skip if already checked in.
- Message log (status: queued|sent|delivered|read|failed) with WhatsApp status webhooks.
- Fallback to SMS/email if WhatsApp fails. Guest opt-out respected.
- Per-hotel usage counters (for billing in Phase 16).
```
**Done when:** creating a booking sends the confirmation + check-in link to your test phone, and the message log shows delivery status.

### Phase 13 — Real KYC provider
```
Goal: Replace the mock KYC adapter with the chosen provider (<HyperVerge | IDfy | Didit>).
I will provide the API docs / sandbox keys in env.

Requirements:
- Implement OCR, liveness, face match and (if supported) DigiLocker/Aadhaar QR verification in the
  adapter; map provider responses to our internal result format (verified | needs_review | rejected,
  scores, extracted fields, reasons).
- Webhook/callback endpoint if the provider is async; idempotent processing.
- Configurable thresholds per hotel (face match score, OCR confidence).
- Never store raw provider payloads containing full Aadhaar numbers; mask before saving.
- Per-hotel KYC usage counters.
- Portal and verification queue code must not change except configuration.
```
**Done when:** a sandbox verification flows through end to end and switching back to the mock works by changing one env value.

### Phase 14 — Channel manager integration
```
Goal: Connect OTAs via our channel manager partner (<partner name>). I will provide their API docs.

Requirements:
- channelManager adapter: push inventory, push rates & restrictions (min stay, CTA/CTD, stop sell),
  receive new/modified/cancelled bookings, room/rate mapping.
- Mapping screen: map Staylo room types + rate plans to channel codes per OTA.
- Outbound sync: any change to availability/rates enqueues a debounced push job; full resync button.
- Inbound: webhook or polling job → create/modify/cancel reservations with source=ota, ota_name,
  commission; dedupe by channel booking id; inventory locked in a transaction.
- Sync log + error dashboard with retry; alert when a push fails repeatedly.
- Direct booking engine (public): availability search, rate display with taxes, booking + Razorpay
  payment, embeddable widget for the hotel website; bookings use the same reservation logic.
```
**Done when:** a test booking from the partner's sandbox appears on the tape chart, availability updates are pushed back, and a direct booking from the widget works end to end.

---

## STAGE D — BUSINESS LAYER

### Phase 15 — CRM
```
Goal: Guest relationships and repeat business.

Requirements:
- Guest 360 profile: stays history, total spend, preferences, documents (masked), notes, tags, VIP/blacklist,
  communication history, feedback.
- Duplicate detection + merge (by phone/email).
- Corporate accounts and travel agents with negotiated rates.
- Segments builder (e.g. stayed 2+ times, last stay > 6 months, birthday this month, source = OTA).
- Campaigns: WhatsApp/email to a segment using templates, schedule, opt-out handling, results.
- Automations: thank-you after check-out, birthday/anniversary offers, win-back.
- Feedback: post-stay rating; high ratings → review link (Google/OTA), low ratings → manager alert.
- Group/event leads pipeline (lead → quoted → confirmed → lost) with tasks.
- Loyalty (simple): points per spend, tiers, redeem as discount on folio.
```
**Done when:** you can build a segment, send a campaign to test numbers, and see a low rating trigger a manager alert.

### Phase 16 — Super admin + subscriptions
```
Goal: The Staylo team's control room and SaaS billing.

Requirements:
- admin.staylo.app (or /admin) for platform_admins only, with mandatory 2FA.
- Dashboard: total hotels, active/trial/past_due/cancelled, MRR, new signups, churn, usage totals.
- Plans: name, price (per property or per room), billing period, limits (rooms, users), feature flags,
  add-on pricing (KYC checks, WhatsApp credits).
- Subscriptions: trial → active → past_due (grace period N days) → read_only → cancelled; data retained
  N days after cancellation. Razorpay Subscriptions for Staylo's own billing; webhooks update status.
- Hotel-side: Billing page (current plan, usage, invoices, upgrade/downgrade, payment method).
- Enforce limits and read-only mode across the app (middleware + server checks).
- Tenants list and detail: plan, status, usage, last active, notes; actions: extend trial, change plan,
  suspend/reactivate, toggle feature flags.
- "Log in as hotel" (support access): requires hotel's consent toggle, time-limited, banner shown,
  every action audited. Admin views show business metrics only, never guest personal data.
- Platform health: failed jobs, webhook failures, sync errors per hotel.
- Announcements banner to all/selected hotels.
- Platform team management with roles (super_admin, support, sales, finance).
```
**Done when:** you can see every hotel, move one from trial to paid with a Razorpay test subscription, push it to read-only by failing payment, and every admin action shows in the audit log.

### Phase 17 — Security, quality & performance review
```
Goal: Audit before launch. First produce a report only — do not change code yet.

Check and list issues with severity and file locations:
- Any table without RLS or with weak policies; any server code using the service-role key without need
- Secrets in code or logs; personal data in logs; ID document access without audit
- Missing Zod validation; missing webhook signature checks or idempotency
- Money handled as float; missing transactions around inventory/money
- N+1 queries, missing indexes, slow pages (measure); large client bundles
- Missing loading/empty/error states; accessibility basics; mobile layout problems
- Test coverage gaps for billing, GST, night audit, RLS, booking conflicts
Then wait for me to choose which issues to fix, and fix them in small batches with tests.
```
**Done when:** all high/critical issues are fixed and tests cover them.

---

## STAGE E — LAUNCH

### Phase 18 — Production deployment
```
Goal: Production-ready deployment and operations.

Requirements:
- Document and script the setup for: Supabase production project (Mumbai), staging project,
  Vercel (web, root apps/web, Mumbai functions region), Railway (worker, root apps/worker, Singapore),
  custom domain + wildcard subdomains for hotels, env variables per environment.
- Migration workflow: supabase link + db push in CI on merge to main, before app deploy.
- Vercel preview deployments use the staging Supabase project.
- Sentry for web and worker; /api/health endpoint; uptime monitor instructions; alert on failed jobs.
- Backups: confirm Supabase backup settings; document restore procedure.
- Seed script for creating a real hotel without demo data.
- Legal pages: privacy policy, terms, DPA placeholders (I will supply final text), cookie notice.
- Production checklist in docs/LAUNCH_CHECKLIST.md.
```
**Done when:** pushing to `main` runs migrations and deploys web + worker automatically, and a fresh hotel can sign up on the live domain.

### Phase 19 — Pilot with real hotels
- Onboard 1–2 friendly hotels for free. Watch them use it for 2–4 weeks.
- Collect feedback in a simple list. For each item, run the working loop with a small prompt:
```
Read CLAUDE.md. Pilot feedback from <hotel>: "<exact feedback>".
Investigate the cause, propose a fix in plan mode, wait for approval, implement with tests.
```
- Then set final pricing, finish legal documents, and open signups.

---

## 2. What only you can do
- Create and pay for accounts: Supabase, Vercel, Railway, Sentry, domain.
- Business onboarding: Razorpay KYC, Meta WhatsApp Business verification, KYC vendor agreement,
  channel manager partnership (needed before Phase 13 and 14).
- Put real API keys into `.env` files / hosting dashboards yourself.
- Legal: privacy policy, terms, DPA with hotels (DPDP Act) — get a lawyer to review.
- Product decisions: pricing plans, invoice numbering format, accepted ID types, retention periods.
- Real-world testing with hotel staff.

## 3. Rough timeline (one person, steady effort — adjust to your pace)
| Stage | Phases | Approx. |
|---|---|---|
| A Foundation | 1–4 | 2 weeks |
| B PMS core | 5–9 | 4 weeks |
| C Guest + integrations | 10–14 | 4 weeks (14 depends on partner) |
| D Business layer | 15–17 | 3 weeks |
| E Launch | 18–19 | 1 week + pilot |

## 4. Progress tracker
- [ ] 0 Setup
- [ ] 1 Monorepo skeleton
- [ ] 2 Core database + multi-tenancy
- [ ] 3 Auth, tenancy, roles
- [ ] 4 Premium app shell
- [ ] 5 Property setup
- [ ] 6 Reservations + tape chart
- [ ] 7 Front desk + housekeeping
- [ ] 8 Folio, payments, invoices, night audit
- [ ] 9 Dashboard + reports
- [ ] 10 Web check-in/out (mock KYC)
- [ ] 11 Razorpay
- [ ] 12 WhatsApp + email
- [ ] 13 Real KYC provider
- [ ] 14 Channel manager + booking engine
- [ ] 15 CRM
- [ ] 16 Super admin + subscriptions
- [ ] 17 Security & quality review
- [ ] 18 Production deployment
- [ ] 19 Pilot
