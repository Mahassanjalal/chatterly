"use client";

import { useState, useEffect, useCallback } from "react";

// Notification types matching backend
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

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority: NotificationPriority;
  read?: boolean;
  createdAt: number;
}

interface NotificationCenterProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onDismiss: (notificationId: string) => void;
  onClose: () => void;
}

// Notification icons by type
const getNotificationIcon = (type: NotificationType): JSX.Element => {
  const iconClass = "w-5 h-5";
  
  switch (type) {
    case 'match_found':
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      );
    case 'match_ended':
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
      );
    case 'message_received':
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
        </svg>
      );
    case 'message_blocked':
    case 'message_warning':
    case 'account_warning':
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
        </svg>
      );
    case 'subscription_upgraded':
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
        </svg>
      );
    case 'email_verified':
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
        </svg>
      );
    case 'system_maintenance':
    case 'system_update':
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
        </svg>
      );
    default:
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
        </svg>
      );
  }
};

// Get background color based on type/priority
const getNotificationStyle = (type: NotificationType, priority: NotificationPriority): string => {
  if (priority === 'urgent') {
    return 'bg-red-50 border-red-200';
  }
  
  switch (type) {
    case 'match_found':
      return 'bg-green-50 border-green-200';
    case 'match_ended':
      return 'bg-gray-50 border-gray-200';
    case 'message_blocked':
    case 'message_warning':
    case 'account_warning':
      return 'bg-yellow-50 border-yellow-200';
    case 'subscription_upgraded':
      return 'bg-purple-50 border-purple-200';
    case 'system_maintenance':
      return 'bg-orange-50 border-orange-200';
    default:
      return 'bg-blue-50 border-blue-200';
  }
};

// Get icon color based on type
const getIconColor = (type: NotificationType): string => {
  switch (type) {
    case 'match_found':
      return 'text-green-500';
    case 'match_ended':
      return 'text-gray-500';
    case 'message_blocked':
    case 'message_warning':
    case 'account_warning':
      return 'text-yellow-500';
    case 'subscription_upgraded':
      return 'text-purple-500';
    case 'system_maintenance':
    case 'system_update':
      return 'text-orange-500';
    default:
      return 'text-blue-500';
  }
};

// Format relative time
const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

export default function NotificationCenter({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onClose,
}: NotificationCenterProps) {
  return (
    <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-800">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-500 text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="text-xs text-blue-500 hover:text-blue-600 font-medium"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div className="overflow-y-auto max-h-72">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
            </svg>
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                !notification.read ? getNotificationStyle(notification.type, notification.priority) : ''
              }`}
              onClick={() => onMarkAsRead(notification.id)}
            >
              <div className="flex gap-3">
                <div className={`flex-shrink-0 mt-0.5 ${getIconColor(notification.type)}`}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                      {notification.title}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDismiss(notification.id);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </div>
                  <p className={`text-xs mt-0.5 ${notification.read ? 'text-gray-400' : 'text-gray-600'}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatRelativeTime(notification.createdAt)}
                  </p>
                </div>
                {!notification.read && (
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
          <button className="text-xs text-blue-500 hover:text-blue-600 font-medium">
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}

// Notification Bell Button Component
interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
}

export function NotificationBell({ unreadCount, onClick }: NotificationBellProps) {
  return (
    <button
      onClick={onClick}
      className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors"
      aria-label="Notifications"
    >
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}

// Toast notification for real-time alerts
interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
  onClick?: () => void;
}

export function NotificationToast({ notification, onClose, onClick }: NotificationToastProps) {
  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm w-full bg-white rounded-lg shadow-lg border-l-4 overflow-hidden animate-slideIn ${
        notification.priority === 'urgent' ? 'border-red-500' :
        notification.priority === 'high' ? 'border-yellow-500' :
        'border-blue-500'
      }`}
      onClick={onClick}
    >
      <div className="p-4 flex gap-3">
        <div className={`flex-shrink-0 ${getIconColor(notification.type)}`}>
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
          <p className="text-xs text-gray-600 mt-0.5">{notification.message}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// Hook for managing notifications
export function useNotifications(socket: ReturnType<typeof import("socket.io-client").io> | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCenter, setShowCenter] = useState(false);
  const [toastNotification, setToastNotification] = useState<Notification | null>(null);

  // Fetch initial notifications
  const fetchNotifications = useCallback(() => {
    if (socket) {
      socket.emit('get_notifications');
    }
  }, [socket]);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    // Handle notifications list
    socket.on('notifications_list', (data: { notifications: Notification[]; unreadCount: number }) => {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    });

    // Handle new notification
    socket.on('notification', (notification: Notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
      
      // Show toast for high/urgent priority
      if (notification.priority === 'high' || notification.priority === 'urgent') {
        setToastNotification(notification);
      }
    });

    // Handle notification read confirmation
    socket.on('notification_read', (data: { notificationId: string; unreadCount: number }) => {
      setNotifications(prev =>
        prev.map(n => n.id === data.notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(data.unreadCount);
    });

    // Fetch initial notifications
    fetchNotifications();

    return () => {
      socket.off('notifications_list');
      socket.off('notification');
      socket.off('notification_read');
    };
  }, [socket, fetchNotifications]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    if (socket) {
      socket.emit('mark_notification_read', { notificationId });
    }
  }, [socket]);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    // Update locally first for better UX
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    
    // Then sync with server
    if (socket) {
      socket.emit('mark_all_notifications_read');
    }
  }, [socket]);

  // Dismiss notification
  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    // Optionally delete from server
  }, []);

  // Dismiss toast
  const dismissToast = useCallback(() => {
    setToastNotification(null);
  }, []);

  return {
    notifications,
    unreadCount,
    showCenter,
    setShowCenter,
    toastNotification,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    dismissToast,
    fetchNotifications,
  };
}
