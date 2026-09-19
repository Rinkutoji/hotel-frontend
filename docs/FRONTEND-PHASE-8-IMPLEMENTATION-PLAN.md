# Phase 8: Staff Room Management — Implementation Plan

**Status:** DRAFT — awaiting approval (research only, no code changed)
**Date:** 2026-09-15
**Repository:** `hotel-frontend` (`/Applications/XAMPP/xamppfiles/htdocs/hotel-frontend`)
**Frontend baseline (verified 2026-09-15):** lint clean · **42 test files / 344 tests passing** · `npm run build` successful
**Backend baseline:** `hotel-backend-step08` app code **NOT modified in Phase 8** (STEP 01–17 implemented, verified)

---

## 1. Repository Evidence

### 1.1 Frontend state (verified by inspection)

Staff module routes in `src/routes/StaffApp.jsx`:

| Route | Current element |
|---|---|
| `/staff/bookings`, `/staff/bookings/:id` | `StaffBookingList` / `StaffBookingDetail` (Phase 6 ✅) |
| `/staff/payments`, `/staff/payments/:id` | `StaffPaymentList` / `StaffPaymentDetail` (Phase 7 ✅) |
| `/staff/rooms` | **ComingSoon stub** (`StaffModule title="Rooms"`) |
| `/staff/room-types` | **ComingSoon stub** (`StaffModule title="Room Types"`) |
| `/staff/invoices` | **ComingSoon stub** (`StaffModule title="Invoices"`) |
| `/staff/discounts` | **ComingSoon stub** (`StaffModule title="Discounts"`, route gated `roles=['admin','manager']`) |

- `src/pages/ComingSoon.jsx` renders "Feature in progress … This section will be available in a later phase of the frontend rollout."
- `src/pages/staff/Dashboard.jsx` is an explicit placeholder ("under construction", Phase J).
- `src/components/staff/Sidebar.jsx` already renders **Rooms** and **Room Types** nav links (plus Invoices, Discounts role-gated) — the navigation shell for Phase 8 is already in place; only the route targets are stubs.
- No staff rooms / room-types / room-images code exists anywhere in `src/` (grep confirms zero matches for `staff/rooms`, `staff/room-types` beyond the sidebar + stub route).
- Existing staff patterns to mirror: `BookingList`/`PaymentList` (URL-driven filters + `useApi` + `Pagination`), `BookingDetail`/`PaymentDetail` (`performAction` machinery, inline confirm forms, 409-refetch), `BookingFilters`/`PaymentFilters` (URL commit, `SearchBar`), common `LoadingState`/`EmptyState`/`ErrorState`/`ErrorMessage`.

### 1.2 Phases 2–7 (already delivered — must not be duplicated)

| Phase | Frontend scope | Verified |
|---|---|---|
| 2 | Authentication (customer + staff) | ✅ |
| 3 | Public hotel browsing (room types, rooms, images, availability) | ✅ |
| 4 | Customer booking flow (create/list/detail/cancel) | ✅ |
| 5 | Customer payments & invoices (create/receipt/list/detail) | ✅ |
| 6 | Staff bookings (list/detail/confirm/cancel/check-in/check-out) | ✅ |
| 7 | Staff payments & refunds (list/detail/verify/reject/refund/download) | ✅ |

### 1.3 Canonical roadmap (source of truth)

`hotel-backend-step08/docs/FRONTEND-INTEGRATION-PLAN.md` §8 **Feature Integration Order**:

| Canonical phase | # | Scope | Frontend delivery |
|---|---|---|---|
| F — Staff Booking & Operations | 30–32 | bookings list/detail/lifecycle | **Phase 6 (COMPLETE)** |
| G — Staff Payment & Refund | 33–37 | payment list/detail/receipt/verify/reject/refund | **Phase 7 (COMPLETE)** |
| **H — Staff Room Management** | **38–43** | **rooms list, room create/edit, room status transitions, room type list, room type create/edit, room type images (upload/reorder/delete)** | **THIS PLAN (Phase 8)** |
| I — Staff Invoices & Discounts | 44–48 | invoices list/detail, discount list/create/edit/delete | later (Phase 9) |
| J — Dashboard & Polish | 49–52 | dashboard stats, responsive polish, error boundary, skeletons | later (Phase 10) |

`docs/FRONTEND-PHASE-7-IMPLEMENTATION-PLAN.md` §0.1 confirms the same mapping and states Phase H is the phase **after** Phase G.

