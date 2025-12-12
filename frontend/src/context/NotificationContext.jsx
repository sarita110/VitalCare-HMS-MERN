// src/context/NotificationContext.jsx
import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
} from "react";
import PropTypes from "prop-types";
import notificationService from "../services/notificationService";
import AuthContext from "./AuthContext";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0); // Consider fetching this separately
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 10,
  });

  const fetchNotifications = useCallback(
    async (page = 1, limit = 10) => {
      if (!isAuthenticated) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Assuming getNotifications works for the logged-in user based on token
        const response = await notificationService.getNotifications({
          page,
          limit,
        });
        if (response.success) {
          setNotifications(response.notifications);
          setPagination(response.pagination);
          // TODO: Implement a dedicated endpoint or logic to get total unread count accurately.
          // This is a placeholder count based on the current page.
          const currentUnread = response.notifications.filter(
            (n) => !n.isRead
          ).length;
          setUnreadCount(currentUnread); // Simplification
        } else {
          throw new Error(response.message || "Failed to fetch notifications");
        }
      } catch (err) {
        console.error("Fetch notifications error:", err);
        setError(err.message || "Could not load notifications.");
        setNotifications([]);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated]
  );

  // Fetch on mount and when authentication status changes
  useEffect(() => {
    fetchNotifications(1, pagination.limit); // Fetch first page on auth change
  }, [isAuthenticated, fetchNotifications, pagination.limit]);

  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1)); // Decrement placeholder count
    } catch (err) {
      console.error("Mark notification read error:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Mark all notifications read error:", err);
    }
  };

  const value = {
    notifications,
    unreadCount, // Note: This might only reflect the current page's unread count
    loading,
    error,
    pagination,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

NotificationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default NotificationContext;
