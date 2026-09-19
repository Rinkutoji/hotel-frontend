# Phase 9: Staff Invoices & Discounts — Implementation Plan

**Status:** DRAFT — awaiting approval (research only, no code changed)
**Date:** 2026-09-15
**Repository:** `hotel-frontend` (`/Applications/XAMPP/xamppfiles/htdocs/hotel-frontend`)
**Frontend baseline (verified 2026-09-15):** oxlint 0 warnings · **51 test files / 461 tests passing** · `npm run build` successful (~130 kB gzipped JS)
**Backend baseline:** `hotel-backend-step08` app code **NOT modified in Phase 9** (STEP 01–17 implemented, verified; 430 tests / 1,322 assertions / 0 failures)

---

## 1. Repository Evidence

### 1.1 Frontend state (verified by inspection)

Staff module routes in `src/routes/StaffApp.jsx`:

| Route | Current element |
|---|---|
| `/staff/bookings`, `/staff/bookings/:id` | `StaffBookingList` / `StaffBookingDetail` (Phase 6 ✅) |
| `/staff/payments`, `/staff/payments/:id` | `StaffPaymentList` / `StaffPaymentDetail` (Phase 7 ✅) |
| `/staff/rooms`, `/staff/rooms/new`, `/staff/rooms/:id/edit` | `StaffRooms` / `StaffRoomForm` (Phase 8 ✅) |
| `/staff/room-types`, `/staff/room-types/new`, `/staff/room-types/:id/edit`, `/staff/room-types/:id/images` | `StaffRoomTypes` / `StaffRoomTypeForm` / `StaffRoomTypeImages` (Phase 8 ✅) |
| `/staff/invoices` | **ComingSoon stub** (`StaffModule title="Invoices"`, `ProtectedRoute actor="staff"`) |
| `/staff/discounts` | **ComingSoon stub** (`StaffModule title="Discounts"`, `ProtectedRoute actor="staff" roles=['admin','manager']`) |

- `src/components/staff/Sidebar.jsx` **already renders** the **Invoices** (any staff) and **Discounts** (admin/manager-only) nav links — the navigation shell for Phase 9 is already in place; only the route targets are stubs.
- No staff invoices or staff discounts code exists anywhere in `src/` (grep confirms zero matches for `staff/invoices` / `staff/discounts` beyond the sidebar + stub routes).
- Existing staff patterns to mirror: `PaymentList`/`Bookings` (URL-driven filters + `useApi` + `Pagination`), `PaymentDetail` (`performAction` machinery, 409/403 refetch), `PaymentFilters` (URL commit, shared `SearchBar`), `RoomTypeForm`/`RoomForm` (`noValidate` forms, inline `validate()`, `getFieldErrors` for 422s, create/update → navigate back), customer `InvoiceList`/`InvoiceDetail` (server-authoritative decimal strings, line-item table rendered verbatim), common `LoadingState`/`EmptyState`/`ErrorState`/`ErrorMessage`, `BookingStatusBadge`/`PaymentStatusBadge`.

### 1.2 Phases 2–8 (already delivered — must not be duplicated)

| Phase | Frontend scope | Verified |
|---|---|---|
| 2 | Authentication (customer + staff) | ✅ |
| 3 | Public hotel browsing (room types, rooms, images, availability) | ✅ |
| 4 | Customer booking flow (create/list/detail/cancel) | ✅ |
| 5 | Customer payments & invoices (create/receipt/list/detail) | ✅ |
| 6 | Staff bookings (list/detail/confirm/cancel/check-in/check-out) | ✅ |
| 7 | Staff payments & refunds (list/detail/verify/reject/refund/download) | ✅ |
| 8 | Staff room management (rooms CRUD + status, room types CRUD, room-type images) | ✅ |

### 1.3 Canonical roadmap (source of truth)

`hotel-backend-step08/docs/FRONTEND-INTEGRATION-PLAN.md` §8 **Feature Integration Order**:

