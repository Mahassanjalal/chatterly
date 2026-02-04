import { Router } from 'express'
import { auth } from '../middleware/auth'
import { adminOnly, moderatorOrAdmin } from '../middleware/roles'
import { apiLimiter } from '../middleware/rateLimiter'
import {
  getDashboardStats,
  getUsers,
  getUserById,
  updateUser,
  banUser,
  suspendUser,
  unbanUser,
  getReports,
  getReportById,
  updateReport,
  takeActionOnReport,
} from '../controllers/admin.controller'

const router = Router()

// Apply auth, rate limiting, and admin middleware to all routes
router.use(auth)
router.use(apiLimiter)

// Dashboard (admin only)
router.get('/dashboard', adminOnly, getDashboardStats)

// User management (admin only)
router.get('/users', adminOnly, getUsers)
router.get('/users/:id', adminOnly, getUserById)
router.put('/users/:id', adminOnly, updateUser)
router.post('/users/:id/ban', adminOnly, banUser)
router.post('/users/:id/suspend', adminOnly, suspendUser)
router.post('/users/:id/unban', adminOnly, unbanUser)

// Report management (moderators and admin)
router.get('/reports', moderatorOrAdmin, getReports)
router.get('/reports/:id', moderatorOrAdmin, getReportById)
router.put('/reports/:id', moderatorOrAdmin, updateReport)
router.post('/reports/:id/action', moderatorOrAdmin, takeActionOnReport)

export default router
