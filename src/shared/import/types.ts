export interface ImportFieldConfig {
  targetField: string
  label: string
  required: boolean
  type: 'string' | 'number' | 'date'
}

export interface ImportRowState {
  rowIndex: number
  raw: Record<string, unknown>
  data: Record<string, unknown>
  errors: string[]
}

/**
 * Parameterizes the reusable import wizard for one entity (employees/articles/orders).
 * `P` is the shape of data `prefetch` loads once per import run (e.g. lookup maps for
 * foreign-key resolution) and passes into `resolveRow` for every row.
 */
export interface ImportEntityConfig<T, P = undefined> {
  entityLabel: string
  collectionName: string
  /** Route to return to once the import is done. */
  listPath: string
  fields: ImportFieldConfig[]
  /**
   * Fields that together (AND-combined) determine a duplicate — in-file and against Firestore.
   * E.g. ['articleName', 'articleNumber']: same number alone isn't a duplicate, only matching
   * both. Omit if not applicable (e.g. orders).
   */
  uniqueKeyFields?: string[]
  fetchExistingKeys?: () => Promise<Set<string>>
  /** Runs once per import run, before any row is validated. */
  prefetch?: () => Promise<P>
  /** Synchronous, per-row resolution (e.g. personnelNumber -> employeeId) using prefetched data. */
  resolveRow?: (data: Record<string, unknown>, prefetched: P) => { data: Record<string, unknown>; errors: string[] }
  /**
   * Runs once, right before the valid rows are committed. May mutate each row's `data` in
   * place — e.g. to create missing related records and swap in their real Firestore IDs.
   */
  beforeCommit?: (rows: ImportRowState[]) => Promise<void>
  mapRowToDoc: (data: Record<string, unknown>) => Partial<T>
}
