/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - Is valid email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result with message
 */
export const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return {
      isValid: false,
      message: "Password must be at least 8 characters long",
    };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
    return {
      isValid: false,
      message:
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    };
  }

  return {
    isValid: true,
    message: "Password is valid",
  };
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - Is valid phone number
 */
export const isValidPhone = (phone) => {
  // Basic validation for Nepali phone numbers
  const phoneRegex = /^(9|01|\+977)[0-9]{9,10}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate date format
 * @param {string} date - Date string to validate
 * @param {string} format - Expected format (default: YYYY-MM-DD)
 * @returns {boolean} - Is valid date
 */
export const isValidDate = (date, format = "YYYY-MM-DD") => {
  if (!date) return false;

  let regex;

  switch (format) {
    case "YYYY-MM-DD":
      regex = /^\d{4}-\d{2}-\d{2}$/;
      break;
    case "MM/DD/YYYY":
      regex = /^\d{2}\/\d{2}\/\d{4}$/;
      break;
    case "DD/MM/YYYY":
      regex = /^\d{2}\/\d{2}\/\d{4}$/;
      break;
    case "DD_MM_YYYY":
      regex = /^\d{1,2}_\d{1,2}_\d{4}$/;
      break;
    default:
      return false;
  }

  if (!regex.test(date)) return false;

  // Parse the date and check if it's valid
  let parsedDate;

  try {
    if (format === "YYYY-MM-DD") {
      const [year, month, day] = date.split("-").map(Number);
      parsedDate = new Date(year, month - 1, day);
      return (
        parsedDate.getFullYear() === year &&
        parsedDate.getMonth() === month - 1 &&
        parsedDate.getDate() === day
      );
    } else if (format === "MM/DD/YYYY") {
      const [month, day, year] = date.split("/").map(Number);
      parsedDate = new Date(year, month - 1, day);
      return (
        parsedDate.getFullYear() === year &&
        parsedDate.getMonth() === month - 1 &&
        parsedDate.getDate() === day
      );
    } else if (format === "DD/MM/YYYY") {
      const [day, month, year] = date.split("/").map(Number);
      parsedDate = new Date(year, month - 1, day);
      return (
        parsedDate.getFullYear() === year &&
        parsedDate.getMonth() === month - 1 &&
        parsedDate.getDate() === day
      );
    } else if (format === "DD_MM_YYYY") {
      const [day, month, year] = date.split("_").map(Number);
      parsedDate = new Date(year, month - 1, day);
      return (
        parsedDate.getFullYear() === year &&
        parsedDate.getMonth() === month - 1 &&
        parsedDate.getDate() === day
      );
    }
  } catch (error) {
    return false;
  }

  return false;
};

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {boolean} - Is valid ObjectId
 */
export const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Validate file type
 * @param {string} filename - Filename to validate
 * @param {Array} allowedTypes - Allowed file extensions
 * @returns {boolean} - Is valid file type
 */
export const isValidFileType = (filename, allowedTypes = []) => {
  if (!filename) return false;

  const extension = filename.split(".").pop().toLowerCase();
  return allowedTypes.includes(extension);
};

/**
 * Validate image file
 * @param {string} filename - Filename to validate
 * @returns {boolean} - Is valid image file
 */
export const isValidImageFile = (filename) => {
  return isValidFileType(filename, ["jpg", "jpeg", "png", "gif", "webp"]);
};

/**
 * Validate document file
 * @param {string} filename - Filename to validate
 * @returns {boolean} - Is valid document file
 */
export const isValidDocumentFile = (filename) => {
  return isValidFileType(filename, [
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "txt",
    "csv",
  ]);
};

/**
 * Validate time format (HH:MM)
 * @param {string} time - Time string to validate
 * @returns {boolean} - Is valid time
 */
export const isValidTime = (time) => {
  if (!time) return false;

  const regex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;

  if (!regex.test(time)) return false;

  const [hours, minutes] = time.split(":").map(Number);

  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
};

export default {
  isValidEmail,
  validatePassword,
  isValidPhone,
  isValidDate,
  isValidObjectId,
  isValidFileType,
  isValidImageFile,
  isValidDocumentFile,
  isValidTime,
};