| Canonical phase | # | Scope | Frontend delivery |
|---|---|---|---|
| F — Staff Booking & Operations | 30–32 | bookings list/detail/lifecycle | **Phase 6 (COMPLETE)** |
| G — Staff Payment & Refund | 33–37 | payment list/detail/receipt/verify/reject/refund | **Phase 7 (COMPLETE)** |
| H — Staff Room Management | 38–43 | rooms + room types + images | **Phase 8 (COMPLETE)** |
| **I — Staff Invoices & Discounts** | **44–48** | **staff invoices list (search), staff invoice detail, staff discount list, staff discount create/edit form, staff discount delete** | **THIS PLAN (Phase 9)** |
| J — Dashboard & Polish | 49–52 | dashboard stats, responsive polish, error boundary, loading skeletons | later (Phase 10) |

`docs/FRONTEND-PHASE-7-IMPLEMENTATION-PLAN.md` §0.1 and §12 and `docs/FRONTEND-PHASE-8-IMPLEMENTATION-PLAN.md` §1.3 confirm the same mapping: **Invoices + Discounts = Phase I = next** after Rooms (Phase H), before Dashboard (Phase J). Phase 9 in this repo therefore = Phase I.

### 1.4 Backend API inventory — implemented but NOT yet integrated

All endpoints below exist in `routes/api.php`, are controller/service/policy-complete, and are covered by the backend suite (430 tests). **None are consumed by the frontend today.**

| Group | Endpoints | Roles | Frontend status |
|---|---|---|---|
| Staff invoices | GET index (search/per_page), GET show | any staff role | ComingSoon stub |
| Staff discounts | GET index, POST store, GET show, PUT update, DELETE destroy | admin,manager only | ComingSoon stub |

**Total to integrate in Phase 9: 7 endpoints** (2 invoice + 5 discount) — all read-or-CRUD, no status transitions, no business-rule 409s.

---

## 2. Selected Phase 9 Scope

