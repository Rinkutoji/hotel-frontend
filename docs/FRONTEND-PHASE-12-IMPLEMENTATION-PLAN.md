# Phase 12 — Receipt Inline Preview (Customer & Staff) — Implementation Plan

> **Status: PROPOSED / DRAFT.** No official Phase 12 exists in the canonical
> `docs/FRONTEND-INTEGRATION-PLAN.md`; scope below is **derived exclusively from
> explicitly-deferred items** in that document and requires **no backend change**.
> Not approved yet — implementation starts only after explicit user approval.

> **Status update (documentation correction, 2026-09-16):** this scope was
> **implemented** on 2026-09-15 — `src/components/common/ReceiptPreview.jsx`,
> integration in `src/pages/customer/PaymentDetail.jsx` and
> `src/pages/staff/PaymentDetail.jsx`, and `src/test/receiptPreview.test.jsx`
> (extended `paymentDetail` / `staffPaymentDetail` suites). The canonical
> `FRONTEND-INTEGRATION-PLAN.md` now records it in a Phase 12 addendum
> (previously unrecorded). The PROPOSED/DRAFT header above is historical record,
> not current status. **This document is NOT the official Phase 12 completion**
> (that is C1/C2/I1/I2/I3, per the canonical Phase 12 record); this is a
> **separate implemented derived item** that shares the Phase-12 label. No
> Phase 13 is created.

---

## 0. Provenance — why this scope (derived, not official)

