import type { WeatherTimelinePoint } from '@shared/storm'

interface WeatherTimelinePanelProps {
  title: string
  subtitle: string
  points: WeatherTimelinePoint[]
}

export default function WeatherTimelinePanel({ title, subtitle, points }: WeatherTimelinePanelProps) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <div className="text-xs uppercase tracking-[0.26em] text-cyan-100/55">{title}</div>
      <div className="mt-2 text-xl font-semibold text-white">{subtitle}</div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {points.map((item) => (
          <div key={item.time} className="rounded-[22px] border border-white/10 bg-slate-950/35 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {new Date(item.time).toLocaleString('zh-CN', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
              })}
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-200">
              <div>风速 {Math.round(item.windSpeedKmh)} km/h</div>
              <div>阵风 {Math.round(item.windGustKmh)} km/h</div>
              <div>风向 {item.windDirectionDeg}°</div>
              <div>降雨 {item.precipitationMm?.toFixed(1) ?? '--'} mm</div>
              <div>气压 {item.pressureHpa?.toFixed(1) ?? '--'} hPa</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
