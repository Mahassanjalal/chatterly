import { Schema, model, Document } from 'mongoose'
import { z } from 'zod'

// Matching preferences validation schema
export const matchingPreferencesValidation = z.object({
  languages: z.array(z.string()),
  interests: z.array(z.string()),
  ageRange: z.object({
    min: z.number().min(18).max(100),
    max: z.number().min(18).max(100)
  }),
  location: z.object({
    country: z.string().optional(),
    region: z.string().optional()
  }).optional()
})

export type MatchingPreferencesInput = z.infer<typeof matchingPreferencesValidation>

// Mongoose interface
export interface IMatchingPreferences extends Document {
  userId: string
  languages: string[]
  interests: string[]
  ageRange: {
    min: number
    max: number
  }
  location?: {
    country?: string
    region?: string
  }
  createdAt: Date
  updatedAt: Date
}

// Mongoose schema
const mongooseSchema = new Schema<IMatchingPreferences>(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User',
      unique: true
    },
    languages: [{
      type: String,
      required: true
    }],
    interests: [{
      type: String,
      required: true
    }],
    ageRange: {
      min: {
        type: Number,
        required: true,
        min: 18,
        max: 100
      },
      max: {
        type: Number,
        required: true,
        min: 18,
        max: 100
      }
    },
    location: {
      country: String,
      region: String
    }
  },
  {
    timestamps: true
  }
)

// Create indexes
mongooseSchema.index({ userId: 1 })
mongooseSchema.index({ languages: 1 })
mongooseSchema.index({ interests: 1 })

export const MatchingPreferences = model<IMatchingPreferences>('MatchingPreferences', mongooseSchema)
