import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { StormPoint } from '@shared/storm'

interface IntensityChartProps {
  points: StormPoint[]
}

export default function IntensityChart({ points }: IntensityChartProps) {
  const data = points.map((point) => ({
    time: new Date(point.time).toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
    }),
    风速: point.windSpeedKts,
    气压: point.pressureHpa,
  }))

  return (
    <div className="h-72 rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
      <div className="mb-4">
        <div className="text-xs uppercase tracking-[0.26em] text-cyan-100/55">强度剖面</div>
        <div className="mt-2 text-xl font-semibold text-white">风速与气压联动变化</div>
      </div>
      <ResponsiveContainer width="100%" height="78%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="windGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="pressureGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.55} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="wind" tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            yAxisId="pressure"
            orientation="right"
            tick={{ fill: '#fdba74', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(15, 23, 42, 0.94)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
            }}
          />
          <Area type="monotone" yAxisId="wind" dataKey="风速" stroke="#22d3ee" fill="url(#windGradient)" strokeWidth={3} />
          <Area
            type="monotone"
            yAxisId="pressure"
            dataKey="气压"
            stroke="#f97316"
            fill="url(#pressureGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
