# Phase 6: Staff Bookings Management — Implementation Plan

> **Status:** PLAN (awaiting approval)
> **Date:** 2026-09-14
> **Repository:** `hotel-frontend` (`/Applications/XAMPP/xamppfiles/htdocs/hotel-frontend`)
> **Backend baseline:** 430 tests / 1,322 assertions / 0 failures — **NOT modified in Phase 6**
> **Frontend baseline:** 32 test files / 234 tests — all passing; lint clean; build successful

---

## 0. Scope Rationale & Evidence-Based Candidate Comparison

Phase 6 is the first staff-facing frontend module. The staff area currently has
Login + a Dashboard placeholder + ComingSoon stubs for all modules. Seven backend
module groups exist with ready endpoints (see §0.2 below). The highest-priority
candidate was selected by weighted scoring across seven evidence-based criteria
read directly from the backend codebase and `routes/api.php`.

### 0.1 Scoring (weights: 1–3; scores: 0–10)

| Criterion (Wt) | Staff Bookings | Staff Payments | Staff Invoices | Staff Discounts | Staff Rooms+Status | Staff Room Types+Images | Staff Dashboard |
|----------------|---------------|---------------|---------------|----------------|-------------------|------------------------|----------------|
| Operational impact (×3) | **10** — daily front-desk core | 8 — financial control | 3 — passive read | 4 — master data | 6 — admin room mgmt | 5 — admin type mgmt | 2 — vanity |
| User breadth (×2) | **10** — any staff role can view; lifecycle actions: admin,manager,receptionist | 7 — verify/reject/restrict | 5 — any staff read-only | 4 — admin,manager only | 4 — admin/manager+receptionist status | 4 — admin,manager only | 3 — any staff |
| Backend endpoints ready (×3) | **10** — all 6 endpoints exist | 10 — all 6 exist | 5 — 2 exist (read-only) | 10 — 5 CRUD endpoints | 10 — 7 endpoints | 10 — 7 endpoints | 0 — no aggregate endpoint |
| Dependencies (×2) | **8** — self-contained; no other module required first | 7 — payment verify links to booking confirm (atomic) | 6 — generated only by payment verify | 8 — standalone | 7 — self-contained | 7 — self-contained | 3 — needs live data in modules |
| Complexity (×1) | 7 — list+detail+4 lifecycle actions+3 filters | 8 — list+detail+3 actions+receipt view+refund | 3 — read-only list+detail | 6 — CRUD with filter+search | 8 — list+detail+2 status actions | 8 — list+detail+image upload/replace/delete | 5 — aggregate counts |
| Business rule risk (×1) | **8** — 4 transitions, expired auto-cancel+409, late fee on confirmed→cancelled | 7 — verify generates invoice atomically, refund cancels booking | 2 — read-only | 4 — master data only | 5 — valid room status transitions | 3 — simple file CRUD | 0 |
| Foundation for later phases (×2) | **9** — bookings required before payments, invoices, dashboard make sense | 7 — natural follow-on from booking detail | 4 — needs payment verify | 5 — standalone | 7 — rooms needed before room mgmt | 7 — type mgmt needed before images | 2 — aggregation layer |
| **Weighted total** | **129** | 111 | 59 | 86 | 97 | 92 | 27 |

**Chosen: Staff Bookings Management** — highest score (129), the daily operational
core for any hotel front desk; covers all staff roles; uses all six existing endpoints
with no backend changes; and provides the foundation for every subsequent staff module.

### 0.2 Backend Modules Not Yet Integrated (for context)

| Module | Endpoints | Status after Phase 6 |
|--------|-----------|---------------------|
| Staff Bookings (list/show/confirm/cancel/check-in/check-out) | 6 | **Phase 6 scope** |
| Staff Payments (list/show/download-receipt/verify/reject/refund) | 6 | Deferred → Phase 7 |
| Staff Invoices (list/show) | 2 | Deferred → Phase 7 |
| Staff Discounts CRUD (admin,manager) | 5 | Deferred → Phase 8 |
| Staff Rooms CRUD + Status (maintenance/available) | 7 | Deferred → Phase 9 |
| Staff Room Types CRUD + Room Images | 7 | Deferred → Phase 9 |
| Staff Dashboard (aggregate counts) | 0 (no endpoint) | Deferred → Phase 10 |

Staff Booking on Behalf (`POST /staff/bookings`) does **NOT** exist in the backend
codebase — see `FRONTEND-INTEGRATION-PLAN.md §0.1`. No staff-create-booking UI may
be built until the backend adds this endpoint.

