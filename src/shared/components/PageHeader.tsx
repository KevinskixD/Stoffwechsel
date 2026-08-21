import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  subtitle: string
  action?: ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-5">
      <div>
        <h1 className="mb-1.5 text-2xl font-extrabold text-gray-900">{title}</h1>
        <p className="text-sm text-black/50">{subtitle}</p>
      </div>
      {action ? <div className="flex flex-wrap items-center gap-3">{action}</div> : null}
    </div>
  )
}

export function PrimaryLinkButton({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-lg bg-brand px-4.5 py-2.5 text-[13.5px] font-bold text-white shadow-[0_2px_8px_rgba(183,14,12,0.25)] hover:bg-brand-dark"
    >
      {children}
    </Link>
  )
}
