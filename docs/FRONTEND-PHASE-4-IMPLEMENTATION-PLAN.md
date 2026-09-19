# FRONTEND PHASE 4 — CUSTOMER BOOKING FLOW

**Status:** PLAN (awaiting approval)
**Date:** 2026-09-14
**Repository:** `hotel-frontend` (feature built on top of Phase 2 Authentication + Phase 3 Public Browsing)
**Backend baseline:** 430 tests / 1,322 assertions / 0 failures — **NOT modified in Phase 4**
**Frontend baseline:** 18 files / 111 tests — all passing; lint clean; build successful

---

## 0. Verified sources (read, not assumed)

Backend (unchanged, read for the API contract):

- `routes/api.php` — customer booking + public availability routes
- `Http/Controllers/Api/V1/{Public,Customer}/BookingController.php`
- `Services/BookingService.php` — `searchAvailable`, `create`, `cancelByCustomer`, hold/expiry logic
- `Policies/BookingPolicy.php`, `Http/Requests/Booking/{CreateBookingRequest,AvailabilityRequest,CancelRequest,FilterRequest}.php`
- `Models/{Booking,BookingRoom,Room,RoomType}.php`
- `Support/ApiResponse.php`, `bootstrap/app.php` (error envelope), `Exceptions/BusinessRuleException.php`
- `config/booking.php` — `hold_hours` (2), `max_stay_nights` (30), `max_rooms_per_booking` (5)
- `tests/Feature/Booking/{CustomerBookingTest,AvailabilityTest}.php` — asserted response shapes

Frontend (read): `src/api/{client,roomApi,bookingApi,authApi}.js`, `src/hooks/useApi.js`,
`src/context/AuthContext.jsx`, `src/routes/{CustomerApp,ProtectedRoute,PublicOnlyRoute}.jsx`,
`src/pages/customer/{Rooms,RoomDetails,AvailabilitySearch,Home,Profile,Login}.jsx`,
`src/components/customer/*`, `src/components/common/*`, `src/utils/{apiError,authStorage}.js`,
`src/test/*` (mocking patterns). **No implementation is started by this document.**

---

## 1. API Endpoints Discovered (actual)

All under `/api/v1`. Phase 4 uses the customer-authenticated booking endpoints and reuses the
already-integrated public availability endpoint for server-side pricing previews.

| Method | Endpoint | Auth | Used for |
|---|---|---|---|
| `POST` | `/public/availability` | none | price preview + availability confirmation on the checkout page (integrated in Phase 3 — unchanged) |
| `POST` | `/customer/bookings` | `auth:sanctum`, `actor:customer` | create booking → `pending_payment` |
| `GET` | `/customer/bookings` | `auth:sanctum`, `actor:customer` | own bookings list, paginated, `status` filter |
| `GET` | `/customer/bookings/{booking}` | `auth:sanctum`, `actor:customer` | booking detail (404 unless own) |
| `POST` | `/customer/bookings/{booking}/cancel` | `auth:sanctum`, `actor:customer` | cancel own `pending_payment` booking |

Notes verified in code:
- Ownership is enforced backend-side twice (policy + query scoping) — a foreign booking 404s.
- A staff token on a customer route → 403; a guest → 401.
- The list endpoint applies **only** the `status` filter (the controller reads `status` alone;
  `Booking/FilterRequest`'s `from/to/search` are validated but **not** applied by the customer
  controller — do not surface those filters in Phase 4).
- Cancellation is `pending_payment`‑only; cancel of any other status → 409 (business rule).

---

## 2. Exact Request Structures

### 2.1 `POST /customer/bookings` request body

```json
{
  "check_in_date": "2026-09-16",
  "check_out_date": "2026-09-18",
  "rooms": [1, 2]
}
```

Validation (from `CreateBookingRequest`, all confirmed):
- `check_in_date` — required, date, `after_or_equal:today`
- `check_out_date` — required, date, `after:check_in_date`; stay ≤ `config('booking.max_stay_nights')` (30) nights
- `rooms` — required array, `min:1`, `max:5`, each element required integer + `distinct` + must exist
  (soft-deleted rooms fail). Money/status/payment fields are never accepted.

### 2.2 `GET /customer/bookings` query params

- `status` — optional, one of `pending_payment,confirmed,checked_in,checked_out,cancelled,no_show`.
- Pagination is server-defaulted to 15 per page (fixed server-side; no `per_page` override used).

### 2.3 `POST /customer/bookings/{booking}/cancel` request body

