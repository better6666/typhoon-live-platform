import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import type { StormDetail, StormSummary, WeatherSnapshot, WindVectorPoint } from '@shared/storm'
import { toWindDirLabel } from '@/lib/windUtils'

type MapStorm = StormSummary | StormDetail

type BaseMapType = 'street' | 'satellite' | 'dark' | 'ocean'

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
}

const CITY_MARKERS = [
  { name: '杭州', lat: 30.2741, lng: 120.1551 },
  { name: '南京', lat: 32.0603, lng: 118.7969 },
  { name: '上海', lat: 31.2304, lng: 121.4737 },
  { name: '福州', lat: 26.0745, lng: 119.2965 },
  { name: '台北', lat: 25.033, lng: 121.5654 },
  { name: '合肥', lat: 31.8206, lng: 117.2272 },
  { name: '南昌', lat: 28.682, lng: 115.8579 },
  { name: '天津', lat: 39.3434, lng: 117.3616 },
]

const intensityColor: Record<string, string> = {
  扰动: '#64748b',
  热带低压: '#60a5fa',
  热带风暴: '#2dd4bf',
  强热带风暴: '#22c55e',
  台风: '#f59e0b',
  强台风: '#fb7185',
  超强台风: '#e879f9',
}

function getColor(intensity: string) {
  return intensityColor[intensity] ?? '#a78bfa'
}

function createTileLayer(type: BaseMapType) {
  if (type === 'satellite') {
    return L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: '&copy; Esri' },
    )
  }

  if (type === 'street') {
    return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    })
  }

  if (type === 'dark') {
    return L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO',
    })
  }

  // 深蓝海洋风格（贴近参考图）
  return L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    className: 'ocean-basemap-tiles',
  })
}

