import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Gauge, MapPinned, Radar, TimerReset } from 'lucide-react'
import type { LiveStormsResponse, WarningOverviewResponse } from '@shared/storm'
import MetricCard from '@/components/MetricCard'
import StormList from '@/components/StormList'
import StormMap from '@/components/StormMap'
import WeatherTimelinePanel from '@/components/WeatherTimelinePanel'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getLiveStorms, getWarningsOverview } from '@/lib/api'
import { useStormStore } from '@/store/useStormStore'

const layerText = {
  showForecast: '预测路径',
  showWindCircle: '风圈范围',
  showWarnings: '预警态势',
} as const

const baseMapOptions = [
  { key: 'street', label: '街道地图' },
  { key: 'satellite', label: '卫星地图' },
  { key: 'dark', label: '深色夜航' },
] as const

export default function Home() {
  usePageTitle('台风路径实时可视化平台')
  const [liveData, setLiveData] = useState<LiveStormsResponse | null>(null)
  const [warningData, setWarningData] = useState<WarningOverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasSelectedDefaultStorm = useRef(false)
  const {
    selectedStormId,
    setSelectedStormId,
    showForecast,
    showWindCircle,
    showWarnings,
    toggleLayer,
  } = useStormStore()
  const [baseMap, setBaseMap] = useState<(typeof baseMapOptions)[number]['key']>('street')

  useEffect(() => {
    Promise.all([getLiveStorms(), getWarningsOverview()])
      .then(([liveResponse, warningResponse]) => {
        setLiveData(liveResponse)
        setWarningData(warningResponse)
        if (!hasSelectedDefaultStorm.current && liveResponse.storms[0]) {
          setSelectedStormId(liveResponse.storms[0].id)
          hasSelectedDefaultStorm.current = true
        }
      })
      .catch(() => setError('实时气象数据加载失败，请稍后刷新重试。'))
      .finally(() => setLoading(false))
  }, [setSelectedStormId])

  const activeStorm = useMemo(
    () => liveData?.storms.find((storm) => storm.id === selectedStormId) ?? liveData?.storms[0] ?? null,
    [liveData, selectedStormId],
  )

  if (loading) {
    return <div className="rounded-[32px] border border-white/10 bg-white/5 p-10 text-slate-200">正在拉取实时台风态势...</div>
  }

  if (error || !liveData || !warningData) {
    return <div className="rounded-[32px] border border-rose-400/20 bg-rose-500/10 p-10 text-rose-100">{error}</div>
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
        <div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.2),transparent_32%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.16),transparent_25%),rgba(7,10,24,0.88)] p-8 shadow-[0_30px_80px_rgba(5,10,25,0.45)]">
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.42em] text-cyan-100/55">Typhoon Observatory Deck</div>
              <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.05] text-white">
                台风路径实时可视化平台
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                将活跃台风、风圈扩展、登陆窗口与沿海预警态势叠加到统一指挥舱视图中，支持一键转入详情回放与历史复盘。
              </p>
            </div>
            <div className="rounded-[24px] border border-cyan-300/20 bg-cyan-300/10 px-5 py-4 text-right">
              <div className="text-xs uppercase tracking-[0.26em] text-cyan-100/50">最新同步</div>
              <div className="mt-2 font-display text-3xl text-white">+5 分钟</div>
              <div className="mt-1 text-sm text-cyan-50/70">{new Date(liveData.updatedAt).toLocaleString('zh-CN')}</div>
            </div>
          </div>
        </div>
        <div className="rounded-[32px] border border-amber-300/15 bg-[linear-gradient(160deg,rgba(249,115,22,0.18),rgba(12,18,38,0.84))] p-8 shadow-[0_20px_60px_rgba(249,115,22,0.12)]">
          <div className="text-xs uppercase tracking-[0.26em] text-amber-100/55">预警焦点</div>
          <div className="mt-4 font-display text-4xl text-white">{warningData.highestLevel}</div>
          <p className="mt-3 text-sm leading-7 text-slate-200">{warningData.coastalFocus}</p>
          <div className="mt-6 space-y-3">
            {warningData.items.slice(0, 3).map((item) => (
              <div key={`${item.region}-${item.level}`} className="rounded-[20px] border border-white/10 bg-black/15 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{item.region}</span>
                  <span className="rounded-full border border-amber-200/15 bg-amber-300/10 px-2.5 py-1 text-xs text-amber-100">
                    {item.level}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.message}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="活跃台风" value={`${liveData.summary.activeCount}`} hint="当前可追踪系统数量" icon={<Radar className="h-5 w-5" />} />
        <MetricCard label="最强系统" value={liveData.summary.strongestStormName} hint="当前海域最强台风名称" icon={<Gauge className="h-5 w-5" />} />
        <MetricCard label="最高预警" value={liveData.summary.highestWarningLevel} hint="沿海地区最高生效等级" icon={<AlertTriangle className="h-5 w-5" />} />
        <MetricCard
          label="杭州实时阵风"
          value={`${Math.round(liveData.hangzhouWeather?.windGustKmh ?? 0)} km/h`}
          hint={`海平面气压 ${liveData.hangzhouWeather?.pressureHpa ?? '--'} hPa`}
          icon={<MapPinned className="h-5 w-5" />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.55fr_0.7fr]">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-cyan-100/55">活跃台风列表</div>
              <div className="mt-2 text-xl font-semibold text-white">快速锁定目标台风</div>
            </div>
            <TimerReset className="h-5 w-5 text-cyan-200" />
          </div>
          <StormList storms={liveData.storms} activeStormId={activeStorm?.id} onSelectStorm={setSelectedStormId} />
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {Object.entries(layerText).map(([key, label]) => {
              const enabled = { showForecast, showWindCircle, showWarnings }[key as keyof typeof layerText]

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleLayer(key as keyof typeof layerText)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    enabled
                      ? 'border-cyan-300/40 bg-cyan-300/12 text-cyan-100'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              )
            })}
            {baseMapOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setBaseMap(option.key)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  baseMap === option.key
                    ? 'border-amber-300/45 bg-amber-300/12 text-amber-100'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <StormMap
            storms={liveData.storms}
            activeStormId={activeStorm?.id}
            showForecast={showForecast}
            showWindCircle={showWindCircle}
            windVectors={liveData.windVectors}
            baseMap={baseMap}
            onSelectStorm={setSelectedStormId}
          />
        </div>

        <div className="space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-cyan-100/55">台风焦点</div>
            <div className="mt-2 text-xl font-semibold text-white">{activeStorm?.nameCn}</div>
            <div className="mt-1 text-sm uppercase tracking-[0.2em] text-slate-400">{activeStorm?.nameEn}</div>
          </div>
          <div className="grid gap-3">
            <div className="rounded-[24px] bg-slate-950/35 p-4">
              <div className="text-xs text-slate-400">当前位置</div>
              <div className="mt-1 text-white">
                {activeStorm?.latestPoint.lat.toFixed(1)}°N / {activeStorm?.latestPoint.lng.toFixed(1)}°E
              </div>
            </div>
            <div className="rounded-[24px] bg-slate-950/35 p-4">
              <div className="text-xs text-slate-400">移动方向</div>
              <div className="mt-1 text-white">
                {activeStorm?.latestPoint.moveDir} · {activeStorm?.latestPoint.moveSpeedKmh} km/h
              </div>
            </div>
            <div className="rounded-[24px] bg-slate-950/35 p-4">
              <div className="text-xs text-slate-400">杭州实时风速</div>
              <div className="mt-1 text-white">
                {Math.round(liveData.hangzhouWeather?.windSpeedKmh ?? 0)} km/h · {liveData.hangzhouWeather?.windDirectionDeg ?? '--'}°
              </div>
            </div>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/10 p-4 text-sm leading-7 text-slate-300">
            {showWarnings ? warningData.items[0]?.message : '已关闭预警态势图层，可重新开启查看沿海预警。'}
          </div>
          <div className="rounded-[24px] border border-cyan-300/15 bg-cyan-300/8 p-4 text-sm leading-7 text-slate-200">
            {activeStorm?.landfallNarrative ?? '正在汇总最新登陆研判。'}
          </div>
          {activeStorm && (
            <Link
              to={`/storm/${activeStorm.id}`}
              className="inline-flex w-full items-center justify-center rounded-full bg-cyan-300 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-200"
            >
              进入台风详情页
            </Link>
          )}
        </div>
      </section>

      <WeatherTimelinePanel
        title="杭州影响时间轴"
        subtitle="未来 8 小时风速、阵风、降雨与气压变化"
        points={liveData.hangzhouTimeline?.slice(0, 8) ?? []}
      />
    </div>
  )
}
