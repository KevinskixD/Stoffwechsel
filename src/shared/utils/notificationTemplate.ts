export interface NotificationLineData {
  quantity: number
  articleName: string
  articleSize: string
  pickupLocationName: string
}

function fillPlaceholders(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => values[key] ?? '')
}

/** employeeName is always denormalized as "Lastname, Firstname" (see employeeDisplayName). */
export function splitEmployeeName(employeeName: string): { firstName: string; lastName: string } {
  const separatorIndex = employeeName.indexOf(', ')
  if (separatorIndex === -1) return { firstName: '', lastName: employeeName }
  return {
    lastName: employeeName.slice(0, separatorIndex),
    firstName: employeeName.slice(separatorIndex + 2),
  }
}

export function renderNotificationLine(lineTemplate: string, line: NotificationLineData): string {
  return fillPlaceholders(lineTemplate, {
    MENGE: String(line.quantity),
    ARTIKEL: line.articleName,
    GROESSE: line.articleSize,
    ABHOLORT: line.pickupLocationName || '—',
  })
}

export function renderNotificationText(
  greetingTemplate: string,
  lineTemplate: string,
  employeeName: string,
  lines: NotificationLineData[],
): string {
  const positionen = lines.map((line) => renderNotificationLine(lineTemplate, line)).join('\n')
  const { firstName, lastName } = splitEmployeeName(employeeName)
  return fillPlaceholders(greetingTemplate, {
    NAME: employeeName,
    VORNAME: firstName,
    NACHNAME: lastName,
    POSITIONEN: positionen,
  })
}
