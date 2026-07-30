import type { Order } from '../../types/order'
import type { ParsedDeliveryLine } from '../../types/lieferscheinCheck'

export interface LineMatchResult {
  line: ParsedDeliveryLine
  matchedOrders: Order[]
  leftoverQuantity: number
}

function sortFifo(orders: Order[]): Order[] {
  return [...orders].sort(
    (a, b) => a.orderDate.localeCompare(b.orderDate) || a.createdAt.getTime() - b.createdAt.getTime(),
  )
}

/**
 * Allocates each delivery line's quantity to the oldest waiting orders for that article number
 * (FIFO), consuming a pending order only when its full quantity fits within what's left of the
 * delivered amount — this data model has no notion of partially fulfilling a single order, so an
 * order that needs more than remains unallocated is left untouched for a future delivery.
 */
export function matchDeliveryLines(lines: ParsedDeliveryLine[], pendingOrders: Order[]): LineMatchResult[] {
  const queuesByArticle = new Map<string, Order[]>()
  for (const order of pendingOrders) {
    if (!order.articleNumber) continue
    const queue = queuesByArticle.get(order.articleNumber)
    if (queue) queue.push(order)
    else queuesByArticle.set(order.articleNumber, [order])
  }
  for (const [articleNumber, queue] of queuesByArticle) {
    queuesByArticle.set(articleNumber, sortFifo(queue))
  }

  return lines.map((line) => {
    const queue = queuesByArticle.get(line.articleNumber) ?? []
    let remaining = line.quantity
    const matchedOrders: Order[] = []
    while (queue.length > 0 && queue[0].quantity <= remaining) {
      const next = queue.shift()!
      matchedOrders.push(next)
      remaining -= next.quantity
    }
    return { line, matchedOrders, leftoverQuantity: remaining }
  })
}
