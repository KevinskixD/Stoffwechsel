# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Uniformverwaltung: web tool for uniform ordering/inventory management, replacing an Excel-based
workflow for a single clothing officer (Bekleidungsreferent). React (Vite) + TypeScript, Firestore
as the only datastore, `xlsx` for client-side Excel import. Purely local operation (`npm run dev`),
no authentication, no multi-user support.

## Commands

- `npm run dev` — start dev server
- `npm run build` — typecheck (`tsc -b`) then production build; the two are separate steps, a
  build can fail on typecheck even if Vite itself would succeed
- `npm run lint` — oxlint (see `.oxlintrc.json`; `react/rules-of-hooks` is an error, not just a warning)
- `npm run preview` — preview a production build

No test runner is configured in this repo.

### Firestore setup (required before `npm run dev` works)

1. Copy `.env.local.example` to `.env.local` and fill in Firebase web app config values.
2. Deploy rules/indexes after any change to `firestore.rules` or `firestore.indexes.json`:
   ```
   firebase deploy --only firestore:rules --project <project-id>
   firebase deploy --only firestore:indexes --project <project-id>
   ```
3. The seven default order statuses ("Zu Bestellen", "Bestellt", "Geliefert", "Informiert",
   "Abgeholt", "Umtausch", "Abgeschlossen") are seeded automatically on first run if the
   `orderStatuses` collection is empty (`src/firebase/seed.ts`) — race-safe via a transaction
   against an `appMeta/seed` marker doc, so two overlapping first-runs (two tabs, a dev
   reload racing an in-flight write) can't double-seed. `appMeta` is internal bookkeeping and
   is deliberately excluded from backups.
4. The **Lieferschein-Check** feature (`src/features/lieferscheinCheck/`) calls the Gemini API
   to extract line items from an uploaded delivery-note PDF — set `VITE_GEMINI_API_KEY` (see
   `.env.local.example`) or it throws at call time. The model is pinned to the `-latest` alias
   (`gemini-flash-latest`), not a dated version, since dated versions can be deprecated out from
   under existing API keys without notice.

## Architecture

### Feature module shape

Each domain lives under `src/features/<name>/` with the same internal shape: `api.ts` (Firestore
reads/writes), `hooks.ts` (wraps `api.ts` calls in `useFirestoreQuery`), a `*ListPage.tsx`, and a
`*Form.tsx` — this applies to `employees`, `articles`, and `orders` (which has no `active` toggle,
see below). `orderStatuses` and `pickupLocations` are a second, simpler shape: no `Form.tsx`, just
a single `*SettingsPage.tsx` with a plain `<ul>` (not `DataTable`) and inline click-to-edit renaming
directly in the list — see `OrderStatusSettingsPage.tsx`/`PickupLocationSettingsPage.tsx`.

These two shapes only cover the master-data CRUD features. The rest are one-off: `dashboard`
(overview), `reports` (three read-only aggregate views over `orders`), `help` (static page),
`orderListSettings`/`bestellFormularSettings`/`notificationSettings` (single-document settings,
same pattern as described below), `bestellFormular` (Excel order-file generation),
`lieferscheinCheck` (Gemini-based delivery-note matching), `orderHistory` (audit log), and
`backup` (full-database export/import) — each shaped around what it actually does.

Cross-cutting reusable pieces live in `src/shared/`:
- `shared/components` — table, search, pagination, filters, badges used by every list page
- `shared/hooks/useFirestoreQuery` — subscribes to a `Query` via `onSnapshot`; on query error
  (e.g. missing composite index) it sets `data: []` **silently** — an empty list can mean "no
  results" or "the query failed," so a blank list page after adding/changing a `where`+`orderBy`
  combination is a strong signal to check the browser console for a Firestore index error
  before assuming a logic bug
- `shared/import` — the generic Excel import wizard (Upload → Mapping → Preview → Commit),
  parametrized per entity via `ImportEntityConfig<T, P>` (`shared/import/types.ts`)

`notificationSettings` (`src/features/notificationSettings/`) is not a list feature — it's a single
fixed document (`doc(db, 'notificationSettings', 'default')`) holding the greeting/line text
templates used to notify an employee their order is pickup-ready. Placeholders (`{{NAME}}`,
`{{VORNAME}}`, `{{NACHNAME}}`, `{{POSITIONEN}}`, `{{MENGE}}`, `{{ARTIKEL}}`, `{{GROESSE}}`,
`{{ABHOLORT}}`) are filled by `shared/utils/notificationTemplate.ts`; `{{VORNAME}}`/`{{NACHNAME}}`
are derived by splitting the denormalized `Order.employeeName` on its `", "` separator rather than
looking up the `Employee` record, since `employeeName` is always written as `${lastName}, ${firstName}`.

### Firestore querying convention — and its main gotcha

Every list-with-active-toggle feature (articles, employees, orderStatuses) builds its query as:
```ts
includeInactive
  ? query(converted, orderBy(sortField))
  : query(converted, where('active', '==', true), orderBy(sortField))
```
The `where(active) + orderBy(otherField)` branch requires a Firestore composite index (not the
automatic single-field kind). Composite indexes must be added to `firestore.indexes.json` and
deployed — they are not created implicitly. When adding a new `active`-filtered query, or a new
`where`+`orderBy` combination on any collection, add the matching entry to
`firestore.indexes.json` and deploy it, or the "active only" branch will fail with
`FAILED_PRECONDITION` and silently render an empty list (see `useFirestoreQuery` note above).

`orders` has no `active` field; `ordersQuery` (`src/features/orders/api.ts`) instead composes
optional `where` clauses (employeeId, articleId, status, date range) plus a fixed
`orderBy('orderDate', 'desc')` and a `FETCH_LIMIT` of 2000 — at this app's confirmed data volume,
fetching everything matching server-side filters and doing text search + pagination client-side
was chosen over cursor pagination, while still keeping live `onSnapshot` updates.

