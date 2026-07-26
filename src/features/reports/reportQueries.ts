import type { Order } from '../../types/order'

export interface ArticleReportRow {
  articleId: string
  articleName: string
  articleNumber: string
  totalQuantity: number
  orderCount: number
}

export function computeByArticleReport(orders: Order[]): ArticleReportRow[] {
  const map = new Map<string, ArticleReportRow>()
  for (const order of orders) {
    const existing = map.get(order.articleId)
    if (existing) {
      existing.totalQuantity += order.quantity
      existing.orderCount += 1
    } else {
      map.set(order.articleId, {
        articleId: order.articleId,
        articleName: order.articleName,
        articleNumber: order.articleNumber,
        totalQuantity: order.quantity,
        orderCount: 1,
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalQuantity - a.totalQuantity)
}

export interface EmployeeReportRow {
  employeeId: string
  employeeName: string
  totalQuantity: number
  orderCount: number
  orders: Order[]
}

export function computeByEmployeeReport(orders: Order[]): EmployeeReportRow[] {
  const map = new Map<string, EmployeeReportRow>()
  for (const order of orders) {
    const existing = map.get(order.employeeId)
    if (existing) {
      existing.totalQuantity += order.quantity
      existing.orderCount += 1
      existing.orders.push(order)
    } else {
      map.set(order.employeeId, {
        employeeId: order.employeeId,
        employeeName: order.employeeName,
        totalQuantity: order.quantity,
        orderCount: 1,
        orders: [order],
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName))
}

export interface DateReportRow {
  date: string
  totalQuantity: number
  orderCount: number
}

export function computeByDateReport(orders: Order[]): DateReportRow[] {
  const map = new Map<string, DateReportRow>()
  for (const order of orders) {
    const existing = map.get(order.orderDate)
    if (existing) {
      existing.totalQuantity += order.quantity
      existing.orderCount += 1
    } else {
      map.set(order.orderDate, { date: order.orderDate, totalQuantity: order.quantity, orderCount: 1 })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}
