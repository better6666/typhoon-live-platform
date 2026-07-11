export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical'

export interface StormPoint {
  time: string
  lat: number
  lng: number
  intensity: string
  windSpeedKts: number
  pressureHpa: number
  moveDir: string
  moveSpeedKmh: number
  isForecast: boolean
}

export interface WindCircle {
  level: '7' | '10' | '12'
  radiusKm: {
    ne: number
    se: number
    sw: number
    nw: number
  }
}

export interface AreaImpact {
  name: string
  severity: SeverityLevel
  eta: string
  rainRisk: string
  windRisk: string
}

export interface WarningItem {
  level: string
  region: string
  message: string
}

export interface WeatherSnapshot {
  name: string
  time: string
  lat: number
  lng: number
  windSpeedKmh: number
  windDirectionDeg: number
  windGustKmh: number
  pressureHpa: number
}

export interface WeatherTimelinePoint {
  time: string
  windSpeedKmh: number
  windDirectionDeg: number
  windGustKmh: number
  pressureHpa?: number
  precipitationMm?: number
}

export interface WindVectorPoint {
  lat: number
  lng: number
  windSpeedKmh: number
  windDirectionDeg: number
  windGustKmh: number
}

export interface StormSummary {
  id: string
  nameCn: string
  nameEn: string
  internationalCode: string
  status: 'active' | 'inactive'
  basin: string
  intensity: string
  maxWindKts: number
  minPressureHpa: number
  lastUpdated: string
  latestPoint: StormPoint
  dataSource?: string
  landfallNarrative?: string
}

export interface StormDetail extends StormSummary {
  points: StormPoint[]
  windCircles: WindCircle[]
  affectedAreas: AreaImpact[]
  warnings: WarningItem[]
  localWeather?: WeatherSnapshot
  windVectors?: WindVectorPoint[]
  localTimeline?: WeatherTimelinePoint[]
}

export interface LiveStormsResponse {
  updatedAt: string
  summary: {
    activeCount: number
    strongestStormName: string
    highestWarningLevel: string
    nextLandfallWindow: string
  }
  storms: StormDetail[]
  hangzhouWeather?: WeatherSnapshot
  windVectors?: WindVectorPoint[]
  hangzhouTimeline?: WeatherTimelinePoint[]
}

export interface WarningOverviewResponse {
  updatedAt: string
  highestLevel: string
  coastalFocus: string
  items: WarningItem[]
  hangzhouWeather?: WeatherSnapshot
  sources?: string[]
}

export interface HistoryQuery {
  year?: string
  basin?: string
  landfall?: string
  intensity?: string
}

export interface HistoryResponse {
  filters: HistoryQuery
  storms: StormSummary[]
}

export interface CompareResponse {
  ids: string[]
  storms: StormDetail[]
}
