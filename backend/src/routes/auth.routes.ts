import { Router } from 'express'
import { signup, login, logout, me, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword } from '../controllers/auth.controller'
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

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
})

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string(),
    password: z.string().min(8),
  }),
})

const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string(),
  }),
})

// Apply rate limiting to auth routes
router.use(apiLimiter)

// Auth routes
router.post('/register', validate(registerSchema), signup)
router.post('/login', validate(loginSchema), login)
router.post('/logout', logout)
router.get('/me', auth, me)

// Email verification routes
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail)
router.post('/resend-verification', auth, resendVerificationEmail)

// Password reset routes
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword)
router.post('/reset-password', validate(resetPasswordSchema), resetPassword)

export default router
