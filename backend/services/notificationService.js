import Notification from "../models/Notification.js";
import emailService from "./emailService.js";
import User from "../models/User.js";

/**
 * Create a new notification
 * @param {Object} notificationData - Notification details
 * @returns {Promise<Object>} - Created notification
 */
const createNotification = async (notificationData) => {
  try {
    const notification = new Notification(notificationData);
    await notification.save();

    // Send email notification if required
    if (notificationData.isEmail) {
      await sendEmailNotification(notification);
    }

    return { success: true, notification };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get notifications for a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - List of notifications
 */
const getUserNotifications = async (userId, options = {}) => {
  try {
    const query = { recipientId: userId };

    if (options.isRead !== undefined) {
      query.isRead = options.isRead;
    }

    if (options.type) {
      query.type = options.type;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit || 50)
      .skip(options.skip || 0);

    const total = await Notification.countDocuments(query);

    return {
      success: true,
      notifications,
      pagination: {
        total,
        limit: options.limit || 50,
        page: Math.floor((options.skip || 0) / (options.limit || 50)) + 1,
        pages: Math.ceil(total / (options.limit || 50)),
      },
    };
  } catch (error) {
    console.error("Error getting notifications:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Result
 */
const markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOne({
      _id: notificationId,
      recipientId: userId,
    });

    if (!notification) {
      return { success: false, message: "Notification not found" };
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return { success: true, notification };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Result
 */
const markAllAsRead = async (userId) => {
  try {
    const result = await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return {
      success: true,
      count: result.modifiedCount,
    };
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Send email notification
 * @param {Object} notification - Notification object
 * @returns {Promise<Object>} - Result
 */
const sendEmailNotification = async (notification) => {
  try {
    const recipient = await User.findById(notification.recipientId);

    if (!recipient || !recipient.email) {
      return { success: false, message: "Recipient email not found" };
    }

    const result = await emailService.sendEmail({
      to: recipient.email,
      subject: notification.title,
      html: `<p>Hello ${recipient.name},</p><p>${notification.message}</p>`,
    });

    if (result.success) {
      notification.emailSent = true;
      notification.emailSentAt = new Date();
      await notification.save();
    }

    return result;
  } catch (error) {
    console.error("Error sending email notification:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Create appointment notification
 * @param {Object} data - Appointment data
 * @returns {Promise<Object>} - Result
 */
const createAppointmentNotification = async (data) => {
  const { appointment, recipient, action } = data;

  let title, message;

  switch (action) {
    case "created":
      title = "New Appointment Scheduled";
      message = `You have a new appointment scheduled on ${new Date(
        appointment.dateTime
      ).toLocaleString()}`;
      break;
    case "confirmed":
      title = "Appointment Confirmed";
      message = `Your appointment on ${new Date(
        appointment.dateTime
      ).toLocaleString()} has been confirmed`;
      break;
    case "cancelled":
      title = "Appointment Cancelled";
      message = `Your appointment on ${new Date(
        appointment.dateTime
      ).toLocaleString()} has been cancelled`;
      break;
    case "reminder":
      title = "Appointment Reminder";
      message = `Reminder: You have an appointment tomorrow at ${new Date(
        appointment.dateTime
      ).toLocaleTimeString()}`;
      break;
    default:
      title = "Appointment Update";
      message = `Your appointment details have been updated`;
  }

  return await createNotification({
    recipientId: recipient._id,
    type: "appointment",
    title,
    message,
    relatedTo: {
      model: "Appointment",
      id: appointment._id,
    },
    isEmail: true,
    priority: action === "cancelled" ? "high" : "medium",
  });
};

/**
 * Create payment notification
 * @param {Object} data - Payment data
 * @returns {Promise<Object>} - Result
 */
const createPaymentNotification = async (data) => {
  const { payment, recipient, status } = data;

  let title, message;

  switch (status) {
    case "completed":
      title = "Payment Successful";
      message = `Your payment of ${payment.currency} ${payment.amount} has been successfully processed`;
      break;
    case "failed":
      title = "Payment Failed";
      message = `Your payment of ${payment.currency} ${payment.amount} has failed. Please try again`;
      break;
    case "refunded":
      title = "Payment Refunded";
      message = `Your payment of ${payment.currency} ${payment.amount} has been refunded`;
      break;
    default:
      title = "Payment Update";
      message = `There's an update on your payment`;
  }

  return await createNotification({
    recipientId: recipient._id,
    type: "payment",
    title,
    message,
    relatedTo: {
      model: "Payment",
      id: payment._id,
    },
    isEmail: true,
    priority: status === "failed" ? "high" : "medium",
  });
};

/**
 * Create lab result notification
 * @param {Object} data - Lab report data
 * @returns {Promise<Object>} - Result
 */
const createLabResultNotification = async (data) => {
  const { labReport, recipient } = data;

  const title = "Lab Results Available";
  const message = `Your lab results for ${
    labReport.testName || "your test"
  } are now available`;

  return await createNotification({
    recipientId: recipient._id,
    type: "lab-result",
    title,
    message,
    relatedTo: {
      model: "LabReport",
      id: labReport._id,
    },
    isEmail: true,
    priority: "medium",
  });
};

export default {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  createAppointmentNotification,
  createPaymentNotification,
  createLabResultNotification,
};
