import { Schema, model, Document } from 'mongoose'

export interface ISession extends Document {
  userId: string
  token: string
  deviceInfo: {
    userAgent: string
    ip: string
  }
  lastActive: Date
  createdAt: Date
  updatedAt: Date
}

const sessionSchema = new Schema<ISession>(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User'
    },
    token: {
      type: String,
      required: true,
      unique: true
    },
    deviceInfo: {
      userAgent: String,
      ip: String
    },
    lastActive: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
)

// Create indexes
sessionSchema.index({ userId: 1 })
sessionSchema.index({ token: 1 })
sessionSchema.index({ lastActive: 1 })

export const Session = model<ISession>('Session', sessionSchema)
