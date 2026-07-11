import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Clock3, CloudRainWind, Gauge, MoveRight, Orbit } from 'lucide-react'
import type { StormDetail } from '@shared/storm'
import StormMap from '@/components/StormMap'
import IntensityChart from '@/components/IntensityChart'
import WeatherTimelinePanel from '@/components/WeatherTimelinePanel'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getStormDetail } from '@/lib/api'

export default function StormDetailPage() {
  const { stormId } = useParams()
  const [storm, setStorm] = useState<StormDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  usePageTitle(storm ? `${storm.nameCn} · 台风详情` : '台风详情')

  useEffect(() => {
    if (!stormId) return

    getStormDetail(stormId)
      .then((response) => setStorm(response))
      .catch(() => setError('未能加载该台风详情，请稍后再试。'))
      .finally(() => setLoading(false))
  }, [stormId])

  const actualPoints = useMemo(() => storm?.points.filter((point) => !point.isForecast) ?? [], [storm])
  const forecastPoints = useMemo(() => storm?.points.filter((point) => point.isForecast) ?? [], [storm])

  if (loading) {
    return <div className="rounded-[32px] border border-white/10 bg-white/5 p-10 text-slate-200">正在加载台风详情...</div>
  }

  if (error || !storm) {
    return <div className="rounded-[32px] border border-rose-400/20 bg-rose-500/10 p-10 text-rose-100">{error ?? '未找到台风详情。'}</div>
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.2),transparent_34%),rgba(255,255,255,0.05)] p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.34em] text-cyan-100/55">Storm Detail</div>
              <h1 className="mt-3 font-display text-5xl text-white">{storm.nameCn}</h1>
              <div className="mt-2 text-sm uppercase tracking-[0.24em] text-slate-400">
                {storm.nameEn} · {storm.internationalCode}
              </div>
            </div>
            <Link to="/" className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10">
              返回总览
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] bg-slate-950/35 p-4">
              <div className="flex items-center gap-2 text-xs text-slate-400"><Gauge className="h-4 w-4" />当前强度</div>
              <div className="mt-2 text-xl text-white">{storm.intensity}</div>
            </div>
            <div className="rounded-[24px] bg-slate-950/35 p-4">
              <div className="flex items-center gap-2 text-xs text-slate-400"><CloudRainWind className="h-4 w-4" />最大风速</div>
              <div className="mt-2 text-xl text-white">{storm.maxWindKts} kt</div>
            </div>
            <div className="rounded-[24px] bg-slate-950/35 p-4">
              <div className="flex items-center gap-2 text-xs text-slate-400"><Orbit className="h-4 w-4" />最低气压</div>
              <div className="mt-2 text-xl text-white">{storm.minPressureHpa} hPa</div>
            </div>
            <div className="rounded-[24px] bg-slate-950/35 p-4">
              <div className="flex items-center gap-2 text-xs text-slate-400"><MoveRight className="h-4 w-4" />移动趋势</div>
              <div className="mt-2 text-xl text-white">
                {storm.latestPoint.moveDir} · {storm.latestPoint.moveSpeedKmh} km/h
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="text-xs uppercase tracking-[0.28em] text-cyan-100/55">时间轴回放</div>
          <div className="mt-4 space-y-4">
            {storm.points.map((point, index) => (
              <div key={`${point.time}-${index}`} className="relative rounded-[22px] border border-white/10 bg-black/10 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-white">{point.intensity}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {new Date(point.time).toLocaleString('zh-CN', { hour12: false })}
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs ${point.isForecast ? 'bg-white/10 text-slate-200' : 'bg-cyan-300/15 text-cyan-100'}`}>
                    {point.isForecast ? '预测' : '实况'}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-300">
                  <div>{point.lat.toFixed(1)}°N / {point.lng.toFixed(1)}°E</div>
                  <div>{point.windSpeedKts} kt / {point.pressureHpa} hPa</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <StormMap
          storms={[storm]}
          activeStormId={storm.id}
          showForecast
          showWindCircle
          windVectors={storm.windVectors}
          baseMap="ocean"
        />
        <IntensityChart points={storm.points} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr_0.9fr]">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="text-xs uppercase tracking-[0.26em] text-cyan-100/55">路径摘要</div>
          <div className="mt-4 space-y-4 text-sm leading-7 text-slate-300">
            <div className="rounded-[22px] bg-slate-950/35 p-4">实况节点 {actualPoints.length} 个，预测节点 {forecastPoints.length} 个。</div>
            <div className="rounded-[22px] bg-slate-950/35 p-4">当前中心位于 {storm.latestPoint.lat.toFixed(1)}°N / {storm.latestPoint.lng.toFixed(1)}°E，正向 {storm.latestPoint.moveDir} 移动。</div>
            <div className="rounded-[22px] bg-slate-950/35 p-4">最近一次更新于 {new Date(storm.lastUpdated).toLocaleString('zh-CN', { hour12: false })}。</div>
            {storm.landfallNarrative && (
              <div className="rounded-[22px] border border-cyan-300/15 bg-cyan-300/8 p-4">
                {storm.landfallNarrative}
              </div>
            )}
            {storm.localWeather && (
              <div className="rounded-[22px] bg-slate-950/35 p-4">
                杭州实时风速 {Math.round(storm.localWeather.windSpeedKmh)} km/h，阵风 {Math.round(storm.localWeather.windGustKmh)} km/h，海平面气压 {storm.localWeather.pressureHpa} hPa。
              </div>
            )}
          </div>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="text-xs uppercase tracking-[0.26em] text-cyan-100/55">风圈与影响</div>
          <div className="mt-4 grid gap-4">
            {storm.windCircles.map((circle) => (
              <div key={circle.level} className="rounded-[22px] bg-slate-950/35 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-white">{circle.level} 级风圈</div>
                  <div className="text-xs text-slate-400">半径 km</div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-300">
                  <div>东北 {circle.radiusKm.ne}</div>
                  <div>东南 {circle.radiusKm.se}</div>
                  <div>西南 {circle.radiusKm.sw}</div>
                  <div>西北 {circle.radiusKm.nw}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="text-xs uppercase tracking-[0.26em] text-cyan-100/55">影响区域与预警</div>
          <div className="mt-4 space-y-3">
            {storm.affectedAreas.map((item) => (
              <div key={item.name} className="rounded-[22px] border border-white/10 bg-black/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-white">{item.name}</div>
                  <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-xs text-rose-100">{item.severity}</span>
                </div>
                <div className="mt-2 text-sm text-slate-300">预计影响：{item.eta}</div>
                <div className="mt-1 text-sm text-slate-400">降雨：{item.rainRisk} / 风力：{item.windRisk}</div>
              </div>
            ))}
            <div className="rounded-[22px] border border-amber-300/20 bg-amber-400/10 p-4">
              <div className="flex items-center gap-2 text-amber-100"><Clock3 className="h-4 w-4" />最新预警</div>
              <div className="mt-2 space-y-2 text-sm text-slate-200">
                {storm.warnings.map((warning) => (
                  <div key={`${warning.region}-${warning.level}`}>{warning.level} · {warning.region} · {warning.message}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <WeatherTimelinePanel
        title="杭州本地影响推演"
        subtitle="未来数小时风速、阵风、降雨与气压"
        points={storm.localTimeline?.slice(0, 8) ?? []}
      />
    </div>
  )
}
