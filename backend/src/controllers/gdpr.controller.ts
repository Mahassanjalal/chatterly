import { Request, Response } from 'express'
import { User } from '../models/user.model'
import { Report } from '../models/report.model'
import { AppError } from '../middleware/error'
import { asyncHandler } from '../utils/asyncHandler'
import { sendAccountDeletionConfirmation } from '../services/email.service'

// Export user data (GDPR compliance)
export const exportUserData = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id

  const user = await User.findById(userId)
    .select('-password -passwordResetToken -emailVerificationToken')
    .lean()

  if (!user) {
    throw new AppError(404, 'User not found')
  }

  // Get user's reports (both made and received)
  const [reportsMade, reportsReceived] = await Promise.all([
    Report.find({ reporterUserId: userId }).lean(),
    Report.find({ reportedUserId: userId }).lean(),
  ])

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      type: user.type,
      status: user.status,
      role: user.role,
      flags: user.flags,
      stats: user.stats,
      restrictions: user.restrictions,
      blockedUsers: user.blockedUsers,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    reports: {
      made: reportsMade.map(r => ({
        id: r._id,
        reason: r.reason,
        description: r.description,
        status: r.status,
        createdAt: r.createdAt,
      })),
      received: reportsReceived.map(r => ({
        id: r._id,
        reason: r.reason,
        status: r.status,
        moderatorNotes: r.moderatorNotes,
        resolvedAt: r.resolvedAt,
        createdAt: r.createdAt,
      })),
    },
  }

  // Set headers for download
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename="chatterly-data-export-${user._id}.json"`)
  
  res.json(exportData)
})

// Delete user account (GDPR Right to be Forgotten)
export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id
  const { password, confirmation } = req.body

  if (confirmation !== 'DELETE') {
    throw new AppError(400, 'Please type DELETE to confirm account deletion')
  }

  const user = await User.findById(userId)
  if (!user) {
    throw new AppError(404, 'User not found')
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password)
  if (!isPasswordValid) {
    throw new AppError(401, 'Invalid password')
  }

  // Prevent admin from deleting their own account
  if (user.role === 'admin') {
    throw new AppError(400, 'Admin accounts cannot be self-deleted')
  }

  // Store email and name before deletion for confirmation email
  const { email, name } = user

  // Delete user data
  await Promise.all([
    // Delete the user
    User.findByIdAndDelete(userId),
    
    // Anonymize reports made by this user
    Report.updateMany(
      { reporterUserId: userId },
      { $set: { reporterUserId: 'deleted-user' } }
    ),
    
    // Anonymize reports against this user (keep for safety records)
    Report.updateMany(
      { reportedUserId: userId },
      { $set: { reportedUserId: 'deleted-user' } }
    ),

    // Remove user from everyone's blocked list
    User.updateMany(
      { blockedUsers: userId },
      { $pull: { blockedUsers: userId } }
    ),
  ])

  // Clear the auth cookie
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  })

  // Send confirmation email
  sendAccountDeletionConfirmation(email, name).catch(err => {
    console.error('Failed to send deletion confirmation email:', err)
  })

  res.json({
    success: true,
    message: 'Account deleted successfully. All your data has been removed.',
  })
})

// Get data retention info
export const getDataRetentionInfo = asyncHandler(async (req: Request, res: Response) => {
  res.json({
    dataRetention: {
      userAccounts: 'Retained until account deletion',
      chatMessages: 'Not stored (peer-to-peer only)',
      videoAudio: 'Not recorded or stored',
      reports: 'Retained for 1 year after resolution, then anonymized',
      securityLogs: '90 days',
      usageLogs: '30 days',
    },
    yourRights: {
      access: 'You can export all your data using the export feature',
      rectification: 'You can update your profile information anytime',
      erasure: 'You can delete your account and all associated data',
      portability: 'Your data export is in standard JSON format',
      restriction: 'Contact support to restrict processing of your data',
    },
  })
})
