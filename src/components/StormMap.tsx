import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import type { StormDetail, StormSummary, WeatherSnapshot, WindVectorPoint } from '@shared/storm'
import { toWindDirLabel } from '@/lib/windUtils'

type MapStorm = StormSummary | StormDetail

export type BaseMapType = 'ocean' | 'hybrid' | 'terrain' | 'dark' | 'street' | 'satellite'

interface StormMapProps {
  storms: MapStorm[]
  activeStormId?: string | null
  showForecast?: boolean
  showWindCircle?: boolean
  showParticles?: boolean
  showCities?: boolean
  windVectors?: WindVectorPoint[]
  hangzhouWeather?: WeatherSnapshot | null
  windSpeedScale?: number
  baseMap?: BaseMapType
  immersive?: boolean
  onSelectStorm?: (stormId: string) => void
}

interface WindSample {
  u: number
  v: number
  speed: number
}

interface Particle {
  x: number
  y: number
  age: number
  maxAge: number
  seed: number
  _u?: number
  _v?: number
  _s?: number
}

const CITY_MARKERS = [
  { name: '杭州', lat: 30.2741, lng: 120.1551, major: true },
  { name: '上海', lat: 31.2304, lng: 121.4737, major: true },
  { name: '南京', lat: 32.0603, lng: 118.7969, major: true },
  { name: '宁波', lat: 29.8683, lng: 121.544, major: false },
  { name: '温州', lat: 27.9939, lng: 120.6994, major: false },
  { name: '福州', lat: 26.0745, lng: 119.2965, major: true },
  { name: '厦门', lat: 24.4798, lng: 118.0894, major: false },
  { name: '台北', lat: 25.033, lng: 121.5654, major: true },
  { name: '合肥', lat: 31.8206, lng: 117.2272, major: false },
  { name: '南昌', lat: 28.682, lng: 115.8579, major: false },
  { name: '武汉', lat: 30.5928, lng: 114.3055, major: false },
  { name: '青岛', lat: 36.0671, lng: 120.3826, major: false },
  { name: '天津', lat: 39.3434, lng: 117.3616, major: false },
  { name: '北京', lat: 39.9042, lng: 116.4074, major: true },
  { name: '首尔', lat: 37.5665, lng: 126.978, major: false },
  { name: '大阪', lat: 34.6937, lng: 135.5023, major: false },
  { name: '那霸', lat: 26.2124, lng: 127.6809, major: false },
]

const SEA_LABELS = [
  { name: '东海', lat: 28.8, lng: 124.8 },
  { name: '黄海', lat: 34.5, lng: 123.2 },
  { name: '渤海', lat: 38.7, lng: 120.0 },
  { name: '南海', lat: 20.5, lng: 116.5 },
  { name: '台湾海峡', lat: 24.4, lng: 119.0 },
  { name: '杭州湾', lat: 30.45, lng: 121.35 },
]

const intensityColor: Record<string, string> = {
  扰动: '#64748b',
  热带低压: '#60a5fa',
  热带风暴: '#2dd4bf',
  强热带风暴: '#22c55e',
  台风: '#f59e0b',
  强台风: '#fb7185',
  超强台风: '#e879f9',
  观测点: '#94a3b8',
}

function getColor(intensity: string) {
  return intensityColor[intensity] ?? '#a78bfa'
}

