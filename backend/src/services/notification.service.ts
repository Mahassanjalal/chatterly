import { v4 as uuidv4 } from 'uuid';
import { redis } from '../config/redis';
import { logger } from '../config/logger';

/**
 * In-App Notification Service
 * Handles real-time notifications for the Chatterly platform
 * 
 * Features:
 * - Real-time notification delivery via Socket.io
 * - Notification persistence in Redis for offline users
 * - Notification types: match_found, message_received, system_alert, etc.
 * - Read/unread tracking
 * - Notification batching for efficiency
 */

// Notification types
export type NotificationType =
  | 'match_found'
  | 'match_ended'
  | 'message_received'
  | 'message_blocked'
  | 'message_warning'
  | 'user_reported'
  | 'account_warning'
  | 'subscription_reminder'
  | 'subscription_upgraded'
  | 'email_verified'
  | 'system_maintenance'
  | 'system_update'
  | 'welcome'
  | 'connection_quality';

// Notification priority levels
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// Notification interface
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority: NotificationPriority;
  read: boolean;
  createdAt: number;
  expiresAt?: number;
}

// Notification creation input
export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
  expiresInMs?: number;
}

// Redis key patterns
const KEYS = {
  USER_NOTIFICATIONS: (userId: string) => `notifications:user:${userId}`,
  NOTIFICATION: (notificationId: string) => `notification:${notificationId}`,
  USER_UNREAD_COUNT: (userId: string) => `notifications:unread:${userId}`,
  NOTIFICATION_CHANNEL: 'notifications:realtime',
};

// Configuration
const CONFIG = {
  MAX_NOTIFICATIONS_PER_USER: 100, // Maximum stored notifications per user
  DEFAULT_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000, // 7 days default expiry
  NOTIFICATION_TTL_SECONDS: 7 * 24 * 60 * 60, // 7 days in Redis
};

// Notification templates
const NOTIFICATION_TEMPLATES: Record<NotificationType, { title: string; message: string }> = {
  match_found: {
    title: 'New Match Found!',
    message: 'You\'ve been matched with someone. Start chatting now!',
  },
  match_ended: {
    title: 'Chat Ended',
    message: 'Your chat partner has left the conversation.',
  },
  message_received: {
    title: 'New Message',
    message: 'You have a new message.',
  },
  message_blocked: {
    title: 'Message Blocked',
    message: 'Your message was blocked by our content filter.',
  },
  message_warning: {
    title: 'Content Warning',
    message: 'Please follow our community guidelines.',
  },
  user_reported: {
    title: 'Report Submitted',
    message: 'Your report has been submitted and will be reviewed.',
  },
  account_warning: {
    title: 'Account Warning',
    message: 'Your account has received a warning. Please review our guidelines.',
  },
  subscription_reminder: {
    title: 'Subscription Reminder',
    message: 'Your premium subscription is expiring soon.',
  },
  subscription_upgraded: {
    title: 'Subscription Upgraded',
    message: 'Welcome to Premium! Enjoy your new features.',
  },
  email_verified: {
    title: 'Email Verified',
    message: 'Your email has been successfully verified.',
  },
  system_maintenance: {
    title: 'Scheduled Maintenance',
    message: 'The system will undergo maintenance soon.',
  },
  system_update: {
    title: 'System Update',
    message: 'New features and improvements are now available.',
  },
  welcome: {
    title: 'Welcome to Chatterly!',
    message: 'Start connecting with people around the world.',
  },
  connection_quality: {
    title: 'Connection Quality',
    message: 'Your connection quality has changed.',
  },
};

export class NotificationService {
  private socketEmitter: ((userId: string, event: string, data: unknown) => void) | null = null;

  /**
   * Set the socket emitter function (called from SocketService)
   */
  setSocketEmitter(emitter: (userId: string, event: string, data: unknown) => void): void {
    this.socketEmitter = emitter;
  }

