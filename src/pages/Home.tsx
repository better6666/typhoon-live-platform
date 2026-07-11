import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layers, List, Navigation2, X } from 'lucide-react'
import type { LiveStormsResponse, WarningOverviewResponse } from '@shared/storm'
import StormMap from '@/components/StormMap'
import WindTimelineBar from '@/components/WindTimelineBar'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getLiveStorms, getWarningsOverview } from '@/lib/api'
import { useStormStore } from '@/store/useStormStore'

const layerText = {
  showForecast: '预测路径',
  showWindCircle: '风圈范围',
  showWarnings: '预警态势',
} as const

const baseMapOptions = [
  { key: 'ocean' as const, label: '海洋风场' },
  { key: 'dark' as const, label: '深色夜航' },
  { key: 'street' as const, label: '街道' },
  { key: 'satellite' as const, label: '卫星' },
]

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
  const [baseMap, setBaseMap] = useState<(typeof baseMapOptions)[number]['key']>('ocean')
  const [showLayerPanel, setShowLayerPanel] = useState(false)
  const [showStormPanel, setShowStormPanel] = useState(false)
  const [timelineIndex, setTimelineIndex] = useState(0)
  const [playing, setPlaying] = useState(false)

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

  const timeline = liveData?.hangzhouTimeline?.slice(0, 5) ?? []

  useEffect(() => {
    if (!playing || timeline.length <= 1) return
    const timer = window.setInterval(() => {
      setTimelineIndex((prev) => (prev + 1) % timeline.length)
    }, 1600)
    return () => window.clearInterval(timer)
  }, [playing, timeline.length])

  const activeStorm = useMemo(
    () => liveData?.storms.find((storm) => storm.id === selectedStormId) ?? liveData?.storms[0] ?? null,
    [liveData, selectedStormId],
  )

  const windSpeedScale = useMemo(() => {
    if (!timeline.length || !liveData?.hangzhouWeather) return 1
    const base = Math.max(1, liveData.hangzhouWeather.windSpeedKmh)
    const current = timeline[Math.min(timelineIndex, timeline.length - 1)]?.windSpeedKmh ?? base
    return Math.max(0.35, Math.min(2.4, current / base))
  }, [timeline, timelineIndex, liveData?.hangzhouWeather])

  const scaledWeather = useMemo(() => {
    if (!liveData?.hangzhouWeather) return null
    const point = timeline[Math.min(timelineIndex, Math.max(0, timeline.length - 1))]
    if (!point) return liveData.hangzhouWeather
    return {
      ...liveData.hangzhouWeather,
      windSpeedKmh: point.windSpeedKmh,
      windDirectionDeg: point.windDirectionDeg,
      windGustKmh: point.windGustKmh,
      pressureHpa: point.pressureHpa ?? liveData.hangzhouWeather.pressureHpa,
      time: point.time,
    }
  }, [liveData?.hangzhouWeather, timeline, timelineIndex])

  if (loading) {
    return (
      <div className="flex h-[calc(100dvh-7rem)] items-center justify-center rounded-[28px] border border-white/10 bg-[#0b3a6b]/40 text-sky-50">
        正在拉取实时台风与风场数据...
      </div>
    )
  }

  if (error || !liveData || !warningData) {
    return (
      <div className="flex h-[calc(100dvh-7rem)] items-center justify-center rounded-[28px] border border-rose-400/20 bg-rose-500/10 p-10 text-rose-100">
        {error}
      </div>
    )
  }

  return (
    <div className="relative h-[calc(100dvh-5.5rem)] min-h-[560px] overflow-hidden rounded-[28px] border border-white/15 shadow-[0_24px_80px_rgba(4,20,48,0.45)] sm:h-[calc(100dvh-6rem)]">
      {/* 全屏地图 + 风场粒子 */}
      <StormMap
        storms={liveData.storms}
        activeStormId={activeStorm?.id}
        showForecast={showForecast}
        showWindCircle={showWindCircle}
        showParticles
        showCities
        windVectors={liveData.windVectors}
        hangzhouWeather={scaledWeather}
        windSpeedScale={windSpeedScale}
        baseMap={baseMap}
        immersive
        onSelectStorm={setSelectedStormId}
      />

      {/* 左上关闭/返回风格按钮（装饰 + 收起面板） */}
      <div className="pointer-events-none absolute inset-0 z-[550]">
        <div className="pointer-events-auto absolute left-3 top-3 sm:left-4 sm:top-4">
          <button
            type="button"
            onClick={() => {
              setShowLayerPanel(false)
              setShowStormPanel(false)
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-[rgba(220,235,250,0.92)] text-[#1a4a7a] shadow-lg backdrop-blur-md transition hover:bg-white"
            aria-label="关闭面板"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 右上地图控件 */}
        <div className="pointer-events-auto absolute right-3 top-3 flex flex-col gap-2.5 sm:right-4 sm:top-4">
          <button
            type="button"
            onClick={() => {
              setShowLayerPanel((v) => !v)
              setShowStormPanel(false)
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-[rgba(220,235,250,0.92)] text-[#1a4a7a] shadow-lg backdrop-blur-md transition hover:bg-white"
            aria-label="图层"
          >
            <Layers className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setBaseMap((prev) => (prev === 'ocean' ? 'dark' : 'ocean'))}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-[rgba(220,235,250,0.92)] text-[#1a4a7a] shadow-lg backdrop-blur-md transition hover:bg-white"
            aria-label="切换底图"
            title="切换底图"
          >
            <Navigation2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowStormPanel((v) => !v)
              setShowLayerPanel(false)
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-[rgba(220,235,250,0.92)] text-[#1a4a7a] shadow-lg backdrop-blur-md transition hover:bg-white"
            aria-label="台风列表"
          >
            <List className="h-5 w-5" />
          </button>
        </div>

        {/* 图层面板 */}
        {showLayerPanel && (
          <div className="pointer-events-auto absolute right-3 top-[10.5rem] w-52 rounded-2xl border border-white/35 bg-[rgba(230,242,255,0.94)] p-3 shadow-xl backdrop-blur-md sm:right-4">
            <div className="mb-2 text-xs font-semibold text-[#1a4a7a]">图层与底图</div>
            <div className="space-y-1.5">
              {Object.entries(layerText).map(([key, label]) => {
                const enabled = { showForecast, showWindCircle, showWarnings }[key as keyof typeof layerText]
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleLayer(key as keyof typeof layerText)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                      enabled ? 'bg-[#1a4a7a] text-white' : 'bg-white/70 text-[#2a5f8f] hover:bg-white'
                    }`}
                  >
                    <span>{label}</span>
                    <span className="text-[10px] opacity-80">{enabled ? '开' : '关'}</span>
                  </button>
                )
              })}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {baseMapOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setBaseMap(option.key)}
                  className={`rounded-xl px-2 py-2 text-xs transition ${
                    baseMap === option.key
                      ? 'bg-[#1a4a7a] text-white'
                      : 'bg-white/70 text-[#2a5f8f] hover:bg-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 台风列表面板 */}
        {showStormPanel && (
          <div className="pointer-events-auto absolute right-3 top-[10.5rem] max-h-[50vh] w-64 overflow-y-auto rounded-2xl border border-white/35 bg-[rgba(230,242,255,0.94)] p-3 shadow-xl backdrop-blur-md sm:right-4">
            <div className="mb-2 text-xs font-semibold text-[#1a4a7a]">活跃台风</div>
            <div className="space-y-2">
              {liveData.storms.map((storm) => {
                const active = storm.id === activeStorm?.id
                return (
                  <button
                    key={storm.id}
                    type="button"
                    onClick={() => setSelectedStormId(storm.id)}
                    className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                      active ? 'bg-[#1a4a7a] text-white' : 'bg-white/70 text-[#1e4d78] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{storm.nameCn}</span>
                      <span className="text-[10px] opacity-80">{storm.intensity}</span>
                    </div>
                    <div className={`mt-1 text-[11px] ${active ? 'text-sky-100/80' : 'text-[#5a7a9a]'}`}>
                      {storm.latestPoint.lat.toFixed(1)}°N / {storm.latestPoint.lng.toFixed(1)}°E
                    </div>
                  </button>
                )
              })}
            </div>
            {activeStorm && (
              <Link
                to={`/storm/${activeStorm.id}`}
                className="mt-3 flex w-full items-center justify-center rounded-xl bg-white/90 py-2.5 text-sm font-medium text-[#1a4a7a] transition hover:bg-white"
              >
                查看 {activeStorm.nameCn} 详情
              </Link>
            )}
          </div>
        )}

        {/* 预警简讯（左下侧，时间轴上方） */}
        {showWarnings && (
          <div className="pointer-events-auto absolute bottom-28 left-3 max-w-[220px] sm:bottom-32 sm:left-4 sm:max-w-[260px]">
            <div className="rounded-2xl border border-white/30 bg-[rgba(220,235,250,0.9)] px-3 py-2.5 shadow-lg backdrop-blur-md">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5a7a9a]">预警焦点</div>
              <div className="mt-1 text-sm font-semibold text-[#163d66]">{warningData.highestLevel} · {activeStorm?.nameCn ?? '—'}</div>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#3d648c]">
                {warningData.items[0]?.message ?? warningData.coastalFocus}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-[#3d648c]">
                <span className="rounded-full bg-white/70 px-2 py-0.5">
                  风速 {Math.round(scaledWeather?.windSpeedKmh ?? 0)} km/h
                </span>
                <span className="rounded-full bg-white/70 px-2 py-0.5">
                  阵风 {Math.round(scaledWeather?.windGustKmh ?? 0)} km/h
                </span>
                <span className="rounded-full bg-white/70 px-2 py-0.5">
                  {scaledWeather?.pressureHpa ?? '—'} hPa
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 底部时间轴播放条 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3 sm:bottom-5 sm:px-6">
          <WindTimelineBar
            points={timeline}
            activeIndex={timelineIndex}
            playing={playing}
            onTogglePlay={() => setPlaying((v) => !v)}
            onSelectIndex={(index) => {
              setTimelineIndex(index)
              setPlaying(false)
            }}
          />
        </div>
      </div>
    </div>
  )
}
