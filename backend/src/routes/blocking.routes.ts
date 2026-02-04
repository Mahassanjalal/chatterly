import { Router } from 'express'
import { auth } from '../middleware/auth'
import { blockUser, unblockUser, getBlockedUsers, isUserBlocked } from '../controllers/blocking.controller'
import { validate } from '../middleware/validate'
import { z } from 'zod'

const router = Router()

const blockUserSchema = z.object({
  body: z.object({
    userIdToBlock: z.string(),
  }),
})

const unblockUserSchema = z.object({
  body: z.object({
    userIdToUnblock: z.string(),
  }),
})

// All routes require authentication
router.use(auth)

// Get blocked users list
router.get('/', getBlockedUsers)

// Check if user is blocked
router.get('/check', isUserBlocked)

// Block a user
router.post('/block', validate(blockUserSchema), blockUser)

// Unblock a user
router.post('/unblock', validate(unblockUserSchema), unblockUser)

export default router
