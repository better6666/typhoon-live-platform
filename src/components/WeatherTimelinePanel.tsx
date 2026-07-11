import type { WeatherTimelinePoint } from '@shared/storm'

interface WeatherTimelinePanelProps {
  title: string
  subtitle: string
  points: WeatherTimelinePoint[]
}

export default function WeatherTimelinePanel({ title, subtitle, points }: WeatherTimelinePanelProps) {
  return (
    <div className="rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] p-5 shadow-[0_18px_48px_rgba(6,18,40,0.18)] backdrop-blur-2xl sm:p-6">
      <div className="text-[11px] uppercase tracking-[0.26em] text-sky-100/60">{title}</div>
      <div className="mt-2 text-lg font-semibold leading-7 text-white sm:text-xl">{subtitle}</div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {points.map((item) => (
          <div key={item.time} className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,28,52,0.72),rgba(8,22,41,0.88))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-300/72">
              {new Date(item.time).toLocaleString('zh-CN', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
              })}
            </div>
            <div className="mt-3 space-y-2.5 text-sm text-slate-100">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-300/72">风速</span>
                <span>{Math.round(item.windSpeedKmh)} km/h</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-300/72">阵风</span>
                <span>{Math.round(item.windGustKmh)} km/h</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-300/72">风向</span>
                <span>{item.windDirectionDeg}°</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-300/72">降雨</span>
                <span>{item.precipitationMm?.toFixed(1) ?? '--'} mm</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-300/72">气压</span>
                <span>{item.pressureHpa?.toFixed(1) ?? '--'} hPa</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