```json
{ "reason": "Change of plans" }
```
`reason` is optional (`nullable`, `string`, `max:255`). Omitted → server defaults to
`'Cancelled by customer'`.

### 2.4 `POST /public/availability` request body (reused as the checkout price preview)

```json
{ "check_in_date": "2026-09-16", "check_out_date": "2026-09-18", "rooms": [1, 2] }
```
No auth; `rooms` array min:1 max:5 distinct existing ids (same caps as create).

---

## 3. Exact Response Structures

### 3.1 Single-resource envelope (create 201 / show 200 / cancel 200)

```json
{
  "success": true,
  "message": "Booking created.",
  "data": {
    "id": 12,
    "booking_number": "BK-8F3KQ2XA",
    "customer_id": 3,
    "check_in_date": "2026-09-16T00:00:00.000000Z",
    "check_out_date": "2026-09-18T00:00:00.000000Z",
    "status": "pending_payment",
    "total_amount": "200.00",
    "payment_deadline_at": "2026-09-14T12:34:56.000000Z",
    "cancelled_at": null,
    "cancellation_reason": null,
    "created_at": "2026-09-14T10:34:56.000000Z",
    "updated_at": "2026-09-14T10:34:56.000000Z",
    "booking_rooms": [
      {
        "id": 1,
        "booking_id": 12,
        "room_id": 1,
        "room_type_id": 1,
        "price_per_night": "100.00",
        "actual_check_in_at": null,
        "actual_check_out_at": null,
        "room": { "id": 1, "room_number": "101", "floor": 1, "status": "available", "room_type_id": 1 },
        "room_type": { "id": 1, "name": "Standard Room", "base_price": "89.00" }
      }
    ],
    "customer": { "id": 3, "name": "Jane Doe", "email": "jane@example.com", "phone": null }
  }
}
```

Create specifics (verified):
- `create` → **201**, message `'Booking created.'`.
- `booking_number` = `BK-` + 8 uppercase random chars.
- `status` starts at `pending_payment`; room `status` is left untouched (the booking row **is** the hold).
- `payment_deadline_at` = `created_at + config('booking.hold_hours')` (2h).
- `total_amount` = Σ over rooms of `nights × price_per_night`, server-computed - a decimal:2 string.
- Eager loads: `bookingRooms.room`, `bookingRooms.roomType`, `customer`.
- **STEP 17 (D-4):** when a pricing tier applies, the create response *additionally* carries a
  transient `discount` key on `data` with `discount_id, name, min_nights, percent_off, nights,
  saved_total, total_after_discount`. It is never persisted, so show/list responses have **no**
  such key. Render it only if present.

Cancel response: message `'Booking cancelled.'`, `data.status = "cancelled"`, `cancelled_at` set,
`cancellation_reason` = supplied or default. Cancel of a non-`pending_payment` booking → **409**.

### 3.2 Availability response (`POST /public/availability`, 200)

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": 1,
      "room_number": "101",
      "floor": 1,
      "status": "available",
      "room_type_id": 1,
      "price_per_night": "100.00"
    }
  ]
}
```
`data` returns **only** the requested rooms that are truly bookable (server filters overlap
`pending_payment/confirmed/checked_in/checked_out` holds, expired holds, `maintenance` rooms,
deleted rooms/types). When a pricing tier applies, the item carries a transient `discount` object
(`discount_id, name, min_nights, percent_off, nights, price_per_night, discounted_price_per_night,
total_for_stay, total_after_discount, saved_total`).

### 3.3 Paginated envelope (list)

```json
{
  "success": true,
  "message": "OK",
  "data": [ { /* booking objects, each with bookingRooms.room + bookingRooms.roomType */ } ],
  "meta": { "page": 1, "per_page": 15, "total": 3, "last_page": 1 }
}
```

### 3.4 Error envelope + status codes (from `bootstrap/app.php`)

```json
{ "success": false, "message": "<text>", "errors": null }
```
`errors` is an object keyed by field only on validation errors (422), e.g.
`{ "check_in_date": ["The check in date must be a date after or equal to today."] }`.

| Code | Meaning (Phase 4-relevant) |
|---|---|
| 401 | unauthenticated — `apiClient` clears session + dispatches `auth:unauthorized` |
| 403 | wrong actor (staff token on customer routes) |
| 404 | booking not found / not owned (own-only scoping) |
| 409 | business rule (e.g. cancel confirmed/expired booking) — server message is user-meaningful |
| 422 | request validation — field errors in `errors` |
| 500 | server failure |

Frontend `getErrorMessage` already maps 401/403/404/422 to friendly text, keeps 409's
server message, and `getFieldErrors` surfaces per-field errors. No change needed.

---

## 4. Booking Status Values, Hold & Cancel Semantics

Status enum (single source of truth = backend):

| Status | Customer-visible meaning | Phase 4 UI |
|---|---|---|
| `pending_payment` | placed, awaiting payment; holds rooms until `payment_deadline_at` | badge + "Continue to Payment" CTA + Cancel |
| `confirmed` | paid/confirmed by staff | badge (no customer cancel — backend 409s) |
| `checked_in` / `checked_out` | stay in progress / completed | badge |
| `cancelled` | terminal; `cancellation_reason` populated | badge |
| `no_show` | terminal (sweep) | badge |

Hold/expiry behavior to mirror in the UI:
- A `pending_payment` booking holds rooms only while `payment_deadline_at > now` (`Booking::isExpired()`).
- Once expired: rooms are implicitly free, customer cancel → **409** (`'This booking has already
  expired and cannot be cancelled.'`).
