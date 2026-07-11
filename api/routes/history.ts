import { Router } from 'express'
import { compareStorms, getHistory } from '../data/storms.js'

const router = Router()

router.get('/', (req, res) => {
  const { year, basin, landfall, intensity } = req.query

  res.json(
    getHistory({
      year: typeof year === 'string' ? year : undefined,
      basin: typeof basin === 'string' ? basin : undefined,
      landfall: typeof landfall === 'string' ? landfall : undefined,
      intensity: typeof intensity === 'string' ? intensity : undefined,
    }),
  )
})

router.get('/compare', (req, res) => {
  const ids = typeof req.query.ids === 'string' ? req.query.ids.split(',').filter(Boolean) : []
  res.json(compareStorms(ids))
})

export default router
