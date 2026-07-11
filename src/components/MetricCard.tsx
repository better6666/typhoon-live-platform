import type { ReactNode } from 'react'

interface MetricCardProps {
  label: string
  value: string
  hint: string
  icon: ReactNode
}

export default function MetricCard({ label, value, hint, icon }: MetricCardProps) {
  return (
    <div className="rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] p-5 shadow-[0_14px_40px_rgba(7,18,40,0.18)] backdrop-blur-2xl">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-sky-100/60">{label}</div>
          <div className="mt-3 font-display text-3xl leading-none text-white sm:text-4xl">{value}</div>
        </div>
        <div className="rounded-[20px] border border-sky-200/20 bg-[linear-gradient(180deg,rgba(59,130,246,0.24),rgba(14,165,233,0.14))] p-3 text-sky-100">
          {icon}
        </div>
      </div>
      <div className="text-sm leading-6 text-slate-200/88">{hint}</div>
    </div>
  )
}