function degToVector(speed: number, directionDeg: number) {
  // 气象风向：风从该方向吹来；粒子向去向移动
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

  vectors.forEach((vector) => {
    const dLat = lat - vector.lat
    const dLng = lng - vector.lng
    const dist2 = dLat * dLat + dLng * dLng + 0.02
    const w = 1 / dist2
    const vec = degToVector(vector.windSpeedKmh, vector.windDirectionDeg)
    u += vec.u * w
    v += vec.v * w
    weightSum += w
  })

  if (weightSum > 0) {
    u /= weightSum
    v /= weightSum
  } else {
    const bg = degToVector(background.speed, background.directionDeg)
    u = bg.u
    v = bg.v
  }

  // 台风中心合成气旋环流（形成螺旋风场）
  if (stormCenter) {
    const dLat = lat - stormCenter.lat
    const dLng = (lng - stormCenter.lng) * Math.cos((lat * Math.PI) / 180)
    const dist = Math.sqrt(dLat * dLat + dLng * dLng) + 0.0001
    const maxR = 8
    if (dist < maxR) {
      const strength =
        Math.min(stormCenter.maxWindKts * 1.85, 140) * Math.exp(-dist * 0.55) * (1 - dist / maxR)
      // 逆时针气旋 + 向内辐合
      const tangentU = (-dLng / dist) * strength
      const tangentV = (dLat / dist) * strength
      const inwardU = (-dLat / dist) * strength * 0.22
      const inwardV = (-dLng / dist) * strength * 0.22
      const blend = Math.min(1, 1.15 - dist / maxR)
      u = u * (1 - blend * 0.75) + (tangentU + inwardU) * blend
      v = v * (1 - blend * 0.75) + (tangentV + inwardV) * blend
    }
  }

  u *= scale
  v *= scale
  const speed = Math.sqrt(u * u + v * v)
  return { u, v, speed }
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
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef<number>(0)
  const fieldRef = useRef({
    vectors: windVectors,
    storms,
    activeStormId,
    hangzhouWeather,
    windSpeedScale,
  })

  fieldRef.current = { vectors: windVectors, storms, activeStormId, hangzhouWeather, windSpeedScale }

  const activeStorm = useMemo(
    () => storms.find((storm) => storm.id === activeStormId) ?? storms[0] ?? null,
    [storms, activeStormId],
  )

  const displaySpeed = Math.round(
    (hangzhouWeather?.windSpeedKmh ?? activeStorm?.latestPoint.windSpeedKts ?? 0) * windSpeedScale,
  )
  const displayDir = toWindDirLabel(
    hangzhouWeather?.windDirectionDeg ?? 45,
  )

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
    }).setView([30.2, 122.5], immersive ? 6 : 5)

    const tileLayer = createTileLayer(baseMap).addTo(map)
    tileLayerRef.current = tileLayer
    mapRef.current = map

    const onResize = () => map.invalidateSize()
    window.addEventListener('resize', onResize)
    // 全屏容器布局完成后刷新尺寸，避免灰块
    const sizeTimer = window.setTimeout(() => map.invalidateSize(), 80)
    const sizeTimer2 = window.setTimeout(() => map.invalidateSize(), 320)

    return () => {
      window.clearTimeout(sizeTimer)
      window.clearTimeout(sizeTimer2)
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(rafRef.current)
      tileLayerRef.current?.remove()
      tileLayerRef.current = null
      map.remove()
      mapRef.current = null
    }
    // 仅初始化一次地图实例
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    tileLayerRef.current?.remove()
    tileLayerRef.current = createTileLayer(baseMap).addTo(map)
  }, [baseMap])

  // 路径 / 风圈 / 城市
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const layerGroup = L.layerGroup().addTo(map)
    const bounds = L.latLngBounds([])

    storms.forEach((storm) => {
      const points = 'points' in storm ? storm.points : [storm.latestPoint]
      const actualPoints = points.filter((point) => !point.isForecast)
      const forecastPoints = points.filter((point) => point.isForecast)
      const baseColor = getColor(storm.intensity)
      const isActive = storm.id === activeStormId

      actualPoints.forEach((point) => bounds.extend([point.lat, point.lng]))
      forecastPoints.forEach((point) => bounds.extend([point.lat, point.lng]))

      if (actualPoints.length > 1) {
        L.polyline(
          actualPoints.map((point) => [point.lat, point.lng] as [number, number]),
          {
            color: baseColor,
            weight: isActive ? 4 : 2.5,
            opacity: isActive ? 0.9 : 0.55,
          },
        ).addTo(layerGroup)
      }

      if (showForecast && forecastPoints.length > 0 && actualPoints.length > 0) {
        L.polyline(
          [
            [actualPoints[actualPoints.length - 1].lat, actualPoints[actualPoints.length - 1].lng],
            ...forecastPoints.map((point) => [point.lat, point.lng] as [number, number]),
          ],
          {
            color: '#e0f2fe',
            weight: isActive ? 3 : 2,
            opacity: 0.7,
            dashArray: '6 10',
          },
        ).addTo(layerGroup)
      }

      points.forEach((point, index) => {
        const isLatest = index === points.length - 1 || (!point.isForecast && index === actualPoints.length - 1)
        const marker = L.circleMarker([point.lat, point.lng], {
          radius: isLatest ? 7 : 4,
          color: '#ffffff',
          weight: 1.2,
          fillColor: getColor(point.intensity),
          fillOpacity: point.isForecast ? 0.5 : 0.95,
        })
        marker.bindTooltip(
          `<div style="min-width:160px;font-size:12px;line-height:1.55;color:#0f172a">
            <strong>${storm.nameCn}</strong><br/>
            ${new Date(point.time).toLocaleString('zh-CN', { hour12: false })}<br/>
            强度：${point.intensity}<br/>
            风速：${point.windSpeedKts} kt
          </div>`,
          { direction: 'top', offset: [0, -4], opacity: 0.96 },
        )
        marker.on('click', () => onSelectStorm?.(storm.id))
        marker.addTo(layerGroup)
      })

      if ('windCircles' in storm && showWindCircle && storm.windCircles.length > 0) {
        const maxRadiusKm = Math.max(...storm.windCircles.map((item) => item.radiusKm.ne))
        L.circle([storm.latestPoint.lat, storm.latestPoint.lng], {
          radius: maxRadiusKm * 1000,
          color: baseColor,
          weight: 1,
          opacity: 0.35,
          fillColor: baseColor,
          fillOpacity: 0.06,
        }).addTo(layerGroup)
      }
    })

    if (showCities) {
      CITY_MARKERS.forEach((city) => {
        bounds.extend([city.lat, city.lng])
        const icon = L.divIcon({
          className: 'city-marker-icon',
          html: `<div class="city-marker"><span class="city-dot"></span><span class="city-label">${city.name}</span></div>`,
          iconSize: [72, 20],
          iconAnchor: [6, 10],
        })
        L.marker([city.lat, city.lng], { icon, interactive: false }).addTo(layerGroup)
      })
    }

    windVectors.forEach((vector) => bounds.extend([vector.lat, vector.lng]))

    if (bounds.isValid() && !immersive) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 7 })
    } else if (bounds.isValid() && immersive) {
      map.fitBounds(bounds, { padding: [60, 80], maxZoom: 7 })
    }

    return () => {
      layerGroup.remove()
    }
  }, [storms, activeStormId, showForecast, showWindCircle, showCities, windVectors, onSelectStorm, immersive])

  // 风场粒子动画
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
      age: Math.random() * 80,
      maxAge: 60 + Math.random() * 90,
    })

    const ensureParticles = (width: number, height: number) => {
      const count = immersive ? 2200 : 1200
      if (particlesRef.current.length !== count) {
        particlesRef.current = Array.from({ length: count }, () => spawnParticle(width, height))
      }
    }

    resizeCanvas()
    ensureParticles(map.getSize().x, map.getSize().y)

    const onViewChange = () => {
      resizeCanvas()
      ensureParticles(map.getSize().x, map.getSize().y)
    }

    map.on('move', onViewChange)
    map.on('zoom', onViewChange)
    map.on('resize', onViewChange)

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let last = performance.now()

    const frame = (now: number) => {
      const dt = Math.min(40, now - last) / 16.5
      last = now
      const size = map.getSize()
      const width = size.x
      const height = size.y
      ensureParticles(width, height)

      const { vectors, storms: liveStorms, activeStormId: activeId, hangzhouWeather: weather, windSpeedScale: scale } =
        fieldRef.current
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

      // 拖尾淡出，形成流线
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = 'rgba(0,0,0,0.085)'
      ctx.fillRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'lighter'

      particlesRef.current.forEach((particle) => {
        const latlng = map.containerPointToLatLng([particle.x, particle.y])
        const sample = sampleWindField(latlng.lat, latlng.lng, vectors, stormCenter, background, scale)

        // 速度映射到像素位移
        const pxPerKmh = 0.085 * (map.getZoom() / 5)
        const nextX = particle.x + sample.u * pxPerKmh * dt
        const nextY = particle.y - sample.v * pxPerKmh * dt

        const alpha = Math.min(0.95, 0.18 + sample.speed / 90)
        const lineWidth = Math.min(2.4, 0.7 + sample.speed / 70)
        // 风速越高越亮白/青
        const t = Math.min(1, sample.speed / 100)
        const r = Math.round(180 + 75 * t)
        const g = Math.round(220 + 30 * t)
        const b = 255

        ctx.beginPath()
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`
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
          particle.x < -20 ||
          particle.y < -20 ||
          particle.x > width + 20 ||
          particle.y > height + 20
        ) {
          Object.assign(particle, spawnParticle(width, height))
        }
      })

      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(rafRef.current)
      map.off('move', onViewChange)
      map.off('zoom', onViewChange)
      map.off('resize', onViewChange)
    }
  }, [showParticles, immersive])

  return (
    <div
      className={`relative overflow-hidden bg-[#0b3a6b] ${
        immersive
          ? 'h-full w-full rounded-none border-0'
          : 'h-[360px] rounded-[28px] border border-white/10 shadow-[0_30px_80px_rgba(10,18,40,0.45)] sm:h-[430px] xl:h-[520px]'
      }`}
    >
      <div ref={containerRef} className="h-full w-full" />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-[400]"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* 风速色标 */}
      {immersive && (
        <div className="pointer-events-none absolute left-3 top-16 z-[500] sm:left-4 sm:top-20">
          <div className="rounded-2xl border border-white/30 bg-[rgba(210,230,250,0.88)] px-3 py-3 shadow-lg backdrop-blur-md">
            <div className="mb-2 text-[11px] font-medium text-[#1e4d78]">风 (公里/时)</div>
            <div className="flex items-stretch gap-2">
              <div
                className="w-2.5 rounded-full"
                style={{
                  background: 'linear-gradient(180deg, #f8fbff 0%, #9fd4ff 28%, #4aa8ef 55%, #1a6bb8 78%, #0b3d73 100%)',
                  height: 108,
                }}
              />
              <div className="flex flex-col justify-between py-0.5 text-[11px] leading-none text-[#2a5f8f]">
                <span>120</span>
                <span>80</span>
                <span>40</span>
                <span>0</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 浮动风速气泡（杭州附近） */}
      {immersive && hangzhouWeather && (
        <div className="pointer-events-none absolute left-1/2 top-[42%] z-[500] -translate-x-1/2 -translate-y-1/2 sm:left-[46%] sm:top-[40%]">
          <div className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full border border-white/70 bg-white/95 text-center shadow-[0_12px_40px_rgba(10,40,80,0.28)] sm:h-[88px] sm:w-[88px]">
            <div className="text-[10px] font-medium text-[#5a7a9a] sm:text-[11px]">{displayDir}</div>
            <div className="font-display text-[26px] leading-none text-[#163d66] sm:text-[30px]">{displaySpeed}</div>
            <div className="text-[10px] text-[#5a7a9a] sm:text-[11px]">公里/时</div>
          </div>
        </div>
      )}
    </div>
  )
}
