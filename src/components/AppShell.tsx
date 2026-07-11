import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { CloudMoonRain, History, Radar } from 'lucide-react'

interface AppShellProps {
  children: ReactNode
}

const navItems = [
  { to: '/', label: '实时风场', icon: Radar },
  { to: '/history', label: '历史对比', icon: History },
]

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#062a4d] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-5%,rgba(96,180,255,0.22),transparent_28%),linear-gradient(180deg,#08355f_0%,#062a4d_45%,#041e38_100%)]" />
      <div className="relative mx-auto min-h-screen w-full max-w-[1480px] px-2 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3 lg:px-5">
        <header className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-[rgba(18,55,95,0.72)] px-3 py-2.5 shadow-[0_12px_40px_rgba(2,16,36,0.28)] backdrop-blur-xl sm:mb-3 sm:rounded-[22px] sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <div className="rounded-2xl border border-sky-200/25 bg-[linear-gradient(180deg,rgba(120,190,255,0.35),rgba(40,140,220,0.2))] p-2 text-sky-50">
              <CloudMoonRain className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <div className="truncate font-display text-lg leading-none text-white sm:text-xl">StormCast</div>
              <div className="mt-0.5 truncate text-[11px] text-sky-100/70 sm:text-xs">杭州台风 · 实时风场可视化</div>
            </div>
          </div>
          <nav className="flex shrink-0 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition sm:gap-2 sm:px-4 sm:text-sm ${
                      isActive
                        ? 'border-sky-200/35 bg-white/20 text-white shadow-[0_8px_20px_rgba(56,189,248,0.15)]'
                        : 'border-white/10 bg-white/8 text-slate-200 hover:bg-white/12'
                    }`
                  }
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
        </header>
        <main>{children}</main>
      </div>
    </div>
  )
}
