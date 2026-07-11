import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { CloudMoonRain, History, Radar, Waves } from 'lucide-react'

interface AppShellProps {
  children: ReactNode
}

const navItems = [
  { to: '/', label: '实时总览', icon: Radar },
  { to: '/history', label: '历史对比', icon: History },
]

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#050816] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_82%_16%,rgba(249,115,22,0.14),transparent_22%),radial-gradient(circle_at_50%_80%,rgba(168,85,247,0.14),transparent_28%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(148,163,184,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.35) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />
      <div className="relative mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-6 md:px-8">
        <aside className="hidden w-[280px] shrink-0 flex-col rounded-[32px] border border-white/10 bg-white/6 p-6 backdrop-blur-xl xl:flex">
          <div className="flex items-center gap-4">
            <div className="rounded-[22px] border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-200">
              <CloudMoonRain className="h-8 w-8" />
            </div>
            <div>
              <div className="font-display text-2xl text-white">StormCast</div>
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Operations Deck</div>
            </div>
          </div>
          <nav className="mt-10 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-[20px] px-4 py-3 text-sm transition ${
                      isActive
                        ? 'border border-cyan-300/30 bg-cyan-300/12 text-white shadow-[0_12px_30px_rgba(34,211,238,0.12)]'
                        : 'border border-transparent text-slate-300 hover:border-white/10 hover:bg-white/8 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
          <div className="mt-auto rounded-[26px] border border-white/10 bg-black/15 p-5">
            <div className="flex items-center gap-3 text-cyan-200">
              <Waves className="h-5 w-5" />
              <span className="text-sm font-medium">观测模式</span>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              默认以桌面指挥舱视角呈现风圈、路径、预警与历史对比，适合大屏演示和气象内容制作。
            </p>
          </div>
        </aside>
        <main className="flex-1 pb-8">
          <header className="mb-6 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/5 px-6 py-5 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.34em] text-cyan-100/55">Taiwan Strait / West Pacific / South China Sea</div>
              <div className="mt-2 font-display text-3xl text-white">台风态势追踪与历史复盘平台</div>
            </div>
            <div className="flex gap-3 self-start md:self-auto xl:hidden">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `rounded-full border px-4 py-2 text-sm transition ${
                      isActive ? 'border-cyan-300/35 bg-cyan-300/12 text-cyan-100' : 'border-white/10 bg-white/6 text-slate-300'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  )
}