  /**
   * Create and send a notification
   */
  async createNotification(input: CreateNotificationInput): Promise<Notification> {
    const notification: Notification = {
      id: this.generateNotificationId(),
      userId: input.userId,
      type: input.type,
      title: input.title || NOTIFICATION_TEMPLATES[input.type]?.title || 'Notification',
      message: input.message || NOTIFICATION_TEMPLATES[input.type]?.message || '',
      data: input.data,
      priority: input.priority || this.getDefaultPriority(input.type),
      read: false,
      createdAt: Date.now(),
      expiresAt: input.expiresInMs ? Date.now() + input.expiresInMs : undefined,
    };

    try {
      // Store notification in Redis
      await this.storeNotification(notification);

      // Increment unread count
      await redis.incr(KEYS.USER_UNREAD_COUNT(input.userId));

      // Send real-time notification
      await this.sendRealtimeNotification(notification);

      logger.debug(`Notification created for user ${input.userId}: ${notification.type}`);
      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create notification using template
   */
  async notify(
    userId: string,
    type: NotificationType,
    data?: Record<string, unknown>,
    customMessage?: string
  ): Promise<Notification> {
    const template = NOTIFICATION_TEMPLATES[type];
    return this.createNotification({
      userId,
      type,
      title: template?.title || 'Notification',
      message: customMessage || template?.message || '',
      data,
    });
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      unreadOnly?: boolean;
      types?: NotificationType[];
    } = {}
  ): Promise<Notification[]> {
    try {
      const limit = options.limit || 50;
      const listKey = KEYS.USER_NOTIFICATIONS(userId);

      // Get notification IDs from user's list
      const notificationIds = await redis.lRange(listKey, 0, limit - 1);
      if (notificationIds.length === 0) return [];

      // Fetch notifications in batch
      const notificationKeys = notificationIds.map(id => KEYS.NOTIFICATION(id));
      const notificationData = await redis.mGet(notificationKeys);

      const notifications: Notification[] = [];
      const expiredIds: string[] = [];

      for (let i = 0; i < notificationData.length; i++) {
        const data = notificationData[i];
        if (!data) {
          expiredIds.push(notificationIds[i]);
          continue;
        }

        const notification: Notification = JSON.parse(data);

        // Check if expired
        if (notification.expiresAt && notification.expiresAt < Date.now()) {
          expiredIds.push(notificationIds[i]);
          continue;
        }

        // Apply filters
        if (options.unreadOnly && notification.read) continue;
        if (options.types && !options.types.includes(notification.type)) continue;

        notifications.push(notification);
      }

      // Clean up expired notifications
      if (expiredIds.length > 0) {
        this.cleanupExpiredNotifications(userId, expiredIds).catch(err => {
          logger.error('Error cleaning up expired notifications:', err);
        });
      }

      return notifications;
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    try {
      const key = KEYS.NOTIFICATION(notificationId);
      const data = await redis.get(key);
      
      if (!data) return false;

      const notification: Notification = JSON.parse(data);
      
      // Verify ownership
      if (notification.userId !== userId) return false;

      // Update if not already read
      if (!notification.read) {
        notification.read = true;
        await redis.setEx(key, CONFIG.NOTIFICATION_TTL_SECONDS, JSON.stringify(notification));
        
        // Decrement unread count
        await redis.decr(KEYS.USER_UNREAD_COUNT(userId));
      }

      return true;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const notifications = await this.getUserNotifications(userId, { unreadOnly: true });
      let count = 0;

      for (const notification of notifications) {
        if (await this.markAsRead(userId, notification.id)) {
          count++;
        }
      }

      // Reset unread count
      await redis.set(KEYS.USER_UNREAD_COUNT(userId), '0');

      return count;
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      return 0;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<boolean> {
    try {
      const key = KEYS.NOTIFICATION(notificationId);
      const data = await redis.get(key);
      
      if (!data) return false;

      const notification: Notification = JSON.parse(data);
      
      // Verify ownership
      if (notification.userId !== userId) return false;

      // Delete notification
      await redis.del(key);
      
      // Remove from user's list
      await redis.lRem(KEYS.USER_NOTIFICATIONS(userId), 0, notificationId);

      // Update unread count if needed
      if (!notification.read) {
        await redis.decr(KEYS.USER_UNREAD_COUNT(userId));
      }

      return true;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      return false;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const count = await redis.get(KEYS.USER_UNREAD_COUNT(userId));
      return Math.max(0, parseInt(count || '0'));
    } catch (error) {
      logger.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Send notification to multiple users (broadcast)
   */
  async broadcast(
    userIds: string[],
    type: NotificationType,
    data?: Record<string, unknown>,
    customMessage?: string
  ): Promise<number> {
    let sent = 0;
    
    for (const userId of userIds) {
      try {
        await this.notify(userId, type, data, customMessage);
        sent++;
      } catch (error) {
        logger.error(`Error broadcasting notification to ${userId}:`, error);
      }
    }

    return sent;
  }

  /**
   * Send system-wide notification
   */
  async systemNotification(
    type: 'system_maintenance' | 'system_update',
    message: string
  ): Promise<void> {
    try {
      // Publish to Redis channel for all connected users
      const notification = {
        type,
        title: NOTIFICATION_TEMPLATES[type].title,
        message,
        createdAt: Date.now(),
      };

      await redis.publish(KEYS.NOTIFICATION_CHANNEL, JSON.stringify({
        broadcast: true,
        notification,
      }));

      logger.info(`System notification sent: ${type}`);
    } catch (error) {
      logger.error('Error sending system notification:', error);
    }
  }

  // --- Private Helper Methods ---

  /**
   * Store notification in Redis
   */
  private async storeNotification(notification: Notification): Promise<void> {
    const pipeline = redis.multi();

    // Store notification data
    pipeline.setEx(
      KEYS.NOTIFICATION(notification.id),
      CONFIG.NOTIFICATION_TTL_SECONDS,
      JSON.stringify(notification)
    );

    // Add to user's notification list (most recent first)
    pipeline.lPush(KEYS.USER_NOTIFICATIONS(notification.userId), notification.id);

    // Trim list to max size
    pipeline.lTrim(KEYS.USER_NOTIFICATIONS(notification.userId), 0, CONFIG.MAX_NOTIFICATIONS_PER_USER - 1);

    await pipeline.exec();
  }

  /**
   * Send real-time notification via Socket.io
   */
  private async sendRealtimeNotification(notification: Notification): Promise<void> {
    if (this.socketEmitter) {
      this.socketEmitter(notification.userId, 'notification', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        priority: notification.priority,
        createdAt: notification.createdAt,
      });
    }

    // Also publish to Redis for distributed systems
    await redis.publish(KEYS.NOTIFICATION_CHANNEL, JSON.stringify({
      userId: notification.userId,
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        priority: notification.priority,
        createdAt: notification.createdAt,
      },
    }));
  }

  /**
   * Clean up expired notifications
   */
  private async cleanupExpiredNotifications(userId: string, expiredIds: string[]): Promise<void> {
    const pipeline = redis.multi();
    
    for (const id of expiredIds) {
      pipeline.del(KEYS.NOTIFICATION(id));
      pipeline.lRem(KEYS.USER_NOTIFICATIONS(userId), 0, id);
    }
    
    await pipeline.exec();
  }

  /**
   * Get default priority for notification type
   */
  private getDefaultPriority(type: NotificationType): NotificationPriority {
    switch (type) {
      case 'account_warning':
      case 'system_maintenance':
        return 'urgent';
      case 'match_found':
      case 'message_blocked':
      case 'message_warning':
        return 'high';
      case 'message_received':
      case 'subscription_reminder':
        return 'normal';
      default:
        return 'low';
    }
  }

  /**
   * Generate unique notification ID using UUID for collision resistance
   */
  private generateNotificationId(): string {
    return `notif_${uuidv4()}`;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Export types
export { NotificationType, NotificationPriority, Notification };
