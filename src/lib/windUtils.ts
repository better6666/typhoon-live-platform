/** 16 方位中文风向（与气象图一致，如「东东北」） */
export function toWindDirLabel(deg: number): string {
  const labels = [
    '北',
    '北东北',
    '东北',
    '东东北',
    '东',
    '东东南',
    '东南',
    '南东南',
    '南',
    '南西南',
    '西南',
    '西西南',
    '西',
    '西西北',
    '西北',
    '北西北',
  ]
  const normalized = ((deg % 360) + 360) % 360
  return labels[Math.round(normalized / 22.5) % 16]
}

export function formatTimelineLabel(iso: string, index: number): string {
  if (index === 0) return '现在'
  const date = new Date(iso)
  const hour = date.getHours()
  const period = hour < 12 ? '上午' : hour < 18 ? '下午' : '晚上'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${period}${h12}时`
}

export function formatTimelineDate(iso: string): string {
  const date = new Date(iso)
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`
}
