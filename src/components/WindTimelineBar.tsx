import { Pause, Play } from 'lucide-react'
import type { WeatherTimelinePoint } from '@shared/storm'
import { formatTimelineDate, formatTimelineLabel } from '@/lib/windUtils'

interface WindTimelineBarProps {
  points: WeatherTimelinePoint[]
  activeIndex: number
  playing: boolean
  onTogglePlay: () => void
  onSelectIndex: (index: number) => void
}

export default function WindTimelineBar({
  points,
  activeIndex,
  playing,
  onTogglePlay,
  onSelectIndex,
}: WindTimelineBarProps) {
  if (!points.length) return null

  const active = points[Math.min(activeIndex, points.length - 1)]
  const progress = points.length <= 1 ? 0 : (activeIndex / (points.length - 1)) * 100

  return (
    <div className="pointer-events-auto w-full max-w-xl rounded-[28px] border border-white/25 bg-[rgba(236,245,255,0.92)] px-4 py-3 shadow-[0_18px_50px_rgba(8,30,60,0.28)] backdrop-blur-xl sm:px-5 sm:py-3.5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a4a7a] text-white shadow-md transition hover:bg-[#163d66]"
          aria-label={playing ? '暂停' : '播放'}
        >
          {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-semibold text-[#163d66]">风速</span>
            <span className="truncate text-xs text-[#4a6f94]">
              {formatTimelineDate(active.time)}
            </span>
          </div>

          <div className="mt-2.5">
            <div className="relative h-1.5 rounded-full bg-[#c5d8eb]">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-[#1a4a7a] transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
              <div
                className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white bg-[#1a4a7a] shadow"
                style={{ left: `calc(${progress}% - 7px)` }}
              />
            </div>
            <div className="mt-2 flex justify-between gap-1 text-[11px] text-[#5a7a9a]">
              {points.map((point, index) => (
                <button
                  key={point.time}
                  type="button"
                  onClick={() => onSelectIndex(index)}
                  className={`min-w-0 flex-1 truncate text-center transition ${
                    index === activeIndex ? 'font-semibold text-[#163d66]' : 'hover:text-[#163d66]'
                  }`}
                >
                  {formatTimelineLabel(point.time, index)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
