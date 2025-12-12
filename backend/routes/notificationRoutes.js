// src/routes/notification.js
import express from "express";
import { verifyToken } from "../middleware/auth.js"; // Use the generic token verification
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from "../controllers/notificationController.js";

const router = express.Router();

// Apply verifyToken to all notification routes
router.use(verifyToken);

// @route   GET /api/notifications
// @desc    Get notifications for the logged-in user
// @access  Private (Any logged-in user)
router.get("/", getUserNotifications);

// @route   GET /api/notifications/unread-count
// @desc    Get the count of unread notifications
// @access  Private (Any logged-in user)
router.get("/unread-count", getUnreadCount);

// @route   PUT /api/notifications/:id/read
// @desc    Mark a specific notification as read
// @access  Private (Notification owner)
router.put("/:id/read", markAsRead);

// @route   PUT /api/notifications/read-all
// @desc    Mark all unread notifications as read
// @access  Private (Any logged-in user)
router.put("/read-all", markAllAsRead);

export default router;
