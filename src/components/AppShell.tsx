import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { CloudMoonRain, History, Radar } from 'lucide-react'

interface AppShellProps {
  children: ReactNode
}

const navItems = [
  { to: '/', label: '实时总览', icon: Radar },
  { to: '/history', label: '历史对比', icon: History },
]

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#081325] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.24),transparent_24%),radial-gradient(circle_at_18%_22%,rgba(56,189,248,0.18),transparent_26%),radial-gradient(circle_at_85%_8%,rgba(125,211,252,0.12),transparent_16%),linear-gradient(180deg,#0a1930_0%,#0d2242_42%,#091324_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.12]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
      <div className="relative mx-auto min-h-screen w-full max-w-[1320px] px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <main className="pb-8">
          <header className="mb-6 rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.05))] px-5 py-5 shadow-[0_20px_60px_rgba(5,15,35,0.22)] backdrop-blur-2xl sm:px-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-[24px] border border-sky-200/20 bg-[linear-gradient(180deg,rgba(96,165,250,0.28),rgba(34,211,238,0.16))] p-3 text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.24)]">
                  <CloudMoonRain className="h-7 w-7" />
                </div>
                <div>
                  <div className="font-display text-[1.7rem] leading-none text-white sm:text-[2rem]">StormCast</div>
                  <div className="mt-1 text-sm text-sky-100/72">杭州台风影响与路径实时可视化</div>
                </div>
              </div>
              <nav className="flex flex-wrap gap-3">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                          isActive
                            ? 'border-sky-200/30 bg-white/18 text-white shadow-[0_10px_24px_rgba(56,189,248,0.14)]'
                            : 'border-white/10 bg-white/6 text-slate-200 hover:bg-white/10'
                        }`
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
                  )
                })}
              </nav>
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  )
}
