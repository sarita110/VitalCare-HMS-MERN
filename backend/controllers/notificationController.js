// src/controllers/notificationController.js
import Notification from "../models/Notification.js";
import mongoose from "mongoose";

/**
 * Get notifications for the logged-in user
 * @route GET /api/notifications
 * @access Private (Any logged-in user)
 */
export const getUserNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 15, isRead } = req.query; // Increased default limit
    const userId = req.user._id; // Get user ID from verifyToken middleware

    const query = { recipientId: userId };
    const options = {
      sort: { createdAt: -1 }, // Show newest first
      limit: parseInt(limit, 10),
      skip: (parseInt(page, 10) - 1) * parseInt(limit, 10),
    };

    if (isRead !== undefined) {
      query.isRead = isRead === "true";
    }

    const notifications = await Notification.find(query, null, options).lean(); // Use lean for performance
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      notifications,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
        limit: parseInt(limit, 10),
      },
      unreadCount, // Send unread count for the UI badge
    });
  } catch (error) {
    console.error("Get user notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get notifications",
      error: error.message,
    });
  }
};

/**
 * Mark a specific notification as read
 * @route PUT /api/notifications/:id/read
 * @access Private (Notification owner)
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid notification ID format" });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientId: userId, isRead: false }, // Ensure it belongs to the user and is unread
      { isRead: true, readAt: new Date() },
      { new: true } // Return the updated document
    );

    if (!notification) {
      // Either not found, doesn't belong to user, or already read
      const exists = await Notification.exists({
        _id: id,
        recipientId: userId,
      });
      if (!exists) {
        return res.status(404).json({
          success: false,
          message: "Notification not found or access denied",
        });
      } else {
        // It exists but was already read, which is not an error
        return res.status(200).json({
          success: true,
          message: "Notification was already marked as read",
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification, // Send back updated notification if needed
    });
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
      error: error.message,
    });
  }
};

/**
 * Mark all unread notifications as read for the logged-in user
 * @route PUT /api/notifications/read-all
 * @access Private (Any logged-in user)
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      count: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read",
      error: error.message,
    });
  }
};

/**
 * Get unread notification count
 * @route GET /api/notifications/unread-count
 * @access Private (Any logged-in user)
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
    });
    res.status(200).json({ success: true, unreadCount });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get unread notification count",
      error: error.message,
    });
  }
};

export default {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
