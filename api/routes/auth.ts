/**
 * This is a user authentication API route demo.
 * Handle user registration, login, token management, etc.
 */
import { Router, type Request, type Response } from 'express'

const router = Router()

/**
 * User Login
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  res.status(501).json({
    success: false,
    error: 'Auth is not enabled in this demo',
    action: 'register',
  })
})

/**
 * User Login
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  res.status(501).json({
    success: false,
    error: 'Auth is not enabled in this demo',
    action: 'login',
  })
})

/**
 * User Logout
 * POST /api/auth/logout
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    message: 'No active auth session in demo mode',
  })
})

export default router
