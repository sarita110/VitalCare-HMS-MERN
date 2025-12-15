// src/hooks/useNotification.js
import { useState, useEffect, useCallback, useContext } from "react";
import notificationService from "../services/notificationService";
import AuthContext from "../context/AuthContext";

const useNotification = (refreshInterval = 60000) => {
  const { isAuthenticated } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]); // For dropdown list
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    try {
      const response = await notificationService.getUnreadNotificationCount();
      if (response.success) {
        setUnreadCount(response.unreadCount);
      } else {
        console.error("Failed to fetch unread count:", response.message);
        // Optionally set error state here
      }
    } catch (err) {
      console.error("Error fetching unread count:", err);
      // Optionally set error state here
    }
  }, [isAuthenticated]);

  const fetchNotificationsList = useCallback(
    async (limit = 5) => {
      if (!isAuthenticated) {
        setNotifications([]);
        return;
      }
      // setIsLoading(true); // Maybe don't show loading for dropdown refresh
      // setError(null);
      try {
        // Fetch list AND get the latest unread count in one call
        const response = await notificationService.getNotifications({ limit });
        if (response.success) {
          setNotifications(response.notifications);
          setUnreadCount(
            response.unreadCount !== undefined ? response.unreadCount : 0
          ); // Update count from list fetch too
        } else {
          throw new Error(
            response.message || "Failed to fetch notifications list"
          );
        }
      } catch (err) {
        // setError(err.message);
        console.error("Error fetching notifications list:", err);
      } /*finally {
      setIsLoading(false);
    }*/
    },
    [isAuthenticated]
  );

  const markAsRead = useCallback(
    async (id) => {
      if (!isAuthenticated) return;
      try {
        // Only call API if it's actually unread based on current state
        const notificationToMark = notifications.find((n) => n._id === id);
        if (notificationToMark && !notificationToMark.isRead) {
          const response = await notificationService.markNotificationAsRead(id);
          if (response.success) {
            // Update local state immediately for responsiveness
            setNotifications((prev) =>
              prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
            );
            setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0)); // Decrement count locally
          } else {
            console.error(
              "Failed to mark notification as read (API):",
              response.message
            );
            // Optional: Show toast error
          }
        }
      } catch (err) {
        console.error("Error marking notification as read:", err);
        // Optional: Show toast error
      }
    },
    [isAuthenticated, notifications]
  ); // Add notifications dependency

  // Initial fetch and interval setup
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount(); // Initial count fetch
      fetchNotificationsList(); // Fetch initial list for dropdown

      const intervalId = setInterval(fetchUnreadCount, refreshInterval);
      return () => clearInterval(intervalId);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [
    isAuthenticated,
    fetchUnreadCount,
    fetchNotificationsList,
    refreshInterval,
  ]);

  return {
    notifications, // List for dropdown
    unreadCount,
    isLoading, // Loading for the main page, maybe not for dropdown
    error,
    markAsRead, // Function to mark one as read
    refreshCount: fetchUnreadCount, // Manually trigger count refresh if needed
  };
};

export default useNotification;