### 1.4 Backend API inventory — implemented but NOT yet integrated

All endpoints below exist in `routes/api.php`, are controller/service/policy-complete, and are covered by the backend suite. **None are consumed by the frontend today.**

| Group | Endpoints | Roles | Frontend status |
|---|---|---|---|
| Staff room types | GET index, GET show, POST store, PUT update, DELETE destroy, GET images, POST images | view any staff; write admin,manager | ComingSoon stub |
| Staff room images (top-level) | PUT update (sort_order), DELETE destroy | admin,manager | ComingSoon stub |
| Staff rooms | GET index, GET show, POST store, PUT update, DELETE destroy, POST status/maintenance, POST status/available | view any staff; write admin,manager; status admin,manager,receptionist | ComingSoon stub |
| Staff invoices | GET index, GET show | any staff | ComingSoon stub (Phase I) |
| Staff discounts | GET index, POST store, GET show, PUT update, DELETE destroy | admin,manager | ComingSoon stub (Phase I) |

**Total un-integrated:** 23 endpoints. **Phase 8 integrates the 16 that belong to Phase H.**

---

## 2. Candidate Comparison (weighted, evidence-based)

Scoring follows the Phase 6 plan's weighting (criteria weights × scores), grounded in the actual backend and frontend state. Two candidates duplicate nothing in Phases 2–7.

| Criterion (Wt) | Rooms + Room Types + Images (Phase H) | Invoices + Discounts (Phase I) | Room Type images alone | Dashboard / stats | Customer mgmt / profile editing | Staff booking on behalf |
|---|---|---|---|---|---|---|
| Backend endpoints ready (×3) | **10** — 16 endpoints (STEP 06/07/08 complete) | 9 — 7 endpoints (2 invoice + 5 discount) | 5 — 4 image endpoints only | **0** — no aggregate endpoint exists; would need backend change | **0** — no staff-customer or profile-update endpoint exists | **0** — STEP-12 report says implemented but code does NOT exist (`docs/FRONTEND-INTEGRATION-PLAN.md` §0.1) |
| Canonical roadmap position (×3) | **10** — explicitly §8 Phase H → next after Phase 7 | 6 — Phase I is after Phase H | 2 — sub-slice of Phase H, would fragment one phase | 3 — Phase J, structurally last | 3 — no roadmap slot; explicitly out-of-scope §19 #2/#14 | 1 — explicitly out-of-scope until backend lands it |
| Operational value (×2) | **9** — daily room/status + catalogue upkeep for admin/manager; receptionist status ops | 5 — read-only invoices + master data | 4 — catalogue polish | 5 — visibility, no decision support | 4 — helps staff, weak API | 8 — useful but unbuildable |
| User breadth (×2) | 8 — view any staff; status admin,manager,receptionist; write admin,manager | 5 — invoices any staff; discounts admin,manager | 3 — admin,manager only | 3 — any staff | 2 — staff only | 3 — staff only |
| Dependencies (×2) | 8 — self-contained; needs only room-type list for room form selects | 7 — invoices depend on payment verify already shipped in Phase 7 | 4 — depends on room-type CRUD existing | 3 — needs live modules | 2 — needs backend | 2 — needs backend |
| Complexity (×1) | 7 — 3 list pages + 3 forms + images manager + transitions | 6 — 2 lists + 1 detail + 1 CRUD form | 4 — single page | 4 — count tiles | 3 | 5 |
| Business-rule risk (×1) | 7 — room status matrix, room-type delete guard, PUT full replacement, image rules | 3 — read-only + simple CRUD | 3 | 0 | 0 | 0 |
| Foundation for later phases (×2) | **9** — dashboard (J) counts rooms; invoice list (I) shows room data; images feed public gallery | 6 — dashboard reads invoices | 4 | 0 | 0 | 0 |
| **Weighted total** | **278** | **173** | 94 | **68** | 53 | **49** |