- So on the detail page: the **Cancel** button is only shown while `status === 'pending_payment'`
  and the deadline has not passed; an expired `pending_payment` booking shows a
  "payment deadline passed — rooms released" notice instead.

---

## 5. Current Frontend State (what is reused, unchanged)

| Piece | Status for Phase 4 |
|---|---|
| `src/api/bookingApi.js` | **exists already** — `customerBookings.list/create/show/cancel` and `staffBookings`. Only tweak: `customerBookings.cancel(id)` should accept an optional `reason` body. |
| `src/api/roomApi.js` `checkAvailability` | reuse as-is for the checkout price preview |
| `src/api/client.js` axios instance | header injection + 401 handling + `auth:unauthorized` event — unchanged |
| `src/hooks/useApi.js` | reuse for list/detail fetches |
| `src/context/AuthContext.jsx` + `useAuth` | reuse for `isAuthenticated/isCustomer` + redirect logic |
| `src/routes/ProtectedRoute.jsx` | reuse to gate `/book`, `/bookings`, `/bookings/:id` (customer actor) — guest → `/login` with `state.from`, returns after login |
| `src/utils/apiError.js` | reuse (`getErrorMessage`, `getFieldErrors`) |
| `Common` components | `LoadingState`, `EmptyState`, `ErrorState`, `ErrorMessage` — reuse |
| `customer/Pagination.jsx` | reuse on the bookings list (`currentPage`, `lastPage`, `onPageChange`) |
| `customer/RoomCard.jsx` `STATUS_STYLES` | repeat the badge pattern in a new `BookingStatusBadge` |
| Test scaffolding | `MockAdapter(apiClient)` + `MemoryRouter` + `vi.mock('../hooks/useAuth')` — mirror for booking tests |

---

## 6. Approved Architecture (unchanged from Phase 2/3)

- React + Vite, JavaScript, React Router v7 descendant `<Routes>`, Axios, Tailwind.
- No Redux. Simple hooks + local state; `useApi(fetcher)` for fetch-on-mount.
- Backend remains the source of truth — URL search params are the single source of truth for
  the booking *intent*; every price computed by the server (create/availability) is authoritative.
- Money is always displayed as the server's decimal:2 strings; never recalculated client-side for
  what the customer is charged.

---

## 7. Phase 4 Flow → Route/Page Mapping

```
Rooms (/rooms, /rooms/:id) ──► AvailabilitySearch (/availability)
   └─ select rooms + dates → POST /public/availability → server-confirmed available rooms +
      pricing preview
Booking confirmation (/book?check_in&check_out&rooms=1,2,3)   [protected: customer]
   └─ re-runs POST /public/availability → BookingSummary (dates, nights, per-room price, total)
   └─ POST /customer/bookings → pending_payment
Booking success / detail (/bookings/:id)                       [protected: customer]
   └─ success banner (created state) + status badge + summary + cancel (when allowed)
Continue to Payment (/bookings/:id/payment)                    [protected: customer]
   └─ Phase 5 placeholder page (stub, clearly non-functional)
Booking history (/bookings)                                    [protected: customer]
```

### 7.1 Booking intent travels in the URL (Phase 3 pattern)

- Availability results gain a **"Book N room(s)"** primary button that deep-links to
  `/book?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&rooms=<server-confirmed-available-ids>`.
  Only ids returned by the availability call are carried (those are the rooms that are currently
  bookable and carry current pricing). If 0 rooms are available there is no button.
