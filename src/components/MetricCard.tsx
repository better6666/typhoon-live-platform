import type { ReactNode } from 'react'

interface MetricCardProps {
  label: string
  value: string
  hint: string
  icon: ReactNode
}

export default function MetricCard({ label, value, hint, icon }: MetricCardProps) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/6 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-cyan-100/55">{label}</div>
          <div className="mt-3 font-display text-4xl text-white">{value}</div>
        </div>
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-200">{icon}</div>
      </div>
      <div className="text-sm text-slate-300">{hint}</div>
    </div>
  )
}
