import type {
  CompareResponse,
  HistoryQuery,
  HistoryResponse,
  LiveStormsResponse,
  StormDetail,
  StormPoint,
  StormSummary,
  WarningOverviewResponse,
  WeatherSnapshot,
  WeatherTimelinePoint,
  WindVectorPoint,
} from '@shared/storm'

const PANAHON_URL =
  'https://cdn.panahon.gov.ph/api/v1/cyclone-track?token=6y7PVj9dOCf3Gk4IXhQSEJLI2GfvQJDdhDSDLCSB'

const HANGZHOU = {
  name: '杭州',
  lat: 30.2741,
  lng: 120.1551,
}

const intensityMeta: Record<
  string,
  { intensity: string; windSpeedKts: number; pressureHpa: number; riskLevel: string }
> = {
  TD: { intensity: '热带低压', windSpeedKts: 28, pressureHpa: 1000, riskLevel: '蓝色' },
  STS: { intensity: '强热带风暴', windSpeedKts: 52, pressureHpa: 985, riskLevel: '黄色' },
  TY: { intensity: '台风', windSpeedKts: 78, pressureHpa: 960, riskLevel: '橙色' },
  STY: { intensity: '超强台风', windSpeedKts: 110, pressureHpa: 930, riskLevel: '红色' },
}

interface PanahonCyclonePoint {
  cyclone_type: string
  date: string
  time: string
  latitude: string
  longitude: string
  radius: string
}

interface PanahonCyclone {
  cyclone_name: string
  info: Record<string, PanahonCyclonePoint>
}

interface OpenMeteoResponse {
  current: {
    time: string
    wind_speed_10m: number
    wind_direction_10m: number
    wind_gusts_10m: number
    pressure_msl: number
  }
  hourly: {
    time: string[]
    wind_speed_10m: number[]
    wind_direction_10m: number[]
    wind_gusts_10m: number[]
    pressure_msl?: number[]
    precipitation?: number[]
  }
}

interface LiveBundle {
  updatedAt: string
  liveStorms: StormDetail[]
  hangzhouWeather: WeatherSnapshot
  windVectors: WindVectorPoint[]
  hangzhouTimeline: WeatherTimelinePoint[]
}

let liveCache: { expiresAt: number; value: LiveBundle } | null = null

const point = (
  time: string,
  lat: number,
  lng: number,
  intensity: string,
  windSpeedKts: number,
  pressureHpa: number,
  moveDir: string,
  moveSpeedKmh: number,
  isForecast = false,
): StormPoint => ({
  time,
  lat,
  lng,
  intensity,
  windSpeedKts,
  pressureHpa,
  moveDir,
  moveSpeedKmh,
  isForecast,
})

const historicalStorms: StormDetail[] = [
  {
    id: 'DUJUAN-2023',
    nameCn: '杜鹃',
    nameEn: 'DUJUAN',
    internationalCode: '2315',
    status: 'inactive',
    basin: '西北太平洋',
    intensity: '强台风',
    maxWindKts: 100,
    minPressureHpa: 935,
    lastUpdated: '2023-09-04T20:00:00+08:00',
    latestPoint: point('2023-09-04T20:00:00+08:00', 25.2, 119.8, '台风', 65, 970, '北偏西', 18),
    points: [
      point('2023-08-31T08:00:00+08:00', 17.1, 132.4, '台风', 70, 968, '西北', 18),
      point('2023-09-01T08:00:00+08:00', 18.8, 129.8, '强台风', 88, 950, '西北', 18),
      point('2023-09-02T08:00:00+08:00', 20.7, 126.7, '强台风', 100, 935, '西北', 16),
      point('2023-09-03T08:00:00+08:00', 22.4, 123.8, '强台风', 96, 940, '西北偏西', 16),
      point('2023-09-04T20:00:00+08:00', 25.2, 119.8, '台风', 65, 970, '北偏西', 18),
    ],
    windCircles: [],
    affectedAreas: [],
    warnings: [],
  },
  {
    id: 'LEKIMA-2019',
    nameCn: '利奇马',
    nameEn: 'LEKIMA',
    internationalCode: '1909',
    status: 'inactive',
    basin: '西北太平洋',
    intensity: '超强台风',
    maxWindKts: 130,
    minPressureHpa: 920,
    lastUpdated: '2019-08-12T14:00:00+08:00',
    latestPoint: point('2019-08-12T14:00:00+08:00', 37.1, 121.4, '热带风暴', 45, 990, '北偏东', 24),
    points: [
      point('2019-08-07T08:00:00+08:00', 20.6, 127.9, '台风', 70, 975, '西北', 20),
      point('2019-08-08T20:00:00+08:00', 23.1, 125.2, '强台风', 105, 935, '西北', 20),
      point('2019-08-09T20:00:00+08:00', 26.2, 122.2, '超强台风', 130, 920, '北偏西', 18),
      point('2019-08-10T14:00:00+08:00', 28.4, 121.2, '台风', 85, 960, '北', 22),
      point('2019-08-12T14:00:00+08:00', 37.1, 121.4, '热带风暴', 45, 990, '北偏东', 24),
    ],
    windCircles: [],
    affectedAreas: [],
    warnings: [],
  },
]

