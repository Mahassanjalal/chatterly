import { Schema, model, Document } from 'mongoose'
import { z } from 'zod'

// Report validation schema
export const reportValidation = z.object({
  reportedUserId: z.string(),
  reporterUserId: z.string(),
  reason: z.enum(['inappropriate_behavior', 'harassment', 'spam', 'underage', 'other']),
  description: z.string().optional(),
  evidenceUrls: z.array(z.string()).optional()
})

export type ReportInput = z.infer<typeof reportValidation>

// Report status type
export type ReportStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed'

// Report interface
export interface IReport extends Document {
  reportedUserId: string
  reporterUserId: string
  reason: 'inappropriate_behavior' | 'harassment' | 'spam' | 'underage' | 'other'
  description?: string
  evidenceUrls?: string[]
  status: ReportStatus
  moderatorNotes?: string
  resolvedAt?: Date
  createdAt: Date
  updatedAt: Date
}

// Mongoose schema
const mongooseSchema = new Schema<IReport>(
  {
    reportedUserId: {
      type: String,
      required: true,
      ref: 'User'
    },
    reporterUserId: {
      type: String,
      required: true,
      ref: 'User'
    },
    reason: {
      type: String,
      required: true,
      enum: ['inappropriate_behavior', 'harassment', 'spam', 'underage', 'other']
    },
    description: String,
    evidenceUrls: [String],
    status: {
      type: String,
      required: true,
      enum: ['pending', 'investigating', 'resolved', 'dismissed'],
      default: 'pending'
    },
    moderatorNotes: String,
    resolvedAt: Date
  },
  {
    timestamps: true
  }
)

// Create indexes
mongooseSchema.index({ reportedUserId: 1 })
mongooseSchema.index({ reporterUserId: 1 })
mongooseSchema.index({ status: 1 })
mongooseSchema.index({ createdAt: 1 })

export const Report = model<IReport>('Report', mongooseSchema)
