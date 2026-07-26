import { NavLink } from 'react-router-dom'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3.5 py-2 text-[13.5px] font-semibold ${
    isActive ? 'bg-brand text-white' : 'text-gray-600 hover:bg-black/[0.04]'
  }`

export function ReportTabs() {
  return (
    <div className="mb-5 flex gap-1">
      <NavLink to="/reports/by-article" className={tabClass}>
        Nach Artikel
      </NavLink>
      <NavLink to="/reports/by-employee" className={tabClass}>
        Nach Mitarbeiter
      </NavLink>
      <NavLink to="/reports/by-date" className={tabClass}>
        Nach Zeitraum
      </NavLink>
    </div>
  )
}