### 0.3 Booking Statuses — Complete Reference

```
pending_payment → confirmed → checked_in → checked_out
         ↓                          ↓ (no-show sweep) ↓
      cancelled                  no_show           cancelled (via staff cancel; late fee possible)
```

Terminal statuses: `cancelled`, `checked_out`, `no_show`.
`no_show` is set only by the server-side scheduled sweep (STEP 14), never by a staff action.
`checked_out` is terminal for the booking (rooms move to `cleaning`).

---

## 1. Backend API Contract (Verified)

All endpoints verified against `routes/api.php`, `Staff/BookingController.php`,
`Services/BookingService.php`, `Requests/Booking/{FilterRequest,CancelRequest}.php`,
`Policies/BookingPolicy.php`, and `Models/Booking.php`. **No code will be invented.**

### 1.1 Staff Booking Endpoints

| # | Method | URI | Auth | Role | Request Body | Query Params | Response (`data` shape) | Status |
|---|--------|-----|------|------|-------------|-------------|-------------------------|--------|
| S1 | `GET` | `/staff/bookings` | `auth:sanctum`, `actor:staff` | any | — | `status?` (`pending_payment\|confirmed\|checked_in\|checked_out\|cancelled\|no_show`), `from?` (date), `to?` (date, must be ≥ from), `search?` (string, max 255 — matches `booking_number` OR customer `name`/`email`) | `Booking[]` paginated (15/page) — each: `{id, booking_number, customer_id, check_in_date, check_out_date, status, total_amount, payment_deadline_at, cancelled_at, cancellation_reason, no_show_at, late_fee_amount, late_fee_applied_at, created_at, updated_at, booking_rooms: [{id, booking_id, room_id, room_type_id, price_per_night, room: {id, room_number, floor, status}, room_type: {id, name}}], customer: {id, name, email}}` | 200 |
| S2 | `GET` | `/staff/bookings/{id}` | `auth:sanctum`, `actor:staff` | any | — | — | `Booking` (same shape as list item, with all relations) | 200 |
| S3 | `POST` | `/staff/bookings/{id}/confirm` | `auth:sanctum`, `actor:staff` | `admin,manager,receptionist` | — (empty body) | — | `Booking` (refreshed with `bookingRooms.room`, `customer`) + message `"Booking confirmed."` | 200 |
| S4 | `POST` | `/staff/bookings/{id}/cancel` | `auth:sanctum`, `actor:staff` | `admin,manager,receptionist` | `{reason?: string, max 255}` | — | `Booking` (refreshed) + message `"Booking cancelled."` | 200 |
| S5 | `POST` | `/staff/bookings/{id}/check-in` | `auth:sanctum`, `actor:staff` | `admin,manager,receptionist` | — (empty body) | — | `Booking` (refreshed) + message `"Guest checked in."` | 200 |
| S6 | `POST` | `/staff/bookings/{id}/check-out` | `auth:sanctum`, `actor:staff` | `admin,manager,receptionist` | — (empty body) | — | `Booking` (refreshed) + message `"Guest checked out."` | 200 |

### 1.2 Verified Booking Object Shape (staff show response)

```json
{
  "id": 1,
  "booking_number": "BK-ABCD1234",
  "customer_id": 1,
  "check_in_date": "2026-10-01",
  "check_out_date": "2026-10-05",
  "status": "pending_payment",
  "total_amount": "1000.00",
  "payment_deadline_at": "2026-09-14T12:00:00.000000Z",
  "cancelled_at": null,
  "cancellation_reason": null,
  "no_show_at": null,
  "late_fee_amount": null,
  "late_fee_applied_at": null,
  "created_at": "2026-09-14T10:00:00.000000Z",
  "updated_at": "2026-09-14T10:00:00.000000Z",
  "booking_rooms": [
    {
      "id": 10,
      "booking_id": 1,
      "room_id": 3,
      "room_type_id": 1,
      "price_per_night": "250.00",
      "room": { "id": 3, "room_number": "301", "floor": 3, "status": "reserved" },
      "room_type": { "id": 1, "name": "Deluxe Suite" }
    }
  ],
  "customer": { "id": 1, "name": "John Doe", "email": "john@example.com" }
}
```

### 1.3 Error Responses (confirmed in code)