### Firestore access model

`src/firebase/config.ts` initializes the app/db from `VITE_FIREBASE_*` env vars.
`src/firebase/converters.ts` has one generic `createConverter<T>()` used by every collection: it
strips `id` on write (Firestore stores it as the doc ID) and hydrates `createdAt`/`updatedAt`
Timestamps into `Date` on read. Every collection this app owns must be individually allow-listed
in `firestore.rules` (currently 11 collections/singletons); all other paths are denied by the
top-level catch-all. `src/features/backup/api.ts` doubles as the authoritative list — it
enumerates every collection/singleton for export/restore, so a newly added collection needs an
entry there too, or it's silently excluded from backups.
These rules are **not real access control** (no auth exists) — they only limit blast radius if the
Firebase config ever leaks, since this app has no Hosting deploy. If Hosting or public exposure of
the config is ever introduced, revisit `firestore.rules` (add real auth) before relying on it.

### Orders denormalize employee/article data

`Order` (`src/types/order.ts`) stores `employeeName`, `articleName`, and `articleNumber` directly
on the order document, snapshotted at order-creation time, rather than joining against
`employees`/`articles` at read time. This is intentional: it preserves historical accuracy if an
employee or article is later renamed or deactivated, and it's what makes the reports
(`src/features/reports/reportQueries.ts`) able to aggregate from `orders` alone. Don't
"normalize" this by replacing the denormalized fields with live lookups.

### Two edit paths: full form vs. inline table cell

Every `*ListPage.tsx` table still has a "Bearbeiten" link to the full `*Form.tsx` route — that
remains the only way to change fields that touch more than one denormalized value at once (e.g.
Employee/Article on an Order, which also rewrites `employeeName`/`articleName`/etc.). Simple
scalar fields (text, number, date) are additionally editable inline, directly in the table cell,
via `shared/components/EditableCell.tsx` (click reveals an input; Enter/blur commits; Escape
cancels). Each editable column commits through a small, typed per-field patch function added to
the feature's `api.ts` (e.g. `updateEmployeeField`, `updateArticleDeductibleAmount`,
`updateOrderQuantity`) rather than the full-object `update*` function — this follows the
already-established `setXActive`/`renameX`/`updateOrderStatus` precedent. FK/select fields (e.g.
Article's `pickupLocationId`) reuse the same idiom as an inline `<select>` instead of `EditableCell`.

### Order history (audit log)

`src/features/orderHistory/` logs every order create/edit/status-change as an immutable entry
(`OrderHistoryEntry`) in its own `orderHistory` collection — shown at `/orders/history`. Each
order-mutating function in `orders/api.ts` fetches its own "before" snapshot internally (via
`getOrder`/`getDocs`) rather than requiring callers to pass prior state, so adding a new mutation
path doesn't require touching call sites. A change is tagged `'status_changed'` only when the
status is the *sole* changed field; otherwise it's `'updated'` with a per-field diff. Deletes and
the denormalized-field resync helpers (`updateOrderEmployeeNames` etc.) are intentionally not
logged — this log covers order content, not housekeeping.

### Optional per-article inventory tracking

`Article.trackInventory`/`inventoryQuantity` follow the same toggle+value convention as
`hasDeductible`/`deductibleAmount` (zeroed in `createArticle`/`updateArticle` when the toggle is
off). The stock count only ever moves through `adjustArticleInventory` in `articles/api.ts` — a
relative-delta helper built on Firestore's atomic `increment()` — called from every order-mutating
function in `orders/api.ts` (`createOrder`, `updateOrder`, `updateOrderQuantity`, `deleteOrder`,
`deleteOrders`) that touches `articleId`/`quantity`. Two things to know before touching this:
- The Excel bulk order import (`shared/import`, `orderImportConfig.ts`) writes order docs directly
  and bypasses `orders/api.ts` entirely, so imported orders **do not** adjust inventory — a
  deliberate scope decision (see the comment in `orderImportConfig.ts`), not an oversight to fix.
- Stock is allowed to go negative (an over-order deficit is valid data), but `OrderForm` and
  `OrderListPage`'s inline quantity `EditableCell` both show a `ConfirmDialog` before committing a
  change that would push it below zero — bridged via a resolver held in local state, since
  `ConfirmDialog` is callback-based, not promise-based.

### Import wizard

`shared/import/ImportWizard.tsx` drives a 4-step flow (`upload` → `mapping` → `preview` →
`commit`) that is entirely generic; per-entity behavior is injected via `ImportEntityConfig<T, P>`:
- `uniqueKeyFields` + `fetchExistingKeys` define duplicate detection (composite key match,
  AND-combined across fields — see `articleImportConfig.ts` for the canonical example)
- `prefetch`/`resolveRow` let an entity resolve foreign keys during import (e.g. orders resolving
  an employee's personnel number to an `employeeId`) using data fetched once per import run, not
  per row
- `mapRowToDoc` maps a validated row to the Firestore document shape

### Known accepted risk

The `xlsx` (SheetJS) dependency has two unpatched advisories (prototype pollution, ReDoS) with no
npm fix available. Accepted because Excel files are only ever uploaded by the trusted single
operator of this tool — but re-evaluate if that trust boundary ever changes.

### Two Excel libraries, different jobs

`xlsx` (SheetJS) reads/imports arbitrary user-supplied `.xlsx` files (`shared/import`). `exceljs`
writes into the fixed Bestellformular template (`features/bestellFormular/generate.ts`),
preserving the template's existing cell formatting/merges while only touching specific mapped
cells — not interchangeable with `xlsx` for that job.
