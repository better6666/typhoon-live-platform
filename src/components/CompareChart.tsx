import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { StormDetail } from '@shared/storm'

interface CompareChartProps {
  storms: StormDetail[]
}

export default function CompareChart({ storms }: CompareChartProps) {
  const data = storms.map((storm) => ({
    名称: storm.nameCn,
    最大风速: storm.maxWindKts,
    最低气压: storm.minPressureHpa,
    生命周期: storm.points.length,
  }))

  return (
    <div className="h-80 rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
      <div className="mb-4">
        <div className="text-xs uppercase tracking-[0.26em] text-cyan-100/55">历史对比</div>
        <div className="mt-2 text-xl font-semibold text-white">关键指标横向对照</div>
      </div>
      <ResponsiveContainer width="100%" height="78%">
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
          <XAxis dataKey="名称" tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: 'rgba(15, 23, 42, 0.94)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
            }}
          />
          <Bar dataKey="最大风速" fill="#22d3ee" radius={[6, 6, 0, 0]} />
          <Bar dataKey="生命周期" fill="#818cf8" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
