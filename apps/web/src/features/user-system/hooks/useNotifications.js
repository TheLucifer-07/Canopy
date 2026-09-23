import { useState, useEffect, useCallback } from 'react';

export function useNotifications(api) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    setError(null);
    try {
      const [listRes, countRes] = await Promise.all([
        api.listNotifications({ limit: 50 }).catch(() => ({ data: [] })),
        api.getUnreadNotificationCount().catch(() => ({ unread_count: 0 }))
      ]);
      setNotifications(Array.isArray(listRes.data) ? listRes.data : []);
      setUnreadCount(countRes.unread_count || 0);
    } catch (err) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId) => {
    try {
      await api.markNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read_at: n.read_at || new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setError(err.message || 'Failed to mark notification as read.');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      setError(err.message || 'Failed to mark all notifications as read.');
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead
  };
}