const toSummary = (storm: StormDetail): StormSummary => ({
  id: storm.id,
  nameCn: storm.nameCn,
  nameEn: storm.nameEn,
  internationalCode: storm.internationalCode,
  status: storm.status,
  basin: storm.basin,
  intensity: storm.intensity,
  maxWindKts: storm.maxWindKts,
  minPressureHpa: storm.minPressureHpa,
  lastUpdated: storm.lastUpdated,
  latestPoint: storm.latestPoint,
  dataSource: storm.dataSource,
  landfallNarrative: storm.landfallNarrative,
})

function normalizeCycloneName(name: string) {
  const match = name.match(/\{([^}]+)\}/)
  return {
    displayName: match?.[1] ?? name,
    nameCn: match?.[1] === 'BAVI' ? '巴威' : match?.[1] ?? name,
  }
}

function toLocalIso(date: string, time: string) {
  return `${date}T${time}:00+08:00`
}

function computeBearing(from: StormPoint, to: StormPoint) {
  const lat1 = (from.lat * Math.PI) / 180
  const lat2 = (to.lat * Math.PI) / 180
  const deltaLng = ((to.lng - from.lng) * Math.PI) / 180
  const y = Math.sin(deltaLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

function bearingToDirection(deg: number) {
  const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
  return dirs[Math.round(deg / 45) % 8]
}

function haversineKm(from: StormPoint, to: StormPoint) {
  const r = 6371
  const dLat = ((to.lat - from.lat) * Math.PI) / 180
  const dLng = ((to.lng - from.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) * Math.cos((to.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(a))
}

function createFallbackWeather(): WeatherSnapshot {
  return {
    name: HANGZHOU.name,
    time: new Date().toISOString(),
    lat: HANGZHOU.lat,
    lng: HANGZHOU.lng,
    windSpeedKmh: 20,
    windDirectionDeg: 70,
    windGustKmh: 42,
    pressureHpa: 998,
  }
}

function createFallbackLiveBundle(): LiveBundle {
  const hangzhouWeather = createFallbackWeather()
  const hangzhouTimeline: WeatherTimelinePoint[] = [
    { time: '2026-07-11T18:00:00+08:00', windSpeedKmh: 24, windDirectionDeg: 48, windGustKmh: 55, pressureHpa: 998, precipitationMm: 1.2 },
    { time: '2026-07-11T19:00:00+08:00', windSpeedKmh: 26, windDirectionDeg: 38, windGustKmh: 58, pressureHpa: 997, precipitationMm: 2.8 },
    { time: '2026-07-11T20:00:00+08:00', windSpeedKmh: 28, windDirectionDeg: 32, windGustKmh: 66, pressureHpa: 996, precipitationMm: 4.6 },
    { time: '2026-07-11T21:00:00+08:00', windSpeedKmh: 31, windDirectionDeg: 28, windGustKmh: 70, pressureHpa: 995, precipitationMm: 5.1 },
  ]
  const windVectors: WindVectorPoint[] = [
    { lat: 28.9, lng: 119.1, windSpeedKmh: 22, windDirectionDeg: 70, windGustKmh: 42 },
    { lat: 29.9, lng: 119.7, windSpeedKmh: 22, windDirectionDeg: 70, windGustKmh: 42 },
    { lat: 30.3, lng: 120.2, windSpeedKmh: 28, windDirectionDeg: 60, windGustKmh: 55 },
    { lat: 30.8, lng: 120.8, windSpeedKmh: 24, windDirectionDeg: 48, windGustKmh: 47 },
    { lat: 31.4, lng: 121.5, windSpeedKmh: 30, windDirectionDeg: 40, windGustKmh: 62 },
  ]
  const fallbackStorm: StormDetail = {
    id: 'BAVI-2026',
    nameCn: '巴威',
    nameEn: 'BAVI',
    internationalCode: '2609',
    status: 'active',
    basin: '东海近岸',
    intensity: '台风',
    maxWindKts: 78,
    minPressureHpa: 960,
    lastUpdated: '2026-07-11T17:00:00+08:00',
    latestPoint: point('2026-07-11T17:00:00+08:00', 26.7, 123.3, '台风', 78, 960, '西北', 28, false),
    points: [
      point('2026-07-10T08:00:00+08:00', 20.7, 127.3, '台风', 78, 960, '西北', 24, false),
      point('2026-07-10T20:00:00+08:00', 22.8, 126.1, '台风', 78, 960, '西北', 25, false),
      point('2026-07-11T08:00:00+08:00', 25.0, 124.7, '台风', 78, 960, '西北', 27, false),
      point('2026-07-11T17:00:00+08:00', 26.7, 123.3, '台风', 78, 960, '西北', 28, false),
      point('2026-07-12T02:00:00+08:00', 28.6, 120.6, '强热带风暴', 52, 985, '西北', 24, true),
    ],
    windCircles: [{ level: '7', radiusKm: { ne: 180, se: 180, sw: 180, nw: 180 } }],
    affectedAreas: [
      { name: '浙江沿海', severity: 'high', eta: '今夜至明晨', rainRisk: '暴雨到大暴雨', windRisk: '9-11 级阵风' },
      { name: '杭州', severity: 'medium', eta: '当前至未来 12 小时', rainRisk: '中到大雨', windRisk: '8-9 级阵风' },
    ],
    warnings: [
      { level: '黄色', region: '杭州', message: '外部实时数据暂不可用，当前展示平台内置兜底样本。' },
    ],
    localWeather: hangzhouWeather,
    windVectors,
    localTimeline: hangzhouTimeline,
    landfallNarrative: '预计巴威今晚到明晨掠过浙江近海，杭州将持续受到外围大风和强降雨影响。',
    dataSource: 'Fallback bundle',
  }

  return {
    updatedAt: hangzhouWeather.time,
    liveStorms: [fallbackStorm],
    hangzhouWeather,
    windVectors,
    hangzhouTimeline,
  }
}

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${url}`)
  }
  return response.json() as Promise<T>
}

async function fetchWeather(lat = HANGZHOU.lat, lng = HANGZHOU.lng, name = HANGZHOU.name) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    '&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl' +
    '&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,precipitation&forecast_hours=8&timezone=Asia%2FShanghai'
  const data = await requestJson<OpenMeteoResponse>(url)
  return {
    snapshot: {
      name,
      time: `${data.current.time}:00+08:00`,
      lat,
      lng,
      windSpeedKmh: data.current.wind_speed_10m,
      windDirectionDeg: data.current.wind_direction_10m,
      windGustKmh: data.current.wind_gusts_10m,
      pressureHpa: data.current.pressure_msl,
    } satisfies WeatherSnapshot,
    timeline: data.hourly.time.map((time, index) => ({
      time: `${time}:00+08:00`,
      windSpeedKmh: data.hourly.wind_speed_10m[index],
      windDirectionDeg: data.hourly.wind_direction_10m[index],
      windGustKmh: data.hourly.wind_gusts_10m[index],
      pressureHpa: data.hourly.pressure_msl?.[index],
      precipitationMm: data.hourly.precipitation?.[index],
    })) satisfies WeatherTimelinePoint[],
  }
}

async function fetchWindVectors() {
  const coords = [
    [28.6, 119.0],
    [28.9, 120.1],
    [29.2, 121.2],
    [29.5, 122.1],
    [29.8, 119.2],
    [30.1, 120.1],
    [30.4, 121.0],
    [30.7, 121.9],
    [31.0, 119.3],
    [31.2, 120.2],
    [31.4, 121.1],
    [31.6, 122.0],
  ]

  const result = await Promise.all(
    coords.map(async ([lat, lng]) => {
      const { snapshot } = await fetchWeather(lat, lng, `${lat.toFixed(1)},${lng.toFixed(1)}`)
      return {
        lat,
        lng,
        windSpeedKmh: snapshot.windSpeedKmh,
        windDirectionDeg: snapshot.windDirectionDeg,
        windGustKmh: snapshot.windGustKmh,
      } satisfies WindVectorPoint
    }),
  )

  return result
}

async function fetchLiveStormsFromPanahon(hangzhouWeather: WeatherSnapshot, windVectors: WindVectorPoint[]) {
  const data = await requestJson<PanahonCyclone[]>(PANAHON_URL)
  const now = Date.now()

  return data.map((cyclone, index) => {
    const { displayName, nameCn } = normalizeCycloneName(cyclone.cyclone_name)
    const orderedEntries = Object.values(cyclone.info).sort((a, b) =>
      toLocalIso(a.date, a.time).localeCompare(toLocalIso(b.date, b.time)),
    )

    const points = orderedEntries.map((entry, pointIndex) => {
      const meta = intensityMeta[entry.cyclone_type] ?? intensityMeta.TD
      const time = toLocalIso(entry.date, entry.time)
      const previous = pointIndex > 0
        ? point(
            toLocalIso(orderedEntries[pointIndex - 1].date, orderedEntries[pointIndex - 1].time),
            Number(orderedEntries[pointIndex - 1].latitude),
            Number(orderedEntries[pointIndex - 1].longitude),
            meta.intensity,
            meta.windSpeedKts,
            meta.pressureHpa,
            '北',
            0,
            false,
          )
        : null

      const draft = point(
        time,
        Number(entry.latitude),
        Number(entry.longitude),
        meta.intensity,
        meta.windSpeedKts,
        meta.pressureHpa,
        '北',
        0,
        new Date(time).getTime() > now,
      )

      if (!previous) return draft

      const bearing = computeBearing(previous, draft)
      const hours = Math.max(1, (new Date(draft.time).getTime() - new Date(previous.time).getTime()) / 3600000)
      const speed = Math.round(haversineKm(previous, draft) / hours)
      return {
        ...draft,
        moveDir: bearingToDirection(bearing),
        moveSpeedKmh: speed,
      }
    })

    const latestPoint = [...points].reverse().find((item) => !item.isForecast) ?? points[points.length - 1]
    const latestEntry = orderedEntries[Math.max(0, orderedEntries.length - 1)]
    const latestMeta = intensityMeta[latestEntry.cyclone_type] ?? intensityMeta.TD
    const radius = Number(latestEntry.radius || '0')
    const distanceToHangzhou = haversineKm(
      point(hangzhouWeather.time, HANGZHOU.lat, HANGZHOU.lng, '观测点', 0, 0, '北', 0, false),
      latestPoint,
    )

    return {
      id: `${displayName}-${new Date(latestPoint.time).getFullYear()}`,
      nameCn,
      nameEn: displayName,
      internationalCode: `${new Date(latestPoint.time).getFullYear().toString().slice(2)}${String(index + 1).padStart(2, '0')}`,
      status: 'active',
      basin: latestPoint.lng < 123 ? '东海近岸' : '西北太平洋',
      intensity: latestMeta.intensity,
      maxWindKts: Math.max(...points.map((item) => item.windSpeedKts)),
      minPressureHpa: Math.min(...points.map((item) => item.pressureHpa)),
      lastUpdated: latestPoint.time,
      latestPoint,
      points,
      windCircles:
        radius > 0
          ? [{ level: '7', radiusKm: { ne: radius, se: radius, sw: radius, nw: radius } }]
          : [],
      affectedAreas: [
        { name: '浙江沿海', severity: distanceToHangzhou < 350 ? 'critical' : 'high', eta: '12-24 小时', rainRisk: '暴雨到大暴雨', windRisk: '9-12 级阵风' },
        { name: '杭州', severity: hangzhouWeather.windGustKmh >= 60 ? 'high' : 'medium', eta: '当前至未来 12 小时', rainRisk: '大雨到暴雨', windRisk: `${Math.round(hangzhouWeather.windGustKmh)} km/h 阵风` },
        { name: '钱塘江沿线', severity: 'high', eta: '当前至未来 24 小时', rainRisk: '短时强降水', windRisk: '潮位与大风叠加风险' },
      ],
      warnings: [
        { level: latestMeta.riskLevel, region: '浙江沿海', message: `${nameCn}正在向浙闽沿海靠近，需关注登陆和近岸风暴潮风险。` },
        { level: hangzhouWeather.windGustKmh >= 60 ? '黄色' : '蓝色', region: '杭州', message: `杭州当前实测阵风约 ${Math.round(hangzhouWeather.windGustKmh)} km/h，气压 ${hangzhouWeather.pressureHpa} hPa。` },
      ],
      localWeather: hangzhouWeather,
      windVectors,
      localTimeline: [],
      landfallNarrative:
        latestPoint.lng < 122.5
          ? `${nameCn}已逼近浙江近海，预计今夜至明晨对浙北和杭州湾一带造成明显风雨影响。`
          : `${nameCn}正持续向浙闽沿海推进，杭州将先受外围环流影响，再进入主风雨时段。`,
      dataSource: 'Panahon + Open-Meteo',
    } satisfies StormDetail
  })
}

async function loadLiveBundle(): Promise<LiveBundle> {
  if (liveCache && liveCache.expiresAt > Date.now()) {
    return liveCache.value
  }

  try {
    const { snapshot: hangzhouWeather, timeline: hangzhouTimeline } = await fetchWeather()
    const windVectors = await fetchWindVectors()
    const liveStorms = (await fetchLiveStormsFromPanahon(hangzhouWeather, windVectors)).map((storm) => ({
      ...storm,
      localTimeline: hangzhouTimeline,
    }))

    const bundle = {
      updatedAt: hangzhouWeather.time,
      liveStorms,
      hangzhouWeather,
      windVectors,
      hangzhouTimeline,
    }

    liveCache = {
      expiresAt: Date.now() + 5 * 60 * 1000,
      value: bundle,
    }

    return bundle
  } catch {
    const fallbackBundle = createFallbackLiveBundle()
    liveCache = {
      expiresAt: Date.now() + 60 * 1000,
      value: fallbackBundle,
    }
    return fallbackBundle
  }
}

export async function getLiveStorms(): Promise<LiveStormsResponse> {
  const bundle = await loadLiveBundle()
  const strongestStorm = bundle.liveStorms[0]

  return {
    updatedAt: bundle.updatedAt,
    summary: {
      activeCount: bundle.liveStorms.length,
      strongestStormName: strongestStorm?.nameCn ?? '暂无',
      highestWarningLevel: bundle.hangzhouWeather.windGustKmh >= 60 ? '黄色' : '蓝色',
      nextLandfallWindow: '今夜至明晨',
    },
    storms: bundle.liveStorms.map(toSummary),
    hangzhouWeather: bundle.hangzhouWeather,
    windVectors: bundle.windVectors,
    hangzhouTimeline: bundle.hangzhouTimeline,
  }
}

export async function getStormDetail(stormId: string) {
  const bundle = await loadLiveBundle()
  const liveMatch = bundle.liveStorms.find((storm) => storm.id === stormId)
  if (liveMatch) return liveMatch
  return historicalStorms.find((storm) => storm.id === stormId) ?? null
}

export async function getWarningsOverview(): Promise<WarningOverviewResponse> {
  const bundle = await loadLiveBundle()
  const liveWarnings = bundle.liveStorms.flatMap((storm) => storm.warnings).slice(0, 6)

  return {
    updatedAt: bundle.updatedAt,
    highestLevel: bundle.hangzhouWeather.windGustKmh >= 60 ? '黄色' : '蓝色',
    coastalFocus: '浙江沿海、杭州湾、钱塘江流域',
    items: liveWarnings.length
      ? liveWarnings
      : [{ level: '蓝色', region: '杭州', message: '当前未获取到外部预警数据，已展示实时风速与气压。' }],
    hangzhouWeather: bundle.hangzhouWeather,
    sources: ['Panahon 台风轨迹', 'Open-Meteo 实时风速/阵风/气压'],
  }
}

export async function getHistory(filters: HistoryQuery): Promise<HistoryResponse> {
  const result = historicalStorms.filter((storm) => storm.status === 'inactive').filter((storm) => {
    if (filters.year && !storm.lastUpdated.startsWith(filters.year)) return false
    if (filters.basin && storm.basin !== filters.basin) return false
    if (filters.intensity && storm.intensity !== filters.intensity) return false
    if (filters.landfall && !storm.points.some((pointItem) => pointItem.lng < 123)) return false
    return true
  })

  return {
    filters,
    storms: result.map(toSummary),
  }
}

export async function compareHistory(ids: string[]): Promise<CompareResponse> {
  return {
    ids,
    storms: historicalStorms.filter((storm) => ids.includes(storm.id)),
  }
}
