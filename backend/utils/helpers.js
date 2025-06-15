// backend/utils/helpers.js
import crypto from "crypto";
import jwt from "jsonwebtoken";

/**
 * Generate JWT token
 * @param {Object} payload - Data to include in token
 * @param {string} expiresIn - Token expiration time
 * @returns {string} - JWT token
 */
export const generateToken = (payload, expiresIn = "7d") => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * Generate random OTP
 * @param {number} length - OTP length
 * @returns {string} - OTP
 */
export const generateOTP = (length = 6) => {
  const digits = "0123456789";
  let OTP = "";

  for (let i = 0; i < length; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }

  return OTP;
};

/**
 * Generate random token
 * @param {number} length - Token length in bytes
 * @returns {string} - Random token
 */
export const generateRandomToken = (length = 32) => {
  return crypto.randomBytes(length).toString("hex");
};

/**
 * Format date to string
 * @param {Date} date - Date object
 * @param {Object} options - Format options
 * @returns {string} - Formatted date
 */
export const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  const dateOptions = { ...defaultOptions, ...options };

  return new Date(date).toLocaleDateString("en-US", dateOptions);
};

/**
 * Format time to string
 * @param {Date} date - Date object
 * @param {Object} options - Format options
 * @returns {string} - Formatted time
 */
export const formatTime = (date, options = {}) => {
  const defaultOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };

  const timeOptions = { ...defaultOptions, ...options };

  return new Date(date).toLocaleTimeString("en-US", timeOptions);
};

/**
 * Format date and time to string
 * @param {Date|string} date - Date object or ISO string
 * @param {object} options - Format options (can combine date and time options)
 * @returns {string} - Formatted date-time string
 */
export const formatDateTime = (date, options = {}) => {
  const defaultOptions = {
    year: "numeric",
    month: "short", // Use short month name for brevity
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };
  const dateTimeOptions = { ...defaultOptions, ...options };

  try {
    return new Date(date).toLocaleString("en-US", dateTimeOptions);
  } catch (error) {
    console.error("Error formatting date-time:", error);
    return ""; // Return empty string on error
  }
};

/**
 * Format currency
 * @param {number} amount - Amount
 * @param {string} currency - Currency code
 * @returns {string} - Formatted currency
 */
export const formatCurrency = (amount, currency = "NPR") => {
  return `${currency} ${amount.toLocaleString()}`;
};

/**
 * Parse date string from format DD_MM_YYYY
 * @param {string} slotDate - Date string in format DD_MM_YYYY
 * @returns {Date} - Date object
 */
export const parseSlotDate = (slotDate) => {
  const [day, month, year] = slotDate.split("_").map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Format date to slot date format DD_MM_YYYY
 * @param {Date} date - Date object
 * @returns {string} - Formatted slot date
 */
// backend/utils/helpers.js
export const formatSlotDate = (date) => {
  if (!date) return "";

  // Ensure we have a Date object
  const dateObj = typeof date === "string" ? new Date(date) : date;

  // Get date components
  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1; // JavaScript months are 0-based
  const year = dateObj.getFullYear();

  // Format as DD_MM_YYYY - Note that MongoDB shows it as DD_M_YYYY
  // We need to standardize this to avoid inconsistencies
  return `${day}_${month}_${year}`;
};

/**
 * Calculate age from date of birth
 * @param {Date} dob - Date of birth
 * @returns {number} - Age in years
 */
export const calculateAge = (dob) => {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
};

/**
 * Get date range (start and end dates)
 * @param {Object} options - Options
 * @param {string} options.period - Period ('day', 'week', 'month', 'year')
 * @param {Date} options.date - Reference date
 * @returns {Object} - Start and end dates
 */
export const getDateRange = (options = {}) => {
  const { period = "month", date = new Date() } = options;

  const today = new Date(date);
  let startDate, endDate;

  switch (period) {
    case "day":
      startDate = new Date(today.setHours(0, 0, 0, 0));
      endDate = new Date(today.setHours(23, 59, 59, 999));
      break;
    case "week":
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
      startDate = new Date(today.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "month":
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "year":
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = new Date(today.getFullYear(), 11, 31);
      endDate.setHours(23, 59, 59, 999);
      break;
    default:
      startDate = new Date(today.setHours(0, 0, 0, 0));
      endDate = new Date(today.setHours(23, 59, 59, 999));
  }

  return { startDate, endDate };
};

/**
 * Format status string to display format
 * @param {string} status - Status string
 * @returns {string} - Formatted status
 */
export const getDisplayStatus = (status) => {
  if (!status) return "N/A";

  // Convert to title case and replace hyphens with spaces
  return status
    .replace(/([A-Z])/g, " $1") // Insert space before capital letters
    .replace(/-/g, " ") // Replace hyphens with spaces
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .trim(); // Remove extra spaces
};

/**
 * Converts time string to 24-hour format
 * @param {string} timeStr - Time string in either "HH:MM" or "HH:MM AM/PM" format
 * @returns {string} - Time in "HH:MM" format
 */
export const convertTo24HourFormat = (timeStr) => {
  if (!timeStr) return "";

  // If already in HH:MM format without AM/PM, return as is
  if (timeStr.match(/^\d{1,2}:\d{2}$/) && !timeStr.includes(" "))
    return timeStr;

  try {
    // If there's AM/PM, convert properly
    if (timeStr.includes(" ")) {
      const [time, modifier] = timeStr.split(" ");
      let [hours, minutes] = time.split(":");

      hours = parseInt(hours, 10);
      minutes = parseInt(minutes, 10);

      if (modifier === "PM" && hours < 12) hours += 12;
      if (modifier === "AM" && hours === 12) hours = 0;

      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
    }

    // Just ensure proper formatting
    const [hours, minutes] = timeStr.split(":");
    return `${parseInt(hours, 10).toString().padStart(2, "0")}:${parseInt(
      minutes,
      10
    )
      .toString()
      .padStart(2, "0")}`;
  } catch (error) {
    console.error("Error converting time format:", error);
    return timeStr; // Return original on error
  }
};

/**
 * Checks if a time slot is already booked
 * @param {string|Object} slot - Slot time string or object with time property
 * @param {Array} bookedSlots - Array of booked time slots
 * @returns {boolean} - True if slot is booked
 */
export const isSlotBooked = (slot, bookedSlots) => {
  if (!bookedSlots || !Array.isArray(bookedSlots) || bookedSlots.length === 0)
    return false;

  const slotTime = typeof slot === "string" ? slot : slot.time;
  const standardTime = convertTo24HourFormat(slotTime);

  return bookedSlots.some((bookedSlot) => {
    const bookedStandardTime = convertTo24HourFormat(bookedSlot);
    return bookedStandardTime === standardTime;
  });
};

export default {
  generateToken,
  generateOTP,
  generateRandomToken,
  formatDate,
  formatTime,
  formatDateTime,
  formatCurrency,
  parseSlotDate,
  formatSlotDate,
  calculateAge,
  getDateRange,
  getDisplayStatus,
  convertTo24HourFormat,
  isSlotBooked,
};
