import { Request, Response } from 'express'
import { User } from '../models/user.model'
import { Report } from '../models/report.model'
import { AppError } from '../middleware/error'
import { asyncHandler } from '../utils/asyncHandler'

// Get dashboard statistics
export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const [
    totalUsers,
    activeUsers,
    bannedUsers,
    suspendedUsers,
    pendingReports,
    totalReports,
    verifiedUsers,
    proUsers,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: 'active' }),
    User.countDocuments({ status: 'banned' }),
    User.countDocuments({ status: 'suspended' }),
    Report.countDocuments({ status: 'pending' }),
    Report.countDocuments(),
    User.countDocuments({ 'flags.isEmailVerified': true }),
    User.countDocuments({ type: 'pro' }),
  ])

  // Get recent user registrations (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentRegistrations = await User.countDocuments({
    createdAt: { $gte: sevenDaysAgo },
  })

  res.json({
    users: {
      total: totalUsers,
      active: activeUsers,
      banned: bannedUsers,
      suspended: suspendedUsers,
      verified: verifiedUsers,
      pro: proUsers,
      recentRegistrations,
    },
    reports: {
      total: totalReports,
      pending: pendingReports,
    },
  })
})

// Get all users with pagination and filters
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20
  const status = req.query.status as string
  const role = req.query.role as string
  const search = req.query.search as string

  const query: any = {}
  
  if (status && ['active', 'suspended', 'banned'].includes(status)) {
    query.status = status
  }
  
  if (role && ['user', 'moderator', 'admin'].includes(role)) {
    query.role = role
  }
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ]
  }

  const total = await User.countDocuments(query)
  const users = await User.find(query)
    .select('-password -passwordResetToken -emailVerificationToken')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)

  res.json({
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  })
})

// Get single user
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id)
    .select('-password -passwordResetToken -emailVerificationToken')

  if (!user) {
    throw new AppError(404, 'User not found')
  }

  res.json({ user })
})

// Update user (admin)
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { status, role, type } = req.body
  const userId = req.params.id

  const user = await User.findById(userId)
  if (!user) {
    throw new AppError(404, 'User not found')
  }

  // Prevent self-demotion
  if (req.user?._id.toString() === userId && role && role !== 'admin') {
    throw new AppError(400, 'Cannot change your own admin role')
  }

  if (status && ['active', 'suspended', 'banned'].includes(status)) {
    user.status = status
  }
  
  if (role && ['user', 'moderator', 'admin'].includes(role)) {
    user.role = role
  }
  
  if (type && ['free', 'pro'].includes(type)) {
    user.type = type
  }

  await user.save()

  res.json({
    success: true,
    message: 'User updated successfully',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      status: user.status,
      role: user.role,
      type: user.type,
    },
  })
})

// Ban user
export const banUser = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body
  const userId = req.params.id

  const user = await User.findById(userId)
  if (!user) {
    throw new AppError(404, 'User not found')
  }

  // Prevent banning self or other admins
  if (req.user?._id.toString() === userId) {
    throw new AppError(400, 'Cannot ban yourself')
  }
  
  if (user.role === 'admin') {
    throw new AppError(400, 'Cannot ban an admin')
  }

  user.status = 'banned'
  user.restrictions.isPermBanned = true
  user.restrictions.banReason = reason || 'Banned by administrator'
  await user.save()

  res.json({
    success: true,
    message: 'User banned successfully',
  })
})

// Suspend user
export const suspendUser = asyncHandler(async (req: Request, res: Response) => {
  const { reason, duration } = req.body
  const userId = req.params.id

  const user = await User.findById(userId)
  if (!user) {
    throw new AppError(404, 'User not found')
  }

  // Prevent suspending self or admins
  if (req.user?._id.toString() === userId) {
    throw new AppError(400, 'Cannot suspend yourself')
  }
  
  if (user.role === 'admin') {
    throw new AppError(400, 'Cannot suspend an admin')
  }

  const suspensionExpires = new Date()
  suspensionExpires.setHours(suspensionExpires.getHours() + (duration || 24))

  user.status = 'suspended'
  user.restrictions.isSuspended = true
  user.restrictions.suspensionReason = reason || 'Suspended by administrator'
  user.restrictions.suspensionExpiresAt = suspensionExpires
  await user.save()

  res.json({
    success: true,
    message: 'User suspended successfully',
  })
})