The canonical roadmap (`docs/FRONTEND-INTEGRATION-PLAN.md`) defines phases as
letters **A → J (§8 items #1–#52)**. The last item (#52 loading skeletons) was
delivered as **Phase 10** (report `0.1i`), and Phase 11 delivered the derived
standalone customer payment list + print view (report `0.1j`). There is **no
§8 Phase K and no defined "Phase 12" section** anywhere in the canonical
document (verified by full read: §8 ends at item #52; the completion reports
are 0.1a–0.1j; Appendix B closes the roadmap).

Therefore Phase 12 must be derived **only from explicitly-deferred items that
are implementable today against existing endpoints**. The deferred-items
catalog has two primary sources:

| # | Deferred item | Documented where (verbatim) | Status today |
|---|---------------|------------------------------|--------------|
| 1 | **Receipt image preview (inline thumbnail)** | `FRONTEND-PHASE-5-IMPLEMENTATION-PLAN.md` §12: "Receipt image preview (inline thumbnail) \| **Future** \| Blob download opens in new tab for now" | Never built (verified below) |
| 2 | Real-time payment status updates | Same §12 table ("Future … No WebSocket/polling; page refreshes on action") | **Backend-blocked** — no WS/polling (canonical §19 #6) |

Item #1 is the **only remaining frontend-only survivor** of the Phase 5
deferral table: the standalone payment list and print view were delivered in
Phase 11, and real-time requires backend support (stays deferred). It is the
natural derived Phase 12 scope. No endpoint, field, permission, or business
rule is invented (see §2 and §7).

---

## 1. Purpose and Constraints

- **Frontend-only Phase 12** in `hotel-frontend`. No backend app code, routes,
  tests, migrations, or models are created or modified.
- Build **only against pre-existing, verified endpoints**. Never invent an
  endpoint, field, permission, or business rule. Never send a query/body field
  the backend does not document.
- **Do not change receipt visibility rules.** Preview is offered only for the
  exact `status` values where the existing "View receipt" action already
  appears (customer: `receipt_uploaded`, `verified`, `refunded`; staff:
  `receipt_uploaded`, `verified`, `rejected`, `refunded`). `pending` never
  previews (no receipt).
- **No new dependencies** — the preview uses `URL.createObjectURL` + `<img>`,
  already in the project's toolchain (`paymentApi.downloadReceipt` exists).
- Preserve Phases 2–11 behavior and the 67-file / 596-test baseline.

---

## 2. Already Supported by the Backend — No Backend Change Required

### 2.1 Receipt download endpoints (verified)

- Customer: `GET /api/v1/customer/payments/{payment}/receipt` (canonical §2.7:
  binary file download or 404) — own-only for customers.
- Staff: `GET /api/v1/staff/payments/{payment}/receipt` (canonical §2.14:
  binary file download or 404) — any staff role.
- Serving: `Storage::disk('receipts')->response($path)` (verified in
  `Customer/PaymentController.php:87` and `Staff/PaymentController.php:69`) —
  Laravel streams the stored file, so the response `Content-Type` reflects the
  stored file (image/jpeg, image/png, or application/pdf per canonical §10.2).
  The client reads that content type from `blob.type` to decide previewability
  (see §7). `receipt_path` is hidden from API responses (canonical §10.2/§16.4)
  — never exposed in the UI.

### 2.2 Receipt MIME set (verified)

Upload contract: **jpeg, png, pdf, max 4MB** (canonical §10.2; enforced
client-side by `PaymentDetail.jsx` `ACCEPTED_TYPES`/`MAX_RECEIPT_SIZE` and by
the backend). Only images can be shown inline as a thumbnail; PDF receipts
must keep the existing new-tab/open behavior.

### 2.3 Current frontend behavior (verified by inspection)

- `src/pages/customer/PaymentDetail.jsx` `handleViewReceipt` and
  `src/pages/staff/PaymentDetail.jsx` `handleDownloadReceipt` **both** download
  the blob and `window.open(URL.createObjectURL(blob))` — exactly the "opens in
  new tab" behavior the Phase 5 deferral describes. No `<img>`-based inline
  preview exists anywhere in `src` (grep for `createObjectURL`/`<img>` shows
  only these lookups plus room images).

Both `downloadReceipt` API clients already exist in `src/api/paymentApi.js`;
**no API client change** is needed.

---

## 3. Frontend Dependencies

- **None new.** Reuses the existing stack (React 19, Axios, Tailwind 3, Vitest
  + Testing Library + axios-mock-adapter). No image/CDN/PDF library is added.
- Reused existing modules:
  - `src/api/paymentApi.js` → `customerPayments.downloadReceipt(id)` and
    `staffPayments.downloadReceipt(id)` (both return a `blob` via
    `responseType: 'blob'`)
  - `src/components/common/{LoadingState,ErrorMessage}.jsx` (compact loading /
    error rendering patterns)
  - `src/hooks/useApi.js` for page data (unchanged)

---

## 4. In-Scope — Feature A: Receipt Inline Preview

Current state (verified): neither payment detail page renders the receipt
inline; the only actions are the "View receipt"/"Open" new-tab downloads
described in §2.3.

### 4.1 New component `src/components/common/ReceiptPreview.jsx`

Reusable by the customer and staff payment detail pages. Props:
`paymentId` (number) and `download` (callable returning the blob promise, i.e.
the existing `downloadReceipt`-bound function).

Behavior:
- Renders a **"Preview receipt"** toggle button (`btn-outline`), adjacent to
  the existing "View receipt" button. On first click it **lazily fetches** the
  blob (button disabled while loading, shows `role="status"` "Loading receipt…").
- On success it inspects `blob.type`:
  - starts with `image/` (jpeg/png) → render an inline `<img>` thumbnail
    (`alt="Payment receipt for payment #{paymentId}"`), capped height, rounded
    border, using a `URL.createObjectURL(blob)` source.
  - otherwise (`application/pdf` or any non-image / empty `blob.type`) → no
    `<img>`; show a compact note: "This receipt is a PDF and can't be previewed
    inline. Use View receipt to open it." (decision cached per payment so it is
    not re-fetched toggling back and forth).
- On error → compact inline error with a **Try again** retry that re-fetches.
  The page and its other actions are unaffected.
- Cleanup: `URL.revokeObjectURL` on hide and on unmount (no leak).

### 4.2 Customer integration — `src/pages/customer/PaymentDetail.jsx`

- Inside the existing **Receipt** card, within the `status !== 'pending'`
  branch, alongside the existing "View receipt" button (i.e. only when
  `canViewReceipt` is true — `receipt_uploaded` / `verified` / `refunded`, an
  **unchanged** rule), render
  `<ReceiptPreview paymentId={payment.id} download={() => customerPayments.downloadReceipt(payment.id)} />`.
- Upload/replace flow, verified-by note, and status messaging remain untouched.
- After a receipt upload / verify / reject / refund triggers `refetch`, the
  preview button remounts at its idle state (any open preview is reset) —
  expected and documented.

### 4.3 Staff integration — `src/pages/staff/PaymentDetail.jsx`

- Same insertion inside the staff **Receipt** card, alongside "View receipt",
  under the existing `canViewReceipt` statuses (`receipt_uploaded`, `verified`,
  `rejected`, `refunded` — unchanged):
  `<ReceiptPreview paymentId={payment.id} download={() => staffPayments.downloadReceipt(payment.id)} />`.
- Verify / reject / refund action forms are untouched.

### 4.4 Non-goals (within this feature)

- No image lightbox / full-screen modal (existing "View receipt" new-tab is the
  full view).
- No automatic (eager) fetch — the preview fetch happens **only** when the user
  clicks "Preview receipt"; a PDF is never fetched needlessly (see §10).
- No download/copy interaction changes; the existing "View receipt" button is
  still the download/open action.

---

## 5. API Endpoints (exhaustive)

| Endpoint | Used by | Calls |
|----------|---------|-------|
| `GET /api/v1/customer/payments/{payment}/receipt` | Preview (customer) | 1 on first "Preview receipt" click (+1 per explicit retry) |
| `GET /api/v1/staff/payments/{payment}/receipt` | Preview (staff) | 1 on first "Preview receipt" click (+1 per explicit retry) |

Both are pre-existing, verified endpoints (canonical §2.7 / §2.14). No new
endpoints, query params, request bodies, or `status` values are sent. The
preview adds **no** request to normal page loads; it adds one only when the
user requests a preview.

---

## 6. Authorization / RBAC

| Action | Allowed | Enforced |
|--------|---------|----------|
| Preview receipt (customer) | own payment with a receipt (`receipt_uploaded`/`verified`/`refunded`) | client-side: button rendered only under existing `canViewReceipt`; backend: `auth:customer` + own-only `whereHas(booking)` + `Storage::response` (existing) |
| Preview receipt (staff) | **any staff role** on a payment with a receipt (`receipt_uploaded`/`verified`/`rejected`/`refunded`) | client-side: same existing `canViewReceipt` guard; backend: `auth:staff` + `Storage::response` (existing, matches Phase 7) |
| `pending` payments | — | no receipt exists; no preview button (unchanged) |

No permission matrix change; no new role-gated action.

---

## 7. Validation

- **No forms / no user input** — nothing to validate; no client-side accept
  rules are re-derived.
- The only "decision" is the **previewability check**, which reads the served
  file's `Content-Type` from the blob (`blob.type`):
  - `image/*` → inline thumbnail
  - `application/pdf` → "single-page/open in new tab" note
  - any other / empty `blob.type` → same non-previewable note (no magic-byte
    guessing, no fallback heuristic — honest and bounded).
- Upload accept-rule parity (jpeg/png/pdf 4MB) is **not** re-implemented
  client-side for the preview; the note handles any file type the backend
  legitimately stores.

---

## 8. UI/UX

- Both detail pages: the existing **Receipt** card gains a **"Preview receipt"**
  button beside "View receipt", revealing an inline thumbnail (image) or a
  short non-previewable note (PDF). A compact `role="status"` loading state and
  an inline error-with-retry follow the project's established error handling
  (canonical §12/§13).
- The thumbnail is capped in height (`max-h`/`max-w`, `rounded-lg`, border) so
  it never dominates the page; the card column/stack layout is untouched.
- Accessible: real `<button>` with visible text label; `alt` on the thumbnail;
  no icon-only control (per §9 conventions of prior phases).
- Screen layout/behavior of the payment pages is otherwise unchanged.

---

## 9. Tests (planned, aligned with existing conventions)

| File | Cases | Notes |
|------|-------|-------|
| `src/test/receiptPreview.test.jsx` (new) | ~7 | image blob (mock `new Blob([…], {type:'image/png'})`) renders `<img>` with object URL + alt; pdf blob shows PDF note and no `<img>`; unknown/empty `blob.type` → note; loading `role="status"` while fetching; fetch error → inline error, Try again re-fetches; toggling off hides + calls `URL.revokeObjectURL`; unmount revokes |
| `src/test/paymentDetail.test.jsx` (modified) | +4 | "Preview receipt" shown for `receipt_uploaded`/`verified`/`refunded` image payments and reveals the thumbnail on click; **not** shown for `pending`; PDF receipt → note; preview fetch failure does not break the page / other buttons |
| `src/test/staffPaymentDetail.test.jsx` (modified) | +4 | preview available for `receipt_uploaded`/`verified`/`rejected`/`refunded`; `pending` → none; PDF → note; verify/reject/refund flows unaffected by the preview's presence |

Blob mocks follow the existing `paymentDetail.test.jsx` pattern
(`window.URL.createObjectURL = vi.fn(...)` already used there, line 199).
Estimated **~15 new tests, +1 new test file** → 67 files / 596 tests →
projected **68 files / ~611 tests**. Final results are recorded in the
completion report (canonical `0.1k`), not promised in advance.

---

## 10. Performance Considerations

- **Lazy, on-demand fetch**: the preview issues a blob GET only when "Preview
  receipt" is clicked — page loads add **zero** requests, and PDF receipts (up
  to 4MB, canonical §10.2) are never fetched for a preview they cannot use, the
  MIME being unknown until fetched once per payment.