- `/book` reads the params and validates they exist; a missing/invalid intent renders a friendly
  empty state with a link back to `/availability`.

### 7.2 `/book` — Booking confirmation (`BookingCheckout.jsx`)

- Reads `check_in`, `check_out`, `rooms` from `useSearchParams`.
- Calls `POST /public/availability` with those values to (re)confirm availability and obtain the
  authoritative price preview — the server re-checks holds concurrently, so a stale selection
  surfaces immediately (0 rooms → "no longer available" empty state).
- Renders `BookingSummary`: nights (server convention: checkout day not billed), each room's
  `room_number`, `room_type.name`, `price_per_night`, the per-room `discount` line if the tier
  applies, and a display total (`Σ nights × price_per_night`, discounted when `discount.total_after_discount`
  is present — preview only; the created booking's `total_amount` is the final figure).
- Confirm button (disabled while submitting) → `customerBookings.create({check_in_date,
  check_out_date, rooms})`. Success → `navigate('/bookings/'+createdId, { state: { created: true } })`.
- Errors: 409 → message "one or more rooms are no longer available" style via `getErrorMessage`
  (server wording preserved) + link back to availability; 422 → `getFieldErrors` shown per field;
  401 → handled globally (session cleared); 500 → fallback.
- The route is wrapped in `ProtectedRoute actor="customer"`; unauthenticated guests are sent to
  `/login` with `state.from = /book?…` and return after login (existing behaviour).

### 7.3 `/bookings/:id` — Booking detail (`BookingDetail.jsx`)

- Fetches via `customerBookings.show(id)` + `useApi` (404 → ErrorState "Booking not found").
- Success banner when `location.state?.created` is set (post-create landing).
- `BookingStatusBadge` + `BookingSummary` (uses snapshotted `booking_rooms.price_per_night` —
  the persisted prices; no discount keys exist here, which is correct - historical).
- Shows `booking_number`, dates, `total_amount`, `payment_deadline_at`, `cancelled_at` /
  `cancellation_reason` when cancelled.
- **Cancel** (only `pending_payment` + not expired): small inline reason input (optional,
  placeholder "Reason (optional)") → `customerBookings.cancel(id, reason)` → refetch
  (status becomes `cancelled`, reason shown). 409 → ErrorMessage with the server's business-rule
  text (e.g. booking already cancelled / expired).
- **Continue to Payment** (primary CTA, only `pending_payment` + not expired): links to
  `/bookings/:id/payment`. Payment endpoints (STEP 10 backend, verified) are **not** wired in
  Phase 4 - the target page is a stub (see §7.5).

### 7.4 `/bookings` — My bookings (`MyBookings.jsx`)

- `customerBookings.list({ status })` via `useApi`; `status` lives in the URL (`?status=…`,
  single source of truth, same pattern as `Rooms.jsx`).
- Compact status filter (All + the six status values) bound to the URL; rows show
  `booking_number`, check-in/out dates, status badge, `total_amount`, and link to `/bookings/:id`.
- Reuse `Pagination` from `meta.page / meta.last_page`; `EmptyState` when empty.
- Row/card component: new `BookingCard` (list item) mirroring `RoomCard` conventions.

### 7.5 `/bookings/:id/payment` — Phase 5 placeholder (`Payment.jsx` stub)

- Minimal placeholder page (reuses the `ComingSoon` pattern with payment copy) so the
  "Continue to Payment" skip from §7.3 resolves instead of 404ing. Explicitly labelled:
  "Payments are coming in Phase 5." No payment API calls are made.

### 7.6 Navigation

- `Navbar.jsx` (desktop + mobile): add **My Bookings** link for authenticated customers.
- `Footer.jsx`: add a My Bookings link (customer-only) for parity.
- `Home.jsx`: optional small copy tweak on the third feature card - keep minimal, no restructure.

---

## 8. Files Created / Modified

### New

- `src/pages/customer/BookingCheckout.jsx` — `/book` confirmation + create
- `src/pages/customer/MyBookings.jsx` — `/bookings` list + status filter + pagination
- `src/pages/customer/BookingDetail.jsx` — `/bookings/:id` detail + cancel + payment CTA
- `src/pages/customer/Payment.jsx` — `/bookings/:id/payment` Phase 5 stub
- `src/components/customer/BookingStatusBadge.jsx` — color-coded status badge (mirrors `RoomCard` STATUS_STYLES)
- `src/components/customer/BookingSummary.jsx` — shared summary box (used by checkout + detail)
- `src/components/customer/BookingCard.jsx` — list row for My Bookings
- Tests (new files, see §10)

### Modified

- `src/api/bookingApi.js` — `customerBookings.cancel(id, reason)` sends `{ reason }` when provided
- `src/routes/CustomerApp.jsx` — add `/book`, `/bookings`, `/bookings/:id`,
  `/bookings/:id/payment` (all `ProtectedRoute actor="customer"` inside `PublicLayout`)
- `src/pages/customer/AvailabilitySearch.jsx` — add the "Book N room(s)" button on results
- `src/components/customer/Navbar.jsx` — My Bookings link (desktop + mobile)
- `src/components/customer/Footer.jsx` — My Bookings link
- `src/pages/customer/Home.jsx` — optional feature-card copy tweak only

No backend files, no new dependencies, no React-Router/Axios changes.

---

## 9. Money & Date Conventions (frontend)

- Amounts arrive as decimal:2 **strings** (`"200.00"`). Display verbatim; never coerce to float for
  display. The display total on checkout is a preview (`Σ nights × price_per_night` summed as
  cents then `(cents/100).toFixed(2)`), replaced on the detail page by the persisted
  `total_amount` / `booking_rooms[].price_per_night`.
- `check_in_date` / `check_out_date` serialize as ISO datetimes (`2026-09-16T00:00:00.000000Z`).
  For display use `new Date(value).toLocaleDateString()` (same approach as `Profile.jsx`); for
  URL building use `value.slice(0, 10)`.
- Nights = integer day difference of the two date-only values (checkout day is not billed).

---

## 10. Test Plan

Mirror the established patterns: `MockAdapter(apiClient)`, `MemoryRouter` + `<Routes>`, and
`vi.mock('../hooks/useAuth')` for route-level tests. Backend stays untouched.

| New test file | Covers |
|---|---|
| `bookingApi.test.js` | create/list/show/cancel requests: URLs, methods, bodies (`create` payload; `cancel` with/without `reason`) |
| `bookingCheckout.test.jsx` | renders summary from availability mock; missing-param empty state; `create` posts correct body and navigates to `/bookings/:id`; 409 (rooms gone), 422 (field errors) and 500 surfaces; zero-available empty state |
| `bookingDetail.test.jsx` | renders booking + badge + summary; success banner via `location.state.created`; cancel posts reason and updates after refetch; cancel 409 shows server message; cancel hidden when confirmed / expired; Continue-to-Payment link present only when `pending_payment` and not expired |
| `myBookings.test.jsx` | paginated list render, status filter in URL triggers refetch with `?status=`, empty state, pagination |
| `bookingSummary.test.jsx` | nights math, per-room breakdown, discount line when present, total formatting |
| `bookingStatusBadge.test.jsx` | every status maps to a stable label/colour class |
| `customerBookingRoutes.test.jsx` | guests hit `/book`, `/bookings`, `/bookings/:id` → redirected to `/login` with `state.from`; authenticated customers render them; staff → `/staff/dashboard` |

Existing 111 tests must remain green (only additive changes to `Navbar`/`AvailabilitySearch` and
those pages' existing tests, if any assertion is touched).

---

## 11. Verification

1. `npm run lint` (oxlint) — **0 warnings, 0 errors**.
2. `npm run test` (Vitest) — all files green (existing 111 + new Phase 4 tests).
3. `npm run build` — production build succeeds.
4. Backend regression (`php artisan test` in `hotel-backend-step08`) — **430 / 1,322 / 0 failures**,
   and `git status` shows no backend modifications.
5. Manual guest check: AvailabilitySearch → Book → `/login` (`state.from` preserved) → after login
   land on `/book?…` → confirm → `/bookings/:id` success banner → My Bookings list → cancel flow.

---

## 12. Out of Scope (explicit)

- **No payment endpoints wired.** `POST /api/v1/customer/payments/*` and the receipt flow are
  verified as *existing* backend endpoints (STEP 10) but are **not** integrated; payment is Phase 5.
  `/bookings/:id/payment` is a non-functional stub.
- **No booking "re-booking"/modification** — bookings are only created, viewed, listed, cancelled.
- **No staff module UI** — `staffBookings` in `bookingApi.js` stays unused this phase.
- **No backend changes of any kind.**
- No unrelated feature changes (no new dependencies, no architecture changes).

---

*End of Frontend Phase 4 Implementation Plan*