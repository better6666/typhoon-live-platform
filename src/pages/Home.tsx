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
    <div className="space-y-5 sm:space-y-6">
      <section className="overflow-hidden rounded-[36px] border border-white/12 bg-[linear-gradient(180deg,rgba(122,187,255,0.18),rgba(255,255,255,0.08))] p-5 shadow-[0_22px_60px_rgba(5,18,42,0.22)] backdrop-blur-2xl sm:p-7">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center rounded-full border border-white/16 bg-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.24em] text-sky-50/82">
              Hangzhou Typhoon Monitor
            </div>
            <div>
              <h1 className="max-w-3xl font-display text-[2.2rem] leading-[1.02] text-white sm:text-5xl lg:text-[4.2rem]">
                杭州台风影响
                <br />
                实时观测平台
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-sky-50/78 sm:text-base">
                用一套更像气象产品的界面，把台风路径、杭州实时风速、阵风、预警与未来数小时影响整合到同一个页面里。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[28px] bg-[rgba(7,28,55,0.38)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="text-xs text-sky-100/64">杭州实时风速</div>
                <div className="mt-2 font-display text-3xl text-white">{Math.round(liveData.hangzhouWeather?.windSpeedKmh ?? 0)}</div>
                <div className="mt-1 text-sm text-sky-50/72">km/h</div>
              </div>
              <div className="rounded-[28px] bg-[rgba(7,28,55,0.38)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="text-xs text-sky-100/64">杭州实时阵风</div>
                <div className="mt-2 font-display text-3xl text-white">{Math.round(liveData.hangzhouWeather?.windGustKmh ?? 0)}</div>
                <div className="mt-1 text-sm text-sky-50/72">km/h</div>
              </div>
              <div className="rounded-[28px] bg-[rgba(7,28,55,0.38)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="text-xs text-sky-100/64">海平面气压</div>
                <div className="mt-2 font-display text-3xl text-white">{liveData.hangzhouWeather?.pressureHpa ?? '--'}</div>
                <div className="mt-1 text-sm text-sky-50/72">hPa</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <div className="rounded-full border border-white/14 bg-white/10 px-4 py-2 text-sm text-sky-50/82">
                已同步 {new Date(liveData.updatedAt).toLocaleString('zh-CN')}
              </div>
              <div className="rounded-full border border-white/14 bg-white/10 px-4 py-2 text-sm text-sky-50/82">
                当前最强 {liveData.summary.strongestStormName}
              </div>
              <div className="rounded-full border border-white/14 bg-white/10 px-4 py-2 text-sm text-sky-50/82">
                最高预警 {liveData.summary.highestWarningLevel}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.05))] p-5 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-sky-100/60">预警焦点</div>
                  <div className="mt-3 font-display text-4xl text-white">{warningData.highestLevel}</div>
                </div>
                <div className="rounded-full border border-amber-200/20 bg-amber-200/12 px-3 py-1 text-xs text-amber-50">
                  {warningData.coastalFocus}
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {warningData.items.slice(0, 2).map((item) => (
                  <div key={`${item.region}-${item.level}`} className="rounded-[22px] bg-[rgba(9,27,50,0.52)] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-medium text-white">{item.region}</span>
                      <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs text-slate-100/84">
                        {item.level}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-200/82">{item.message}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.05))] p-5 backdrop-blur-xl">
              <div className="text-[11px] uppercase tracking-[0.24em] text-sky-100/60">台风焦点</div>
              <div className="mt-3 text-2xl font-semibold text-white">{activeStorm?.nameCn}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-200/56">{activeStorm?.nameEn}</div>
              <p className="mt-4 text-sm leading-7 text-slate-100/82">
                {activeStorm?.landfallNarrative ?? '正在汇总最新路径与杭州影响说明。'}
              </p>
              {activeStorm && (
                <Link
                  to={`/storm/${activeStorm.id}`}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-white/90 px-4 py-3 text-sm font-medium text-sky-950 transition hover:bg-white"
                >
                  进入台风详情页
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="活跃台风" value={`${liveData.summary.activeCount}`} hint="当前追踪中的活跃系统数量" icon={<Radar className="h-5 w-5" />} />
        <MetricCard label="最强系统" value={liveData.summary.strongestStormName} hint="当前海域最强台风名称" icon={<Gauge className="h-5 w-5" />} />
        <MetricCard label="最高预警" value={liveData.summary.highestWarningLevel} hint="沿海地区当前最高生效等级" icon={<AlertTriangle className="h-5 w-5" />} />
        <MetricCard
          label="杭州实时阵风"
          value={`${Math.round(liveData.hangzhouWeather?.windGustKmh ?? 0)} km/h`}
          hint={`风向 ${liveData.hangzhouWeather?.windDirectionDeg ?? '--'}° · 气压 ${liveData.hangzhouWeather?.pressureHpa ?? '--'} hPa`}
          icon={<MapPinned className="h-5 w-5" />}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] p-5 shadow-[0_18px_48px_rgba(6,18,40,0.16)] backdrop-blur-2xl sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-sky-100/60">活跃台风列表</div>
              <div className="mt-2 text-xl font-semibold text-white">快速锁定目标台风</div>
            </div>
            <TimerReset className="h-5 w-5 text-sky-100/78" />
          </div>
          <StormList storms={liveData.storms} activeStormId={activeStorm?.id} onSelectStorm={setSelectedStormId} />
        </div>

        <div className="space-y-4">
          <div className="rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] p-4 shadow-[0_18px_48px_rgba(6,18,40,0.16)] backdrop-blur-2xl sm:p-5">
            <div className="mb-4 flex flex-wrap gap-2.5">
              {Object.entries(layerText).map(([key, label]) => {
                const enabled = { showForecast, showWindCircle, showWarnings }[key as keyof typeof layerText]

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleLayer(key as keyof typeof layerText)}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      enabled
                        ? 'border-sky-200/30 bg-white/14 text-white'
                        : 'border-white/10 bg-white/6 text-slate-200/72 hover:text-white'
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
                      ? 'border-cyan-200/32 bg-cyan-100/12 text-cyan-50'
                      : 'border-white/10 bg-white/6 text-slate-200/72 hover:text-white'
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

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] p-5 backdrop-blur-2xl">
              <div className="text-xs text-slate-300/68">当前位置</div>
              <div className="mt-2 text-base font-medium text-white">
                {activeStorm?.latestPoint.lat.toFixed(1)}°N / {activeStorm?.latestPoint.lng.toFixed(1)}°E
              </div>
            </div>
            <div className="rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] p-5 backdrop-blur-2xl">
              <div className="text-xs text-slate-300/68">移动方向</div>
              <div className="mt-2 text-base font-medium text-white">
                {activeStorm?.latestPoint.moveDir} · {activeStorm?.latestPoint.moveSpeedKmh} km/h
              </div>
            </div>
            <div className="rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] p-5 backdrop-blur-2xl">
              <div className="text-xs text-slate-300/68">杭州实时风速</div>
              <div className="mt-2 text-base font-medium text-white">
                {Math.round(liveData.hangzhouWeather?.windSpeedKmh ?? 0)} km/h · {liveData.hangzhouWeather?.windDirectionDeg ?? '--'}°
              </div>
            </div>
          </div>
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