Staff Invoices & Discounts, mirroring canonical Phase I (#44–48) verbatim:

1. **Staff invoices list** (`/staff/invoices`) — any staff role; URL-driven `search` + pagination.
2. **Staff invoice detail** (`/staff/invoices/:id`) — any staff role; read-only document with payment, booking, customer and line-item snapshots.
3. **Staff discount list** (`/staff/discounts`) — admin,manager only; URL-driven `search` + pagination; delete entry point.
4. **Staff discount create/edit** (`/staff/discounts/new`, `/staff/discounts/:id/edit`) — admin,manager only.
5. **Staff discount delete** — admin,manager only; served from the list page (with inline confirm).

### Why it belongs after Phase 8

- Canonical §8 orders F→G→H→**I**→J; Phases 6, 7 and 8 realized F, G, H — Phase I is the next canonically ordered phase and was explicitly deferred in the Phase 7 and Phase 8 plans ("invoice links are a Phase I dependency", "Phase I to follow").
- All 7 endpoints are already implemented and backend-tested; no backend change is needed (pure frontend integration, same as Phases 3–8).
- Invoices depend on the Phase 7 verify flow (an invoice is generated only by payment verification); Discounts are standalone master data consumed at booking time.
- Does not duplicate any Phase 2–8 feature (customer invoice pages are read-only and ownership-scoped; the staff view is searchable, cross-customer, and links into the staff booking/payment modules).

---

## 3. Exact Backend Endpoints (all verified against `routes/api.php`, controllers, requests, policies, models, services, and the backend test suite)

All under `/api/v1`, `auth:sanctum` + `actor:staff`. Two-layer authorization (route `role:*` middleware, then policy `$this->authorize()` re-check).

### 3.1 Staff invoices (read-only; `routes/api.php` lines 221–224; `Staff/InvoiceController`)

| Method | URL | Roles | Query | Success response |
|---|---|---|---|---|
| GET | `/staff/invoices` | any staff | `search` (booking_number, customer name or email — `LIKE %…%`), `per_page` (1–50, default 15); **`status` is PROHIBITED → 422** | 200 `{success, data:[Invoice], meta}` — ordered `issued_at` desc, eager `payment.booking.customer` + `items` |
| GET | `/staff/invoices/{invoice}` | any staff | — | 200 `{success, data: Invoice}` — eager `payment.booking.customer` + `items` |

**Invoice shape (no `$hidden`, all columns):** `id, invoice_number` (`INV-XXXXXXXX`), `payment_id, total_amount` (decimal:2 → string, e.g. `"200.00"`), `issued_at` (datetime ISO), `created_at, updated_at`.

**Nested relations (`payment` ← Payment model; `receipt_path` is the only hidden field):**
- `payment`: `id, booking_id, amount` (string), `method` (`bank_transfer|cash`), `status` (`pending|receipt_uploaded|verified|rejected|refunded`), `verified_by, verified_at, notes, created_at, updated_at`.
- `payment.booking`: `id, booking_number, customer_id, check_in_date, check_out_date, status` (six booking statuses), `total_amount`, `payment_deadline_at, cancelled_at, cancellation_reason, no_show_at, late_fee_amount, late_fee_applied_at, created_at, updated_at`.
- `payment.booking.customer`: `id, name, email, phone, address, status, created_at, updated_at`.
- `items`: `[{id, invoice_id, room_number, room_type_name, price_per_night` (string), `nights` (integer), `line_total` (string), `created_at, updated_at}]` — persisted snapshots, immutable.

**Business rules (from `InvoicePolicy` + `Invoice` model):** any staff role may list/show any invoice; customers may only read their own (existing Phase 5 surface); invoices are immutable (never edited/deleted/voided); an invoice remains visible after its payment is refunded (`payment.status` then reads `refunded` — verified by `tests/Feature/Invoice/StaffInvoiceTest.php`).

### 3.2 Staff discounts (master data; `routes/api.php` lines 232–238; `Staff/DiscountController`, `DiscountService`, `DiscountPolicy`)

| Method | URL | Roles | Body | Success response |
|---|---|---|---|---|
| GET | `/staff/discounts` | admin,manager | — | 200 `{success, data:[Discount], meta}` — `search` (name `LIKE %…%`), `per_page` (1–50, default 15); ordered `min_nights` asc |
| POST | `/staff/discounts` | admin,manager | `{name, min_nights, percent_off}` | **201** `{success:true, message:"Discount created.", data: Discount}` |
| GET | `/staff/discounts/{discount}` | admin,manager | — | 200 `{success, data: Discount}` |
| PUT | `/staff/discounts/{discount}` | admin,manager | `{name, min_nights, percent_off}` (full replacement) | 200 `{success:true, message:"Discount updated.", data: Discount}` |
| DELETE | `/staff/discounts/{discount}` | admin,manager | — | 200 `{success:true, message:"Discount deleted.", data: null}` |

**Discount shape:** `id, name, min_nights` (integer), `percent_off` (decimal:2 → string, e.g. `"15.00"`), `created_at, updated_at`.

**Validation (`Discount/StoreRequest`, `Discount/UpdateRequest`):**
- `name`: required, string, max 255.
- `min_nights`: required, integer, min 1, **unique** (one tier per threshold — a duplicate → 422 on `min_nights`).
- `percent_off`: required, numeric, min 0.01, max 100. A 0% tier is invalid; `100` is allowed.
- `UpdateRequest` unique rule ignores the current row (`Rule::unique('discounts','min_nights')->ignore($this->route('discount'))`).

**Business rules (from `DiscountService`):** rows are pure master data consulted only at booking time; the discounted nightly rate is snapshotted into `booking_rooms.price_per_night`, so **editing/deleting a tier never mutates historical bookings** — delete is a **hard** delete with **no 409 guard** (unlike room-type delete). There are **no business-rule 409s** in this module; the only error statuses the frontend must render are **401/403/404/422/500**.

**Authorization:** every discount endpoint (including the list) requires `admin,manager` (route `role:admin,manager` + `DiscountPolicy` re-check for `viewAny/view/create/update/delete`). Receptionist and any customer → **403**; unauthenticated → **401** (verified by `tests/Feature/Discount/DiscountTierAdminTest.php`).

---

## 4. Frontend Routing Plan

All new routes inside `StaffApp.jsx`, inside `StaffLayout`, and inside `ProtectedRoute actor="staff"`:

| Route | Page | Access |
|---|---|---|
| `/staff/invoices` | `StaffInvoiceList` | any staff |
| `/staff/invoices/:id` | `StaffInvoiceDetail` | any staff |
| `/staff/discounts` | `StaffDiscountList` | admin,manager (`roles` prop) |
| `/staff/discounts/new` | `StaffDiscountForm` | admin,manager |
| `/staff/discounts/:id/edit` | `StaffDiscountForm` | admin,manager |

- Replace `<StaffModule title="Invoices" />` at `path="invoices"` with `StaffInvoiceList`; add `path="invoices/:id"` → `StaffInvoiceDetail`.
- Replace `<StaffModule title="Discounts" />` at `path="discounts"` (which already carries `roles={['admin','manager']}`) with `StaffDiscountList`; add `path="discounts/new"` and `path="discounts/:id/edit"` → `StaffDiscountForm`, both with the same roles gate.
- No customer routes modified; the remaining `StaffModule` usages are removed entirely (Rooms, Room Types, Payments, Bookings, Invoices, Discounts stubs are all now real) — `StaffModule` and `ComingSoon` keep working for any future stub.
- Sidebar needs **no change** (Invoices + Discounts links already present and role-gated).

---

## 5. Files to Create

### 5.1 Pages
| File | Purpose |
|---|---|
| `src/pages/staff/InvoiceList.jsx` | URL-driven list (`search`, `page`) + pagination + states |
| `src/pages/staff/InvoiceDetail.jsx` | Read-only invoice document + line-item table + back link |
| `src/pages/staff/DiscountList.jsx` | URL-driven tier list (`search`, `page`) + inline delete + states |
| `src/pages/staff/DiscountForm.jsx` | Create/edit tier (name, min_nights, percent_off) |

### 5.2 Components
| File | Purpose |
|---|---|
| `src/components/staff/InvoiceCard.jsx` | Invoice list row card (Link to detail) |
| `src/components/staff/DiscountCard.jsx` | Tier row card (Link to edit + delete confirm) |

### 5.3 Reused components (no changes)
`PaymentStatusBadge`, `BookingStatusBadge`, `Pagination`, `SearchBar`, `LoadingState`, `EmptyState`, `ErrorState`, `ErrorMessage`, `useApi`, `getErrorMessage`/`getFieldErrors`, `useAuth().hasRole`.

### 5.4 API service
- **Invoices:** add a `staffInvoices` group to the existing `src/api/paymentApi.js` (same file already holds `customerInvoices` and `staffPayments` — the established "payments + invoices in one module" convention, Phase 5/7):
  ```js
  export const staffInvoices = {
    /** GET /api/v1/staff/invoices */
    list: (params) => apiClient.get('/staff/invoices', { params }),
    /** GET /api/v1/staff/invoices/:id */
    show: (id) => apiClient.get(`/staff/invoices/${id}`),
  }
  ```
  The client must **never send `status`** (backend `prohibited` → 422; Phase 5 already enforces the same rule customer-side).
- **Discounts:** new module `src/api/discountApi.js` (discounts are pricing master data with no home in the existing payment/room modules):
  ```js
  export const staffDiscounts = {
    list: (params) => apiClient.get('/staff/discounts', { params }),
    show: (id) => apiClient.get(`/staff/discounts/${id}`),
    create: (data) => apiClient.post('/staff/discounts', data),
    update: (id, data) => apiClient.put(`/staff/discounts/${id}`, data),
    destroy: (id) => apiClient.delete(`/staff/discounts/${id}`),
  }
  ```

### 5.5 Test files
| File | Est. tests |
|---|---|
| `src/test/staffInvoiceApi.test.js` | ~6 |
| `src/test/staffInvoiceCard.test.jsx` | ~5 |
| `src/test/staffInvoiceList.test.jsx` | ~11 |
| `src/test/staffInvoiceDetail.test.jsx` | ~18 |
| `src/test/staffDiscountApi.test.js` | ~6 |
| `src/test/staffDiscountCard.test.jsx` | ~6 |
| `src/test/staffDiscountList.test.jsx` | ~11 |
| `src/test/staffDiscountForm.test.jsx` | ~13 |
| `src/test/staffInvoiceDiscountRoutes.test.jsx` | ~10 |

---

## 6. Files to Modify

| File | Change |
|---|---|
| `src/routes/StaffApp.jsx` | Replace invoices + discounts stubs with the 5 real routes + imports |
| `src/api/paymentApi.js` | Add `staffInvoices` group |
| `src/test/staffRoomRoutes.test.jsx` | Replace the two stub assertions ("keeps the invoices route as a stub", "keeps the discounts route as a stub") with real page assertions (this file is currently the only test asserting those stubs; `staffPaymentRoutes.test.jsx`'s discounts-gate test stays valid because it pauses at the `Forbidden` guard before rendering) |

**Existing tests:** `staffPaymentRoutes.test.jsx` ("keeps the discounts route gated to admin and manager roles" — remains green; `hasRole → false` short-circuits at `ProtectedRoute` → `Access denied`), `paymentApi.test.js`, customer invoice tests — all untouched.

---

## 7. Detailed Component Specifications

### 7.1 `src/pages/staff/InvoiceList.jsx` (`/staff/invoices`)

Mirrors `PaymentList.jsx`:
- `useSearchParams` → `search`, `page` (default 1); `apiParams` memo `{page, ...(search ? {search} : {})}` → `staffInvoices.list`; `useApi`.
- Loading / `ErrorState` (+retry) / header "Invoices" + subtitle "Billing documents generated when payments are verified."
- `SearchBar` (`placeholder="Search by booking #, name, or email"`) committing straight to URL with `page: 1` reset.
- Empty state via `EmptyState` — `title="No invoices found"`, filtered vs unfiltered message, **Clear all filters** when `search` is active (`CLEARED_FILTERS = { search: undefined, page: 1 }`).
- `StaffInvoiceCard`s in `space-y-3`; shared `Pagination` when `lastPage > 1`.

### 7.2 `src/components/staff/InvoiceCard.jsx`

Link card to `/staff/invoices/${invoice.id}` (same shell as `PaymentCard`):
- Primary line `invoice.invoice_number`.
- Secondary line `invoice.payment?.booking?.booking_number` (or `Booking #${invoice.payment?.booking_id ?? '—'}` fallback) + `invoice.payment?.booking?.customer ? '${name} · ${email}' : 'Guest not found'`.
- Right side: `PaymentStatusBadge status={invoice.payment?.status}` when present + `invoice.total_amount` verbatim; `formatDateTime(invoice.issued_at)`.

### 7.3 `src/pages/staff/InvoiceDetail.jsx` (`/staff/invoices/:id`)

Follows the customer `InvoiceDetail.jsx` layout, staff-flavored (mirrors `PaymentDetail` structure):
- `useApi(staffInvoices.show(id))`; 404 → `ErrorState` without retry + **Back to invoices** button; error → retry.
- Header: `invoice.invoice_number`, `Issued {formatDateTime(issued_at)}`, `PaymentStatusBadge` from `payment.status`.
- **Invoice details** card: `total_amount` (verbatim), issued; payment method + payment amount when `payment` present; `payment_id` not shown (surrogate).
- **Booking** card: `booking_number` linking `/staff/bookings/${booking.id}`, `BookingStatusBadge`, guest name/email, check-in/check-out dates, `total_amount`.
- **Payment** card: links `/staff/payments/${payment.id}` showing payment id, status badge, method label, amount, verified-by when available. (No direct invoice→payment relation on the payment endpoint, so no reverse invoice link is added in PaymentDetail — captured below in deferred scope.)
- **Line items** table rendered verbatim from `invoice.items` (room_number, room_type_name, price_per_night, nights, line_total) with a **Total** tfoot from `invoice.total_amount`; "No line items on this invoice." empty row.
- Read-only — no action buttons of any kind (invoices are immutable).

### 7.4 `src/pages/staff/DiscountList.jsx` (`/staff/discounts`)

Mirrors `PaymentList.jsx` (admin,manager-only via the route guard):
- `useSearchParams` → `search`, `page`; `apiParams` → `staffDiscounts.list`; `useApi`.
- Header "Discounts" + subtitle "Length-of-stay pricing tiers applied at booking time." + **New discount** button (`btn-primary`, `Link` to `/staff/discounts/new`).
- `SearchBar` (placeholder="Search discounts by name") committing with `page: 1` reset.
- Empty state `title="No discounts found"` with filtered vs unfiltered message + **Clear all filters**.
- `DiscountCard`s; shared `Pagination` when `lastPage > 1`.
- **Delete** lives on the card (inline confirm, below), calls `staffDiscounts.destroy`, then `refetch()`; success banner pattern from `PaymentDetail`/`RoomTypeImages` (list-scoped action message, refetch after success).
- Error statuses expected: 401/403/404/422/500 via shared helpers (no 409s in this module).

### 7.5 `src/components/staff/DiscountCard.jsx`

- Primary line `discount.name`, `min_nights` rendered as `From {min_nights} night{s}` (pluralized), right side `percent_off` verbatim with a `%` label (e.g. `15.00%`) — no numeric recomputation, the server's decimal string is displayed as-is.
- **Edit** link → `/staff/discounts/${discount.id}/edit` (admin,manager route already gated).
- **Delete** button opening an inline confirm (mirrors `RoomCard` transition confirm): `ErrorMessage` for action errors, submit label "Confirm delete", success → refetch list.

### 7.6 `src/pages/staff/DiscountForm.jsx` (`/staff/discounts/new`, `/staff/discounts/:id/edit`)

Follows `RoomTypeForm.jsx` exactly:
- `const { id } = useParams(); const editing = Boolean(id);`
- Edit mode: `useApi(staffDiscounts.show(id))`; 404 → not-found `ErrorState` + back link; render-phase prefill into `form = {name, min_nights: String, percent_off: String}` (render-time sync pattern per oxlint `set-state-in-effect` rule).
- Fields:
  - `name` — `input type="text" maxLength={255}`, required.
  - `min_nights` — `input type="number" min="1" step="1"`, required whole number ≥ 1. Form element carries **`noValidate`** (Phase 8 precedent: native constraint validation blocks `fireEvent.click` submits in jsdom when `min` is violated) and the page validates inline: `Number.isInteger(n) && n >= 1`.
  - `percent_off` — `input type="text" inputMode="decimal"` (Phase 8 `base_price` precedent keeps values verbatim, including trailing zeros, and avoids jsdom number-input quirks), required, inline `Number(v) > 0 && Number(v) <= 100`.
- Inline `validate()` builds `fieldErrors` (mirror messages to the backend: "name is required", "min_nights must be at least 1", "percent_off must be between 0.01 and 100").
- Submit payload: `{name: trim, min_nights: Number(form.min_nights), percent_off: form.percent_off}` — only the three approved fields are ever sent (the backend silently ignores injected money/foreign keys, but the frontend never sends them).
- On create (201) or update (200) → `navigate('/staff/discounts')`. On 422 → `getFieldErrors` surfaces `min_nights` uniqueness inline ("…already been taken"); submit error surfaced via `ErrorMessage`.
- Duplicate-submission guard (`submitting`), loading state while fetching the existing tier, **Back to discounts** link.

### 7.7 Routing (`StaffApp.jsx`) — final relevant block

```jsx
<Route path="invoices" element={<ProtectedRoute actor="staff"><StaffInvoiceList /></ProtectedRoute>} />
<Route path="invoices/:id" element={<ProtectedRoute actor="staff"><StaffInvoiceDetail /></ProtectedRoute>} />
<Route path="discounts" element={<ProtectedRoute actor="staff" roles={['admin','manager']}><StaffDiscountList /></ProtectedRoute>} />
<Route path="discounts/new" element={<ProtectedRoute actor="staff" roles={['admin','manager']}><StaffDiscountForm /></ProtectedRoute>} />
<Route path="discounts/:id/edit" element={<ProtectedRoute actor="staff" roles={['admin','manager']}><StaffDiscountForm /></ProtectedRoute>} />
```

---

## 8. Backend Authority & Error-Handling Rules

- Frontend never decides legality; it renders by role and the backend re-enforces (403) and owns validation (422) and existence (404). Routes remain wrapped in `ProtectedRoute` so guests → `/staff/login` with `state.from` and customers → `/`.
- `invoices` list/show: any staff role (admin, manager, receptionist). `discounts` all routes: admin,manager only — the frontend also gates via `ProtectedRoute roles`, and the server returns 403 for e.g. a receptionist.
- `getErrorMessage`: 401/403/404 → friendly lines; 422 → friendly + `getFieldErrors` inline; 409 → server message; 500 → server message else fallback. (No 409 business cases exist in this module; on 403 the user is directed via the guard or the error state.)
- 404 detail pages → `ErrorState` without retry + back-to-list button (Phase 7/8 pattern).
- Invoices are displayed verbatim: `total_amount`, `price_per_night`, `line_total`, payment/booking amounts are never recomputed client-side. `percent_off` is a decimal string rendered with a `%` label — no percentage arithmetic.

---

## 9. Test Plan

All in `src/test/`, mirroring the Phase 7/8 mocks (module-scoped `mock` via `MockAdapter(apiClient)`, mocked `useAuth`, `MemoryRouter`).

### 9.1 `staffInvoiceApi.test.js` (~6)
list sends `{search, page}` · list sends nothing when no params · never sends a `status` param (assert the client only forwards what is passed) · show by id · error rejection propagates (404).

### 9.2 `staffInvoiceCard.test.jsx` (~5)
invoice number + booking number · customer name/email line · guest-not-found fallback · amount + issued date + payment status badge · link href → `/staff/invoices/:id`.

### 9.3 `staffInvoiceList.test.jsx` (~11)
loading · renders cards · apiParams from URL (search/page) · search commits via SearchBar (page reset) · empty + filters message + clear button · empty without filters · pagination render + change · error + retry · status badge rendered · header/subtitle.

### 9.4 `staffInvoiceDetail.test.jsx` (~18)
loading · 404 (no retry, back button) · error retry · header (invoice number, issued, payment status badge) · invoice details card (total verbatim, payment method/amount) · booking card (link, number, badge, customer, dates, total) · payment card (link to `/staff/payments/:id`, amount, method) · line items table (room, type, price/night, nights, line total) · empty line items row · tfoot Total · refunded payment shows `PaymentStatusBadge` refunded (no actions) · back-to-invoices link.

### 9.5 `staffDiscountApi.test.js` (~6)
list passes search/per_page · list without params · show · create posts the three fields · update PUTs full replacement body · delete sends DELETE · error propagation.

### 9.6 `staffDiscountCard.test.jsx` (~6)
name + `From N nights` line · percent rendered verbatim with `%` label · edit link href · delete confirm flow (opens, cancels, confirms → callback) · delete error message.

### 9.7 `staffDiscountList.test.jsx` (~11)
loading · renders cards · apiParams from URL · search commits · empty + filters + clear · empty without filters · pagination · error + retry · New discount link present · delete success → destroy called + refetch.

### 9.8 `staffDiscountForm.test.jsx` (~13)
create renders back link · create submits `{name, min_nights, percent_off}` and navigates to `/staff/discounts` · edit prefills and submits PUT · inline validation: name required, min_nights ≥ 1 integer, percent_off > 0 and ≤ 100 · 422 server field error (`min_nights` unique) rendered inline · loading while fetching existing · 404 not-found on missing edit · duplicate-submit guard.

### 9.9 `staffInvoiceDiscountRoutes.test.jsx` (~10)
guest `/staff/invoices` → `/staff/login` with `state.from` · guest `/staff/invoices/:id` → login · guest `/staff/discounts` → login · customer on any → `/` · any staff reaches invoice list + detail · admin/manager reach discount list + new + edit · receptionist blocked from discounts (`Access denied`).

**Estimated new tests: ~85 → projected total: ~546** (461 baseline + ~85).

---

## 10. Implementation Order

1. **API + tests:** add `staffInvoices` (paymentApi.js) + new `discountApi.js`; write+run `staffInvoiceApi.test.js` and `staffDiscountApi.test.js`.
2. **Invoice card** `InvoiceCard.jsx` + tests.
3. **Invoice list** `InvoiceList.jsx` + tests.
4. **Invoice detail** `InvoiceDetail.jsx` + tests.
5. **Discount card** `DiscountCard.jsx` + tests.
6. **Discount list** `DiscountList.jsx` (delete + refetch) + tests.
7. **Discount form** `DiscountForm.jsx` (create/edit, validation, 422 surfacing) + tests.
8. **Route integration** in `StaffApp.jsx`; `staffInvoiceDiscountRoutes.test.jsx`; replace the two stub assertions in `staffRoomRoutes.test.jsx`.
9. **Final verification:** `npm run lint` (0 warnings), `npm run test` (all green), `npm run build` (success), backend `git status` unchanged (docs-only).

---

## 11. What is Deferred / Out of Scope (explicit)

**Deferred to later canonical phases:**
- Staff dashboard / summary stats, responsive polish, error boundary, loading skeletons (Phase J / Phase 10).
- Cross-module niceties that need backend support that does not exist: a `payment → invoice` relation (the payment `show` response carries no invoice id), so **no invoice link is added to `StaffPaymentDetail`**; a booking→invoice lookup is a list-fetch+match, deferred and optional.

**Out of scope for Phase 9:**
- No staff-side invoice generation, editing, deletion or download (the backend exposes none — invoices are generated only by payment verification and are immutable).
- No discount "pause/enable" or multi-discount stacking UI (the backend has a single active-definition table and resolves one tier per stay).
- No customer-side changes (customer invoice pages from Phase 5 are untouched).
- No backend changes, no new endpoints.
- `Sidebar` unchanged (nav links already present); the `staff/invoices` subscription pattern is not needed — the single pages render everything.

---

## 12. Risk Notes & Deviations

- **Invoices are always decimal strings** (`total_amount`, `price_per_night`, `line_total`, `payment.amount`) — render verbatim, never `Number()` (Phase 4/5 rule).
- **`percent_off` is a decimal string** (e.g. `"12.00"`) — the form captures it as text (`inputMode="decimal"`) and submits verbatim; the list renders it verbatim with a `%` label. `min_nights` is a true integer — parse with `Number()` before submit.
- **Discount list is admin/manager-gated too** (unlike invoice/payment read-listings which are any staff) — the `ProtectedRoute` `roles` gate must be present on all discount routes, and it already is on the current stub.
- **`status` is prohibited on the staff invoice list** (mirror the customer rule) — the client must not construct or forward a status param.
- **`min_nights` uniqueness** is the only cross-field validation gotcha: the 422 field error must render inline so the user sees "already taken" rather than a generic failure.
- **No 409s** in this module: delete is a hard delete with snapshot safety, so the `performAction` 409-refetch machinery is not needed on the discount list — a plain confirm → destroy → refetch suffices (keep the running-action guard for double-clicks).
- Housekeeping, matching Phase 8 note: the Phase 6 plan's internal renumbering conflict is resolved — canonical §8 letters are the source of truth (I = Invoices + Discounts). The Phase 9 completion report will be appended to the canonical `FRONTEND-INTEGRATION-PLAN.md` as `0.1h` following the Phase 7 (`0.1f`) and Phase 8 (`0.1g`) sections and the status/date header lines will be updated (doc-only, after approval).

---

## 13. Verified Source Files (read, not assumed)

Backend (`/Applications/XAMPP/xamppfiles/htdocs/hotel-backend-step08`):
- `routes/api.php` (staff invoices group lines 221–224; staff discounts group lines 232–238)
- `app/Http/Controllers/Api/V1/Staff/{InvoiceController,DiscountController}.php`
- `app/Services/DiscountService.php`
- `app/Http/Requests/Invoice/FilterRequest.php` (status prohibited)
- `app/Http/Requests/Discount/{FilterRequest,StoreRequest,UpdateRequest}.php`
- `app/Policies/{InvoicePolicy,DiscountPolicy}.php`
- `app/Models/{Invoice,InvoiceItem,Discount}.php`
- `app/Support/ApiResponse.php`
- `docs/FRONTEND-INTEGRATION-PLAN.md` (§2.15 Staff — Invoices, §2.16 Staff — Discounts, §8 Feature Integration Order Phase I #44–48)
- `tests/Feature/Invoice/StaffInvoiceTest.php`, `tests/Feature/Discount/DiscountTierAdminTest.php`

Frontend (`/Applications/XAMPP/xamppfiles/htdocs/hotel-frontend`):
- `src/api/paymentApi.js` (`customerInvoices` + `staffPayments` conventions), `src/api/roomApi.js` (group conventions)
- `src/routes/StaffApp.jsx`, `src/routes/ProtectedRoute.jsx`, `src/components/staff/Sidebar.jsx`
- `src/pages/staff/{PaymentList,PaymentDetail,RoomForm,RoomTypeForm}.jsx` (patterns)
- `src/components/staff/{PaymentCard,PaymentFilters}.jsx` (patterns)
- `src/pages/customer/{InvoiceList,InvoiceDetail}.jsx` (invoice shape consumers — Phase 5)
- `src/hooks/useApi.js`, `src/utils/apiError.js`, `src/context/AuthContext.jsx` (`hasRole`)
- `src/test/{staffPaymentRoutes,staffRoomRoutes}.test.jsx` (stub assertions to update)
- `docs/FRONTEND-PHASE-8-IMPLEMENTATION-PLAN.md` (structure/mirror)