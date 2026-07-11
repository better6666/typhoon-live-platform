import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { StormDetail, StormSummary, WindVectorPoint } from '@shared/storm'

type MapStorm = StormSummary | StormDetail

type BaseMapType = 'street' | 'satellite' | 'dark'

interface StormMapProps {
  storms: MapStorm[]
  activeStormId?: string | null
  showForecast?: boolean
  showWindCircle?: boolean
  windVectors?: WindVectorPoint[]
  baseMap?: BaseMapType
  onSelectStorm?: (stormId: string) => void
}

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
      {
        attribution: '&copy; Esri &mdash; World Imagery',
      },
    )
  }

  if (type === 'dark') {
    return L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    })
  }

  return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  })
}

function moveByBearing(lat: number, lng: number, distanceKm: number, bearingDeg: number) {
  const r = 6371
  const bearing = (bearingDeg * Math.PI) / 180
  const lat1 = (lat * Math.PI) / 180
  const lng1 = (lng * Math.PI) / 180
  const angularDistance = distanceKm / r
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
  )
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    )

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (lng2 * 180) / Math.PI,
  }
}

export default function StormMap({
  storms,
  activeStormId,
  showForecast = true,
  showWindCircle = true,
  windVectors = [],
  baseMap = 'street',
  onSelectStorm,
}: StormMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([20, 123], 4)

    const tileLayer = createTileLayer(baseMap).addTo(map)
    tileLayerRef.current = tileLayer

    mapRef.current = map

    return () => {
      tileLayerRef.current?.remove()
      tileLayerRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [baseMap])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    tileLayerRef.current?.remove()
    tileLayerRef.current = createTileLayer(baseMap).addTo(map)
  }, [baseMap])

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
            weight: isActive ? 5 : 3,
            opacity: isActive ? 0.92 : 0.64,
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
            color: '#f8fafc',
            weight: isActive ? 4 : 2.5,
            opacity: 0.72,
            dashArray: '8 10',
          },
        ).addTo(layerGroup)
      }

      points.forEach((point, index) => {
        const marker = L.circleMarker([point.lat, point.lng], {
          radius: index === points.length - 1 ? 8 : 5,
          color: '#ffffff',
          weight: 1.4,
          fillColor: getColor(point.intensity),
          fillOpacity: point.isForecast ? 0.55 : 0.95,
        })

        marker.bindTooltip(
          `
            <div style="min-width:180px;font-size:12px;line-height:1.6;">
              <div style="font-weight:700;color:#fff;">${storm.nameCn}</div>
              <div>${new Date(point.time).toLocaleString('zh-CN', { hour12: false })}</div>
              <div>强度：${point.intensity}</div>
              <div>风速：${point.windSpeedKts} kt</div>
              <div>气压：${point.pressureHpa} hPa</div>
            </div>
          `,
          {
            direction: 'top',
            offset: [0, -4],
            opacity: 0.95,
          },
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
          opacity: 0.45,
          fillColor: baseColor,
          fillOpacity: 0.1,
        }).addTo(layerGroup)
      }
    })

    windVectors.forEach((vector) => {
      bounds.extend([vector.lat, vector.lng])
      const directionToward = (vector.windDirectionDeg + 180) % 360
      const end = moveByBearing(vector.lat, vector.lng, Math.max(18, vector.windSpeedKmh * 0.45), directionToward)
      const arrow = L.polyline(
        [
          [vector.lat, vector.lng],
          [end.lat, end.lng],
        ],
        {
          color: '#38bdf8',
          weight: 2,
          opacity: 0.85,
        },
      )
      arrow.bindTooltip(
        `风速 ${vector.windSpeedKmh.toFixed(1)} km/h<br/>风向 ${vector.windDirectionDeg}°<br/>阵风 ${vector.windGustKmh.toFixed(1)} km/h`,
        { direction: 'top', opacity: 0.95 },
      )
      arrow.addTo(layerGroup)

      L.circleMarker([vector.lat, vector.lng], {
        radius: 3.5,
        color: '#dbeafe',
        weight: 1,
        fillColor: '#38bdf8',
        fillOpacity: 0.9,
      }).addTo(layerGroup)
    })

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40] })
    }

    return () => {
      layerGroup.remove()
    }
  }, [storms, activeStormId, showForecast, showWindCircle, windVectors, onSelectStorm])

  return (
    <div className="h-[520px] overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/50 shadow-[0_30px_80px_rgba(10,18,40,0.45)]">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
