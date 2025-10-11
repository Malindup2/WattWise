import { useEffect, useState } from 'react';
import { auth } from '../../../../config/firebase';
import { 
  subscribeToUserNotifications, 
  markNotificationAsRead,
  getUnreadNotificationsCount 
} from '../services';
import { NotificationData } from '../types';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // Subscribe to notifications
    const unsubscribe = subscribeToUserNotifications(currentUser.uid, (newNotifications) => {
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter(n => !n.read).length);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const markAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
  };

  const markAllAsRead = async () => {
    await Promise.all(
      notifications
        .filter(n => !n.read)
        .map(n => markNotificationAsRead(n.id))
    );
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  };
};