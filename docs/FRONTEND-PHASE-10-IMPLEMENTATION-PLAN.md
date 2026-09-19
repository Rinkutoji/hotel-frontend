# Phase 10 — Dashboard & Polish — Implementation Plan (DRAFT)

> **Repo:** `/Applications/XAMPP/xamppfiles/htdocs/hotel-frontend` (this plan lives here)
> **Canonical scope:** `docs/FRONTEND-INTEGRATION-PLAN.md` §8 Phase J, items **49–52**
> **Status:** DRAFT — awaiting approval. No application code, tests, routes, migrations, or backend files have been touched.
> **Baselines:** frontend 60 test files / 544 tests / 0 failures, lint 0 warnings, build successful; backend 430 tests / 1,322 assertions / 0 failures, backend application code unchanged.

---

## 1. Purpose and Constraints

1. Implement canonical Phase J items **49 (staff dashboard summary stats)**, **50 (responsive polish)**, **51 (error boundary)**, **52 (loading skeleton components)**.
2. Frontend-only. **No backend changes.** All data must come from existing, verified endpoints.
3. Do not invent endpoints, fields, permissions, or business rules. Every value shown must trace to a real field of a real response, and every permission used must already exist server-side.
4. Reuse the established frontend conventions (verified in Phase 9): `useApi`, shared `SearchBar`/`Pagination`/`LoadingState`/`LoadingSpinner`/`EmptyState`/`ErrorState`/`ErrorMessage`, card shadow/border styling, URL-driven filters, `getErrorMessage`/`getFieldErrors`, `performAction` where actions exist, `ProtectedRoute`/`PublicOnlyRoute` guards, oxlint-clean code, Vitest + Testing Library + `axios-mock-adapter` tests.
5. After implementation: run `npm run lint`, `npm run test`, `npm run build`, compare against baseline, and write the completion report.
6. Stop after Phase 10 (guard: no future phase work).

## 2. Source of Truth — Canonical Phase J Items

From `FRONTEND-INTEGRATION-PLAN.md` §8:

> 49. Staff dashboard (summary stats — may need new backend endpoint or use existing list endpoints for counts)
> 50. Responsive polish pass
> 51. Error boundary
> 52. Loading skeleton components

Route table §6.2 already reserves `/staff/dashboard → Dashboard (auth: staff)`, and `ProtectedRoute` already implements the §6.3 protection matrix (guest → `/staff/login` with `state.from`; customer → `/`; staff → dashboard). The dashboard itself is the placeholder at `src/pages/staff/Dashboard.jsx`.

Current placeholder (lines 7–20): greeting from `user?.name` plus four hard-coded cards (`Bookings`, `Rooms`, `Payments`, `Invoices`) that render `—`. Phase 10 replaces the entire page body; the route, sidebar entry, and guard are unchanged.

## 3. Already Supported by the Backend — No Backend Change Required

**None of the four Phase J items require a backend change.** Verified against `routes/api.php`, the five staff controllers, services, request classes, and `ApiResponse`:

- **No dashboard/summary/statistics endpoint exists** anywhere in the backend (grep of `routes/api.php` and `app/Http/Controllers`).
- The canonical note (§19.4 "Dashboard statistics — no summary endpoint exists") still holds; the plan uses the second option the canonical explicitly permits: **existing list endpoints for counts**.
- Every metric below is derived from the **`meta.total`** of existing staff list responses (`ApiResponse::paginated` envelope: `{ success, message, data: [...], meta: { page, per_page, total, last_page } }`), where `total` is the backend count *under the current filter*.

Exact list endpoints (all any-staff unless noted; all pre-existing):

| Endpoint | Filters that exist | `per_page` | Justify |
|---|---|---|---|
| `GET /api/v1/staff/bookings` | `status` (`pending_payment,confirmed,checked_in,checked_out,cancelled,no_show`), `from`, `to` (on `check_in_date` / `check_out_date`), `search` | No (`paginate(15)` fixed) | source for booking counts + recent bookings |
| `GET /api/v1/staff/payments` | `status` (`pending,receipt_uploaded,verified,rejected,refunded`), `search` | Yes (1–50) | payment counts + recent payments |
| `GET /api/v1/staff/rooms` | `search`, `room_type_id`, `floor`, `status` (`available,reserved,occupied,cleaning,maintenance`), `sort`, `direction` | Yes (1–50, clamped) | room occupancy counts |
| `GET /api/v1/staff/invoices` | `search` (`status` is **`prohibited`** → 422) | Yes (1–50) | invoice total + recent invoices |
| `GET /api/v1/staff/room-types` | `search`, `min_price`, `max_price`, `min_adults`, `min_children`, `sort`, `direction` | Yes (1–50) | optional room-type count |
| `GET /api/v1/staff/discounts` | `search` | Yes (1–50) | optional discount count (admin/manager only) |

