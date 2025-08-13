import { Router } from 'express'
import { 
  updateProfile, 
  changePassword, 
  upgradeToPro,
  getUserProfile 
} from '../controllers/profile.controller'
import { auth } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { z } from 'zod'

const router = Router()

// Profile update schema
const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50).optional(),
    email: z.string().email().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
  })
})

// Password change schema
const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(8).max(100),
  })
})

// Apply auth middleware to all routes
router.use(auth)

// Get user profile
router.get('/', getUserProfile)

// Update profile
router.put('/', validate(updateProfileSchema), updateProfile)

// Change password
router.put('/password', validate(changePasswordSchema), changePassword)

// Upgrade to Pro
router.post('/upgrade', upgradeToPro)

export default router