/** 气象风场色：低蓝 → 青 → 白 → 黄 → 橙 */
function speedToColor(speed: number, alpha: number): string {
  const t = Math.max(0, Math.min(1, speed / 120))
  let r: number
  let g: number
  let b: number
  if (t < 0.25) {
    const k = t / 0.25
    r = 30 + 40 * k
    g = 90 + 110 * k
    b = 180 + 50 * k
  } else if (t < 0.5) {
    const k = (t - 0.25) / 0.25
    r = 70 + 120 * k
    g = 200 + 40 * k
    b = 230 + 25 * k
  } else if (t < 0.75) {
    const k = (t - 0.5) / 0.25
    r = 190 + 50 * k
    g = 240 - 20 * k
    b = 255 - 80 * k
  } else {
    const k = (t - 0.75) / 0.25
    r = 240 + 15 * k
    g = 220 - 80 * k
    b = 175 - 100 * k
  }
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${alpha})`
}

function createBaseLayer(type: BaseMapType): L.Layer {
  if (type === 'satellite') {
    return L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: '&copy; Esri', maxZoom: 18 },
    )
  }

  if (type === 'hybrid') {
    return L.layerGroup([
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: '&copy; Esri', maxZoom: 18 },
      ),
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        { attribution: '', maxZoom: 18, opacity: 0.85 },
      ),
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
        { attribution: '', maxZoom: 18, opacity: 0.45 },
      ),
    ])
  }

  if (type === 'terrain') {
    return L.layerGroup([
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        { attribution: '&copy; Esri', maxZoom: 18, className: 'terrain-basemap-tiles' },
      ),
    ])
  }

  if (type === 'street') {
    return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    })
  }

  if (type === 'dark') {
    return L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO',
      maxZoom: 19,
    })
  }

  // 真实海洋底图 + 标注层（专业气象感）
  return L.layerGroup([
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
      { attribution: '&copy; Esri Ocean', maxZoom: 13, className: 'ocean-basemap-tiles' },
    ),
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',
      { attribution: '', maxZoom: 13, opacity: 0.9, className: 'ocean-ref-tiles' },
    ),
  ])
}

function degToVector(speed: number, directionDeg: number) {
  const rad = ((directionDeg + 180) * Math.PI) / 180
  return {
    u: Math.sin(rad) * speed,
    v: Math.cos(rad) * speed,
  }
}

function sampleWindField(
  lat: number,
  lng: number,
  vectors: WindVectorPoint[],
  stormCenter: { lat: number; lng: number; maxWindKts: number } | null,
  background: { speed: number; directionDeg: number },
  scale: number,
): WindSample {
  let weightSum = 0
  let u = 0
  let v = 0

  // 只取邻近点，提升真实插值与性能
  for (let i = 0; i < vectors.length; i += 1) {
    const vector = vectors[i]
    const dLat = lat - vector.lat
    const dLng = (lng - vector.lng) * Math.cos((lat * Math.PI) / 180)
    const dist2 = dLat * dLat + dLng * dLng
    if (dist2 > 36) continue
    const w = 1 / (dist2 + 0.04)
    const vec = degToVector(vector.windSpeedKmh, vector.windDirectionDeg)
    u += vec.u * w
    v += vec.v * w
    weightSum += w
  }

  if (weightSum > 0) {
    u /= weightSum
    v /= weightSum
  } else {
    const bg = degToVector(background.speed, background.directionDeg)
    u = bg.u
    v = bg.v
  }

  // 台风中心：Rankine 涡 + 向内辐合 + 外围流出
  if (stormCenter) {
    const dLat = lat - stormCenter.lat
    const dLng = (lng - stormCenter.lng) * Math.cos((lat * Math.PI) / 180)
    const dist = Math.sqrt(dLat * dLat + dLng * dLng) + 0.0001
    const rMax = 1.1
    const maxR = 9.5
    if (dist < maxR) {
      const vmax = Math.min(stormCenter.maxWindKts * 1.95, 155)
      let vt: number
      if (dist < rMax) {
        vt = vmax * (dist / rMax)
      } else {
        vt = vmax * (rMax / dist) * Math.exp(-(dist - rMax) * 0.22)
      }
      const radial = dist < rMax * 1.4 ? -vt * 0.28 : vt * 0.08
      const tangentU = (-dLng / dist) * vt
      const tangentV = (dLat / dist) * vt
      const radialU = (dLat / dist) * radial
      const radialV = (dLng / dist) * radial
      const blend = Math.min(1, Math.pow(1 - dist / maxR, 0.65) * 1.15)
      u = u * (1 - blend * 0.82) + (tangentU + radialU) * blend
      v = v * (1 - blend * 0.82) + (tangentV + radialV) * blend
    }
  }

  // 弱地形/海岸扰动噪声，避免过度平滑
  const noise = Math.sin(lat * 12.7 + lng * 9.3) * 1.8 + Math.cos(lat * 5.1 - lng * 7.4) * 1.2
  u += noise * 0.35
  v += noise * 0.25

  u *= scale
  v *= scale
  const speed = Math.sqrt(u * u + v * v)
  return { u, v, speed }
}

function buildDefaultWindCircles(maxWindKts: number) {
  const scale = Math.max(0.7, Math.min(1.6, maxWindKts / 80))
  return [
    { level: '7' as const, radiusKm: { ne: 220 * scale, se: 200 * scale, sw: 180 * scale, nw: 210 * scale } },
    { level: '10' as const, radiusKm: { ne: 120 * scale, se: 110 * scale, sw: 95 * scale, nw: 115 * scale } },
    { level: '12' as const, radiusKm: { ne: 55 * scale, se: 50 * scale, sw: 42 * scale, nw: 52 * scale } },
  ]
}

export default function StormMap({
  storms,
  activeStormId,
  showForecast = true,
  showWindCircle = true,
  showParticles = true,
  showCities = true,
  windVectors = [],
  hangzhouWeather = null,
  windSpeedScale = 1,
  baseMap = 'ocean',
  immersive = false,
  onSelectStorm,
}: StormMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const baseLayerRef = useRef<L.Layer | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef<number>(0)
  const hasFitRef = useRef(false)
  const fieldRef = useRef({
    vectors: windVectors,
    storms,
    activeStormId,
    hangzhouWeather,
    windSpeedScale,
  })
  const [badgePos, setBadgePos] = useState<{ x: number; y: number } | null>(null)
  const [zoomLevel, setZoomLevel] = useState(6)

  fieldRef.current = { vectors: windVectors, storms, activeStormId, hangzhouWeather, windSpeedScale }

  const activeStorm = useMemo(
    () => storms.find((storm) => storm.id === activeStormId) ?? storms[0] ?? null,
    [storms, activeStormId],
  )

  const displaySpeed = Math.round(hangzhouWeather?.windSpeedKmh ?? 0)
  const displayDir = toWindDirLabel(hangzhouWeather?.windDirectionDeg ?? 45)
  const hangzhouLat = hangzhouWeather?.lat ?? 30.2741
  const hangzhouLng = hangzhouWeather?.lng ?? 120.1551

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
      minZoom: 4,
      maxZoom: 12,
      worldCopyJump: true,
    }).setView([29.8, 122.8], immersive ? 6 : 5)

    const baseLayer = createBaseLayer(baseMap).addTo(map)
    baseLayerRef.current = baseLayer
    mapRef.current = map
    setZoomLevel(map.getZoom())

    L.control
      .scale({ imperial: false, metric: true, position: 'bottomleft' })
      .addTo(map)

    const onResize = () => map.invalidateSize()
    const onZoom = () => setZoomLevel(map.getZoom())
    window.addEventListener('resize', onResize)
    map.on('zoomend', onZoom)

    const sizeTimer = window.setTimeout(() => map.invalidateSize(), 80)
    const sizeTimer2 = window.setTimeout(() => map.invalidateSize(), 320)

    return () => {
      window.clearTimeout(sizeTimer)
      window.clearTimeout(sizeTimer2)
      window.removeEventListener('resize', onResize)
      map.off('zoomend', onZoom)
      cancelAnimationFrame(rafRef.current)
      baseLayerRef.current?.remove()
      baseLayerRef.current = null
      map.remove()
      mapRef.current = null
      hasFitRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    baseLayerRef.current?.remove()
    baseLayerRef.current = createBaseLayer(baseMap).addTo(map)
  }, [baseMap])

  // 风速气泡跟随杭州坐标
  useEffect(() => {
    const map = mapRef.current
    if (!map || !immersive || !hangzhouWeather) {
      setBadgePos(null)
      return
    }

    const update = () => {
      const point = map.latLngToContainerPoint([hangzhouLat, hangzhouLng])
      setBadgePos({ x: point.x, y: point.y - 52 })
    }
    update()
    map.on('move', update)
    map.on('zoom', update)
    map.on('resize', update)
    return () => {
      map.off('move', update)
      map.off('zoom', update)
      map.off('resize', update)
    }
  }, [immersive, hangzhouWeather, hangzhouLat, hangzhouLng])

  // 路径 / 风圈 / 城市 / 海域
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const layerGroup = L.layerGroup().addTo(map)
    const bounds = L.latLngBounds([])

    // 海域文字标注
    SEA_LABELS.forEach((sea) => {
      const icon = L.divIcon({
        className: 'sea-label-icon',
        html: `<div class="sea-label">${sea.name}</div>`,
        iconSize: [80, 20],
        iconAnchor: [40, 10],
      })
      L.marker([sea.lat, sea.lng], { icon, interactive: false, zIndexOffset: -200 }).addTo(layerGroup)
    })

    storms.forEach((storm) => {
      const points = 'points' in storm ? storm.points : [storm.latestPoint]
      const actualPoints = points.filter((point) => !point.isForecast)
      const forecastPoints = points.filter((point) => point.isForecast)
      const baseColor = getColor(storm.intensity)
      const isActive = storm.id === activeStormId

      actualPoints.forEach((point) => bounds.extend([point.lat, point.lng]))
      forecastPoints.forEach((point) => bounds.extend([point.lat, point.lng]))

      // 路径光晕 + 主线
      if (actualPoints.length > 1) {
        const latlngs = actualPoints.map((point) => [point.lat, point.lng] as [number, number])
        L.polyline(latlngs, {
          color: baseColor,
          weight: isActive ? 10 : 7,
          opacity: 0.18,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layerGroup)
        L.polyline(latlngs, {
          color: baseColor,
          weight: isActive ? 4.5 : 3,
          opacity: isActive ? 0.95 : 0.6,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layerGroup)

        // 分段强度色点连线提示
        actualPoints.forEach((point, index) => {
          if (index === 0) return
          const prev = actualPoints[index - 1]
          L.polyline(
            [
              [prev.lat, prev.lng],
              [point.lat, point.lng],
            ],
            {
              color: getColor(point.intensity),
              weight: isActive ? 3 : 2,
              opacity: 0.55,
            },
          ).addTo(layerGroup)
        })
      }

      if (showForecast && forecastPoints.length > 0 && actualPoints.length > 0) {
        const forecastLine = [
          [actualPoints[actualPoints.length - 1].lat, actualPoints[actualPoints.length - 1].lng] as [number, number],
          ...forecastPoints.map((point) => [point.lat, point.lng] as [number, number]),
        ]
        L.polyline(forecastLine, {
          color: '#f8fafc',
          weight: isActive ? 8 : 5,
          opacity: 0.12,
        }).addTo(layerGroup)
        L.polyline(forecastLine, {
          color: '#e2e8f0',
          weight: isActive ? 3 : 2,
          opacity: 0.8,
          dashArray: '7 11',
        }).addTo(layerGroup)

        // 简易预测扇区
        if (isActive && forecastPoints.length >= 1) {
          const last = actualPoints[actualPoints.length - 1]
          const tip = forecastPoints[forecastPoints.length - 1]
          const midLat = (last.lat + tip.lat) / 2
          const midLng = (last.lng + tip.lng) / 2
          const spread = Math.max(0.6, Math.hypot(tip.lat - last.lat, tip.lng - last.lng) * 0.35)
          L.polygon(
            [
              [last.lat, last.lng],
              [midLat + spread * 0.35, midLng - spread],
              [tip.lat, tip.lng],
              [midLat - spread * 0.35, midLng + spread * 0.4],
            ],
            {
              color: '#94a3b8',
              weight: 1,
              opacity: 0.35,
              fillColor: '#cbd5e1',
              fillOpacity: 0.08,
              dashArray: '4 6',
            },
          ).addTo(layerGroup)
        }
      }

      points.forEach((point, index) => {
        const isEye =
          !point.isForecast &&
          index === actualPoints.length - 1
        if (isEye && isActive) {
          const eyeIcon = L.divIcon({
            className: 'typhoon-eye-icon',
            html: `<div class="typhoon-eye">
              <div class="typhoon-eye-ring"></div>
              <div class="typhoon-eye-core"></div>
              <div class="typhoon-eye-label">${storm.nameCn}</div>
            </div>`,
            iconSize: [96, 96],
            iconAnchor: [48, 48],
          })
          const eye = L.marker([point.lat, point.lng], { icon: eyeIcon, zIndexOffset: 800 })
          eye.bindTooltip(
            `<div style="min-width:190px;font-size:12px;line-height:1.55;color:#0f172a">
              <strong>${storm.nameCn} · 台风中心</strong><br/>
              ${new Date(point.time).toLocaleString('zh-CN', { hour12: false })}<br/>
              强度：${point.intensity}<br/>
              风速：${point.windSpeedKts} kt · 气压：${point.pressureHpa} hPa<br/>
              移向：${point.moveDir} ${point.moveSpeedKmh} km/h
            </div>`,
            { direction: 'top', offset: [0, -28], opacity: 0.97 },
          )
          eye.on('click', () => onSelectStorm?.(storm.id))
          eye.addTo(layerGroup)
          return
        }

        const marker = L.circleMarker([point.lat, point.lng], {
          radius: point.isForecast ? 4 : 5,
          color: '#ffffff',
          weight: 1.3,
          fillColor: getColor(point.intensity),
          fillOpacity: point.isForecast ? 0.45 : 0.92,
        })
        marker.bindTooltip(
          `<div style="min-width:170px;font-size:12px;line-height:1.55;color:#0f172a">
            <strong>${storm.nameCn}</strong> ${point.isForecast ? '(预测)' : ''}<br/>
            ${new Date(point.time).toLocaleString('zh-CN', { hour12: false })}<br/>
            强度：${point.intensity}<br/>
            风速：${point.windSpeedKts} kt · ${point.pressureHpa} hPa
          </div>`,
          { direction: 'top', offset: [0, -4], opacity: 0.96 },
        )
        marker.on('click', () => onSelectStorm?.(storm.id))
        marker.addTo(layerGroup)
      })

      // 多级风圈（7/10/12）
      if (showWindCircle && isActive) {
        const circles =
          'windCircles' in storm && storm.windCircles.length > 0
            ? storm.windCircles
            : buildDefaultWindCircles(storm.maxWindKts)
        const styles: Record<string, { color: string; fill: number; weight: number }> = {
          '7': { color: '#38bdf8', fill: 0.05, weight: 1.2 },
          '10': { color: '#fbbf24', fill: 0.06, weight: 1.4 },
          '12': { color: '#f43f5e', fill: 0.08, weight: 1.6 },
        }
        circles.forEach((circle) => {
          const avgR =
            (circle.radiusKm.ne + circle.radiusKm.se + circle.radiusKm.sw + circle.radiusKm.nw) / 4
          const style = styles[circle.level] ?? styles['7']
          L.circle([storm.latestPoint.lat, storm.latestPoint.lng], {
            radius: avgR * 1000,
            color: style.color,
            weight: style.weight,
            opacity: 0.55,
            fillColor: style.color,
            fillOpacity: style.fill,
            dashArray: circle.level === '7' ? '2 8' : undefined,
          }).addTo(layerGroup)

          // 风圈等级标签
          const labelLat = storm.latestPoint.lat + avgR / 111
          const labelIcon = L.divIcon({
            className: 'wind-circle-label-icon',
            html: `<div class="wind-circle-label">${circle.level}级风圈</div>`,
            iconSize: [64, 16],
            iconAnchor: [32, 8],
          })
          L.marker([labelLat, storm.latestPoint.lng], {
            icon: labelIcon,
            interactive: false,
          }).addTo(layerGroup)
        })
      }
    })

    if (showCities) {
      CITY_MARKERS.forEach((city) => {
        // 低缩放时只显示主要城市
        if (zoomLevel < 5.5 && !city.major) return
        bounds.extend([city.lat, city.lng])
        const icon = L.divIcon({
          className: 'city-marker-icon',
          html: `<div class="city-marker ${city.major ? 'is-major' : ''}">
            <span class="city-dot"></span>
            <span class="city-label">${city.name}</span>
          </div>`,
          iconSize: [80, 22],
          iconAnchor: [6, 11],
        })
        L.marker([city.lat, city.lng], { icon, interactive: false }).addTo(layerGroup)
      })
    }

    // 杭州高亮观测点
    if (hangzhouWeather) {
      bounds.extend([hangzhouLat, hangzhouLng])
      L.circleMarker([hangzhouLat, hangzhouLng], {
        radius: 6,
        color: '#fff',
        weight: 2,
        fillColor: '#ef4444',
        fillOpacity: 1,
      })
        .bindTooltip(
          `<div style="font-size:12px;line-height:1.5;color:#0f172a">
            <strong>杭州实况</strong><br/>
            风速 ${Math.round(hangzhouWeather.windSpeedKmh)} km/h<br/>
            阵风 ${Math.round(hangzhouWeather.windGustKmh)} km/h<br/>
            气压 ${hangzhouWeather.pressureHpa} hPa
          </div>`,
          { direction: 'right', opacity: 0.96 },
        )
        .addTo(layerGroup)
    }

    windVectors.forEach((vector) => bounds.extend([vector.lat, vector.lng]))

    if (bounds.isValid() && !hasFitRef.current) {
      map.fitBounds(bounds, {
        padding: immersive ? [70, 90] : [48, 48],
        maxZoom: immersive ? 6.5 : 7,
      })
      hasFitRef.current = true
    }

    return () => {
      layerGroup.remove()
    }
  }, [
    storms,
    activeStormId,
    showForecast,
    showWindCircle,
    showCities,
    windVectors,
    onSelectStorm,
    immersive,
    hangzhouWeather,
    hangzhouLat,
    hangzhouLng,
    zoomLevel,
  ])

  // 风场粒子
  useEffect(() => {
    const map = mapRef.current
    const canvas = canvasRef.current
    if (!map || !canvas || !showParticles) {
      cancelAnimationFrame(rafRef.current)
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }
      return
    }

    const resizeCanvas = () => {
      const size = map.getSize()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = size.x * dpr
      canvas.height = size.y * dpr
      canvas.style.width = `${size.x}px`
      canvas.style.height = `${size.y}px`
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const spawnParticle = (width: number, height: number): Particle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      age: Math.random() * 100,
      maxAge: 50 + Math.random() * 110,
      seed: Math.random(),
    })

    const ensureParticles = (width: number, height: number) => {
      const count = immersive ? 3200 : 1600
      if (particlesRef.current.length !== count) {
        particlesRef.current = Array.from({ length: count }, () => spawnParticle(width, height))
      }
    }

    resizeCanvas()
    ensureParticles(map.getSize().x, map.getSize().y)

    const onViewChange = () => {
      resizeCanvas()
      // 平移缩放时重置部分粒子，避免拖影错位
      const size = map.getSize()
      particlesRef.current.forEach((p, i) => {
        if (i % 3 === 0) Object.assign(p, spawnParticle(size.x, size.y))
      })
    }

    map.on('moveend', onViewChange)
    map.on('zoomend', onViewChange)
    map.on('resize', onViewChange)

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let last = performance.now()

    const frame = (now: number) => {
      const dt = Math.min(42, now - last) / 16.5
      last = now
      const size = map.getSize()
      const width = size.x
      const height = size.y
      ensureParticles(width, height)

      const {
        vectors,
        storms: liveStorms,
        activeStormId: activeId,
        hangzhouWeather: weather,
        windSpeedScale: scale,
      } = fieldRef.current
      const storm = liveStorms.find((item) => item.id === activeId) ?? liveStorms[0] ?? null
      const stormCenter = storm
        ? {
            lat: storm.latestPoint.lat,
            lng: storm.latestPoint.lng,
            maxWindKts: storm.maxWindKts,
          }
        : null
      const background = {
        speed: weather?.windSpeedKmh ?? 18,
        directionDeg: weather?.windDirectionDeg ?? 60,
      }

      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = 'rgba(0,0,0,0.072)'
      ctx.fillRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'lighter'

      const zoom = map.getZoom()
      const pxPerKmh = 0.072 * (zoom / 5)

      // 每帧抽样子集附近采样，其余插值续行以提速
      for (let i = 0; i < particlesRef.current.length; i += 1) {
        const particle = particlesRef.current[i]
        // 隔帧全量采样：用 seed 错开
        const shouldSample = (i + Math.floor(now / 32)) % 2 === 0
        let sample: WindSample
        if (shouldSample || particle.age < 2) {
          const latlng = map.containerPointToLatLng([particle.x, particle.y])
          sample = sampleWindField(latlng.lat, latlng.lng, vectors, stormCenter, background, scale)
          particle._u = sample.u
          particle._v = sample.v
          particle._s = sample.speed
        } else {
          sample = { u: particle._u ?? 0, v: particle._v ?? 0, speed: particle._s ?? 0 }
        }

        const nextX = particle.x + sample.u * pxPerKmh * dt
        const nextY = particle.y - sample.v * pxPerKmh * dt

        const life = 1 - particle.age / particle.maxAge
        const alpha = Math.min(0.92, (0.12 + sample.speed / 100) * (0.35 + life * 0.75))
        const lineWidth = Math.min(2.8, 0.55 + sample.speed / 65 + particle.seed * 0.4)

        ctx.beginPath()
        ctx.strokeStyle = speedToColor(sample.speed, alpha)
        ctx.lineWidth = lineWidth
        ctx.lineCap = 'round'
        ctx.moveTo(particle.x, particle.y)
        ctx.lineTo(nextX, nextY)
        ctx.stroke()

        particle.x = nextX
        particle.y = nextY
        particle.age += dt

        if (
          particle.age > particle.maxAge ||
          particle.x < -30 ||
          particle.y < -30 ||
          particle.x > width + 30 ||
          particle.y > height + 30
        ) {
          // 高风速区更易重生粒子，强化台风眼附近密度
          if (stormCenter && particle.seed > 0.55) {
            const eye = map.latLngToContainerPoint([stormCenter.lat, stormCenter.lng])
            const ang = Math.random() * Math.PI * 2
            const rad = 20 + Math.random() * Math.min(width, height) * 0.28
            Object.assign(particle, {
              x: eye.x + Math.cos(ang) * rad,
              y: eye.y + Math.sin(ang) * rad,
              age: 0,
              maxAge: 50 + Math.random() * 100,
              seed: Math.random(),
            })
          } else {
            Object.assign(particle, spawnParticle(width, height))
          }
        }
      }

      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(rafRef.current)
      map.off('moveend', onViewChange)
      map.off('zoomend', onViewChange)
      map.off('resize', onViewChange)
    }
  }, [showParticles, immersive])

  const zoomBy = (delta: number) => {
    mapRef.current?.setZoom((mapRef.current?.getZoom() ?? 6) + delta)
  }

  return (
    <div
      className={`relative overflow-hidden bg-[#0a3358] ${
        immersive
          ? 'h-full w-full rounded-none border-0'
          : 'h-[360px] rounded-[28px] border border-white/10 shadow-[0_30px_80px_rgba(10,18,40,0.45)] sm:h-[430px] xl:h-[520px]'
      }`}
    >
      <div ref={containerRef} className="h-full w-full" />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-[400]"
        style={{ mixBlendMode: baseMap === 'hybrid' || baseMap === 'satellite' ? 'screen' : 'screen' }}
      />

      {/* 缩放控件 */}
      {immersive && (
        <div className="pointer-events-auto absolute bottom-28 right-3 z-[520] flex flex-col gap-1.5 sm:bottom-32 sm:right-4">
          <button
            type="button"
            onClick={() => zoomBy(1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/40 bg-[rgba(230,242,255,0.92)] text-lg font-semibold text-[#1a4a7a] shadow-md"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => zoomBy(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/40 bg-[rgba(230,242,255,0.92)] text-lg font-semibold text-[#1a4a7a] shadow-md"
          >
            −
          </button>
        </div>
      )}

      {/* 风速色标 */}
      {immersive && (
        <div className="pointer-events-none absolute left-3 top-16 z-[500] sm:left-4 sm:top-20">
          <div className="rounded-2xl border border-white/30 bg-[rgba(210,230,250,0.9)] px-3 py-3 shadow-lg backdrop-blur-md">
            <div className="mb-2 text-[11px] font-medium text-[#1e4d78]">风 (公里/时)</div>
            <div className="flex items-stretch gap-2">
              <div
                className="w-2.5 rounded-full"
                style={{
                  background:
                    'linear-gradient(180deg, #fbbf24 0%, #f8fafc 22%, #7dd3fc 48%, #3b82f6 72%, #1e3a8a 100%)',
                  height: 120,
                }}
              />
              <div className="flex flex-col justify-between py-0.5 text-[11px] leading-none text-[#2a5f8f]">
                <span>120</span>
                <span>80</span>
                <span>40</span>
                <span>0</span>
              </div>
            </div>
            {activeStorm && (
              <div className="mt-2 border-t border-[#9bb8d4]/50 pt-2 text-[10px] leading-relaxed text-[#2a5f8f]">
                <div className="font-semibold text-[#163d66]">{activeStorm.nameCn}</div>
                <div>{activeStorm.intensity}</div>
                <div>{activeStorm.maxWindKts} kt</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 跟随杭州的风速气泡 */}
      {immersive && hangzhouWeather && badgePos && (
        <div
          className="pointer-events-none absolute z-[500] -translate-x-1/2 -translate-y-1/2"
          style={{ left: badgePos.x, top: badgePos.y }}
        >
          <div className="flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full border border-white/80 bg-white/95 text-center shadow-[0_12px_36px_rgba(10,40,80,0.3)] sm:h-[84px] sm:w-[84px]">
            <div className="text-[10px] font-medium text-[#5a7a9a] sm:text-[11px]">{displayDir}</div>
            <div className="font-display text-[24px] leading-none text-[#163d66] sm:text-[28px]">{displaySpeed}</div>
            <div className="text-[10px] text-[#5a7a9a]">公里/时</div>
          </div>
        </div>
      )}
    </div>
  )
}
