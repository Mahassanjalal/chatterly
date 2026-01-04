"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moderationService = exports.ModerationService = void 0;
const logger_1 = require("../config/logger");
const Filter = require('bad-words');
class ModerationService {
    constructor() {
        this.filter = new Filter();
        // Add custom words if needed
        // this.filter.addWords('customword1', 'customword2')
    }
    /**
     * Cleans a message by replacing profanity with asterisks
     */
    cleanMessage(message) {
        try {
            if (!message)
                return '';
            return this.filter.clean(message);
        }
        catch (error) {
            logger_1.logger.error('Error cleaning message:', error);
            return message; // Return original message if cleaning fails
        }
    }
    /**
     * Checks if a message contains profanity
     */
    isProfane(message) {
        try {
            if (!message)
                return false;
            return this.filter.isProfane(message);
        }
        catch (error) {
            logger_1.logger.error('Error checking profanity:', error);
            return false;
        }
    }
}
exports.ModerationService = ModerationService;
exports.moderationService = new ModerationService();
