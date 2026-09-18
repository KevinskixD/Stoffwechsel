export interface Article {
  id: string
  articleName: string
  articleNumber: string
  hasDeductible: boolean
  /** EUR amount, only meaningful when hasDeductible is true; 0 otherwise. */
  deductibleAmount: number
  trackInventory: boolean
  /** Current stock count, only meaningful when trackInventory is true; 0 otherwise. Can go negative (over-ordered). */
  inventoryQuantity: number
  /** Loan items are issued through an order and can later be returned on that same order. */
  isLoanArticle: boolean
  active: boolean
  /** Free text, e.g. "M", "42"; '' if unknown. Best-effort extracted from articleName. */
  size: string
  /** '' if no pickup location assigned. */
  pickupLocationId: string
  /** Denormalized alongside pickupLocationId, same convention as Order's status/statusId. */
  pickupLocationName: string
  createdAt: Date
  updatedAt: Date
}

export type ArticleInput = Pick<
  Article,
  | 'articleName'
  | 'articleNumber'
  | 'hasDeductible'
  | 'deductibleAmount'
  | 'trackInventory'
  | 'inventoryQuantity'
  | 'isLoanArticle'
  | 'size'
  | 'pickupLocationId'
  | 'pickupLocationName'
>

export function articleDisplayLabel(article: { articleName: string; articleNumber: string }): string {
  return article.articleNumber ? `${article.articleName} (${article.articleNumber})` : article.articleName
}
