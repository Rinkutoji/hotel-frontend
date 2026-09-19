# Phase 11 — Customer Payments List & Invoice Print View — Implementation Plan

> **Status: PROPOSED / DRAFT.** No official Phase 11 exists in the canonical
> `docs/FRONTEND-INTEGRATION-PLAN.md`; scope below is **derived exclusively from
> explicitly-deferred items** in that document and requires **no backend change**.
> Not approved yet — implementation starts only after explicit user approval.

---

## 0. Provenance — why this scope (derived, not official)

The canonical roadmap (`docs/FRONTEND-INTEGRATION-PLAN.md`) defines phases as
letters **A → J (§8 items #1–#52)**. The last item (#52 loading skeletons) was
delivered as **Phase 10** (canonical report `0.1i`). There is **no §8 Phase K
and no defined "Phase 11" section** anywhere in the canonical document.

The only textual reference to "Phase 11" is a forward pointer in the Phase 10
completion report's scope confirmation (`FRONTEND-INTEGRATION-PLAN.md:789`):

> "**Phase 11 / notifications** + anything beyond Phase 10 was NOT started."

That candidate topic — **notifications / email** — is explicitly **backend
blocked**: canonical §19 item #5 "Notifications / email — **not implemented in
backend**", and `routes/api.php` has no notification/email/webhook route
(verified). Per the authoring constraints ("do not invent endpoints, fields,
permissions, or business rules"), notifications cannot be part of a
frontend-only phase. It therefore stays out of scope (see §15).

Instead, Phase 11 is derived **only from explicitly-deferred items that are
implementable today against existing endpoints**:

| # | Deferred item | Documented where (canonical) | Status today |
|---|---------------|------------------------------|--------------|
| 1 | Standalone customer payment list page | Phase 5 completion report: "The **standalone customer payment list**, PDF invoice download, print view, real-time updates... remain deferred as specified" (`FRONTEND-INTEGRATION-PLAN.md:302–303`); also `FRONTEND-PHASE-5-IMPLEMENTATION-PLAN.md` §12 table: "Customer payments list page (standalone) \| **Future**" | Never built (verified below) |
| 2 | Print-friendly invoice view / print view | Canonical §19 item #9 "**Print-friendly invoice view** — implement basic display first"; same Phase 5 deferral line ("print view") | Basic display exists; **no print support** (verified below) |

Both items are frontend-only, need **no new endpoint/field/permission/business
rule**, and are the natural survivors of the Phase 5 deferral sentence (its
other members — staff payment/invoice management — were delivered in Phases 7
and 9; "real-time updates" requires backend support and stays deferred).

---

## 1. Purpose and Constraints

- **Frontend-only Phase 11** in `hotel-frontend`. No backend app code, routes,
  tests, migrations, or models are created or modified.
- Build **only against pre-existing, verified endpoints**. Never invent an
  endpoint, field, permission, or business rule. Never send a query/body field
  the backend does not document.
- **Do not add PDF generation/download**: backend serves invoice data as JSON
  only (canonical §2.8/§2.15; §19 item #8). Producing a PDF would require
  either a new backend endpoint or a new client library — both out of scope for
  a frontend-only, no-new-dependency phase (kept deferred, §15).
- Preserve Phases 2–10 behavior and their 65-file / 572-test baseline.

---

## 2. Already Supported by the Backend — No Backend Change Required

### 2.1 Customer payment list endpoint (verified)

`routes/api.php:87` → `Customer/PaymentController@index`:

```
GET /api/v1/customer/payments   (auth:sanctum + actor:customer)
```

Controller behavior (read from `Customer/PaymentController.php:25`):
- **Own-only** by construction: `whereHas('booking', customer_id = token user)`
  (customers can never see others' payments).
- Query params: `status` (filter), `per_page` (default 15) — **no `search`
  param**; order `created_at desc`; eager `booking`.
- Response: `{success, message, data: [Payment + booking], meta}` (Paginator).
- Payment fields available on the list: `id, booking_id, amount, method,
  status, verified_by, verified_at, notes, created_at, updated_at`.

This page is **already fetched client-side** somewhere (the same list is used
by `BookingDetail` to resolve a booking's payment — `customerPayments.list` in
`src/api/paymentApi.js`), so the API client needs **no changes**.

### 2.2 Invoice detail data for print (verified)

- Customer: `GET /api/v1/customer/invoices/{invoice}` (own-only) — already
  rendered by `src/pages/customer/InvoiceDetail.jsx`.
- Staff: `GET /api/v1/staff/invoices/{invoice}` (any staff) — already rendered
  by `src/pages/staff/InvoiceDetail.jsx`.
- Print reuses the **already-loaded** page data; **no extra network request**.

---

## 3. Frontend Dependencies

- **None new.** Reuses the existing minimal stack (React 19, React Router 7,
  Axios, Tailwind 3, Vitest + Testing Library + axios-mock-adapter). No PDF,
  chart, date-picker, or state library is added.
- Reused existing modules:
  - `src/api/paymentApi.js` → `customerPayments.list(params)`
  - `src/hooks/useApi.js` → `useApi(fetcher)` → `{data, meta, error, isLoading, refetch}`
  - `src/components/common/{LoadingState,EmptyState,ErrorState,Pagination}.jsx`
  - `src/components/customer/PaymentStatusBadge.jsx`
  - `src/utils/apiError.js` → `getErrorMessage` (401/403/404/422/409/500)

---

## 4. In-Scope — Feature A: Standalone Customer Payment List (`/payments`)

Current state (verified by inspection): **no** `/payments` route exists in
`CustomerApp.jsx`; the customer sees payments only inside `BookingDetail`
(lookup + single link) and on `PaymentDetail`. `CustomerPaymentList.jsx` does
not exist. Navbar/Footer have **no "My Payments"** link.

### 4.1 New page `src/pages/customer/CustomerPaymentList.jsx`

- Route: `/payments`, wrapped in `ProtectedRoute actor="customer"` (mirror
  `MyBookings`/`InvoiceList`).
- URL drives state (project convention): `status`, `page` via
  `useSearchParams`; page resets to 1 on filter change.
- Data: `useApi(() => customerPayments.list({ page, status, per_page: 15 }))`.
  Filter dropdown constrained to the **five backend statuses** (`pending`,
  `receipt_uploaded`, `verified`, `rejected`, `refunded`) labelled exactly like
  `PaymentStatusBadge`. No search box — the endpoint has no search param.
- Rendering: `PaymentCard`-style cards (customer variant) + shared
  `Pagination` (when `last_page > 1`) + `LoadingState` / `EmptyState` ("No
  payments yet", filters-aware) / `ErrorState` (with retry).
- Card content: `PaymentStatusBadge`, `amount` **verbatim** (never
  Number()-reformatted), method label (`bank_transfer` → "Bank transfer",
  `cash` → "Cash"), created date, linked booking number → `/bookings/:id`
  (the list response eager-loads `booking`, which carries `booking_number`).
- Card links to `/payments/:id`.

### 4.2 New component `src/components/customer/CustomerPaymentCard.jsx`

Sibling of the staff `PaymentCard.jsx` following the same header pattern
(h3 + badge sibling so `getByText` stays unique); shows `amount` verbatim.

### 4.3 Routing & navigation

- `src/routes/CustomerApp.jsx`: add `/payments` inside `PublicLayout` +
  `ProtectedRoute actor="customer"` (guest → `/login` with `state.from`
  preserved including search; staff → `/staff/dashboard`).
- `src/components/customer/Navbar.jsx` (desktop + mobile) and `Footer.jsx`:
  add a customer-only **My Payments** link next to My Bookings / My Invoices.

---

## 5. In-Scope — Feature B: Invoice Print View

Current state (verified by inspection): neither `customer/InvoiceDetail.jsx`
nor `staff/InvoiceDetail.jsx` has a print button, `window.print()` call, or
print stylesheet; `index.css` has **no** `@media print` block.

### 5.1 Print button

- Add a **Print** button to both invoice detail headers (customer: own
  invoice; staff: any invoice). It calls `window.print()` with no state
  change; no data is re-fetched.
- Button is hidden in print output (part of the print stylesheet).

### 5.2 Print stylesheet (in `src/index.css`)

- Add `@media print { … }`: hide the shell chrome outside the printed region —
  this project uses a shared `PublicLayout`/`StaffLayout`, so the print rule
  targets the reusable page chrome: `.site-header`, `.site-footer`,
  `.staff-sidebar`, `.staff-topbar`, buttons/actions, and "Back to…" links are
  `display: none`. The invoice content remains and is allowed to use the full
  page width.
- Keep the global `prefers-reduced-motion` block unchanged (print needs no
  animation rules).
- No per-page `print:` Tailwind variants needed unless the two invoice pages
  require page-break tweaks (`break-inside: avoid` on cards/tables).

### 5.3 Print correctness (data)

- Only backend-provided values are printed (invoice number, `issued_at`,
  `total_amount`, payment/booking summaries, line-item table with verbatim
  `price_per_night`/`nights`/`line_total`). Print renders the **same** DOM as
  the screen view — no parallel "print API" exists or is invented.

---

## 6. API Endpoints (exhaustive — nothing else is called)

| Endpoint | Used by | Calls |
|----------|---------|-------|
| `GET /api/v1/customer/payments` (`status`?, `per_page`?) | Customer payment list | 1 page load (+1 per filter/page change) |
| `GET /api/v1/customer/invoices/{invoice}` | Print (customer) | already-loaded page data; none new |
| `GET /api/v1/staff/invoices/{invoice}` | Print (staff) | already-loaded page data; none new |

No new endpoints, query params, request bodies, or `status` values are sent.
The customer invoices `status` prohibition (customer invoice index rejects it)
is not affected — no invoice list call is added.

---

## 7. Authorization / RBAC

| Route / action | Allowed | Enforced |
|----------------|---------|----------|
| `/payments` (customer list) | authenticated **customer** | `ProtectedRoute actor="customer"` client-side; backend `auth:customer` + own-only query scoping server-side |
| Guest → `/payments` | — | redirect to `/login` with `state.from` (customer) |
| Staff → `/payments` | — | redirected to `/staff/dashboard` (existing guard) |
| Invoice print (customer) | authenticated customer (own invoice) | existing `/invoices/:id` guard; backend own-only show |
| Invoice print (staff) | **any staff role** | existing `/staff/invoices/:id` guard; no role gate (matches Phase 9) |

No permission matrix change; no new role-gated route.

---

## 8. Validation

- Both features are **read-only**: there are no forms, no request bodies, no
  file uploads, and no client-side field validation.
- Filter "validation" is constraint-enforcement only, not user-input: the
  status `<select>` is bounded to the five documented statuses; `page` is
  derived from pagination `meta` (clamped to `last_page`/`1` by the shared
  `Pagination` component). No backend rule is re-derived or invented.

---

## 9. UI/UX

- **Payment list** follows the established list-page pattern used by
  `MyBookings.jsx` / `InvoiceList.jsx`: URL `status` filter on top, card grid
  (1 column mobile → multi-column desktop), shared `Pagination`, and the
  project's Loading/Empty/Error states (canonical §13).
- **Print view** produces a clean, single-column invoice (header, summary
  cards, line-item table, total row) with the site chrome hidden that targets
  the shared layouts so the customer home layout and staff shell share one
  rule. Screen layout/behavior is unchanged (print-only CSS).
- Responsive/accessibility: list already mobile-safe; Print remains an
  accessible `<button>`; no icon-only control is introduced.

---

## 10. Tests (planned, aligned with existing conventions)

| File | Cases | Notes |
|------|-------|-------|
| `src/test/customerPaymentList.test.jsx` | ~12 | renders cards+badges, verbatim amounts, booking links → `/bookings/:id`; status filter reset page to 1; pagination; empty (unfiltered vs filtered message); error+retry; loading; card links to `/payments/:id` |
| `src/test/customerPaymentRoutes.test.jsx` | ~6 | guest → `/login` with `state.from`; staff → `/staff/dashboard`; customer → list renders; `/payments` route exists; navbar "My Payments" link (desktop+mobile) visible only to customers |
| `src/components/customer/CustomerPaymentCard` test(s) — folded into the list file or `customerPaymentCard.test.jsx` | ~4 | badge, amount verbatim, method label, booking link |
| `src/test/invoiceDetail.test.jsx` (modified) | +2 | Print button present; clicking calls `window.print()` (spy) |
| `src/test/staffInvoiceDetail.test.jsx` (modified) | +2 | Print button present for any staff; clicking calls `window.print()` |
| Print-stylesheet smoke test (new `printStyles.test.js` or assertion in the invoice tests) | ~1 | `@media print` block exists in compiled CSS (jsdom can't layout-print; asserted as a CSS-text guard) |

Estimated **~25–27 new tests, +1 new test file**. Baseline 65 files / 572 tests
→ projected **~66 files / ~598 tests**. Final results are recorded in the
completion report (canonical `0.1j`), not promised in advance.

---

## 11. Performance Considerations

- **Bounded fetches:** the payment list is paginated (15/page default, `per_page`
  via `meta`), identical to `MyBookings`/`InvoiceList`. No windowing or
  virtualization is needed at this scale.
- **No extra network on print:** print renders already-fetched invoice data; no
  re-query, no N+1, no PDF/service round trip.
- **No new dependencies or bundle size growth** beyond two small components and
  print CSS; no `window.print()` performance trap introduced (browser-native,
  only triggered on user click).
- **No polling / real-time** (per canonical §19 item #6, stays deferred).

---

## 12. Files (planned)

**Create**
- `src/pages/customer/CustomerPaymentList.jsx`
- `src/components/customer/CustomerPaymentCard.jsx`
- `src/test/customerPaymentList.test.jsx`, `src/test/customerPaymentRoutes.test.jsx`
- `docs/FRONTEND-PHASE-11-IMPLEMENTATION-PLAN.md` (this document)

**Modify**
- `src/routes/CustomerApp.jsx` (add `/payments`)
- `src/components/customer/Navbar.jsx`, `src/components/customer/Footer.jsx`
  (customer-only **My Payments** link)
- `src/index.css` (`@media print` block)
- `src/pages/customer/InvoiceDetail.jsx`, `src/pages/staff/InvoiceDetail.jsx`
  (Print button)
- `src/test/invoiceDetail.test.jsx`, `src/test/staffInvoiceDetail.test.jsx`
  (print-button cases)

**No backend files touched.**

---

## 13. Deferred / Out-of-Scope (explicit)

- **Notifications / email** — backend not implemented (canonical §19 #5; no
  route). This is the only topic the "Phase 11" forward-pointer referenced;
  it needs a **backend** phase first, so it is **not** this phase.
- **PDF invoice download** — backend serves JSON only (§19 #8; §2.8/§2.15);
  no PDF client library is added.
- **Real-time updates / WebSocket / polling** — §19 #6; pages refresh on action.
- **Staff booking on behalf (STEP-12), staff user management, department
  management, admin employee panel, customer profile editing** — no endpoints
  exist (§19 #1/#2/#3/#13/#14; §0.1).
- **Dashboard revenue totals / time-series trends** — deferred by Phase 10
  (no existing endpoint yields revenue; would require a new backend endpoint).
- **Staff reverse invoice link on `/staff/payments/:id`** — payment show
  response carries no invoice id (Phase 9 deviation #3); the canonical
  deferral rationale stands (would require an invoices cross-lookup, kept out).
- **Dark mode, i18n, E2E automation, state libraries, payment gateway,
  calendar view** — §19 items #10/#11/#12/#16/#15/#19; not this phase.

---

## 14. Verification & Completion Steps (only after approval)

1. Implement per §4–§5; keep `oxlint` at 0 warnings.
2. `npm run test` → all 572 baseline tests stay green + new ones pass.
3. `npm run lint` → 0 warnings; `npm run build` → success (note gzip delta).
4. Backend `git status` → **docs only**; backend suite untouched (430 /
   1,322) — nothing to re-run.
5. Append canonical `## 0.1j` completion report to
   `hotel-backend-step08/docs/FRONTEND-INTEGRATION-PLAN.md`; update header.

---

*End of PROPOSED / DRAFT Phase 11 plan — awaiting approval. No code, test,
route, migration, or backend file was created or modified.*