import { Router } from 'express'
import { getLiveStorms, getStormById, getTimeline } from '../data/storms.js'

const router = Router()

router.get('/live', async (_req, res, next) => {
  try {
    res.json(await getLiveStorms())
  } catch (error) {
    next(error)
  }
})

router.get('/:stormId/timeline', async (req, res, next) => {
  try {
    const timeline = await getTimeline(req.params.stormId)

    if (!timeline.length) {
      res.status(404).json({
        success: false,
        error: 'Storm timeline not found',
      })
      return
    }

    res.json({
      stormId: req.params.stormId,
      points: timeline,
    })
  } catch (error) {
    next(error)
  }
})

router.get('/:stormId', async (req, res, next) => {
  try {
    const storm = await getStormById(req.params.stormId)

    if (!storm) {
      res.status(404).json({
        success: false,
        error: 'Storm not found',
      })
      return
    }

    res.json(storm)
  } catch (error) {
    next(error)
  }
})

export default router
