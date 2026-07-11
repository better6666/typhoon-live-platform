import { Router } from 'express'
import { getWarningsOverview } from '../data/storms.js'

const router = Router()

router.get('/overview', async (_req, res, next) => {
  try {
    res.json(await getWarningsOverview())
  } catch (error) {
    next(error)
  }
})

export default router
