import { Router } from 'express'
import { signup, login, logout, me } from '../controllers/auth.controller'
import { validate } from '../middleware/validate'
import { userSchema } from '../models/user.model'
import { auth } from '../middleware/auth'
import { apiLimiter } from '../middleware/rateLimiter'
import { z } from 'zod'

const router = Router()

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
})

const registerSchema = z.object({
  body: userSchema,
})

// Apply rate limiting to auth routes
router.use(apiLimiter)

// Auth routes
router.post('/register', validate(registerSchema), signup)
router.post('/login', validate(loginSchema), login)
router.post('/logout', logout)
router.get('/me', auth, me)

export default router
