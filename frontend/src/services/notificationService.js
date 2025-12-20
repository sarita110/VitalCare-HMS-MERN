// src/services/notificationService.js
import api from "./api";
// REMOVE the getUser import and the role check

/**
 * Get notifications for the logged-in user.
 * @param {object} params - Query parameters (page, limit, isRead)
 * @returns {Promise<object>} Response data including notifications list and pagination.
 */
export const getNotifications = async (params = {}) => {
  // Call the new generic endpoint
  const response = await api.get("/notifications", { params });
  return response.data; // { success, notifications, pagination, unreadCount }
};

/**
 * Mark a specific notification as read.
 * @param {string} notificationId - The ID of the notification.
 * @returns {Promise<object>} Response data.
 */
export const markNotificationAsRead = async (notificationId) => {
  // Call the new generic endpoint
  const response = await api.put(`/notifications/${notificationId}/read`);
  return response.data; // { success, message, notification? }
};

/**
 * Mark all unread notifications as read for the logged-in user.
 * @returns {Promise<object>} Response data.
 */
export const markAllNotificationsAsRead = async () => {
  // Call the new generic endpoint
  const response = await api.put("/notifications/read-all");
  return response.data; // { success, message, count }
};

/**
 * Get the count of unread notifications for the logged-in user.
 * @returns {Promise<object>} Response data.
 */
export const getUnreadNotificationCount = async () => {
  const response = await api.get("/notifications/unread-count");
  return response.data; // { success, unreadCount }
};

export default {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount, // Export the new function
};
