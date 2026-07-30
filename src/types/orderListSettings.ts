export const ORDER_LIST_SETTINGS_DOC_ID = 'default'

export interface OrderListSettings {
  id: string
  showExcelImport: boolean
  showEmployeeNameSync: boolean
  showPickupLocationSync: boolean
  showArticleDataSync: boolean
  showGenerateBestellFile: boolean
  updatedAt: Date
}
