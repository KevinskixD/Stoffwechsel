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
   `orderStatuses` collection is empty (`src/firebase/seed.ts`).

## Architecture

### Feature module shape

Each domain lives under `src/features/<name>/` with the same internal shape: `api.ts` (Firestore
reads/writes), `hooks.ts` (wraps `api.ts` calls in `useFirestoreQuery`), a `*ListPage.tsx`, and a
`*Form.tsx`. `src/features/orders` is the exception — it has no `active` toggle (see below).

Cross-cutting reusable pieces live in `src/shared/`:
- `shared/components` — table, search, pagination, filters, badges used by every list page
- `shared/hooks/useFirestoreQuery` — subscribes to a `Query` via `onSnapshot`; on query error
  (e.g. missing composite index) it sets `data: []` **silently** — an empty list can mean "no
  results" or "the query failed," so a blank list page after adding/changing a `where`+`orderBy`
  combination is a strong signal to check the browser console for a Firestore index error
  before assuming a logic bug
- `shared/import` — the generic Excel import wizard (Upload → Mapping → Preview → Commit),
  parametrized per entity via `ImportEntityConfig<T, P>` (`shared/import/types.ts`)

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
Timestamps into `Date` on read. There are exactly four collections, hardcoded in
`firestore.rules`: `employees`, `articles`, `orderStatuses`, `orders`. All other paths are denied.
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