Backend guidance for count calls (documented in this plan only; no request classes change):
- Payments/rooms/invoices/room-types/discounts count fetches use **`per_page=1`** — the API returns one row but `meta.total` is still the full filtered count, minimizing payload.
- Bookings **does not accept `per_page`** (its `FilterRequest` has no such rule and the controller hard-codes `paginate(15)`), so booking count fetches always return up to 15 rows; only `meta.total` is used.
- Invoices have no status filter — a dashboard "issued invoices total" is a single unfiltered call (`meta.total`); per-status invoice breakdowns are **impossible** without a backend change (deferred, see §14).

## 4. Dashboard Scope (item 49)

The staff dashboard (`/staff/dashboard`) becomes a real overview page composed entirely of the endpoints above. Layout, top-to-bottom:

1. **Page header** — heading "Dashboard", date/today string, and a time-of-day greeting ("Good morning/afternoon/evening, {name}") + role chip. Greeting computed client-side from `user` in auth context (no backend call); role from `user.role` (employee `/me` already returns `{ id, name, email, role }` directly under `data`, values `admin|manager|receptionist`).
2. **Stat cards row** — 4 cards, each a count + short label, each a `Link` to its list page (deep-linked where a status is meaningful):
   - **Bookings** — total bookings (sum of the six status counts) → `/staff/bookings`
   - **Payments to review** — `pending` + `receipt_uploaded` payments → `/staff/payments?status=receipt_uploaded` (the actionable queue)
   - **Rooms occupied** — rooms with `status=occupied` → `/staff/rooms?status=occupied`
   - **Invoices issued** — invoice `meta.total` → `/staff/invoices`
3. **Charts row** — three charts, see §6.
4. **Recent activity row** — "Recent bookings" and "Recent invoices" lists, see §7.
5. **Quick actions card** — role-aware action links, see §8.

All fetch results feed per-card/per-section states; a failed metric degrades that card only (see §9 and §11).

## 5. Staff vs Customer Dashboard Differences

- **Staff**: `/staff/dashboard` is the canonical dashboard (Phase J item 49) and is what this plan builds. It is the post-login staff landing page (`ProtectedRoute actor="staff"`, any role).
- **Customer**: there is **no canonical customer dashboard** — no such route exists in §6.1, no `/me`-based aggregator exists, and backend customer endpoints are per-resource lists (`/customer/bookings`, `/customer/invoices`, `/customer/payments`) with no aggregate. The customer's de-facto dashboards are already-built pages: `Home`, `/bookings` (MyBookings), `/invoices`, `/payments/:id`, `/profile`. **Phase 10 deliberately adds no customer dashboard.** Customer-facing Phase 10 work is limited to the shared polish items (51, 52) and the responsive audit (§10) that touch customer pages only where they share common components.
- Where behavior overlaps (error boundary, skeletons, responsive audit) the same shared components serve both actors.

## 6. Statistics and Metrics

All numbers are **backend-filtered counts via `meta.total`** — never client-computed over partial pages, never summed from paginated `data` (which would undercount).

Core requests (all parallel, single round):

| # | Metric | Fetch | Payload | Used for |
|---|---|---|---|---|
| 1–6 | Bookings per status (×6) | `staffBookings.list({ status })` | up to 15 rows each | bookings-by-status chart + bookings total (sum) |
| 7 | Recent bookings | `staffBookings.list({ page: 1 })` | 15 rows | recent activity list |
| 8–12 | Payments per status (×5) | `staffPayments.list({ status, per_page: 1 })` | 1 row each | payments-by-status chart + "to review" count (`pending`+`receipt_uploaded`) |
| 13 | Recent payments | `staffPayments.list({ page: 1 })` | 15 rows | recent activity list (secondary) |
| 14–18 | Rooms per status (×5) | `staffRooms.list({ status, per_page: 1 })` | 1 row each | room occupancy chart + occupied card + occupancy % |
| 19 | Invoices total + recent | `staffInvoices.list({ page: 1 })` | 15 rows + `meta.total` | invoices card + recent invoices list |

