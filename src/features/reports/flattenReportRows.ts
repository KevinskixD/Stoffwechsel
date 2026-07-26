/**
 * Shared seam between report computation and rendering: both the in-app table and a future
 * CSV exporter consume this same flat array of plain objects, so adding CSV export later
 * needs no changes to how report rows are computed or displayed.
 */
export function flattenReportRows<T extends object>(rows: T[]): T[] {
  return rows
}
