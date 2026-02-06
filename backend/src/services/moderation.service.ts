import { logger } from '../config/logger'
// const Filter = require('bad-words')
import {filter as Filter} from '../utils/filter';

export class ModerationService {
  private filter: any

  constructor() {
    this.filter = Filter
    // Add custom words if needed
    // this.filter.addWords('customword1', 'customword2')
  }

  /**
   * Cleans a message by replacing profanity with asterisks
   */
  public cleanMessage(message: string): string {
    try {
      if (!message) return ''
      return this.filter.clean(message)
    } catch (error) {
      logger.error('Error cleaning message:', error)
      return message // Return original message if cleaning fails
    }
  }

  /**
   * Checks if a message contains profanity
   */
  public isProfane(message: string): boolean {
    try {
      if (!message) return false
      return this.filter.isProfane(message)
    } catch (error) {
      logger.error('Error checking profanity:', error)
      return false
    }
  }
}

export const moderationService = new ModerationService()