Optional (server-permitted for the calling role only):
| 20 | Room types count | `staffRoomTypes.list({ per_page: 1 })` | 1 row | secondary stat (any staff) |
| 21 | Discounts count | `staffDiscounts.list({ per_page: 1 })` | 1 row | admin/manager only (see §9) |

Request budget: **19 core (+2 optional) tiny list calls in one parallel round.** See §11 for the degradation design and §12 for how this stays acceptable plus reduction options.

Semantics that must be stated honestly:
- **Occupancy** = rooms `occupied` / (sum of all five room statuses). Presented as a count + percent, never "revenue".
- **Revenue / financial totals** are **not** computed. Invoice `total_amount`s are only on per-row items across pages and there is no aggregate endpoint; summing would be wrong. Deferred (§14).
- **Time-series** ("bookings per day/week") is deferred. The bookings `from`/`to` filters operate on *check-in dates*, not creation dates, so a "trend" would actually be an occupancy outlook — a different metric. It is not in this phase.

## 7. Charts (CSS/SVG only — no new dependency)

New components, no chart library (`package.json` deps unchanged — verified current deps are only axios / react / react-dom / react-router-dom):
- `src/components/staff/StatCard.jsx` — count, label, caption, optional `to` link, optional accent dot.
- `src/components/staff/StatusBarChart.jsx` — one reusable horizontal bar chart: rows of `{ label, value, color }`. Bar fill is a styled `div` `width: %` (share of max). Rendering: `<dl>` with `dt` label + `dd` value chip; the fill bar is `aria-hidden` decorative.
- `src/components/staff/OccupancyDonut.jsx` — small SVG (no library) donut of room-status shares with `<ul>` legend (label + count + percent), displayed next to the occupied-count card.

Charts shown:
1. **Bookings by status** (6 rows) — statuses in backend enum order.
2. **Payments by status** (5 rows) — statuses in backend enum order.
3. **Room occupancy donut** (5 segments: available, reserved, occupied, cleaning, maintenance) with the "Rooms occupied" headline count.

Chart accessibility: every chart has a visible text summary, `aria-label` (e.g. `Bookings by status: pending_payment 1, confirmed 12, …`), and decorative fills. Color is never the only signal (labels + values are always text). See §15 for details.

## 8. Recent Activity and Quick Actions

