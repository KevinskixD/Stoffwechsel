import type { ComponentType } from 'react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import logo from '../../assets/oerk-logo.png'
import { useAuth } from '../hooks/useAuth'
import { useTheme, type ThemePreference } from '../hooks/useTheme'
import {
  ArticleIcon,
  ChevronDownIcon,
  DashboardIcon,
  DeliveryIcon,
  GearIcon,
  HelpIcon,
  HistoryIcon,
  LogOutIcon,
  MenuIcon,
  MonitorIcon,
  MoonIcon,
  OrdersIcon,
  PersonIcon,
  ReportsIcon,
  SunIcon,
} from './icons'

const THEME_LABEL: Record<ThemePreference, string> = { light: 'Hell', dark: 'Dunkel', system: 'System' }
const THEME_ICON: Record<ThemePreference, ComponentType> = { light: SunIcon, dark: MoonIcon, system: MonitorIcon }

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

const SETTINGS_ITEMS: NavItemDef[] = [
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
    to: '/settings/starter-kit',
    label: 'Basisausrüstung',
    Icon: GearIcon,
    match: (path) => path === '/settings/starter-kit',
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

const isSettingsPath = (path: string) => SETTINGS_ITEMS.some((item) => item.match(path))

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
  const settingsActive = isSettingsPath(pathname)
  const [settingsOpen, setSettingsOpen] = useState(settingsActive)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { preference, cycle } = useTheme()
  const ThemeIcon = THEME_ICON[preference]
  const { user, signOutUser } = useAuth()

  // Collapse the mobile drawer whenever the route changes (nav-link click, back/forward, etc.).
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex items-center gap-3 border-b border-black/[0.08] bg-surface px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Menü öffnen"
          className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-900"
        >
          <MenuIcon />
        </button>
        <img src={logo} alt="ÖRK Logo" className="h-8 w-8 shrink-0 object-contain" />
        <span className="text-[13px] font-extrabold tracking-wide text-gray-900">Bekleidungsreferat</span>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.45)] lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div
        className={`fixed top-0 left-0 z-50 flex h-screen w-[248px] flex-col border-r border-black/[0.08] bg-surface transition-transform duration-200 lg:sticky lg:z-auto lg:shrink-0 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-black/[0.06] px-5 pt-[22px] pb-[18px]">
          <img src={logo} alt="ÖRK Logo" className="h-12 w-12 shrink-0 object-contain" />
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-extrabold tracking-wide text-gray-900">Bekleidungsreferat</span>
            <span className="text-[10.5px] font-semibold text-black/45">Lieboch</span>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => (
            <NavRow key={item.to} to={item.to} label={item.label} Icon={item.Icon} active={item.match(pathname)} />
          ))}
        </nav>

        <div className="flex flex-col gap-0.5 border-t border-black/[0.06] p-3 pb-4">
          <button
            type="button"
            onClick={() => setSettingsOpen((open) => !open)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-brand-tint ${
              settingsActive ? 'text-brand' : 'text-gray-900'
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center ${
                settingsActive ? 'text-brand' : 'text-black/55'
              }`}
            >
              <GearIcon />
            </span>
            <span className="flex-1 text-left">Einstellungen</span>
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center text-black/40 transition-transform ${
                settingsOpen ? 'rotate-180' : ''
              }`}
            >
              <ChevronDownIcon />
            </span>
          </button>

          {settingsOpen && (
            <div className="flex flex-col gap-0.5 pl-4">
              {SETTINGS_ITEMS.map((item) => (
                <NavRow key={item.to} to={item.to} label={item.label} Icon={item.Icon} active={item.match(pathname)} />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={cycle}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-900 hover:bg-brand-tint"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center text-black/55">
              <ThemeIcon />
            </span>
            {THEME_LABEL[preference]}
          </button>

          {user && (
            <button
              type="button"
              onClick={signOutUser}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-900 hover:bg-brand-tint"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center text-black/55">
                <LogOutIcon />
              </span>
              <span className="flex-1 truncate text-left">{user.email}</span>
            </button>
          )}
        </div>
      </div>
    </>
  )
}
