# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Uniformverwaltung: web tool for uniform ordering/inventory management, replacing an Excel-based
workflow for a single clothing officer (Bekleidungsreferent). React (Vite) + TypeScript, Firestore
as the only datastore, `xlsx` for client-side Excel import. Access is gated by Firebase
Authentication (Google Sign-In) restricted to a single authorized account; no multi-user support.

## Commands

- `npm run dev` — start dev server
- `npm run build` — typecheck (`tsc -b`) then production build; the two are separate steps, a
  build can fail on typecheck even if Vite itself would succeed
- `npm run lint` — oxlint (see `.oxlintrc.json`; `react/rules-of-hooks` is an error, not just a warning)
- `npm run preview` — preview a production build

No test runner is configured in this repo.

### Firestore setup (required before `npm run dev` works)

1. Copy `.env.local.example` to `.env.local` and fill in Firebase web app config values.
2. Enable the Google provider under Authentication → Sign-in method in the Firebase Console —
   without it, `signInWithPopup` fails and the app is stuck on the login screen regardless of
   correct `.env.local` values.
3. Deploy rules/indexes after any change to `firestore.rules` or `firestore.indexes.json`:
   ```
   firebase deploy --only firestore:rules --project <project-id>
   firebase deploy --only firestore:indexes --project <project-id>
   ```
4. The seven default order statuses ("Zu Bestellen", "Bestellt", "Geliefert", "Informiert",
   "Abgeholt", "Umtausch", "Abgeschlossen") are seeded automatically on first run if the
   `orderStatuses` collection is empty (`src/firebase/seed.ts`) — race-safe via a transaction
   against an `appMeta/seed` marker doc, so two overlapping first-runs (two tabs, a dev
   reload racing an in-flight write) can't double-seed. `appMeta` is internal bookkeeping and
   is deliberately excluded from backups.

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
`orderHistory` (audit log), and
`backup` (full-database export/import) — each shaped around what it actually does.

`starterKit` (`src/features/starterKit/`) is a third variant: a settings-list page
(`StarterKitSettingsPage.tsx`, mirrors `orderStatuses`/`pickupLocations`'s drag-reorder +
inline-rename shape) but with **no** `active` toggle (nothing references a category by id, so
hard-delete is safe) and each row manually curates a `articleIds: string[]` — since every clothing
size is its own separate `Article` doc in this app (no size-grouping field exists), an admin picks
which specific Articles belong to a category (e.g. all size variants of one item) via
`arrayUnion`/`arrayRemove`, and display order is just insertion order. Paired with a one-off
bulk-order page (`StarterKitOrderForm.tsx`) that pre-selects an employee's starter kit and lets the
operator pick one Article (= one size) per category, then calls `createOrder` from
`orders/api.ts` once per selected category — no new order-mutation/inventory/history logic, purely
a batch UI over the existing single-order pipeline.

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

