import type { ReactNode } from 'react'

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <label className="mb-1 block text-xs font-semibold text-black/45">{label}</label>
      {children}
    </div>
  )
}