**Selected: Phase H — Staff Room Management.** Highest score (278), already the canonical successor to Phase 7 (§8 #38–43), fully backed by existing endpoints, and a prerequisite for Phase J dashboard counts and for the room-type lists referenced by room forms.

> **Roadmap discrepancy, documented:** the Phase 6 frontend plan re-indexed internally as "Discounts → Phase 8, Rooms/Room Types → Phase 9, Dashboard → Phase 10". The canonical plan (§8 letters H/I/J) and the Phase 7 plan (which explicitly calls the canonical mapping the source of truth, §0.1) place **Rooms = Phase H next**, then **Invoices + Discounts = Phase I**, then **Dashboard = Phase J**. Phase 8 in this repo therefore = Phase H. The Phase 6 numbering conflict is a doc-labeling artifact, not a scope instruction.

---

## 3. Selected Phase 8 Scope

Staff Room Management, mirroring canonical Phase H (#38–43) with the delete actions the STEP 06/07 authorization matrices sanction (Delete ✅ for admin,manager):

1. **Staff rooms list** (`/staff/rooms`) — status-aware cards, filters, status transitions, admin CRUD entry points.
2. **Staff room create/edit** (`/staff/rooms/new`, `/staff/rooms/:id/edit`) — admin,manager.
3. **Staff room status transitions** (maintenance / available) — any staff role (admin,manager,receptionist).
4. **Staff room type list** (`/staff/room-types`) — any staff.
5. **Staff room type create/edit** (`/staff/room-types/new`, `/staff/room-types/:id/edit`) — admin,manager.
6. **Staff room type images** (`/staff/room-types/:id/images`) — upload, reorder (`sort_order`), delete — admin,manager.
7. **Room delete** (admin,manager) — backend endpoint exists; completes the step-approved CRUD. Not a roadmap addition.
8. **Room type delete** (admin,manager) — soft delete with the "has physical rooms" 409 guard surfaced.

### Why it belongs after Phase 7

- Canonical §8 orders F→G→**H**→I→J; Phases 6 and 7 realized F and G.
- All 16 endpoints are already implemented and backend-tested; no backend change is needed (Phase 8 is a pure frontend integration, same as Phases 3–7).
- Rooms/room-types are the last outstanding staff Location/Asset master-data surfaces; Invoices (I) and Discounts (I) then land on top of them, and the Dashboard (J) aggregates room counts.
- Does not duplicate any Phase 2–7 feature (customer room browsing is public/read-only; staff room management is entirely new).

---

## 4. Exact Backend Endpoints

All under `/api/v1`, `auth:sanctum` + `actor:staff`. Two-layer authorization (route `role:*` middleware, then policy `$this->authorize()` re-check).

| # | Method | URL | Roles | Body | Query |
|---|---|---|---|---|---|
| R1 | GET | `/staff/rooms` | any | — | `search?`, `room_type_id?`, `floor?`, `status?`, `sort?`, `direction?`, `per_page?` |
| R2 | GET | `/staff/rooms/{room}` | any | — | — |
| R3 | POST | `/staff/rooms` | admin,manager | `{room_number, room_type_id, floor}` | — |
| R4 | PUT | `/staff/rooms/{room}` | admin,manager | `{room_number, room_type_id, floor}` (PUT = all fields) | — |
| R5 | DELETE | `/staff/rooms/{room}` | admin,manager | — | — |
| R6 | POST | `/staff/rooms/{room}/status/maintenance` | admin,manager,receptionist | `{reason?}` | — |
| R7 | POST | `/staff/rooms/{room}/status/available` | admin,manager,receptionist | `{reason?}` | — |
| T1 | GET | `/staff/room-types` | any | — | `search?`, `min_price?`, `max_price?`, `min_adults?`, `min_children?`, `sort?`, `direction?`, `per_page?` |
| T2 | GET | `/staff/room-types/{roomType}` | any | — | — |
| T3 | POST | `/staff/room-types` | admin,manager | `{name, description?, base_price, capacity_adults, capacity_children, amenities?[]}` | — |
| T4 | PUT | `/staff/room-types/{roomType}` | admin,manager | same as T3 (PUT = all fields) | — |
| T5 | DELETE | `/staff/room-types/{roomType}` | admin,manager | — | — |
| I1 | GET | `/staff/room-types/{roomType}/images` | any | — | — |
| I2 | POST | `/staff/room-types/{roomType}/images` | admin,manager | multipart field **`image`** (jpg/jpeg/png/webp, max 5120 KB) | — |
| I3 | PUT | `/staff/room-images/{image}` | admin,manager | `{sort_order}` (integer ≥ 0) | — |
| I4 | DELETE | `/staff/room-images/{image}` | admin,manager | — | — |

## 5. Exact Request / Query Parameters (validated in FormRequests)

- **Rooms index (R1)** — `search` (string ≤255, matches `room_number`), `room_type_id` (int, exists), `floor` (int 1–200), `status` (in `available,reserved,occupied,cleaning,maintenance`), `sort` (in `room_number,floor,status,created_at`), `direction` (in `asc,desc`), `per_page` (int 1–50). Default sort `room_number` asc, 15/page.
- **Room store (R3)** — `room_number` required string ≤50, unique among non-deleted; `room_type_id` required int, exists among **active** room types; `floor` required int 1–200. **`status` is not an accepted field — never send it.** Server forces `available` on create.
- **Room update (R4)** — same as R3, uniqueness ignores the room itself. **Status can never be changed via PUT.**
- **Status transitions (R6/R7)** — `reason` optional string ≤255.
- **Room-type index (T1)** — `search` (string ≤255), `min_price`/`max_price` (numeric ≥0, `max_price ≥ min_price`), `min_adults`/`min_children` (int ≥0), `sort` (in `name,base_price,created_at`), `direction`, `per_page`. Default sort `name` asc, 15/page.
- **Room-type store/update (T3/T4)** — `name` required ≤255, unique among active; `description` optional ≤2000; `base_price` required numeric 0–999999.99; `capacity_adults` required int 1–20; `capacity_children` required int 0–20; `amenities` optional array ≤30 of strings each ≤100 (flat array of short strings). PUT sends all required fields.
- **Image upload (I2)** — multipart `image`: genuine image data, `mimes:jpg,jpeg,png,webp`, `max:5120` KB (content-derived detection; **svg/gif/bmp rejected by design**).
- **Image update (I3)** — `sort_order` required int ≥0.

## 6. Exact Response Structures

Envelope: success `{success, message, data}`; paginated `{success, message, data, meta:{page,per_page,total,last_page}}`; error `{success:false, message, errors?}`.

- **Room** (R1–R7, `data`): `{id, room_number, room_type_id, floor (int), status, status_changed_at, cleaning_started_at, created_at, updated_at, room_type:{id, name, description, base_price (string, e.g. "189.00"), capacity_adults, capacity_children, amenities:[...]}}` — `roomType` eager-loaded on list and show.
- **Room type** (T1–T4): `{id, name, description, base_price (string "189.00"), capacity_adults (int), capacity_children (int), amenities (array), created_at, updated_at}`.
- **Room image** (I1–I4): `{id, room_type_id, sort_order (int), url (computed public URL, e.g. "/storage/room-types/1/abc.jpg"), created_at, updated_at}` — `path` is **never** returned (model `$hidden`).
- **Delete responses:** `{success:true, message:"Room deleted."}`, `"Room type deleted."`, `"Image deleted."` (`data:null`).
- **Status messages:** `"Room marked for maintenance."`, `"Room marked available."`.

Error statuses to handle: **401** (token), **403** (role/policy), **404** (soft-deleted or missing room/type/image → clean 404), **409** (business rule: illegal status transition e.g. `occupied → maintenance`; room type with physical rooms delete → `"Cannot delete a room type that has physical rooms. Remove or reassign its rooms first."`), **422** (field validation, incl. `room_number`/`name` uniqueness).

## 7. Authentication Requirements

- Every endpoint requires a valid Sanctum bearer token; `apiClient` already attaches `Authorization: Bearer` from `hotel_auth`.
- Route guards: guests hitting any `/staff/rooms*` or `/staff/room-types*` route → redirected to `/staff/login` preserving `state.from` (path + search). Logged-in customers → bounced to `/`.
- The apiClient 401 interceptor already clears session and dispatches `auth:unauthorized` (no change).

## 8. Actor Requirements

`actor = staff` for every route and API call (same as Phases 6/7). No customer-surface changes.

## 9. RBAC Requirements (backend remains the authority)

| Surface | receptionist | manager | admin |
|---|---|---|---|
| View rooms list / room types list | ✅ | ✅ | ✅ |
| Room status transitions (maintenance/available) | ✅ | ✅ | ✅ |
| Room create/edit/delete | ❌ 403 | ✅ | ✅ |
| Room type create/edit/delete | ❌ 403 | ✅ | ✅ |
| Room type images (upload/reorder/delete) | ❌ 403 | ✅ | ✅ |

Frontend mirrors via `useAuth().hasRole` / `ProtectedRoute roles` **for UX only**; any bypass surfaces 403 and is handled gracefully. The images route page is role-gated to admin,manager (it is a pure management surface, same convention as the Discounts route); the read endpoints themselves remain any-staff.

## 10. Pages / Routes (`src/routes/StaffApp.jsx`)

| Route | Page | Guard |
|---|---|---|
| `/staff/rooms` | `Rooms` (list) | `ProtectedRoute actor="staff"` |
| `/staff/rooms/new` | `RoomForm` (create) | `ProtectedRoute actor="staff" roles={['admin','manager']}` |
| `/staff/rooms/:id/edit` | `RoomForm` (edit) | `ProtectedRoute actor="staff" roles={['admin','manager']}` |
| `/staff/room-types` | `RoomTypes` (list) | `ProtectedRoute actor="staff"` |
| `/staff/room-types/new` | `RoomTypeForm` (create) | `ProtectedRoute actor="staff" roles={['admin','manager']}` |
| `/staff/room-types/:id/edit` | `RoomTypeForm` (edit) | `ProtectedRoute actor="staff" roles={['admin','manager']}` |
| `/staff/room-types/:id/images` | `RoomTypeImages` | `ProtectedRoute actor="staff" roles={['admin','manager']}` |

`invoices` and `discounts` keep their `StaffModule` ComingSoon stubs (Phase I). `StaffModule` is retained for those two only.

## 11. Components

Create (reusing patterns from Phases 3–7):

| File | Purpose |
|---|---|
| `src/components/staff/RoomStatusBadge.jsx` | Five-status badge (`available` green, `reserved` yellow, `occupied` red, `cleaning` blue, `maintenance` slate) — mirrors `BookingStatusBadge`/`PaymentStatusBadge` |
| `src/components/staff/RoomCard.jsx` | Link-free list card: room number, room type name, floor, `RoomStatusBadge`, status-transition + delete inline strips, edit link (admin/manager) |
| `src/components/staff/RoomFilters.jsx` | URL-driven status select + room-type select + `SearchBar` (mirrors `BookingFilters` commit pattern, `page:1` reset) |
| `src/components/staff/RoomTypeCard.jsx` | Card: name, price (verbatim string), capacities, amenity chips, edit/images links (admin/manager) |

Reused (no changes): `Pagination`, `SearchBar`, `LoadingState`, `EmptyState`, `ErrorState`, `ErrorMessage`, `useApi`, `getErrorMessage`/`getFieldErrors`, `useAuth().hasRole`, `ProtectedRoute`.

## 12. API Service Changes (`src/api/roomApi.js` only)

Add three groups beside the existing `publicRooms` (project convention: one module file — see `bookingApi.js`, `paymentApi.js`):

```js
export const staffRoomTypes = {
  list: (params) => apiClient.get('/staff/room-types', { params }),
  show: (id) => apiClient.get(`/staff/room-types/${id}`),
  create: (data) => apiClient.post('/staff/room-types', data),
  update: (id, data) => apiClient.put(`/staff/room-types/${id}`, data),
  destroy: (id) => apiClient.delete(`/staff/room-types/${id}`),
  listImages: (id) => apiClient.get(`/staff/room-types/${id}/images`),
  uploadImage: (id, file) => {
    const formData = new FormData()
    formData.append('image', file)
    return apiClient.post(`/staff/room-types/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const staffRoomImages = {
  updateSortOrder: (id, sortOrder) =>
    apiClient.put(`/staff/room-images/${id}`, { sort_order: sortOrder }),
  destroy: (id) => apiClient.delete(`/staff/room-images/${id}`),
}

export const staffRooms = {
  list: (params) => apiClient.get('/staff/rooms', { params }),
  show: (id) => apiClient.get(`/staff/rooms/${id}`),
  create: (data) => apiClient.post('/staff/rooms', data),
  update: (id, data) => apiClient.put(`/staff/rooms/${id}`, data),
  destroy: (id) => apiClient.delete(`/staff/rooms/${id}`),
  toMaintenance: (id, reason) =>
    apiClient.post(`/staff/rooms/${id}/status/maintenance`, reason ? { reason } : {}),
  toAvailable: (id, reason) =>
    apiClient.post(`/staff/rooms/${id}/status/available`, reason ? { reason } : {}),
}
```

## 13. Hooks / State Management

- List pages: `useSearchParams` (URL is single source of truth) + `useApi(memoizedFetcher)` + `refetch` — exact `BookingList`/`PaymentList` pattern.
- Forms: local component state (controlled inputs); on edit a `useApi` fetch preloads the resource (+ active room types for the room form select).
- Mutations: a small `performAction(name, request)` running-action guard + success banner + `refetch` — the `BookingDetail`/`PaymentDetail` pattern; **refetch after every successful mutation** so server state reconciles.
- 409/403 after a mutation → also refetch (state is reconciled with the server).
- No Redux, no new global state.

## 14. Loading / Empty / Error States

| Page | Loading | Empty | Error |
|---|---|---|---|
| Rooms list | `LoadingState label="Loading rooms…"` | `EmptyState title="No rooms found"` + "Clear all filters" when filtered | `ErrorState` + retry |
| RoomTypes list | `LoadingState label="Loading room types…"` | `EmptyState title="No room types configured"` + clear filters | `ErrorState` + retry |
| RoomForm edit | `LoadingState label="Loading room…"` | — | 404 → `ErrorState` no-retry + back-to-rooms; other → retry |
| RoomTypeForm edit | `LoadingState label="Loading room type…"` | — | 404 → `ErrorState` + back-to-room-types |
| RoomTypeImages | `LoadingState label="Loading images…"` | `EmptyState title="No photos yet"` + upload prompt | `ErrorState` + retry |
| All | | 401 handled globally (interceptor) | 403 → message / role-gated route → `Forbidden` component |

422 → `getFieldErrors` inline per field on forms. 409 → server business message via `getErrorMessage` (e.g. room-type-with-rooms delete; illegal status transition) then refetch.

## 15. Security Rules

- **Backend is final authority.** Never compute or infer eligibility client-side; buttons are UX affordances only.
- `status` is **never** sent in room create/update bodies. `base_price`, amounts, and role fields are **never** sent in any body.
- Room images: render only the server-provided `url`; never display `path` (it is hidden server-side anyway).
- File input for image upload only via `input[type=file]`; client-side pre-validation mirrors the backend (image, jpg/jpeg/png/webp, ≤5120 KB) before the network call.
- All `sort_order` values validated/sanitized as integers ≥0 before PUT.
- Delete actions require a confirm step (inline confirm panel, not `window.confirm`) and are never auto-executed.

## 16. Business Rules the Frontend Must Respect

- **Room status matrix** (server source of truth): `available → maintenance` and `maintenance → available` are the only manual transitions exposed. `reserved/occupied/cleaning` have **no** status buttons (booking/system-driven); an illegal attempt returns 409 with the server message.
- Room create always starts `available` (server-side).
- Room/room-type PUT is full-resource replacement — edit forms submit every required field.
- Room-type delete with any physical room → 409 `"Cannot delete a room type that has physical rooms..."` shown verbatim.
- Duplicate `room_number` / room-type `name` (among active) → 422 field error.
- `base_price` is a decimal **string** — render verbatim, never `Number()` it (matches every existing money display).
- `amenities` is a JSON array of short strings; the form maps a comma-separated input ↔ array.
- Image upload assignation order is server-decided (`max(sort_order)+1`); the frontend never sends a sort_order on upload.
- History is immutable: editing/deleting a room type or discount **never** rewrites bookings; the frontend performs no such mutation.

## 17. Test Strategy (new files in `src/test/`, mirroring Phase 6/7 mocks)

| File | Cases (~) |
|---|---|
| `staffRoomApi.test.js` | ~14 — all three groups: list params (search/status/room_type_id/floor/sort/direction/per_page), show, create body, update body + PUT verb, delete verb, toMaintenance/toAvailable (reason present/absent), images list, upload FormData `image` field + content-type, updateSortOrder body, destroy verb |
| `staffRoomStatusBadge.test.jsx` | ~4 — five statuses + fallback |
| `staffRoomCard.test.jsx` | ~6 — room number/type/floor, status badge, status button rules (available→maintenance; maintenance→available; reserved/occupied/cleaning → none), edit link only admin/manager |
| `staffRooms.test.jsx` | ~13 — loading, list render, filter commit (status, search, room-type, page reset), empty + clear filters, pagination, error + retry, status transition inline confirm + success + 409 server message + refetch, delete confirm + success |
| `staffRoomForm.test.jsx` | ~16 — create empty form, submit body (no `status` key), 422 field errors (room_number / room_type_id / floor), edit prefill fetch, PUT full payload, 404 detail, loading, duplicate guard, unauthenticated/role guard via route test |
| `staffRoomTypes.test.jsx` | ~12 — loading, render, filters + pagination, empty + clear, error retry, admin/manager New + card action links, receptionist sees no action links |
| `staffRoomTypeForm.test.jsx` | ~16 — create/submit body incl. amenities array, 422 errors, edit prefill (amenities array → comma string), PUT full payload, 409 room-type-with-rooms delete via detail/list, 404 |
| `staffRoomTypeImages.test.jsx` | ~15 — loading, empty, gallery render from `url`s, upload validation (wrong type/size client-side), upload success → refetch, move up/down PUT sort_order, delete confirm + success, 404, error |
| `staffRoomRoutes.test.jsx` | ~12 — guards: guest → `/staff/login` (list + new + edit + images), customer → `/`, role gating (receptionist blocked from `/staff/rooms/new`, `/staff/room-types/new`, `/staff/room-types/:id/edit`, `/staff/room-types/:id/images` → Forbidden; receptionist CAN reach `/staff/rooms`), admin reaches all; invoices/discounts stubs intact |

**Estimated new tests: ~108 → projected total ~452.** This is a stated estimate; actual count follows module completion (Phases 6/7 delivered 55/53 and exceeded their projections).

## 18. Regression Strategy

- **All 344 existing tests must stay green**, with exactly one planned exception:
  - `src/test/staffPaymentRoutes.test.jsx` lines 118–123 assert the rooms route is still a stub (`'Feature in progress'`). **This assertion must be replaced** once `/staff/rooms` becomes real (e.g. assert the list renders for staff, or that a guest is redirected). This is the only existing test that references the rooms/room-types stubs (verified by grep).
- Verify nothing else asserts on the rooms/room-types stubs (Phase 6/7 route tests cover bookings/payments only).
- After implementation run: `npm run lint` (0 warnings), `npm run test` (all files green), `npm run build` (success).
- Backend repo `git status` remains clean of application changes — Phase 8 changes nothing in `hotel-backend-step08` (a Phase 8 completion report may be appended under `docs/FRONTEND-INTEGRATION-PLAN.md` per the established `0.1x` pattern, doc-only, after approval).

## 19. Exact Files to Create

```
src/components/staff/RoomStatusBadge.jsx
src/components/staff/RoomCard.jsx
src/components/staff/RoomFilters.jsx
src/components/staff/RoomTypeCard.jsx
src/pages/staff/Rooms.jsx
src/pages/staff/RoomForm.jsx
src/pages/staff/RoomTypes.jsx
src/pages/staff/RoomTypeForm.jsx
src/pages/staff/RoomTypeImages.jsx
src/test/staffRoomApi.test.js
src/test/staffRoomStatusBadge.test.jsx
src/test/staffRoomCard.test.jsx
src/test/staffRooms.test.jsx
src/test/staffRoomForm.test.jsx
src/test/staffRoomTypes.test.jsx
src/test/staffRoomTypeForm.test.jsx
src/test/staffRoomTypeImages.test.jsx
src/test/staffRoomRoutes.test.jsx
```

## 20. Exact Files to Modify

| File | Change |
|---|---|
| `src/api/roomApi.js` | Add `staffRoomTypes`, `staffRoomImages`, `staffRooms` groups |
| `src/routes/StaffApp.jsx` | Replace the `rooms` and `room-types` ComingSoon stubs with the 7 real routes + imports; keep `StaffModule` for `invoices`/`discounts` only |
| `src/test/staffPaymentRoutes.test.jsx` | Replace the obsolete "rooms route as a stub" assertion (line 118–123) with a real-route guard assertion |

## 21. Explicit Out-of-Scope (later phases)

- **Staff invoices** list/detail (`GET /staff/invoices`, `GET /staff/invoices/{id}`) → **Phase I (Phase 9)**.
- **Staff discounts** CRUD (`/staff/discounts/*`) → **Phase I (Phase 9)**. Discount booking-time behavior already surfaced to customers (Phase 3/4 availability + transient create banner).
- **Dashboard / statistics** — no aggregate backend endpoint exists → **Phase J (Phase 10)**; a backend endpoint may be required first (per canonical §8 #49).
- **Customer profile editing** — no update endpoint exists (customers `/me` is read-only; canonical §19 #14).
- **Staff customer management / staff user management** — no endpoints exist (canonical §19 #2).
- **Staff booking on behalf** (`POST /staff/bookings`) — backend code does not exist despite the STEP-12 report (canonical §0.1/Appendix B) → blocked until the backend lands it.
- **Departments / employee management / department CRUD** — no endpoints.
- **Public room browsing changes, all customer surfaces** — Phase 3 delivers the public room-type/room/image browse; unchanged.
- **Room availability calendar, real-time updates, notifications, PDF invoice download, print views, i18n, dark mode** — canonical §19 #7–#17.
- **Redux / state libraries** — not needed (context + URL state suffice).
- **No backend changes, no DB changes, no new endpoints.**
- **No `RoomDetail` staff page** — the canonical §8 list has no staff room detail item; the list card + forms + images cover the module.

## 22. Implementation Order

1. **API service** — add the three groups to `src/api/roomApi.js`; write + run `staffRoomApi.test.js`.
2. **`RoomStatusBadge`** + test (verify existing customer components untouched).
3. **Rooms list** — `RoomCard`, `RoomFilters`, `Rooms.jsx` + tests (status transitions + delete live here).
4. **RoomForm** (create/edit) + test.
5. **RoomTypes list** — `RoomTypeCard`, `RoomTypes.jsx` + tests.
6. **RoomTypeForm** (create/edit) + test.
7. **RoomTypeImages** (upload/reorder/delete) + test.
8. **Routing** — wire the 7 routes in `StaffApp.jsx`; `staffRoomRoutes.test.jsx`; update the obsolete `staffPaymentRoutes.test.jsx` assertion.
9. **Final verification** — `npm run lint` (0 warnings), `npm run test` (all green incl. the 344 baseline + new), `npm run build` (success), backend `git status` unchanged.

## 23. Verification Checklist

- [ ] Lint clean (0 warnings).
- [ ] All pre-existing 344 tests pass (excluding the one documented relocation in `staffPaymentRoutes.test.jsx`).
- [ ] New Phase 8 tests pass (API groups, 5 components, 4 pages, routes/guard/role).
- [ ] `npm run build` succeeds.
- [ ] Guest hitting any `/staff/rooms*` / `/staff/room-types*` route → `/staff/login` with `state.from`; customer → `/`.
- [ ] Receptionist: sees rooms + room types lists, can run maintenance/available transitions, is Forbidden on new/edit/images routes, sees no action links.
- [ ] Admin/manager: full CRUD + images; server 409 on room-type-with-rooms delete and illegal transitions shown verbatim + refetch.
- [ ] Every money/status/rule value is rendered from the API; no client-side status/total computation anywhere.
- [ ] Backend repository has no application-code changes.

## 24. Verified Source Files (read, not assumed)

Backend (`hotel-backend-step08`):
- `routes/api.php` (staff room-types lines 136–149, room-images 154–157, rooms 163–174)
- `app/Http/Controllers/Api/V1/Staff/{RoomController,RoomStatusController,RoomTypeController,RoomImageController}.php`
- `app/Services/{RoomService,RoomTypeService,RoomImageService}.php` (transition matrix, soft-delete guard, sort-order logic)
- `app/Policies/{RoomPolicy,RoomTypePolicy,RoomImagePolicy}.php`
- `app/Http/Requests/Room/{Index,Store,Update,ChangeStatus}Request.php`, `app/Http/Requests/RoomType/{Index,Store,Update}Request.php`, `app/Http/Requests/RoomImage/{Upload,Update}Request.php`
- `app/Models/{Room,RoomType,RoomImage}.php`
- `docs/FRONTEND-INTEGRATION-PLAN.md` (§2.10–§2.12, §6.2, §8 Phase H #38–43, §11.2 permissions, §19 out-of-scope, Appendix B)
- `docs/STEP-06-ROOM-TYPE-PLAN.md`, `docs/STEP-07-ROOM-PLAN.md` (delete matrices)

Frontend (`hotel-frontend`):
- `src/routes/StaffApp.jsx`, `src/api/roomApi.js`, `src/api/{bookingApi,paymentApi,authApi,client}.js`
- `src/pages/staff/{BookingList,BookingDetail,PaymentList,PaymentDetail,Dashboard}.jsx`
- `src/components/staff/{BookingCard,BookingFilters,PaymentCard,PaymentFilters,Sidebar}.jsx`
- `src/components/customer/{Pagination,SearchBar,RoomCard,RoomGallery}.jsx`
- `src/components/common/{LoadingState,EmptyState,ErrorState}.jsx`
- `src/hooks/useApi.js`, `src/context/AuthContext.jsx`, `src/routes/ProtectedRoute.jsx`, `src/utils/apiError.js`
- `src/test/staffPaymentRoutes.test.jsx` (rooms-stub assertion to update)
- `docs/FRONTEND-PHASE-6-IMPLEMENTATION-PLAN.md`, `docs/FRONTEND-PHASE-7-IMPLEMENTATION-PLAN.md`
- Session verification: `npm run lint` clean; `npm run test` → **42 files / 344 tests passed**; build successful (baseline).