| Scenario | HTTP | `message` |
|----------|------|-----------|
| Confirm a non-`pending_payment` booking | 409 | `"Only pending payment bookings can be confirmed."` |
| Confirm an expired `pending_payment` booking | 409 | `"This booking has expired and has been automatically cancelled."` (note: booking is auto-cancelled first) |
| Cancel a non-cancellable booking (checked_in/out/no_show) | 409 | `"Cannot cancel a booking with status 'checked_in'."` |
| Check-in a non-`confirmed` booking | 409 | `"Only confirmed bookings can be checked in."` |
| Check-in before check-in date | 409 | `"Check-in is only allowed on or after the check-in date."` |
| Check-out a non-`checked_in` booking | 409 | `"Only checked-in bookings can be checked out."` |
| Late cancellation of a confirmed booking | 200 | Succeeds — `late_fee_amount` populated on the returned booking |
| Booking not found / wrong scope | 404 | Standard 404 |
| Missing/invalid token | 401 | `"Unauthenticated."` |
| Wrong actor type (customer token) | 403 | Standard 403 |

### 1.4 Allowed Lifecycle Transitions (from BookingService)

| Current Status | Allowed Action(s) | Front-end Label |
|---------------|-------------------|-----------------|
| `pending_payment` | Confirm, Cancel (staff) | Pending |
| `confirmed` | Check-in (if ≥ check_in_date), Cancel (staff; late fee if within late window) | Confirmed |
| `checked_in` | Check-out | Checked in |
| `checked_out` | — (terminal) | Checked out |
| `cancelled` | — (terminal) | Cancelled |
| `no_show` | — (terminal) | No show |

Late cancellation fee: applied when a `confirmed` booking is cancelled by staff
at or after `(check_in_date − booking.late_cancel_window_hours, default 24h)`.
The fee equals `late_cancel_fee_nights × sum(price_per_night per room)`. This is
computed entirely server-side; the frontend must never compute it.

---

## 2. Frontend Routing Plan

### 2.1 New Routes (inside StaffApp.jsx, wrapped in StaffLayout + ProtectedRoute)

| Route | Component | Auth | Role | Purpose |
|-------|-----------|------|------|---------|
| `/staff/bookings` | `StaffBookingList` | staff | any | Paginated list with status, date range, and search filters |
| `/staff/bookings/:id` | `StaffBookingDetail` | staff | any | Booking detail + status-appropriate lifecycle actions |

### 2.2 Modified Routes (StaffApp.jsx)

- Remove the existing `<Route path="bookings">` → `<StaffModule title="Bookings" />` ComingSoon stub.
- Add two new routes: index (list) and `:id` (detail).
- The detail route requires no additional role guard (the backend re-checks via BookingPolicy).

### 2.3 No Customer Routes Modified

Customer routes (`CustomerApp.jsx`) are **not touched** in Phase 6.

---

## 3. Files to Create

### 3.1 Pages

| File | Contents |
|------|----------|
| `src/pages/staff/BookingList.jsx` | Paginated booking list with status, date range (from/to), and text search filters (URL-state), `StaffBookingCard` items, loading/error/empty states |
| `src/pages/staff/BookingDetail.jsx` | Full booking detail: header with status badge, customer info, booking rooms table, trip details, late fee display (if any), and conditional lifecycle action buttons (confirm/cancel/check-in/check-out) with success/error feedback |

### 3.2 Components

| File | Contents |
|------|----------|
| `src/components/staff/BookingCard.jsx` | Staff booking list card: links to `/staff/bookings/:id`, shows booking_number, customer name, date range, nights, status badge, total amount |
| `src/components/staff/BookingFilters.jsx` | URL-state filter bar: status dropdown (all 6 statuses), from date input, to date input, text search input. Commits `status` and `search` on change, dates on blur (avoids per-keystroke API calls) |

### 3.3 Reused Components (no changes)

| Component | Source | Use in Phase 6 |
|-----------|--------|----------------|
| `BookingStatusBadge` | `src/components/customer/BookingStatusBadge.jsx` | Status badges on list cards and detail header |
| `BookingSummary` | `src/components/customer/BookingSummary.jsx` | Room line-items table (room_number, room_type, price_per_night) on detail page |
| `Pagination` | `src/components/customer/Pagination.jsx` | Page navigation (URL-state, same pattern as MyBookings) |
| `LoadingState` | `src/components/common/LoadingState.jsx` | Loading placeholders |
| `EmptyState` | `src/components/common/EmptyState.jsx` | No-results message |
| `ErrorState` | `src/components/common/ErrorState.jsx` | Error + retry |
| `ErrorMessage` | `src/components/common/ErrorMessage.jsx` | Inline error for failed actions |

