/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import stormRoutes from './routes/storms.js'
import historyRoutes from './routes/history.js'
import warningRoutes from './routes/warnings.js'

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/storms', stormRoutes)
app.use('/api/history', historyRoutes)
app.use('/api/warnings', warningRoutes)

/**
 * health
 */
app.use('/api/health', (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'ok',
    updatedAt: '2026-07-11T15:20:00+08:00',
    source: 'mock-live-cache',
  })
})

/**
 * error handler middleware
 */
app.use((error: Error, _req: Request, res: Response, next: NextFunction) => {
  void next
  res.status(500).json({
    success: false,
    error: 'Server internal error',
    message: error.message,
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
