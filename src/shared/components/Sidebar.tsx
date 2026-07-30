import type { ComponentType } from 'react'
import { Link, useLocation } from 'react-router-dom'
import logo from '../../assets/oerk-logo.png'
import {
  ArticleIcon,
  DashboardIcon,
  DeliveryIcon,
  GearIcon,
  HelpIcon,
  HistoryIcon,
  OrdersIcon,
  PersonIcon,
  ReportsIcon,
} from './icons'

interface NavItemDef {
  to: string
  label: string
  Icon: ComponentType
  match: (path: string) => boolean
}

const NAV_ITEMS: NavItemDef[] = [
  { to: '/', label: 'Übersicht', Icon: DashboardIcon, match: (path) => path === '/' },
  {
    to: '/orders',
    label: 'Bestellungen',
    Icon: OrdersIcon,
    match: (path) =>
      path.startsWith('/orders') &&
      !path.startsWith('/orders/pickup-ready') &&
      !path.startsWith('/orders/lieferschein-check') &&
      !path.startsWith('/orders/history'),
  },
  {
    to: '/orders/lieferschein-check',
    label: 'Lieferschein prüfen',
    Icon: DeliveryIcon,
    match: (path) => path.startsWith('/orders/lieferschein-check'),
  },
  {
    to: '/orders/pickup-ready',
    label: 'Abholbereit',
    Icon: OrdersIcon,
    match: (path) => path.startsWith('/orders/pickup-ready'),
  },
  {
    to: '/orders/history',
    label: 'Verlauf',
    Icon: HistoryIcon,
    match: (path) => path.startsWith('/orders/history'),
  },
  { to: '/employees', label: 'Mitarbeiter', Icon: PersonIcon, match: (path) => path.startsWith('/employees') },
  { to: '/articles', label: 'Artikel', Icon: ArticleIcon, match: (path) => path.startsWith('/articles') },
  {
    to: '/reports/by-article',
    label: 'Berichte',
    Icon: ReportsIcon,
    match: (path) => path.startsWith('/reports'),
  },
]

const BOTTOM_ITEMS: NavItemDef[] = [
  {
    to: '/settings/order-statuses',
    label: 'Bestellstatus',
    Icon: GearIcon,
    match: (path) => path === '/settings/order-statuses',
  },
  {
    to: '/settings/pickup-locations',
    label: 'Abholorte',
    Icon: GearIcon,
    match: (path) => path === '/settings/pickup-locations',
  },
  {
    to: '/settings/notifications',
    label: 'Benachrichtigung',
    Icon: GearIcon,
    match: (path) => path === '/settings/notifications',
  },
  {
    to: '/settings/bestellformular',
    label: 'Bestellformular',
    Icon: GearIcon,
    match: (path) => path === '/settings/bestellformular',
  },
  {
    to: '/settings/order-list-buttons',
    label: 'Aktionsbuttons',
    Icon: GearIcon,
    match: (path) => path === '/settings/order-list-buttons',
  },
  {
    to: '/settings/backup',
    label: 'Datensicherung',
    Icon: GearIcon,
    match: (path) => path === '/settings/backup',
  },
  { to: '/help', label: 'Hilfe', Icon: HelpIcon, match: (path) => path.startsWith('/help') },
]

function NavRow({ to, label, Icon, active }: { to: string; label: string; Icon: ComponentType; active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-brand-tint ${
        active ? 'text-brand' : 'text-gray-900'
      }`}
    >
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center ${active ? 'text-brand' : 'text-black/55'}`}>
        <Icon />
      </span>
      {label}
    </Link>
  )
}

export function Sidebar() {
  const { pathname } = useLocation()

  return (
    <div className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col border-r border-black/[0.08] bg-white">
      <div className="flex items-center gap-2.5 border-b border-black/[0.06] px-5 pt-[22px] pb-[18px]">
        <img src={logo} alt="ÖRK Logo" className="h-12 w-12 shrink-0 object-contain" />
        <div className="flex flex-col leading-tight">
          <span className="text-[13px] font-extrabold tracking-wide text-gray-900">Bekleidungsreferat</span>
          <span className="text-[10.5px] font-semibold text-black/45">Lieboch</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {NAV_ITEMS.map((item) => (
          <NavRow key={item.to} to={item.to} label={item.label} Icon={item.Icon} active={item.match(pathname)} />
        ))}
      </nav>

      <div className="flex flex-col gap-0.5 border-t border-black/[0.06] p-3 pb-4">
        {BOTTOM_ITEMS.map((item) => (
          <NavRow key={item.to} to={item.to} label={item.label} Icon={item.Icon} active={item.match(pathname)} />
        ))}
      </div>
    </div>
  )
}