Note: `BookingStatusBadge` and `BookingSummary` are currently in `src/components/customer/`.
They are pure display components (no customer-specific behavior) and will be imported
directly. A future refactor could move them to `src/components/common/`, but that is
out of Phase 6 scope.

### 3.4 API Service

The `staffBookings` client already exists in `src/api/bookingApi.js` (lines 21–38):
`list(params)`, `show(id)`, `confirm(id)`, `cancel(id)`, `checkIn(id)`, `checkOut(id)`.
**No new API service file is needed.**

### 3.5 Test Files

| File | Tests |
|------|-------|
| `src/test/staffBookingApi.test.js` | Tests all 6 `staffBookings` methods: correct URLs, params for list, empty body for confirm/check-in/check-out, `{reason}` for cancel |
| `src/test/staffBookingList.test.jsx` | Renders booking list, applies filters via URL params, shows pagination, shows loading/error/empty states, filter interactions |
| `src/test/staffBookingDetail.test.jsx` | Shows booking detail with correct fields, status-appropriate action buttons per status, confirm/check-in/check-out/cancel handlers, 409 error display, late fee display, loading/error states |
| `src/test/staffBookingCard.test.jsx` | Renders card with booking_number, customer name, dates, status badge, amount; links to `/staff/bookings/:id` |
| `src/test/staffBookingRoutes.test.jsx` | Route guards: guest → `/staff/login`, customer → `/`, staff allowed |

---

## 4. Files to Modify

### 4.1 Routing

| File | Change |
|------|--------|
| `src/routes/StaffApp.jsx` | Remove: `import ComingSoon` and the `StaffModule` wrapper function. Remove: the `bookings` route pointing to `<StaffModule title="Bookings" />`. Add: two new `<Route>` elements for bookings index and `:id` detail, wrapped in `<ProtectedRoute actor="staff">`. Import `StaffBookingList` and `StaffBookingDetail`. |

### 4.2 Existing Tests (potential impact)

No existing test files assert against the staff bookings ComingSoon route, so no
modification to existing test files is expected. If any test asserts the bookings
route renders "Bookings" text from ComingSoon, it will need updating — verified
by running `npm run test` after implementation.

---

## 5. Detailed Component Specifications

### 5.1 `src/pages/staff/BookingList.jsx`

**Route:** `/staff/bookings`

**State management:**
- URL search params (single source of truth): `status`, `from`, `to`, `search`, `page`.
- Same `updateUrl` pattern as `MyBookings.jsx`.

**On mount / URL change:**
1. Read `status`, `from`, `to`, `search`, `page` from URL search params.
2. Build params object: `{ page, ...(status ? { status } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}), ...(search ? { search } : {}) }`.
3. Call `staffBookings.list(apiParams)` via `useApi(fetchBookings)`.

**Layout:**
- Page heading: "Bookings" with subtitle "View and manage all hotel reservations."
- `BookingFilters` component rendered below the heading.
- List of `StaffBookingCard` items below the filters.
- `Pagination` at the bottom (if `lastPage > 1`).

**Empty state:** "No bookings match your filters." with a "Clear all filters" button.
**Loading state:** `LoadingState` with "Loading bookings…".
**Error state:** `ErrorState` with retry via `refetch`.

### 5.2 `src/components/staff/BookingFilters.jsx`

**Props:** none — reads from and writes to URL search params via `useSearchParams`.

**Filters:**
- **Status dropdown:** Options: `All statuses` (empty), `Pending payment`, `Confirmed`, `Checked in`, `Checked out`, `Cancelled`, `No show`. Commits immediately on change (resets page to 1).
- **From date input:** `<input type="date">`. Commits on blur (not on every keystroke). Clears the `from` param if empty.
- **To date input:** `<input type="date">`. Commits on blur. Clears `to` if empty. Validates `to ≥ from` client-side (shows inline warning, does not submit invalid range).
- **Search input:** `<input type="text" placeholder="Booking #, name, or email">`. Commits on change (debounced 300ms). Max 255 chars.

**Layout:** Horizontal bar with flex-wrap. Each filter is a `<label>` + control group. Responsive: stacks on mobile.

### 5.3 `src/components/staff/BookingCard.jsx`

**Props:** `{ booking }`

**Renders:** A `<Link>` to `/staff/bookings/${booking.id}` styled as a card (same visual language as `BookingCard.jsx` customer version).

