export interface LieferscheinCheckRecord {
  id: string
  lieferscheinNumber: string
  lieferscheinDate: string
  orderIds: string[]
  unmatchedArticleNumbers: string[]
  createdAt: Date
}

export type LieferscheinCheckInput = Pick<
  LieferscheinCheckRecord,
  'lieferscheinNumber' | 'lieferscheinDate' | 'orderIds' | 'unmatchedArticleNumbers'
>

export interface ParsedDeliveryLine {
  pos: number
  articleNumber: string
  description: string
  quantity: number
}
