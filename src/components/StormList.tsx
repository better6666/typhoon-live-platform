import { Link } from 'react-router-dom'
import { ArrowUpRight, Navigation, Waves } from 'lucide-react'
import type { StormSummary } from '@shared/storm'

interface StormListProps {
  storms: StormSummary[]
  activeStormId?: string | null
  onSelectStorm: (stormId: string) => void
}

export default function StormList({ storms, activeStormId, onSelectStorm }: StormListProps) {
  return (
    <div className="space-y-3">
      {storms.map((storm) => {
        const isActive = storm.id === activeStormId

        return (
          <button
            key={storm.id}
            type="button"
            onClick={() => onSelectStorm(storm.id)}
            className={`w-full rounded-[28px] border p-4 text-left transition duration-300 ${
              isActive
                ? 'border-sky-200/35 bg-[linear-gradient(180deg,rgba(89,169,255,0.18),rgba(255,255,255,0.08))] shadow-[0_14px_34px_rgba(56,189,248,0.16)]'
                : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.04))] hover:border-white/15 hover:bg-white/10'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg text-white">{storm.nameCn}</span>
                  <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] tracking-[0.22em] text-slate-200/82">
                    {storm.internationalCode}
                  </span>
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-300/62">{storm.nameEn}</div>
              </div>
              <Link
                to={`/storm/${storm.id}`}
                aria-label={`查看 ${storm.nameCn} 详情`}
                className="rounded-full border border-white/10 bg-white/10 p-2 text-slate-100 transition hover:bg-white/15"
                onClick={(event) => event.stopPropagation()}
              >
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-100">
              <div className="rounded-[22px] bg-[rgba(8,24,46,0.46)] p-3.5">
                <div className="text-xs text-slate-300/68">当前强度</div>
                <div className="mt-1 font-medium">{storm.intensity}</div>
              </div>
              <div className="rounded-[22px] bg-[rgba(8,24,46,0.46)] p-3.5">
                <div className="text-xs text-slate-300/68">最低气压</div>
                <div className="mt-1 font-medium">{storm.minPressureHpa} hPa</div>
              </div>
              <div className="rounded-[22px] bg-[rgba(8,24,46,0.46)] p-3.5">
                <div className="flex items-center gap-2 text-xs text-slate-300/68">
                  <Navigation className="h-3.5 w-3.5" />
                  中心位置
                </div>
                <div className="mt-1 font-medium">
                  {storm.latestPoint.lat.toFixed(1)}°N / {storm.latestPoint.lng.toFixed(1)}°E
                </div>
              </div>
              <div className="rounded-[22px] bg-[rgba(8,24,46,0.46)] p-3.5">
                <div className="flex items-center gap-2 text-xs text-slate-300/68">
                  <Waves className="h-3.5 w-3.5" />
                  最大风速
                </div>
                <div className="mt-1 font-medium">{storm.maxWindKts} kt</div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
