import { Router } from 'express'
import { auth } from '../middleware/auth'
import { exportUserData, deleteAccount, getDataRetentionInfo } from '../controllers/gdpr.controller'
import { validate } from '../middleware/validate'
import { z } from 'zod'

const router = Router()

const deleteAccountSchema = z.object({
  body: z.object({
    password: z.string().min(8),
    confirmation: z.string(),
  }),
})

// Public route - data retention info
router.get('/data-retention', getDataRetentionInfo)

// Protected routes
router.use(auth)

// Export user data
router.get('/export', exportUserData)

// Delete account
router.post('/delete-account', validate(deleteAccountSchema), deleteAccount)

export default router
