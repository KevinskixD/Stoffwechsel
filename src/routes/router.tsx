import { Route, Routes } from 'react-router-dom'
import { articleImportConfig } from '../features/articles/articleImportConfig'
import { ArticleForm } from '../features/articles/ArticleForm'
import { ArticleListPage } from '../features/articles/ArticleListPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { employeeImportConfig } from '../features/employees/employeeImportConfig'
import { EmployeeForm } from '../features/employees/EmployeeForm'
import { EmployeeListPage } from '../features/employees/EmployeeListPage'
import { HelpPage } from '../features/help/HelpPage'
import { NotificationSettingsPage } from '../features/notificationSettings/NotificationSettingsPage'
import { OrderStatusSettingsPage } from '../features/orderStatuses/OrderStatusSettingsPage'
import { orderImportConfig } from '../features/orders/orderImportConfig'
import { OrderForm } from '../features/orders/OrderForm'
import { OrderListPage } from '../features/orders/OrderListPage'
import { PickupReadyPage } from '../features/orders/PickupReadyPage'
import { PickupLocationSettingsPage } from '../features/pickupLocations/PickupLocationSettingsPage'
import { ByArticleReportPage } from '../features/reports/ByArticleReportPage'
import { ByDateRangeReportPage } from '../features/reports/ByDateRangeReportPage'
import { ByEmployeeReportPage } from '../features/reports/ByEmployeeReportPage'
import { ImportWizard } from '../shared/import/ImportWizard'

function Placeholder({ label }: { label: string }) {
  return <div className="p-6 text-gray-500">{label} (folgt)</div>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/help" element={<HelpPage />} />

      <Route path="/orders" element={<OrderListPage />} />
      <Route path="/orders/pickup-ready" element={<PickupReadyPage />} />
      <Route path="/orders/new" element={<OrderForm />} />
      <Route path="/orders/:id/edit" element={<OrderForm />} />
      <Route path="/orders/import" element={<ImportWizard config={orderImportConfig} />} />

      <Route path="/employees" element={<EmployeeListPage />} />
      <Route path="/employees/new" element={<EmployeeForm />} />
      <Route path="/employees/:id/edit" element={<EmployeeForm />} />
      <Route path="/employees/import" element={<ImportWizard config={employeeImportConfig} />} />

      <Route path="/articles" element={<ArticleListPage />} />
      <Route path="/articles/new" element={<ArticleForm />} />
      <Route path="/articles/:id/edit" element={<ArticleForm />} />
      <Route path="/articles/import" element={<ImportWizard config={articleImportConfig} />} />

      <Route path="/reports/by-article" element={<ByArticleReportPage />} />
      <Route path="/reports/by-employee" element={<ByEmployeeReportPage />} />
      <Route path="/reports/by-date" element={<ByDateRangeReportPage />} />

      <Route path="/settings/order-statuses" element={<OrderStatusSettingsPage />} />
      <Route path="/settings/pickup-locations" element={<PickupLocationSettingsPage />} />
      <Route path="/settings/notifications" element={<NotificationSettingsPage />} />

      <Route path="*" element={<Placeholder label="Seite nicht gefunden" />} />
    </Routes>
  )
}