**Content:**
- Left: `booking.booking_number` (bold), customer name and email below.
- Center: date range → `new Date(booking.check_in_date).toLocaleDateString()` → `new Date(booking.check_out_date).toLocaleDateString()` · `{nights}` nights (using `nightsBetween` from `src/utils/booking.js`).
- Right: `BookingStatusBadge` + `booking.total_amount`.

### 5.4 `src/pages/staff/BookingDetail.jsx`

**Route:** `/staff/bookings/:id`

**Data fetching:**
- `useParams()` to get `id`.
- `useMemo(() => () => staffBookings.show(id), [id])` → `useApi(fetchBooking)`.
- `booking` loaded with `bookingRooms.room`, `bookingRooms.roomType`, `customer` relations.

**Page layout:**

1. **Back link:** `<Link to="/staff/bookings">← Back to bookings</Link>`

2. **Header row:** Booking number (`booking.booking_number`) + `BookingStatusBadge`.

3. **Success banner:** Shown after a successful action (confirm/check-in/check-out/cancel). Dismissible after 5 seconds or on next action. Message text varies per action (e.g., "Booking confirmed", "Guest checked in", "Booking cancelled").

4. **Trip details card** (same visual pattern as `BookingDetail.jsx` customer):
   - Check-in date, Check-out date, Nights
   - Total amount, Payment deadline (if `pending_payment` or `confirmed`)
   - Created date
   - Cancelled at + cancellation reason (if `cancelled`)
   - No-show at (if `no_show`)
   - Late fee amount + late fee applied at (if `late_fee_amount` is set)

5. **Booking rooms table** (reuses `BookingSummary` component or renders a manual table):
   | Room # | Floor | Room Type | Price/Night |
   |--------|-------|-----------|-------------|
   | 301 | 3 | Deluxe Suite | 250.00 |

6. **Customer info card:**
   - Name: `booking.customer.name`
   - Email: `booking.customer.email`

7. **Action panel** — visible only for non-terminal statuses; role-aware rendering via `useAuth().hasRole(...)`:

   | Booking Status | Actions Shown |
   |---------------|---------------|
   | `pending_payment` | Confirm (primary), Cancel (outline, opens inline form) |
   | `confirmed` | Check-in (primary, disabled if today < check_in_date), Cancel (outline, opens inline form) |
   | `checked_in` | Check-out (primary) |
   | `checked_out` | — (terminal: "This booking is complete.") |
   | `cancelled` | — (terminal: "This booking was cancelled.") + cancellation reason + late fee if present |
   | `no_show` | — (terminal: "This guest did not check in.") |

   **Confirm action:** Single-click primary button → `POST /staff/bookings/:id/confirm`. 
   On success: refetch booking, show success banner. On 409: show server message (expired → auto-cancelled notice).

   **Check-in action:** Single-click primary button (disabled if check-in date is in the future — show tooltip: "Check-in is only allowed on or after [date]"). On success: refetch, success banner.

   **Check-out action:** Single-click primary button. On success: refetch, success banner.

   **Cancel action:** Click "Cancel booking" → reveals inline panel:
   - `<label>` "Reason (optional)" + text input (max 255 chars)
   - "Confirm cancellation" primary button + "Keep booking" outline button
   - On submit: `POST /staff/bookings/:id/cancel` with `{ reason }` (omitted if empty).
   - On success: refetch, success banner, panel closes.
   - On 409: show server message inline (e.g., "Cannot cancel a booking with status 'checked_in'").

   **Role restriction note:** The `ProtectedRoute` does not pass `roles` for the bookings
   routes (any staff can view). Action buttons are shown for all staff roles, and the
   backend rejects unauthorized actions with 403. The frontend will show the server's
   403/409 error message if an unauthorized staff member tries an action — matching the
   project's pattern where the backend is the security authority.

### 5.5 Reused `BookingStatusBadge` (no changes)

Already handles all six booking statuses with correct labels and colors. Imported
from `src/components/customer/BookingStatusBadge.jsx`.

### 5.6 Reused `BookingSummary` (no changes)

Renders the booking rooms table with room_number, room_type, price_per_night, nights,
and total. Imported from `src/components/customer/BookingSummary.jsx`. May need minor
adaptation in the detail page if it renders the total differently; inspect at implementation
time and adapt if needed (e.g., skip total if it duplicates the trip details card).

---

## 6. Updated StaffApp.jsx Route Structure

