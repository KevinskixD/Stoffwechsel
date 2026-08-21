import type { ReactNode } from 'react'

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-black/55">{label}</label>
      {children}
    </div>
  )
}

export const formInputClass =
  'w-full rounded-lg border border-black/[0.14] px-3 py-2.5 text-[13.5px] text-gray-900 focus:border-brand focus:outline-none'

export function FormCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="px-4 pt-[4.5rem] pb-10 lg:px-11 lg:pt-9 lg:pb-15">
      <div className="mx-auto w-full max-w-[420px] rounded-2xl bg-surface p-7 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <h1 className="mb-1 text-[17px] font-extrabold text-gray-900">{title}</h1>
        <p className="mb-5 text-[13px] text-black/45">{subtitle}</p>
        {children}
      </div>
    </div>
  )
}
