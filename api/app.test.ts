import request from 'supertest'
import { describe, expect, it } from 'vitest'
import app from './app.js'

describe('台风 API', () => {
  it('返回健康状态', async () => {
    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.source).toBe('mock-live-cache')
  })

  it('返回活跃台风列表', async () => {
    const response = await request(app).get('/api/storms/live')

    expect(response.status).toBe(200)
    expect(response.body.storms.length).toBeGreaterThan(0)
    expect(response.body.summary.activeCount).toBeGreaterThan(0)
  })

  it('返回历史台风对比数据', async () => {
    const response = await request(app).get('/api/history/compare').query({
      ids: 'DUJUAN-2023,LEKIMA-2019',
    })

    expect(response.status).toBe(200)
    expect(response.body.storms).toHaveLength(2)
  })
})