**Recent activity** (two panels, each up to 5 rows, each linking to detail):
- **Recent bookings** — from fetch #7 (`booking_number`, `customer.name`, `BookingStatusBadge`, `check_in_date` → `check_out_date`). Row → `/staff/bookings/:id`. Empty state: "No bookings yet."
- **Recent invoices** — from fetch #19 (`invoice_number`, `payment.booking.customer.name`, `PaymentStatusBadge`/invoice amount verbatim, `issued_at`). Row → `/staff/invoices/:id`. Empty state: "No invoices issued yet." (Invoice amounts are shown **verbatim** from `total_amount`, never reformatted — Phase 9 invariant.)
- Secondary **recent payments** (from fetch #13) is optional; include only if it does not blow the request budget decision (see §12). Default: include, since the fetch is needed anyway for the actions queue on `/staff/payments` deep link.

**Quick actions** (role-aware, client-side `hasRole(['admin','manager'])`; all are plain `Link`s — **no endpoint called**):
- Receptionist: "View bookings", "Process payments", "Browse rooms", "View invoices".
- Admin/Manager adds: "New room", "New room type", "New discount" (`/staff/discounts/new`).
- **No "New booking" / walk-in action** — `POST /staff/bookings` does not exist (STEP-12 not implemented). This is explicitly NOT offered, matching the §19.1 out-of-scope note.

## 9. Authorization / RBAC

- Route: unchanged `ProtectedRoute actor="staff"` (any role) on `index` and `path="dashboard"` in `StaffApp.jsx`. Dashboard is **not** role-gated (canonical §6.2: any staff role).
- Sidebar: "Dashboard" already present and un-gated (verified `Sidebar.jsx` NAV_ITEMS).
- Staff-only surface: everything the dashboard reads (bookings, payments, rooms, invoices lists) is any-staff. The two **optional** fetches differ:
  - `staffRoomTypes.list` — any staff (safe).
  - `staffDiscounts.list` — **admin/manager only**; the dashboard must gate this single optional stat by `hasRole(['admin','manager'])` and never fire it for a receptionist (would 403). Default: **omit the discounts stat** and drop this request entirely (see §12); a note explains it can be added behind the role check.
- No `_authz-check` or `/me` changes; the greeting/role reuse the existing auth context.

## 10. Responsive / Mobile Behavior (item 50)

The codebase is already responsive (grids `sm:`/`lg:`, sidebar hamburger, `flex-wrap` page headers, `overflow-x-auto` on the two invoice tables — all verified). The polish pass is a **targeted audit linked to the new dashboard plus known touchpoints**, not a rewrite:

1. **Dashboard** (new): stat cards `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`; charts `grid-cols-1 lg:grid-cols-3`; activity + actions stack on mobile. Long labels/amounts truncate (`truncate`) rather than overflow.
2. **Full-page audit checklist** applied to existing pages (no defects known; verify and fix only if found): no horizontal scroll at 320px; `overflow-x-auto` on any data table; `flex-wrap` on page headers/actions; adequately sized touch targets (`btn` padding already ≥44px height); sticky Topbar stays usable on mobile.
3. Reduced-motion: add a `prefers-reduced-motion: reduce` rule in `src/index.css` (small, safe, additive) so `animate-pulse` skeleton shimmer and spinner `animate-spin` are softened, per a11y guidance.
4. No new responsive library; Tailwind classes only.

## 11. Error Boundary (item 51)

- New `src/components/common/ErrorBoundary.jsx` — React class component (`componentDidCatch` + `getDerivedStateFromError`), props `{ fallback?, onReset?, children }`; default fallback UI mirrors `ErrorState` styling (`role="alert"`, friendly message, "Reload" button that calls `onReset ?? window.location.reload`).
- Integrated at the top of `src/App.jsx` wrapping `<Routes>` so both customer and staff subtrees are covered; parent passes `key={location.pathname}` so a navigation resets the boundary.
- Optional nested wrap inside `StaffLayout` main is **not** added (keep scope minimal); widget-level failures on the dashboard are handled by the per-card fetch design below, not by the boundary.
- Boundary treats **render crashes** only; API errors stay in the existing `ErrorState` path.

## 12. Performance Considerations

- **One parallel round.** All dashboard fetches are fired together via a `Promise.allSettled` in a new `src/hooks/useDashboard.js` (fetchers memoized with `useMemo`/`useCallback` per the existing `useApi` patterns). `allSettled` means one slow/failed metric cannot block the others.
- **Payload discipline:** count fetches use `per_page=1` where the backend allows (payments, rooms, invoices, room-types, discounts). Bookings are fixed 15 rows/call by the backend — accepted; only `meta.total` is consumed.
- **No polling / realtime.** Data loads on mount and refetches on a manual "Refresh" button (and, if trivially cheap, on navigation). Backend has no WebSocket and §19.6 forbids fabricating realtime.
- **No new dependencies** (charts and skeletons are CSS/SVG/Tailwind), keeping the bundle lean.
- **Request-budget reduction options** (decision point for approval, default = full 19 core requests):
  - Option A (default): all 19 core requests — complete charts + activity.
  - Option B: drop the "recent payments" panel (`−1`), drop the invoices chart if absent (charts are only bookings, payments, occupancy) — `−N` chart fetches already counted.
  - Option C (minimum): bookings totals + occupancy + "payments to review" only (~11 requests).
  - Recommended default is Option A; the trade-off (many tiny requests vs. richer summary) is accepted because each response is ≤15 rows and runs in a single round.
- Dashboard data is **never cached across sessions**; a modest, optional `sessionStorage` cache (TTL ~60s) can be added later if needed — out of scope here (kept simple, refetch-on-mount).

## 13. Loading Skeleton Components (item 52)

- New `src/components/common/Skeleton.jsx`: primitive `<Skeleton className>` (`animate-pulse bg-slate-200 rounded`) plus composed variants used on the dashboard: `SkeletonStatCard` (icon + two lines), `SkeletonChart` (bar placeholders), `SkeletonList` (3–5 row placeholders, same height as real rows to avoid layout shift).
- Applied to:
  - the dashboard (every stat card, chart, and activity panel while its fetch group is loading) — replaces the placeholder `—` cards;
  - customer `Home` featured-room section (small, safe swap of the current `LoadingState` in its loading branch) to demonstrate reuse.
- Existing list pages keep their `LoadingState` spinner so that `LoadingState`/PageSpinner semantics and the 60-file test suite (which asserts loading labels on those pages) are untouched. Skeleton adoption is additive, not a blanket replacement.
- Accessibility: skeleton containers carry `role="status"` + `aria-label` (e.g. "Loading dashboard…"); see §15 for reduced-motion interaction.

## 14. Loading / Empty / Error States

- **Loading:** skeletons (§13) for the dashboard; unchanged `LoadingState` elsewhere.
- **Empty:** stats that are legitimately zero render the number `0` (never an empty-state block). Activity panels with no rows render `EmptyState` ("No bookings yet." / "No invoices issued yet."), following the established pattern.
- **Error:** because of `Promise.allSettled`, errors are grouped per concern:
  - a failed **chart/stat group** renders that card with a compact `ErrorState`-style message + per-card "Retry" (`refetch`);
  - an API-level 401 is already handled globally by the axios interceptor (clears auth → login); 403 on an optional role-gated fetch is impossible by construction (§9); any 409/422/500 on a read path surfaces through `getErrorMessage`.
  - Page-level catastrophic render faults go to the ErrorBoundary (§11).
- Successful counts are always numbers; the page never "fails wholesale" if one metric 403s or times out.

## 15. Tests (planned, aligned with existing conventions)

New files in `src/test/` (conventions: `axios-mock-adapter` on the shared client, `vi.mock` for `useAuth`/`AuthContext`, `MemoryRouter`, Testing Library):

1. `skeleton.test.jsx` — renders `Skeleton` primitive and composed variants; exposes `role="status"`/`aria-label`.
2. `errorBoundary.test.jsx` — renders children; a throwing child shows fallback + Reload; `Reload` fires `onReset`; no crash when no error; does not break a normal child subtree.
3. `dashboardApi.test.js` — `dashboardApi` helper calls the right endpoint/filter combos: bookings `status` × 6, payments/rooms/invoices `per_page=1` on count calls, invoices `{ page: 1 }` for total+recent, no `status` ever sent for invoices, no discount call for a non-`admin|manager`.
4. `staffDashboard.test.jsx` — loading skeletons first; greeting/role rendered from mocked `useAuth`; stat values read from mocked `meta.total`s; bookings/payments/rooms/invoices charts render correct labels + counts; partial failure degrades only the affected card and "Retry" refetches it; role-gated quick actions (receptionist hides "New discount"/"New room"/"New room type"); empty activity panels show empty states; occupancy % and "payments to review" arithmetic correct.
5. `staffDashboardRoutes.test.jsx` — `/staff/dashboard` reachable by any staff role; guest → `/staff/login` keeping `state.from`; customer → `/`.
6. `homePage.test.jsx` **modified** only if the Home skeleton swap changes an asserted loading label — otherwise untouched. Existing list-page tests are **not** modified.

Planned totals: **≥5 new test files, ~45–55 new tests** (final number reported after implementation; baseline comparison: 60 → ~65 files, 544 → ~590–600 tests).

Run: `npm run lint` (expect 0 warnings), `npm run test` (expect all green), `npm run build` (expect successful, ~similar gzip size; no new deps).

## 16. Accessibility

- **Charts:** visible text labels/values for every datum; `aria-label` summaries on chart containers; decorative fills `aria-hidden`. No color-only distinctions (`StatusBarChart` rows keep the status caption text; `OccupancyDonut` has a text legend).
- **Skeletons:** `role="status"` + descriptive `aria-label`; `prefers-reduced-motion` disables pulse/spin (index.css addition).
- **ErrorBoundary:** `role="alert"` fallback with a real button.
- **Semantics:** stat cards use `<dl>`; activity rows are lists of `Link`s (keyboard-focusable); `NavLink` active state already sets `aria-current` (verified).
- **Keyboard/touch:** action density already meets the `btn` sizing; dashboard maintains visible `focus-visible` states from the shared styles.

## 17. Polish / UX Items (item 50 continued)

- Greeting personalization + today's date in the dashboard header.
- Stat cards deep-link to relevant filtered lists where the backend supports the filter (payments → `?status=receipt_uploaded`; rooms → `?status=occupied`).
- Consistent "Refresh" affordance when the dashboard has partial data.
- Keep every displayed decimal string verbatim (invoice amounts; no `Number()` coercion) — Phase 9 invariant carried forward.
- No behavior change to any existing list/form/detail page beyond the audit fixes.

## 18. Files (planned)

**Create:**
- `docs/FRONTEND-PHASE-10-IMPLEMENTATION-PLAN.md` (this file)
- `src/components/common/ErrorBoundary.jsx`
- `src/components/common/Skeleton.jsx`
- `src/components/staff/StatCard.jsx`
- `src/components/staff/StatusBarChart.jsx`
- `src/components/staff/OccupancyDonut.jsx`
- `src/components/staff/DashboardActivityPanel.jsx` (shared recent-list panel)
- `src/api/dashboardApi.js` (composes the existing staff list clients; **no new HTTP endpoints**)
- `src/hooks/useDashboard.js`
- `src/pages/staff/Dashboard.jsx` → **rewritten** (becomes a real page; keep export name `StaffDashboard` used by `StaffApp.jsx`)
- Tests: `skeleton.test.jsx`, `errorBoundary.test.jsx`, `dashboardApi.test.js`, `staffDashboard.test.jsx`, `staffDashboardRoutes.test.jsx`

**Modify:**
- `src/App.jsx` — wrap `<Routes>` with `ErrorBoundary` (keyed by pathname)
- `src/index.css` — additive `prefers-reduced-motion` rule (small, safe)
- `src/test/homePage.test.jsx` — **only if** the Home skeleton swap changes an asserted label; otherwise untouched

**Backend:** none. Frontend existing API modules (`bookingApi.js`, `paymentApi.js`, `roomApi.js`, `invoiceApi` in `paymentApi.js`) are **not modified** — `dashboardApi.js` composes them.

## 19. Deferred / Out-of-Scope (explicit)

1. New backend summary/statistics endpoint — none created; documented as backend roadmap (a future aggregate endpoint would let Phase 10+ drop the count calls).
2. Revenue / financial totals and any per-status invoice statistics (invoices have no status filter; revenue needs an aggregate endpoint).
3. Customer dashboard page — no canonical route/endpoint; customers keep Home + My Bookings / My Invoices / Profile.
4. Time-series trend charts (weekly/daily bookings) — bookings `from`/`to` filter on check-in dates, so a trend would be an occupancy outlook, not creation volume; not in this phase.
5. Real-time updates / polling / WebSocket (backend §19.6 out-of-scope).
6. Notifications / email.
7. Staff booking-on-behalf / walk-in "New booking" quick action (STEP-12 `POST /staff/bookings` does not exist).
8. Advanced date-range pickers, print/receipt PDF, i18n (canonical §19 items 7–10).
9. Customer management, department management (no endpoints).
10. New npm dependencies (charts/skeletons are CSS/SVG/Tailwind).

## 20. Verification and Completion Steps (after approval)

1. Implement per §18 in the order: common pieces → dashboardApi/useDashboard → dashboard components → Dashboard.jsx → App.jsx/index.css wiring → polish audit.
2. Write the §15 test files; run `npm run lint` (0 warnings), `npm run test` (report new file/test totals vs 60/544), `npm run build` (report gzip size vs current ~131.94 kB).
3. Confirm `git status` on `hotel-backend-step08` shows **no** application changes (docs-only), and the frontend diff matches §18.
4. Append the Phase 10 completion report (`0.1i`) to the canonical `docs/FRONTEND-INTEGRATION-PLAN.md` with the same record fields used in Phases 8 and 9 (scope/, delivered features, endpoints consumed, RBAC, files, tests totals, lint, build, deviations, backend-untouched confirmation).
5. Report to the user and stop.