import { Router } from 'express';
import { auth } from '../middleware/auth';
import { apiLimiter } from '../middleware/rate-limiter';
import { notificationService, NotificationType } from '../services/notification.service';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/error';

const router = Router();

// Apply rate limiting to all notification routes
router.use(apiLimiter);

/**
 * @route GET /api/notifications
 * @desc Get user's notifications
 * @access Private
 */
router.get(
  '/',
  auth,
  asyncHandler(async (req:any, res:any) => {
    const userId = req.user?._id;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const { limit, unreadOnly, types } = req.query;

    const notifications = await notificationService.getUserNotifications(userId, {
      limit: limit ? parseInt(limit as string) : 50,
      unreadOnly: unreadOnly === 'true',
      types: types ? (types as string).split(',') as NotificationType[] : undefined,
    });

    res.json({
      success: true,
      notifications,
      count: notifications.length,
    });
  })
);

/**
 * @route GET /api/notifications/unread-count
 * @desc Get unread notification count
 * @access Private
 */
router.get(
  '/unread-count',
  auth,
  asyncHandler(async (req:any, res:any) => {
    const userId = req.user?._id;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const count = await notificationService.getUnreadCount(userId);

    res.json({
      success: true,
      unreadCount: count,
    });
  })
);

/**
 * @route POST /api/notifications/:id/read
 * @desc Mark a notification as read
 * @access Private
 */
router.post(
  '/:id/read',
  auth,
  asyncHandler(async (req:any, res:any) => {
    const userId = req.user?._id;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const { id } = req.params;
    const success = await notificationService.markAsRead(userId, id);

    if (!success) {
      throw new AppError(404, 'Notification not found');
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  })
);

/**
 * @route POST /api/notifications/read-all
 * @desc Mark all notifications as read
 * @access Private
 */
router.post(
  '/read-all',
  auth,
  asyncHandler(async (req:any, res:any) => {
    const userId = req.user?._id;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const count = await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: `${count} notifications marked as read`,
      count,
    });
  })
);

/**
 * @route DELETE /api/notifications/:id
 * @desc Delete a notification
 * @access Private
 */
router.delete(
  '/:id',
  auth,
  asyncHandler(async (req:any, res:any) => {
    const userId = req.user?._id;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const { id } = req.params;
    const success = await notificationService.deleteNotification(userId, id);

    if (!success) {
      throw new AppError(404, 'Notification not found');
    }

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  })
);

export default router;