```jsx
import StaffBookingList from '../pages/staff/BookingList'
import StaffBookingDetail from '../pages/staff/BookingDetail'

// Inside StaffLayout:
<Route index element={<ProtectedRoute actor="staff"><StaffDashboard /></ProtectedRoute>} />
<Route path="dashboard" element={<ProtectedRoute actor="staff"><StaffDashboard /></ProtectedRoute>} />

{/* Phase 6 — replaces ComingSoon stub */}
<Route path="bookings" element={<ProtectedRoute actor="staff"><StaffBookingList /></ProtectedRoute>} />
<Route path="bookings/:id" element={<ProtectedRoute actor="staff"><StaffBookingDetail /></ProtectedRoute>} />

{/* ComingSoon stubs for future phases */}
<Route path="rooms" element={<ProtectedRoute actor="staff"><StaffModule title="Rooms" /></ProtectedRoute>} />
<Route path="room-types" element={<ProtectedRoute actor="staff"><StaffModule title="Room Types" /></ProtectedRoute>} />
<Route path="payments" element={<ProtectedRoute actor="staff"><StaffModule title="Payments" /></ProtectedRoute>} />
<Route path="invoices" element={<ProtectedRoute actor="staff"><StaffModule title="Invoices" /></ProtectedRoute>} />
<Route path="discounts" element={<ProtectedRoute actor="staff" roles={['admin', 'manager']}><StaffModule title="Discounts" /></ProtectedRoute>} />
```

---

## 7. Loading / Error / Empty States

| Page / Context | Loading | Error | Empty / Not Found |
|---------------|---------|-------|-------------------|
| `BookingList` | `LoadingState "Loading bookings…"` | `ErrorState` with retry via `refetch` | `EmptyState "No bookings match your filters."` with "Clear all filters" button |
| `BookingDetail` (fetch) | `LoadingState "Loading booking…"` | `ErrorState` with retry; 404 → "Booking not found" + back link | N/A (404 handled as error) |
| `BookingDetail` (action success) | — | — | Success banner: "Booking confirmed" / "Guest checked in" / "Guest checked out" / "Booking cancelled" — auto-dismisses after 5 seconds |
| `BookingDetail` (action error) | — | `ErrorMessage` inline with server's message (409 business rule, 403 permission) | — |

---

## 8. Client-Side Validation

### BookingList
- **To date ≥ From date:** Warn inline ("End date must be on or after start date.") when `to < from`. Does not block submission (the backend rejects it with 422 anyway), but the UX warning is nicer.
- **Search:** Max 255 characters (enforced by `maxLength` attribute).

### BookingDetail
- **Cancel reason:** Max 255 characters (enforced by `maxLength` attribute). No other validation needed.
- **Check-in disabled state:** Button disabled with tooltip when `new Date(today) < new Date(booking.check_in_date)`. The disable is purely UX; the backend rejects early check-in with 409 anyway.

No monetary calculations are performed client-side.

---

## 9. Test Plan

### 9.1 `staffBookingApi.test.js` (~6 tests)

Tests the `staffBookings` API client methods (the existing `bookingApi.test.js` only
tests `customerBookings`).

- `staffBookings.list()` calls GET `/staff/bookings` with params `{ status: 'confirmed', search: 'John' }`.
- `staffBookings.list()` without params calls GET `/staff/bookings` with no params.
- `staffBookings.show(5)` calls GET `/staff/bookings/5`.
- `staffBookings.confirm(5)` calls POST `/staff/bookings/5/confirm`.
- `staffBookings.cancel(5, 'Guest requested')` calls POST `/staff/bookings/5/cancel` with `{ reason: 'Guest requested' }`.
- `staffBookings.checkIn(5)` calls POST `/staff/bookings/5/check-in` and `staffBookings.checkOut(5)` calls POST `/staff/bookings/5/check-out`.

### 9.2 `staffBookingCard.test.jsx` (~5 tests)

- Renders booking_number, customer name, email, date range, nights, status badge, total.
- Links to `/staff/bookings/:id`.
- Handles missing customer gracefully (booking_number still renders).

### 9.3 `staffBookingList.test.jsx` (~10 tests)

- Renders loading state while fetching.
- Renders list of booking cards.
- Renders empty state when no bookings match filters.
- Renders pagination when `last_page > 1`.
- `status` filter changes update URL and re-fetch with the status param.
- `search` filter changes update URL and re-fetch.
- `from`/`to` filter changes update URL.
- "Clear all filters" button resets URL params.
- Shows error state on fetch failure with retry button.
- Calls `staffBookings.list` with correct params derived from URL search params.

