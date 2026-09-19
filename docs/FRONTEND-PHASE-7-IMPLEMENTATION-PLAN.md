# Phase 7: Staff Payment & Refund — Implementation Plan

**Status:** DRAFT — awaiting approval (research only, no code changed)
**Date:** 2026-09-14
**Baseline:** lint 0 warnings · 37 test files / 289 tests passing · build successful · backend app code untouched

---

## 0. Scope Rationale & Evidence-Based Comparisons

### 0.1 Canonical phase mapping (source of truth: `FRONTEND-INTEGRATION-PLAN.md` §8)

The canonical plan's **Feature Integration Order** defines the phases in order:

| Canonical phase | Scope | Frontend delivery |
|---|---|---|
| Phase F — Staff Booking & Operations (§8 #30-32) | Bookings list/detail/lifecycle | **Phase 6 (COMPLETE)** |
| **Phase G — Staff Payment & Refund (§8 #33-37)** | Payments list/detail, receipt download, verify/reject, refund | **This plan (Phase 7)** |
| Phase H — Staff Room Management (§8 #38-43) | Rooms + room types + images | later |
| Phase I — Staff Invoices & Discounts (§8 #44-48) | Invoices + discounts | later |
| Phase J — Dashboard & Polish (§8 #49-52) | Dashboard stats, polish | later |

Phase G items adopted verbatim:
1. **33.** Staff payments list (with filters: status, search)
2. **34.** Staff payment detail
3. **35.** Receipt download (staff view)
4. **36.** Payment verification / rejection
5. **37.** Refund action (admin/manager only)

This is also the next-highest weighted candidate in the Phase 6 scoring (Staff Payments was measured right below Staff Bookings 129).

### 0.2 Backend modules still not integrated (for context)

| Module | Canonical section | Score signal (Phase 6 board) | Phase |
|---|---|---|---|
| Staff — Payments | §2.14 | next (below Bookings) | **7 (this plan)** |
| Staff — Rooms + status | §2.12 | after | H |
| Staff — Room types + images | §2.10/2.11 | after | H |
| Staff — Invoices | §2.15 | after | I |
| Staff — Discounts | §2.16 | after | I |
| Staff — Dashboard/stats | §2.1 | last | J |

### 0.3 Payment statuses — complete reference

`pending` → `receipt_uploaded` → `verified` → `refunded`, with `rejected` reachable from `receipt_uploaded` (and back to `receipt_uploaded` on customer re-upload). Verified payments become `refunded` only via a refund.

---

## 1. Backend API Contract (Verified)

Verified against `routes/api.php`, `Staff/PaymentController.php`, `PaymentService.php`, `PaymentPolicy.php`, the `Payment/` form requests, and `ApiResponse.php` (2026-09-14). No backend code was modified.

### 1.1 Staff payment endpoints (actual routes, `routes/api.php` lines 197-216)

| Method | URL | Auth/Roles | Body | Query | Success response |
|---|---|---|---|---|---|
| GET | `/staff/payments` | staff, any | — | `status`, `search`, `per_page` | 200 `{success, message, data: [...Payment], meta}` |
| GET | `/staff/payments/{payment}` | staff, any | — | — | 200 `{success, message, data: Payment (with booking.customer, verifiedBy)}` |
| GET | `/staff/payments/{payment}/receipt` | staff, any | — | — | 200 **binary** file download; 404 `{success:false,message:"Receipt not found."}` |
| POST | `/staff/payments/{payment}/verify` | staff `admin,manager,receptionist` | — | — | 200 `{success, message:"Payment verified.", data: Payment}` |
| POST | `/staff/payments/{payment}/reject` | staff `admin,manager,receptionist` | `{reason: string}` (required, max 255) | — | 200 `{success, message:"Payment rejected.", data: Payment}` |
| POST | `/staff/payments/{payment}/refund` | staff `admin,manager` only | `{reason: string}` (required, max 255) | — | 200 `{success, message:"Payment refunded.", data: Payment}` |

Route middleware: `auth:sanctum` + `actor:staff`, then `role:...` middleware, then `PaymentPolicy` re-check inside the controller (two-layer pattern).

### 1.2 Verified Payment object shape

Fields returned on both list item and detail (`Payment` model, `ApiResponse`):

```
id, booking_id, amount (decimal:2 → string, e.g. "1500.00"), method ("bank_transfer"|"cash"),
status (pending|receipt_uploaded|verified|rejected|refunded),
verified_by, verified_at (datetime|null), notes (string|null), created_at, updated_at
```

- `receipt_path` is never returned (hidden server-side).
- List items: eager-loaded `booking.customer` → `payment.booking.booking_number`, `payment.booking.status`, `payment.booking.customer.name/email`.
- Detail: eager-loaded `booking.customer` **and** `verifiedBy` (employee name).

### 1.3 Response envelopes (from `ApiResponse.php`)

- Success: `{success: true, message, data}`
- Paginated: `{success: true, message, data: [...], meta: {page, per_page, total, last_page}}`
- Error: `{success: false, message, errors?}`

### 1.4 Business rules (from `PaymentService.php`)

- **verify**: only `receipt_uploaded` payments of a non-terminal booking. Atomically → `verified` (+`verified_at`/`verified_by`), booking `pending_payment`→`confirmed`, room→`reserved`, and an invoice is issued (STEP 16). If the booking is an expired hold it is auto-cancelled and the call returns **409** `"This booking has expired and has been automatically cancelled."`
- **reject**: only `receipt_uploaded` payments whose booking is still `pending_payment`. Reason is stored in `notes`; file kept for audit; customer may re-upload later (`rejected`→`receipt_uploaded`).
- **refund**: only `verified` payments whose booking is `confirmed` or `pending_payment` (guest must not have stayed). Atomically → `refunded` (+`notes`) and booking → `cancelled` (rooms released).
- Any break of the above → `BusinessRuleException` → **HTTP 409** with the server's user-meaningful message (frontend `getErrorMessage` surfaces it).
- Validation failures (bad `status` filter value, `per_page` outside 1..50, missing `reason`, reason >255) → **HTTP 422** with `{errors: {field: [msg]}}`.
- Role failures → **HTTP 403**; unauthenticated → **401**; missing payment/receipt → **404**.

---

## 2. Frontend Routing Plan

### 2.1 New routes (inside `StaffApp.jsx`, inside `StaffLayout` + `ProtectedRoute actor="staff"`)

| Route | Page | Access |
|---|---|---|
| `/staff/payments` | `StaffPaymentList` | any staff |
| `/staff/payments/:id` | `StaffPaymentDetail` | any staff |

### 2.2 Modified routes (`StaffApp.jsx`)

- Replace `<StaffModule title="Payments" />` at `path="payments"` with `StaffPaymentList`; add `path="payments/:id"` → `StaffPaymentDetail`.
- `StaffModule` stays for `rooms`, `room-types`, `invoices`, `discounts` (unchanged).

### 2.3 No customer routes modified

---

## 3. Files to Create

### 3.1 Pages

| File | Purpose |
|---|---|
| `src/pages/staff/PaymentList.jsx` | URL-driven list with status/search filters + pagination |
| `src/pages/staff/PaymentDetail.jsx` | Detail + receipt download + verify/reject/refund actions |

### 3.2 Components

| File | Purpose |
|---|---|
| `src/components/staff/PaymentCard.jsx` | List row card (Link to detail) |
| `src/components/staff/PaymentFilters.jsx` | Status select + search bar (URL-driven) |

### 3.3 Reused components (no changes)

`PaymentStatusBadge` (all five statuses already mapped), `Pagination`, `SearchBar`, `LoadingState`, `EmptyState`, `ErrorState`, `ErrorMessage`, `useApi`, `getErrorMessage`/`getFieldErrors`, `useAuth().hasRole`.

### 3.4 API service

Add a `staffPayments` group to the existing `src/api/paymentApi.js` (same single-file/two-group convention as `bookingApi.js` — do not create a new file):

```js
export const staffPayments = {
  /** GET /api/v1/staff/payments */
  list: (params) => apiClient.get('/staff/payments', { params }),

  /** GET /api/v1/staff/payments/:id */
  show: (id) => apiClient.get(`/staff/payments/${id}`),

  /** GET /api/v1/staff/payments/:id/receipt (binary download) */
  downloadReceipt: (id) =>
    apiClient.get(`/staff/payments/${id}/receipt`, { responseType: 'blob' }),

  /** POST /api/v1/staff/payments/:id/verify */
  verify: (id) => apiClient.post(`/staff/payments/${id}/verify`),

  /** POST /api/v1/staff/payments/:id/reject */
  reject: (id, reason) => apiClient.post(`/staff/payments/${id}/reject`, { reason }),

  /** POST /api/v1/staff/payments/:id/refund */
  refund: (id, reason) => apiClient.post(`/staff/payments/${id}/refund`, { reason }),
}
```

### 3.5 Test files

| File | Est. count |
|---|---|
| `src/test/staffPaymentApi.test.js` | ~10 |
| `src/test/staffPaymentCard.test.jsx` | ~5 |
| `src/test/staffPaymentList.test.jsx` | ~11 (filters exercised here, mirroring Phase 6) |
| `src/test/staffPaymentDetail.test.jsx` | ~22 |
| `src/test/staffPaymentRoutes.test.jsx` | ~5 |

---

## 4. Files to Modify

| File | Change |
|---|---|
| `src/routes/StaffApp.jsx` | Wire payments + payments/:id routes |
| `src/api/paymentApi.js` | Add `staffPayments` group |

**Existing tests:** no existing test targets `StaffApp` payments stub except `staffBookingRoutes.test.jsx`/`customerPaymentRoutes.test.jsx`; add a dedicated `staffPaymentRoutes.test.jsx` and leave prior tests untouched (verify they still pass).

---

## 5. Detailed Component Specifications

### 5.1 `src/pages/staff/PaymentList.jsx`

Mirrors `BookingList.jsx` exactly:

- `useSearchParams` → `status`, `search`, `page` (default 1).
- `apiParams` memo: `{ page, ...(status ? {status} : {}), ...(search ? {search} : {}) }` → `staffPayments.list`.
- `useApi(fetchPayments)`; render `LoadingState label="Loading payments…"` / `ErrorState` (+retry) / header "Payments" + subtitle "View and verify guest payments."
- `PaymentFilters` at top; empty state via `EmptyState` with `title="No payments found"`, filtered vs unfiltered message, "Clear all filters" button when `hasFilters` (`status` or `search`).
- Cards in `space-y-3`; `Pagination` when `lastPage > 1`.
- `CLEARED_FILTERS = { status: undefined, search: undefined, page: 1 }`.

### 5.2 `src/components/staff/PaymentFilters.jsx`

- `STATUS_OPTIONS = ['pending','receipt_uploaded','verified','rejected','refunded']` rendered as `value.replaceAll('_',' ')` labels.
- Status `<select>` + `SearchBar placeholder="Search by booking #, name, or email"` — both commit straight to URL with `page: 1` reset (no date fields — the backend supports only `status` + `search`; `commitParams` setState-from-event pattern from `BookingFilters.jsx`, no render-time sync needed since there are no draft date inputs).

### 5.3 `src/components/staff/PaymentCard.jsx`

Link card to `/staff/payments/${payment.id}` (same shell as `StaffBookingCard`):

- Primary line `/payment.booking.booking_number/f`, else `Payment #{payment.id}` fallback.
- `customer ? `${customer.name} · ${customer.email}` : 'Guest not found'` (from `payment.booking.customer`).
- Date line: `new Date(payment.created_at).toLocaleDateString()`, plus method label (`bank_transfer`→"Bank transfer", `cash`→"Cash"; reuse `METHOD_LABELS`).
- Right side: `PaymentStatusBadge` + amount `payment.amount`.

### 5.4 `src/pages/staff/PaymentDetail.jsx`

Follows `BookingDetail.jsx` action machinery + customer `PaymentDetail.jsx` receipt/download layout.

**State:** `runningAction`, `actionError`, `actionMessage` (auto-dismiss 5 s via `useEffect`), `rejectOpen`, `reason`, `fieldErrors`, `downloading`, `downloadError`.

**`performAction(name, request)`:** identical to Phase 6 — set runningAction, clear errors, `await request()`, `setActionMessage(SUCCESS[name])`, close form, clear reason, `await refetch()`; on error set field errors + actionError; on **409 or 403 refetch**; finally clear runningAction.

**Derived visibility:**

- `showActions = status === 'receipt_uploaded'` → **Verify** btn-primary + **Reject** btn-outline (opens reason form). (Verify/reject are allowed for every staff role; server stays the authority.)
- `showRefund = status === 'verified'` → **Refund** btn-primary, rendered only when `hasRole(['admin','manager'])`; for other roles show the info line "Refunds require manager or admin access."
- Reason forms (reject + refund) reuse the cancel-form pattern: `ErrorMessage error={actionError && runningAction === null ? actionError : null}`, required input `maxLength={255}` with `fieldErrors.reason`, submit disabled until non-empty trimmed `reason`; "Keep payment"/close action.
- Terminal info boxes for `rejected` (red, shows `payment.notes` + "Wait for the guest to upload a corrected receipt.") and `refunded` (slate, shows `payment.notes` + "The associated booking was cancelled.").

**Receipt section:** `status !== 'pending'` → "Receipt uploaded" + **View receipt** button that calls `staffPayments.downloadReceipt` (blob → `URL.createObjectURL` → `window.open` → revoke after 1 s — same as customer `PaymentDetail.jsx`). `downloadError` shown via `ErrorMessage`. When verified: green line `Verified by {payment.verifiedBy.name} on {formatted(verified_at)}`.

**Cards:** header row `Payment #{payment.id}` + `PaymentStatusBadge` + back link to `/staff/payments`; "Payment summary" card (amount, method, created, updated, verified when present); "Booking" card with `booking.booking_number` link to `/staff/bookings/:id`, `BookingStatusBadge`, customer name/email, check-in/out dates, `total_amount`. (Invoice is a Phase I dependency — no invoice links here.)

**Success messages:** verify → "Payment verified. The booking was confirmed and an invoice was issued." · reject → "Payment rejected." · refund → "Payment refunded. The booking was cancelled."

### 5.5 Routing (`StaffApp.jsx`) — final relevant block

```jsx
<Route
  path="payments"
  element={
    <ProtectedRoute actor="staff">
      <StaffPaymentList />
    </ProtectedRoute>
  }
/>
<Route
  path="payments/:id"
  element={
    <ProtectedRoute actor="staff">
      <StaffPaymentDetail />
    </ProtectedRoute>
  }
/>
```

---

## 6. Backend authority & error-handling rules

- Frontend never decides legality; it only decides what to render. Buttons are shown on status/role, server re-enforces and returns 409/403.
- `getErrorMessage`: 401/403/404 → friendly lines; 422 → friendly line (field detail separate); **409 → server message** (e.g. expired-hold auto-cancel wording) and 500 → server message. After 409/403 the page refetches so state reconciles.
- 404 detail → `ErrorState` without retry + back-to-payments button (mirror Phase 6).

---

## 7. Test Plan

All in `src/test/`, mirroring Phase 6 mocks (module-scoped `let mock` helper, mocked `apiClient` for the API test, mocked `useApi`/router for page tests).

### 7.1 `staffPaymentApi.test.js` (~10)

list (no params) · list passes status+search+per_page · show · downloadReceipt uses blob responseType · verify posts with no body · reject sends `{reason}` · refund sends `{reason}` · list pagination meta surfaced · error rejection propagates.

### 7.2 `staffPaymentCard.test.jsx` (~5)

booking number + customer · guest-not-found fallback · amount + method label · `PaymentStatusBadge` for statuses · link href → `/staff/payments/:id`.

### 7.3 `staffPaymentList.test.jsx` (~11)

loading · renders cards from data · apiParams from URL (status/search/page) · status select commits (page reset) · search commits via SearchBar · empty + filters message + clear button · empty without filters · pagination render + change · error + retry · badge rendered.

### 7.4 `staffPaymentDetail.test.jsx` (~22)

loading · 404 (no retry, back button) · generic error retry · summary card (amount, method, created, status badge) · booking card (link, customer name/email, dates, total) · pending → no view-receipt · receipt_uploaded → view receipt + verify + reject · verify success → banner + refetch · reject opens form + validation (disabled until reason) + success · verified → verified-by line + refund (admin role) · refund success → banner + refetch · rejected shows reason + no verify · refunded shows reason + no refund · receptionist: no refund button + hint · 409 shows server message + refetch · 422 surfaces reason field error · download blob → `window.open` · download error.

### 7.5 `staffPaymentRoutes.test.jsx` (~5)

payments renders list · payments/:id renders detail · non-staff blocked (redirect) · discounts still admin/manager-gated · rooms/room-types/invoices stubs intact.

**Estimated new tests: ~53 → projected total: 342** (289 baseline + 53).

---

## 8. Implementation Order

1. **API + tests:** add `staffPayments` group; write+run `staffPaymentApi.test.js`.
2. **`PaymentStatusBadge` reuse** (verify existing tests still pass — no change).
3. **`PaymentCard`** + tests.
4. **`PaymentFilters`**.
5. **`PaymentList`** + tests.
6. **`PaymentDetail`** + tests.
7. **Route integration** in `StaffApp.jsx`; `staffPaymentRoutes.test.jsx`.
8. **Final verification:** `npm run lint` (0 warnings), `npm run test` (all green), `npm run build` (success), backend `git status` unchanged.

---

## 9. What is Deferred / Out of Scope (explicit)

**Deferred to later canonical phases:**
- Staff invoices list/detail (Phase I) — invoice links intentionally omitted from this phase.
- Staff discounts list/create/edit/delete (Phase I).
- Staff rooms / room types / room images (Phase H).
- Staff dashboard stats / polish (Phase J).

**Out of scope for Phase 7:**
- No staff-side payment creation or receipt upload (the backend has no such route by design — STEP 10 §3 matrix shows staff upload as "-").
- No backend changes, no customer-side changes.
- No multi-payment support, no refund workflow beyond the single verify→refund path the backend supports.
- `rooms`, `room-types`, `invoices`, `discounts` keep their `StaffModule` stubs.

---

## 10. Risk Notes & Deviations

- **Amount is a string** (`decimal:2`) rendered verbatim, matching existing customer payment screens — do not `Number()` it.
- **`verifiedBy`** is only eager-loaded on `show`, so card/list code must not reference it.
- **Rejected payments still have a viewable receipt** (kept on disk for audit) — `status !== 'pending'` governs the View receipt button, not just positive statuses.
- **Expired-hold verify → 409** with auto-cancel wording surfaces via `getErrorMessage`; the refetch keeps the page consistent (booking shows `cancelled`).
- Housekeeping: the canonical plan's top status line (§status) still lists Phases 1–5; Phase 6's completion report was added as section `0.1e` without touching that line. On Phase 7 completion, the report will be appended following the Phase 6 pattern; updating the status header is a doc-only item, out of scope for the code change.
- Keep `Page` tests free of real timers/logic duplication already covered by `performAction` 409-refetch behavior.

---

## 11. Verified Source Files (read, not assumed)

Backend (`/Applications/XAMPP/xamppfiles/htdocs/hotel-backend-step08`):
- `routes/api.php` (staff payments group, lines 197-216)
- `app/Http/Controllers/Api/V1/Staff/PaymentController.php`
- `app/Services/PaymentService.php`
- `app/Policies/PaymentPolicy.php`
- `app/Http/Requests/Payment/{FilterRequest,RejectPaymentRequest,RefundRequest}.php`
- `app/Models/Payment.php`
- `app/Support/ApiResponse.php`
- `docs/FRONTEND-INTEGRATION-PLAN.md` (§2.14 Staff — Payments, §8 Feature Integration Order Phase G #33-37)
- `app/Exceptions/BusinessRuleException.php`

Frontend (`/Applications/XAMPP/xamppfiles/htdocs/hotel-frontend`):
- `src/api/paymentApi.js`
- `src/routes/StaffApp.jsx`
- `src/pages/staff/BookingList.jsx`, `src/pages/staff/BookingDetail.jsx` (patterns)
- `src/components/staff/BookingCard.jsx`, `src/components/staff/BookingFilters.jsx` (patterns)
- `src/pages/customer/PaymentDetail.jsx` (receipt download/upload pattern)
- `src/components/customer/PaymentStatusBadge.jsx`, `src/components/customer/SearchBar.jsx`
- `src/hooks/useApi.js`, `src/utils/apiError.js`, `src/context/AuthContext.jsx` (`hasRole`)
- `docs/FRONTEND-PHASE-6-IMPLEMENTATION-PLAN.md` (structure/mirror)