// Unban/unsuspend user
export const unbanUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id

  const user = await User.findById(userId)
  if (!user) {
    throw new AppError(404, 'User not found')
  }

  user.status = 'active'
  user.restrictions.isSuspended = false
  user.restrictions.suspensionReason = undefined
  user.restrictions.suspensionExpiresAt = undefined
  user.restrictions.isPermBanned = false
  user.restrictions.banReason = undefined
  await user.save()

  res.json({
    success: true,
    message: 'User unbanned successfully',
  })
})

// Get all reports (moderation queue)
export const getReports = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20
  const status = req.query.status as string

  const query: any = {}
  
  if (status && ['pending', 'investigating', 'resolved', 'dismissed'].includes(status)) {
    query.status = status
  }

  const total = await Report.countDocuments(query)
  const reports = await Report.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()

  // Populate user details
  const reportedUserIds = reports.map(r => r.reportedUserId)
  const reporterUserIds = reports.map(r => r.reporterUserId)
  const allUserIds = [...new Set([...reportedUserIds, ...reporterUserIds])]
  
  const users = await User.find({ _id: { $in: allUserIds } })
    .select('name email')
    .lean()
  
  const userMap = new Map(users.map(u => [u._id.toString(), u]))

  const reportsWithUsers = reports.map(report => ({
    ...report,
    reportedUser: userMap.get(report.reportedUserId),
    reporter: userMap.get(report.reporterUserId),
  }))

  res.json({
    reports: reportsWithUsers,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  })
})

// Get single report
export const getReportById = asyncHandler(async (req: Request, res: Response) => {
  const report = await Report.findById(req.params.id).lean()
  
  if (!report) {
    throw new AppError(404, 'Report not found')
  }

  // Get user details
  const [reportedUser, reporter] = await Promise.all([
    User.findById(report.reportedUserId).select('name email status').lean(),
    User.findById(report.reporterUserId).select('name email').lean(),
  ])

  res.json({
    report: {
      ...report,
      reportedUser,
      reporter,
    },
  })
})

// Update report status
export const updateReport = asyncHandler(async (req: Request, res: Response) => {
  const { status, moderatorNotes } = req.body
  const reportId = req.params.id

  const report = await Report.findById(reportId)
  if (!report) {
    throw new AppError(404, 'Report not found')
  }

  if (status && ['pending', 'investigating', 'resolved', 'dismissed'].includes(status)) {
    report.status = status
    if (status === 'resolved' || status === 'dismissed') {
      report.resolvedAt = new Date()
    }
  }

  if (moderatorNotes) {
    report.moderatorNotes = moderatorNotes
  }

  await report.save()

  res.json({
    success: true,
    message: 'Report updated successfully',
    report,
  })
})

// Take action on report (ban/suspend reported user)
export const takeActionOnReport = asyncHandler(async (req: Request, res: Response) => {
  const { action, reason, duration } = req.body
  const reportId = req.params.id

  const report = await Report.findById(reportId)
  if (!report) {
    throw new AppError(404, 'Report not found')
  }

  const user = await User.findById(report.reportedUserId)
  if (!user) {
    throw new AppError(404, 'Reported user not found')
  }

  if (user.role === 'admin') {
    throw new AppError(400, 'Cannot take action against an admin')
  }

  switch (action) {
    case 'warn':
      user.stats.warningCount += 1
      user.stats.lastWarningDate = new Date()
      break
    case 'suspend':
      const suspensionExpires = new Date()
      suspensionExpires.setHours(suspensionExpires.getHours() + (duration || 24))
      user.status = 'suspended'
      user.restrictions.isSuspended = true
      user.restrictions.suspensionReason = reason || `Action from report ${reportId}`
      user.restrictions.suspensionExpiresAt = suspensionExpires
      break
    case 'ban':
      user.status = 'banned'
      user.restrictions.isPermBanned = true
      user.restrictions.banReason = reason || `Action from report ${reportId}`
      break
    case 'dismiss':
      // No action on user
      break
    default:
      throw new AppError(400, 'Invalid action')
  }

  await user.save()

  // Update report
  report.status = action === 'dismiss' ? 'dismissed' : 'resolved'
  report.moderatorNotes = `Action taken: ${action}. ${reason || ''}`
  report.resolvedAt = new Date()
  await report.save()

  res.json({
    success: true,
    message: `Action '${action}' taken successfully`,
  })
})
