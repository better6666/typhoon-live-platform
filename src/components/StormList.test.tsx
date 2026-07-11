import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { StormSummary } from '@shared/storm'
import StormList from './StormList'

const storms: StormSummary[] = [
  {
    id: 'KRATHON-2026',
    nameCn: '克拉通',
    nameEn: 'KRATHON',
    internationalCode: '2608',
    status: 'active',
    basin: '西北太平洋',
    intensity: '强台风',
    maxWindKts: 105,
    minPressureHpa: 930,
    lastUpdated: '2026-07-11T15:20:00+08:00',
    latestPoint: {
      time: '2026-07-11T15:00:00+08:00',
      lat: 21.3,
      lng: 124.8,
      intensity: '强台风',
      windSpeedKts: 105,
      pressureHpa: 930,
      moveDir: '西北偏西',
      moveSpeedKmh: 18,
      isForecast: false,
    },
  },
]

describe('StormList', () => {
  it('渲染台风核心信息', () => {
    render(
      <MemoryRouter>
        <StormList storms={storms} activeStormId="KRATHON-2026" onSelectStorm={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.getByText('克拉通')).toBeInTheDocument()
    expect(screen.getByText('强台风')).toBeInTheDocument()
    expect(screen.getByText('105 kt')).toBeInTheDocument()
  })
})