- **One in-flight guard + one revoke**: the component disables the button while
  loading, caches the decision, and revokes the object URL on hide/unmount
  (no `URL.createObjectURL` leak).
- Bounded payload: a single ≤4MB download per opened preview; no N+1, no
  polling, no real-time (canonical §19 #6 stays deferred).
- **No new dependencies / negligible bundle impact** (one small component).

---

## 11. Files (planned)

**Create**
- `src/components/common/ReceiptPreview.jsx`
- `src/test/receiptPreview.test.jsx`
- `docs/FRONTEND-PHASE-12-IMPLEMENTATION-PLAN.md` (this document)

**Modify**
- `src/pages/customer/PaymentDetail.jsx` (render `ReceiptPreview` beside "View
  receipt", guarded by existing `canViewReceipt`)
- `src/pages/staff/PaymentDetail.jsx` (same in staff receipt card)
- `src/test/paymentDetail.test.jsx`, `src/test/staffPaymentDetail.test.jsx`
  (preview cases)

**No backend files touched.**

---

## 12. Deferred / Out-of-Scope (explicit)

Backend-blocked (no endpoint exists — out regardless of frontend effort):
- **Notifications / email** (canonical §19 #5), **real-time updates**
  (§19 #6), **staff booking on behalf / STEP-12** (§19 #1; verified absent),
  **staff user management** (§19 #2), **department management** (§19 #3),
  **admin employee panel** (§19 #13), **customer profile editing** (§19 #14 —
  `GET /customer/me` is read-only; no update endpoint),
  **payment gateway integration** (§19 #16), **PDF invoice download**
  (§19 #8 — JSON only, and would need a new backend endpoint or client lib).

Frontend-possible but **deliberately left out of this derived phase**:
- **Room availability calendar view** (§19 #15) — a per-day grid would require
  a client-side strategy of repeated `POST /public/availability` calls (one per
  day/room), a request pattern **not grounded in any documented endpoint usage**;
  risks inventing behavior. Kept deferred.
- **Dark mode** (§19 #11) — frontend-only but an unbounded visual change across
  ~40 components with no documented acceptance criteria; a poor fit for a
  narrowly-derived phase. Kept deferred.
- **i18n** (§19 #10), **E2E Cypress/Playwright** (§19 #12 — new dependency
  infrastructure), **performance/memoization audit** (§19 #18 — audit-only),
  **Redux/Zustand** (§19 #19 — a regression from Context). All kept deferred.
- Everything already built (Phases 2–11) remains as-is; this phase adds no
  regression surface.

---

## 13. Verification & Completion Steps (only after approval)

1. Implement per §4; keep `oxlint` at 0 warnings.
2. `npm run test` → all 596 baseline tests stay green + new ones pass.
3. `npm run lint` → 0 warnings; `npm run build` → success (note gzip delta).
4. Backend `git status` → **docs only**; backend suite untouched (430 /
   1,322) — nothing to re-run.
5. Append canonical `## 0.1k` completion report to
   `hotel-backend-step08/docs/FRONTEND-INTEGRATION-PLAN.md`; update its header.

---

*End of PROPOSED / DRAFT Phase 12 plan — awaiting approval. No code, test,
route, migration, or backend file was created or modified.*

---

### Completion (documentation correction, 2026-09-16)

Implemented 2026-09-15: `src/components/common/ReceiptPreview.jsx`, integrated in
`src/pages/customer/PaymentDetail.jsx` and `src/pages/staff/PaymentDetail.jsx`
(guarded by the unchanged `canViewReceipt` status rules); tests in
`src/test/receiptPreview.test.jsx` plus preview cases in
`src/test/paymentDetail.test.jsx` and `src/test/staffPaymentDetail.test.jsx`.
Consumes only pre-existing endpoints (`GET /api/v1/customer/payments/{payment}/receipt`,
`GET /api/v1/staff/payments/{payment}/receipt`). No backend change. Recorded in
`hotel-backend-step08/docs/FRONTEND-INTEGRATION-PLAN.md` Phase 12 addendum.