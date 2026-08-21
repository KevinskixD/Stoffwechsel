export interface StarterKitCategory {
  id: string
  label: string
  /** Manually curated Article refs (e.g. all size variants of one clothing item), in add order. */
  articleIds: string[]
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}
