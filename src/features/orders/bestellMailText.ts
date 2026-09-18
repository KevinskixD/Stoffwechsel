import { splitEmployeeName } from '../../shared/utils/notificationTemplate'
import { articleDisplayLabel } from '../../types/article'
import type { Order } from '../../types/order'

function displayEmployeeName(employeeName: string): string {
  const { firstName, lastName } = splitEmployeeName(employeeName)
  return [firstName, lastName].filter(Boolean).join(' ') || employeeName
}

export function renderBestellMailText(orders: Order[], date = new Date()): string {
  const month = new Intl.DateTimeFormat('de-AT', { month: 'long' }).format(date)
  const exchangeNotes = orders
    .filter((order) => order.exchangedFromOrderId)
    .map(
      (order) =>
        `Für ${displayEmployeeName(order.employeeName)} ist ein Umtauschartikel auf der Bestellliste enthalten: ` +
        `${articleDisplayLabel(order)}${order.articleSize ? `, Größe ${order.articleSize}` : ''}. ` +
        `Ursprünglich bestellt wurde: ${order.exchangedFromArticleName}. ` +
        'Ich deponiere den Umtauschartikel bei den Hauptis und bitte diese, den Umtauschartikel auf die Bezirksstelle mitzunehmen.',
    )

  return [
    'Hallo liebe KollegInnen,',
    '',
    `anbei sende ich euch die Bestellliste für den Monat ${month}.`,
    ...(exchangeNotes.length ? ['', ...exchangeNotes] : []),
    '',
    'Vielen Dank im Voraus für euer Bemühen!',
    '',
    'Liebe Grüße',
    'Kevin',
  ].join('\n')
}