### 9.4 `staffBookingDetail.test.jsx` (~20 tests)

- Renders loading state while fetching.
- Shows 404 message for non-existent booking.
- Shows error state on fetch failure with retry.
- Shows booking_number, status badge, customer name/email.
- Shows booking rooms table with room_number, room_type, price_per_night.
- Shows check-in/check-out dates, total amount, payment deadline.
- Shows cancellation info when status is `cancelled`.
- Shows no-show info when status is `no_show`.
- Shows late fee when `late_fee_amount` is present.
- **pending_payment:** Shows Confirm and Cancel buttons; no Check-in/Check-out.
- **confirmed:** Shows Check-in button (enabled) and Cancel button; no Confirm/Check-out.
- **checked_in:** Shows Check-out button; no Confirm/Cancel/Check-in.
- **checked_out:** Shows "This booking is complete." terminal message; no action buttons.
- **cancelled:** Shows "This booking was cancelled." terminal message; no action buttons.
- **no_show:** Shows "This guest did not check in." terminal message; no action buttons.
- Confirm button triggers `staffBookings.confirm()`, shows success banner, refetches booking.
- Cancel opens inline form; submit triggers `staffBookings.cancel()` with reason; shows success banner.
- Cancel form "Keep booking" button closes the panel.
- Check-in button triggers `staffBookings.checkIn()`, shows success banner, refetches booking.
- Check-out button triggers `staffBookings.checkOut()`, shows success banner, refetches booking.
- 409 error from server is shown inline (e.g., expired booking auto-cancelled message).
- Disabled check-in button shows tooltip when check-in date is in the future.

### 9.5 `staffBookingRoutes.test.jsx` (~5 tests)

- Guest hitting `/staff/bookings` redirected to `/staff/login`.
- Guest hitting `/staff/bookings/1` redirected to `/staff/login`.
- Customer (wrong actor) hitting `/staff/bookings` redirected to `/`.
- Staff member can access `/staff/bookings`.
- Staff member can access `/staff/bookings/1`.

### Estimated new tests: ~46 → projected total: 280

---

## 10. Implementation Order

### Step 1: Staff Booking API Tests
- Create `src/test/staffBookingApi.test.js`
- Verify: `npm run lint` 0 warnings, `npm run test` all pass

### Step 2: BookingCard Component
- Create `src/components/staff/BookingCard.jsx`
- Create `src/test/staffBookingCard.test.jsx`
- Verify: lint + tests pass

### Step 3: BookingFilters Component
- Create `src/components/staff/BookingFilters.jsx`
- (Tested via BookingList tests below)

### Step 4: BookingList Page
- Create `src/pages/staff/BookingList.jsx`
- Create `src/test/staffBookingList.test.jsx`
- Verify: lint + tests pass

### Step 5: BookingDetail Page
- Create `src/pages/staff/BookingDetail.jsx`
- Create `src/test/staffBookingDetail.test.jsx`
- Verify: lint + tests pass

### Step 6: Route Integration
- Modify `src/routes/StaffApp.jsx`: replace ComingSoon bookings route with real routes
- Create `src/test/staffBookingRoutes.test.jsx`
- Verify: lint + tests pass

### Step 7: Final Verification
- `npm run lint` → 0 warnings
- `npm run test` → all tests pass (projected: 280)
- `npm run build` → successful
- Verify backend untouched: `git status` on `hotel-backend-step08` shows no changes

---

## 11. What is Deferred to Later Phases

| Feature | Deferred To | Reason |
|---------|-------------|--------|
| Staff payment list, detail, verify/reject/refund | Phase 7 | Payment management is the natural follow-on to booking detail |
| Staff invoice list, detail | Phase 7 | Invoices are generated by payment verify |
| Staff room CRUD + status transitions (maintenance/available) | Phase 9 | Admin master data, lower priority than bookings+payments |
| Staff room type CRUD + image upload/replace/delete | Phase 9 | Admin master data |
| Staff discount CRUD (admin,manager) | Phase 8 | Admin master data, standalone |
| Staff dashboard with live aggregate counts | Phase 10 | Requires live modules; no aggregate backend endpoint exists |
| Staff booking on behalf (walk-in) | Blocked | Backend does not implement `POST /staff/bookings`; must be built in backend first |
| Customer payment status visible on staff booking detail | Phase 7 | Requires `staffPayments` API; natural cross-link when payments module is built |
| Export booking list to CSV | Future | Lower priority; manual copy sufficient for MVP |
| Real-time status updates | Future | No WebSocket/polling infrastructure |

