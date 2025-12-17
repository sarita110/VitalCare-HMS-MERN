// frontend/src/utils/helpers.js
import { format, parseISO, differenceInYears } from "date-fns";
import { UI } from "../constants"; // Import UI constants for formats

/**
 * Format date to string (e.g., 2024-12-31)
 * @param {Date|string} date - Date object or ISO string
 * @param {string} formatString - Custom format string (optional)
 * @returns {string} - Formatted date string or empty string if invalid
 */
export const formatDate = (date, formatString = UI.DATE_FORMAT) => {
  if (!date) return "";
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return format(dateObj, formatString);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

/**
 * Format time to string (e.g., 05:30 PM)
 * @param {Date|string} date - Date object or ISO string
 * @param {string} formatString - Custom format string (optional)
 * @returns {string} - Formatted time string or empty string if invalid
 */
export const formatTime = (date, formatString = UI.TIME_FORMAT) => {
  if (!date) return "";
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return format(dateObj, formatString);
  } catch (error) {
    console.error("Error formatting time:", error);
    return "";
  }
};

/**
 * Format date and time to string (e.g., 2024-12-31 05:30 PM)
 * @param {Date|string} date - Date object or ISO string
 * @param {string} formatString - Custom format string (optional)
 * @returns {string} - Formatted date-time string or empty string if invalid
 */
export const formatDateTime = (date, formatString = UI.DATE_TIME_FORMAT) => {
  if (!date) return "";
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return format(dateObj, formatString);
  } catch (error) {
    console.error("Error formatting date-time:", error);
    return "";
  }
};

/**
 * Format currency (e.g., NPR 1,500.00)
 * @param {number} amount - Amount
 * @param {string} currency - Currency code (default: NPR)
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount, currency = "NPR") => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return `${currency} 0.00`; // Or handle as needed
  }
  return `${currency} ${amount.toLocaleString("en-NP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Calculate age from date of birth
 * @param {Date|string} dob - Date of birth (Date object or ISO string)
 * @returns {number|null} - Age in years or null if invalid date
 */
export const calculateAge = (dob) => {
  if (!dob) return null;
  try {
    const birthDate = typeof dob === "string" ? parseISO(dob) : dob;
    return differenceInYears(new Date(), birthDate);
  } catch (error) {
    console.error("Error calculating age:", error);
    return null;
  }
};

/**
 * Get a display-friendly status name
 * @param {string} status - Status key (e.g., 'sample-collected')
 * @returns {string} - Display-friendly status (e.g., 'Sample Collected')
 */
export const getDisplayStatus = (status) => {
  if (!status) return "N/A";
  // Add 'Confirmed' case
  if (status.toLowerCase() === "confirmed") return "Confirmed";
  return status.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

/**
 * Get a badge color class based on status
 * @param {string} status - Status key
 * @returns {string} - Tailwind CSS class name for badge background/text
 */
export const getStatusBadgeClass = (status) => {
  switch (status?.toLowerCase()) {
    case "completed":
      return "badge-success";
    case "scheduled":
    case "confirmed":
    case "in-progress":
      return "badge-info";
    case "pending":
    case "requested":
    case "sample-collected":
      return "badge-warning";
    case "cancelled":
    case "failed":
    case "rejected":
    case "no-show":
      return "badge-danger";
    default:
      return "badge-gray"; // Default gray badge
  }
};

/**
 * Format date to slot date format DD_MM_YYYY to match backend expectations
 * @param {Date} date - Date object
 * @returns {string} - Formatted slot date
 */
export const formatSlotDate = (date) => {
  if (!date) return "";

  // Ensure we have a Date object
  const dateObj = typeof date === "string" ? new Date(date) : date;

  // Get date components
  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1; // JavaScript months are 0-based
  const year = dateObj.getFullYear();

  // Format as DD_MM_YYYY
  return `${day}_${month}_${year}`;
};

/**
 * Parse date string from format DD_MM_YYYY
 * @param {string} slotDate - Date string in format DD_MM_YYYY
 * @returns {Date} - Date object or null if invalid
 */
export const parseSlotDate = (slotDate) => {
  if (!slotDate) return null;
  try {
    const [day, month, year] = slotDate.split("_").map(Number);
    return new Date(year, month - 1, day); // Month is 0-indexed in JS
  } catch (error) {
    console.error("Error parsing slot date:", error);
    return null;
  }
};

/**
 * Converts time string to 24-hour format
 * @param {string} timeStr - Time string in either "HH:MM" or "HH:MM AM/PM" format
 * @returns {string} - Time in "HH:MM" format
 */
export const convertTo24HourFormat = (timeStr) => {
  if (!timeStr) return "";

  // If already in HH:MM format, return as is
  if (timeStr.match(/^\d{1,2}:\d{2}$/)) return timeStr;

  // Parse 12-hour format (e.g., "2:30 PM")
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":");

  hours = parseInt(hours, 10);
  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  return `${hours.toString().padStart(2, "0")}:${minutes}`;
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
  formatDate,
  formatTime,
  formatDateTime,
  formatCurrency,
  calculateAge,
  getDisplayStatus,
  getStatusBadgeClass,
  formatSlotDate,
  parseSlotDate,
  convertTo24HourFormat,
  isSlotBooked,
};
