import { useEffect, useMemo, useState } from 'react'
import { Filter, Search } from 'lucide-react'
import type { CompareResponse, HistoryQuery, HistoryResponse } from '@shared/storm'
import StormMap from '@/components/StormMap'
import CompareChart from '@/components/CompareChart'
import { usePageTitle } from '@/hooks/usePageTitle'
import { compareHistory, getHistory } from '@/lib/api'

const defaultFilters: HistoryQuery = {
  year: '',
  basin: '',
  intensity: '',
}

export default function HistoryPage() {
  usePageTitle('历史台风对比 · 台风路径实时可视化平台')
  const [filters, setFilters] = useState<HistoryQuery>(defaultFilters)
  const [history, setHistory] = useState<HistoryResponse | null>(null)
  const [compareData, setCompareData] = useState<CompareResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getHistory(filters)
      .then((response) => {
        setHistory(response)
        const ids = response.storms.slice(0, 2).map((storm) => storm.id)
        return compareHistory(ids)
      })
      .then((response) => setCompareData(response))
      .finally(() => setLoading(false))
  }, [filters])

  const storyText = useMemo(() => {
    if (!compareData?.storms.length) return '暂无可对比的历史台风样本。'
    return compareData.storms
      .map(
        (storm) =>
          `${storm.nameCn}在${new Date(storm.lastUpdated).getFullYear()}年达到${storm.intensity}级别，最大风速 ${storm.maxWindKts} kt，最低气压 ${storm.minPressureHpa} hPa。`,
      )
      .join(' ')
  }, [compareData])

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.16),transparent_30%),rgba(255,255,255,0.05)] p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.34em] text-cyan-100/55">Historical Replay</div>
            <h1 className="mt-3 font-display text-5xl text-white">历史台风对比复盘</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
              按年份、海域与强度筛选历史台风，对比登陆路径、生命周期和强度极值，用于演示、教学与应急培训复盘。
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-cyan-100/55">
            <Filter className="h-4 w-4" />
            检索筛选
          </div>
          <div className="mt-5 grid gap-4">
            <label className="text-sm text-slate-300">
              年份
              <input
                value={filters.year ?? ''}
                onChange={(event) => setFilters((prev) => ({ ...prev, year: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white outline-none transition focus:border-cyan-300/40"
                placeholder="例如 2019"
              />
            </label>
            <label className="text-sm text-slate-300">
              海域
              <select
                value={filters.basin ?? ''}
                onChange={(event) => setFilters((prev) => ({ ...prev, basin: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white outline-none transition focus:border-cyan-300/40"
              >
                <option value="">全部海域</option>
                <option value="西北太平洋">西北太平洋</option>
                <option value="南海">南海</option>
              </select>
            </label>
            <label className="text-sm text-slate-300">
              强度
              <select
                value={filters.intensity ?? ''}
                onChange={(event) => setFilters((prev) => ({ ...prev, intensity: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white outline-none transition focus:border-cyan-300/40"
              >
                <option value="">全部强度</option>
                <option value="台风">台风</option>
                <option value="强台风">强台风</option>
                <option value="超强台风">超强台风</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => setFilters(defaultFilters)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10"
            >
              <Search className="h-4 w-4" />
              重置筛选
            </button>
          </div>
          <div className="mt-6 rounded-[24px] border border-white/10 bg-black/10 p-4 text-sm leading-7 text-slate-300">
            {storyText}
          </div>
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-10 text-slate-200">正在加载历史台风样本...</div>
          ) : (
            <>
              <StormMap storms={compareData?.storms ?? []} showForecast={false} showWindCircle={false} />
              {compareData && <CompareChart storms={compareData.storms} />}
            </>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
        <div className="text-xs uppercase tracking-[0.26em] text-cyan-100/55">历史样本</div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {history?.storms.map((storm) => (
            <div key={storm.id} className="rounded-[24px] border border-white/10 bg-slate-950/35 p-4">
              <div className="text-lg text-white">{storm.nameCn}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{storm.nameEn}</div>
              <div className="mt-4 space-y-2 text-sm text-slate-300">
                <div>年份：{new Date(storm.lastUpdated).getFullYear()}</div>
                <div>最大风速：{storm.maxWindKts} kt</div>
                <div>最低气压：{storm.minPressureHpa} hPa</div>
                <div>海域：{storm.basin}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