---

## 12. Risk Notes & Deviations

1. **`BookingStatusBadge` and `BookingSummary` imported from `src/components/customer/`:**
   These are pure presentational components with no customer-specific logic. Phase 6
   imports them directly from the customer folder. A future refactor could move them
   to `src/components/common/` — that refactor is out of scope here.

2. **No per-page param on staff booking list:** The backend `FilterRequest` for
   bookings does not accept a `per_page` param (unlike the payment list). The page
   size is fixed at 15 server-side. The `Pagination` component renders correctly
   based on `meta.last_page` and `meta.page`.

3. **Late fee display is informational only:** The frontend displays the
   `late_fee_amount` returned by the backend. It never computes fees client-side.
   The fee is written server-side by `BookingService::cancelByStaff` only when the
   late cancellation window applies.

4. **Expired `pending_payment` confirm returns 409 + auto-cancel:** When staff
   attempts to confirm an expired booking, the backend auto-cancels it in a separate
   transaction before throwing 409. The frontend shows the server's 409 message.
   The booking must be re-fetched to reflect the new `cancelled` status.

5. **Staff actions are not role-restricted in the frontend UI:** The `ProtectedRoute`
   for `/staff/bookings/*` routes uses `actor="staff"` with no `roles` prop (any
   staff role can view). Action buttons are shown to all staff; the backend rejects
   unauthorized actions (e.g., a receptionist attempting to verify a payment — not
   relevant in Phase 6 but consistent with future modules). This matches the
   project's pattern where the backend is the security authority.

6. **`BookingSummary` component:** This renders a total line at the bottom. On the
   staff booking detail, the trip details card already shows `total_amount`. During
   implementation, inspect whether this creates visual duplication; if so, render
   only the room line-items portion of `BookingSummary` (or use it as-is if the UX
   is acceptable).

7. **Backend filter `from`/`to` applies to `check_in_date`/`check_out_date`:**
   `from` filters `check_in_date >= from`; `to` filters `check_out_date <= to`.
   This is the opposite of what some users might expect. The filter UI labels
   should make this clear: "Check-in from" / "Check-out to".

8. **Decimal string amounts:** `total_amount`, `price_per_night`, `late_fee_amount`
   are all decimal strings (e.g., `"1000.00"`). The frontend displays them verbatim;
   no client-side parsing or rounding.

---

## 13. Verified Source Files (read, not assumed)

Backend:
- `routes/api.php` (lines 176–195) — staff booking routes
- `app/Http/Controllers/Api/V1/Staff/BookingController.php` — index, show, confirm, cancel, checkIn, checkOut
- `app/Http/Requests/Booking/FilterRequest.php` — status, from, to, search rules
- `app/Http/Requests/Booking/CancelRequest.php` — reason (nullable, max 255)
- `app/Services/BookingService.php` — confirm, cancelByStaff, checkIn, checkOut, cancelExpiredHold, isLateCancellation
- `app/Policies/BookingPolicy.php` — role-based authorization (viewAny, view, confirm, cancel, checkIn, checkOut)
- `app/Models/Booking.php` — fields, relations
- `FRONTEND-INTEGRATION-PLAN.md §2.13` — endpoint inventory (lines 597–608)
- `FRONTEND-INTEGRATION-PLAN.md §0.1` — STEP-12 NOT implemented (no `POST /staff/bookings`)

Frontend:
- `src/api/bookingApi.js` — `staffBookings` client already exists (lines 21–38)
- `src/routes/StaffApp.jsx` — current routes with ComingSoon stubs
- `src/components/staff/Sidebar.jsx` — nav items, `roles` filter for Discounts
- `src/hooks/useApi.js` — data fetching hook
- `src/components/customer/BookingStatusBadge.jsx` — reuse as-is
- `src/components/customer/BookingSummary.jsx` — reuse as-is
- `src/components/customer/BookingCard.jsx` — reference for visual pattern
- `src/pages/customer/MyBookings.jsx` — reference for filter+pagination URL-state pattern
- `src/pages/customer/BookingDetail.jsx` — reference for detail page pattern
- `src/test/customerPaymentRoutes.test.jsx` — reference for route guard test pattern
- `src/utils/booking.js` — `nightsBetween` helper
- `src/utils/apiError.js` — `getErrorMessage`, `getFieldErrors`