`src/firebase/config.ts` initializes the app/db from `VITE_FIREBASE_*` env vars, plus `auth`
(`getAuth`), a `googleProvider` (`GoogleAuthProvider`), and `ALLOWED_EMAIL` — the single Google
account permitted to sign in. `src/firebase/converters.ts` has one generic `createConverter<T>()`
used by every collection: it strips `id` on write (Firestore stores it as the doc ID) and hydrates
`createdAt`/`updatedAt` Timestamps into `Date` on read. Every collection this app owns must be
individually allow-listed in `firestore.rules` (currently 12 collections/singletons); all other
paths are denied by the top-level catch-all. `src/features/backup/api.ts` doubles as the
authoritative list — it enumerates every collection/singleton for export/restore, so a newly added
collection needs an entry there too, or it's silently excluded from backups.
`firestore.rules` is real access control: every collection's `allow read, write` calls a shared
`isAuthorized()` function that checks `request.auth.token.email` against a literal email address.
**That literal must match `ALLOWED_EMAIL` in `src/firebase/config.ts` exactly** — the two are not
derived from a single source (Firestore rules can't read app env vars), so changing one without the
other silently breaks either the sign-in UX (client accepts, server rejects every read/write) or
the access boundary (client blocks an account the rules would actually still deny — less risky, but
still a drift bug worth avoiding).

### Authentication gate

`src/shared/hooks/useAuth.ts` wraps `onAuthStateChanged` and exposes `user`/`loading`/`error` plus
`signIn`/`signOutUser`; called directly wherever needed (in `App.tsx` and in `Sidebar.tsx`) rather
than through a context, mirroring the existing `useTheme()` pattern. If a signed-in Google account's
email doesn't match `ALLOWED_EMAIL`, the hook immediately calls `signOut` and surfaces an inline
error — this is a UX convenience only, not the real security boundary (see "Firestore access model"
above). `App.tsx`'s gate order matters: auth must resolve (and the user must be signed in) *before*
`ensureSeedData()` fires, since seeding writes to Firestore and would fail under `firestore.rules`
if unauthenticated — the `useEffect` that triggers seeding depends on `[user]`, not `[]`.

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

`src/features/orderHistory/` logs every order create/edit/status-change as an application-level
append-only entry
(`OrderHistoryEntry`) in its own `orderHistory` collection — shown at `/orders/history`. Each
order-mutating function in `orders/api.ts` fetches its own "before" snapshot internally (via
`getOrder`/`getDocs`) rather than requiring callers to pass prior state, so adding a new mutation
path doesn't require touching call sites. A change is tagged `'status_changed'` only when the
status is the *sole* changed field; otherwise it's `'updated'` with a per-field diff. Deletes and
the denormalized-field resync helpers (`updateOrderEmployeeNames` etc.) are intentionally not
logged — this log covers order content, not housekeeping. `exchangeOrder` is the one exception to
the field-count tagging rule: it always logs `'exchanged'` (never `'status_changed'`/`'updated'`),
once on each of the two linked orders — see "Order-to-order exchange" below.
The current Firestore rules still allow the authorized single account to modify or delete history
documents, so this is not a revisionssicheres, unveränderliches Audit-Protokoll.

### Optional per-article inventory tracking

`Article.trackInventory`/`inventoryQuantity` follow the same toggle+value convention as
`hasDeductible`/`deductibleAmount` (zeroed in `createArticle`/`updateArticle` when the toggle is
off). The stock count only ever moves through `adjustArticleInventory` in `articles/api.ts` — a
relative-delta helper built on Firestore's atomic `increment()` — called from every order-mutating
function in `orders/api.ts` (`createOrder`, `updateOrder`, `updateOrderQuantity`, `deleteOrder`,
`deleteOrders`, `exchangeOrder`) that touches `articleId`/`quantity`. Two things to know before
touching this:
- The Excel bulk order import (`shared/import`, `orderImportConfig.ts`) writes order docs directly
  and bypasses `orders/api.ts` entirely, so imported orders **do not** adjust inventory — a
  deliberate scope decision (see the comment in `orderImportConfig.ts`), not an oversight to fix.
- Stock is allowed to go negative (an over-order deficit is valid data), but `OrderForm` and
  `OrderListPage`'s inline quantity `EditableCell` both show a `ConfirmDialog` before committing a
  change that would push it below zero — bridged via a resolver held in local state, since
  `ConfirmDialog` is callback-based, not promise-based.

### Order-to-order exchange (Umtausch)

`exchangeOrder` (`src/features/orders/api.ts`) implements the "Umtausch" flow: a row action on
`OrderListPage` (visible only when `status === 'Abgeholt'` and the order hasn't been exchanged
already) opens `ExchangeOrderDialog.tsx`, which picks a replacement article and a status for the
new order. `exchangeOrder` then creates that new order and marks the old one's status as
`'Umtausch'`, linking the two both ways via `exchangedFromOrderId`/`exchangedToOrderId` (plus
denormalized `exchangedFromArticleName`/`exchangedToArticleName` snapshots — fields on `Order` in
`src/types/order.ts`). This is the **only order-to-order FK in the schema** — every other order
relationship points at master data (`employeeId`/`articleId`/`statusId`), never at another order.
Inventory moves in both directions in the same call: the old article is restocked, the new one is
consumed. Because a full-form edit via `OrderForm` overwrites the entire `OrderInput`, the four
exchange fields are loaded into and resubmitted from `FormState` unchanged (no UI exposes them) —
editing an exchanged order must not silently drop the link.

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

### Bestellformular template's hidden second sheet (Matrix)

The Bestellformular template has a second sheet (`settings.matrixSheetName`, auto-detected by
`detectMatrixSheet()` in `templateMapping.ts`, default name "Matrix") holding an Artikel-Nr./
Bezeichnung lookup table — the "Bezeichnung" column of the Artikel-Nr. order table on the main
sheet is **never written by the app** (see the `bezeichnungColumn: ''` comment on
`TableMapping`); it's populated by a `VLOOKUP` formula baked into the template itself, reading
from this second sheet. An article whose number isn't present there resolves to `#N/A` in every
generated Bestelldatei — this was originally only discoverable by unzipping the `.xlsx` (OOXML is
a zip) and reading `xl/worksheets/sheet2.xml` directly.

`src/features/bestellFormular/matrixSync.ts` addresses this two ways: `syncArticleToMatrix()` is
called from `createArticle`/`updateArticle` in `articles/api.ts` (cross-feature call, same
direction-reversed precedent as `orders/api.ts` → `adjustArticleInventory`) and best-effort writes
new/changed articles into the Matrix sheet, re-saving the template's `templateBase64` field —
never throws, so a sync failure can't block saving an article. `checkMatrixCoverage()` is called
from `OrderListPage`'s generate-Bestelldatei confirmation step to warn (not block) about orders
whose article number still isn't in the Matrix sheet, **or** is present with a stale Bezeichnung
(e.g. bulk-imported articles, which bypass `createArticle` entirely — see "Optional per-article
inventory tracking" above for the identical bypass pattern on the order-import side; or an inline
rename via `ArticleListPage`'s `EditableCell`, which goes through `updateArticleField` and — by
deliberate scope decision, to avoid an extra Firestore read in that hot path — never calls
`syncArticleToMatrix`, so this pre-generation check is the only thing that catches it).
**Deliberately never rewrites the VLOOKUP formulas** to extend their range — instead both
functions bound their scan/write to `worksheet.rowCount` after loading, which reflects the
template's actual current sheet dimension (confirmed against the real template:
`dimension ref="A1:B236"` matches the formulas' hardcoded `Matrix!$A$2:$B$236` range exactly). If
there's no empty row left within that range, `syncArticleToMatrix` returns `'matrix_full'` instead
of writing past it — surfaced as a toast telling the user to extend the range in the template
manually, rather than risk corrupting the array formulas programmatically.

`ArticleListPage`'s "Mit Bestellformular abgleichen" button calls `syncAllArticlesToMatrix()`
(`articles/api.ts`) → `syncArticlesToMatrix()` (`matrixSync.ts`) to backfill every article at
once — for articles that predate this feature, were bulk-imported, or were inline-renamed (none of
which go through `createArticle`/`updateArticle`). This bulk path shares the same
`applyArticleToMatrix()` in-memory logic as the single-article sync but loads/saves the template
**once** for the whole batch rather than once per article, to avoid repeatedly re-uploading the
full base64 template to Firestore.

### Theming (light/dark mode)

Tailwind v4's CSS-based config (`src/index.css`, no `tailwind.config.js`) exposes the whole
default palette as overridable CSS variables, and opacity-modified utilities (`text-black/45`,
`border-black/[0.08]`) compile to `color-mix(in oklab, var(--color-black) ..%, transparent)` —
i.e. they reference the variable, not a baked-in value. Dark mode is implemented by overriding
`--color-black`/`--color-gray-*`/`--color-red-*`/`--color-amber-*`/the badge-color vars inside a
`.dark { }` block in `src/index.css` (activated via `@custom-variant dark (&:where(.dark, .dark
*))` and a class toggled on `<html>`) — this re-colors essentially every existing utility class
across the whole app with **no per-component edits**, rather than retrofitting `dark:` variants
file-by-file.

**The one collision to know about:** `--color-white` is used both for card/panel backgrounds
(`bg-white`) and for text/dividers on the red `bg-brand` buttons (`text-white`, `border-white/20`)
that must stay white in *both* themes — so `--color-white` itself is never overridden. Instead
there's a separate `--color-surface` token for panel backgrounds. **Any new white card/panel
background must use `bg-surface`, not `bg-white`** — `bg-white` will not adapt to dark mode.
`bg-black/45` modal scrims are the mirror-image exception (kept as literal
`bg-[rgba(0,0,0,0.45)]`, deliberately not inverting).

Preference (`'light' | 'dark' | 'system'`) lives in `src/shared/hooks/useTheme.ts`, persisted to
`localStorage` under `uniformverwaltung.theme`, toggled via a click-to-cycle button at the bottom
of `Sidebar.tsx`. A blocking inline `<script>` in `index.html`'s `<head>` reads the same key before
React mounts to avoid a flash of the wrong theme.

`shared/utils/statusColors.ts`'s custom-hex order-status badges (`status.color` set via the
color-picker) are a deliberate exception: they're literal hex values from Firestore, bypass the
token system entirely, and are intentionally left as fixed "light chips" in both themes — don't
try to make these theme-aware.

### Success/error messages: toast vs. inline

`shared/components/ToastProvider.tsx` (`ToastProvider`/`useToast`, mounted in `App.tsx`) shows
auto-dismissing success/error/info toasts, reusing the badge-color tokens and `bg-surface` so they
adapt to dark mode automatically. Used by: the "Gespeichert." messages on settings pages, the
article size backfill, and `OrderListPage`'s bulk-action messages.
**Deliberately not** migrated to toast: form validation errors, the backup page's structured
summaries, and other context-bound inline messages — these need to stay visible rather than
auto-dismiss. When adding a new success/error message: transient, non-actionable messages → toast;
messages the user needs in order to act (e.g. which field a validation error refers to) → inline.
