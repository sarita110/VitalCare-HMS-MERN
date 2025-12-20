// src/constants/index.js

// Roles (mirroring backend ROLES [cite: 486])
export const ROLES = {
  SUPER_ADMIN: "superAdmin",
  ADMIN: "admin",
  DOCTOR: "doctor",
  PATIENT: "patient",
  RECEPTIONIST: "receptionist",
  LAB_TECHNICIAN: "labTechnician",
  RADIOLOGIST: "radiologist",
};

// Appointment Status (mirroring backend APPOINTMENT_STATUS [cite: 487])
export const APPOINTMENT_STATUS = {
  SCHEDULED: "scheduled",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no-show",
};

// Payment Status (mirroring backend PAYMENT_STATUS [cite: 488])
export const PAYMENT_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing", // Added for frontend clarity if needed
  COMPLETED: "completed",
  FAILED: "failed",
  REFUNDED: "refunded",
};

// Payment Methods (mirroring backend PAYMENT_METHODS [cite: 489])
export const PAYMENT_METHODS = {
  CASH: "cash",
  KHALTI: "khalti",
  INSURANCE: "insurance",
  CREDIT_CARD: "credit_card", // Keep consistent with backend if used
  OTHER: "other",
};

// Lab Test Status (mirroring backend LAB_TEST_STATUS [cite: 490])
export const LAB_TEST_STATUS = {
  REQUESTED: "requested",
  SCHEDULED: "scheduled",
  CONFIRMED: "confirmed", 
  SAMPLE_COLLECTED: "sample-collected",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

// Radiology Status (mirroring backend RADIOLOGY_STATUS [cite: 491])
export const RADIOLOGY_STATUS = {
  REQUESTED: "requested",
  SCHEDULED: "scheduled",
  CONFIRMED: "confirmed", 
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

// Referral Status (mirroring backend REFERRAL_STATUS [cite: 492])
export const REFERRAL_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  COMPLETED: "completed",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
};

// Notification Types (mirroring backend NOTIFICATION_TYPES [cite: 493])
export const NOTIFICATION_TYPES = {
  APPOINTMENT: "appointment",
  PAYMENT: "payment",
  LAB_RESULT: "lab-result",
  RADIOLOGY_RESULT: "radiology-result",
  REFERRAL: "referral",
  SYSTEM: "system",
  PRESCRIPTION: "prescription", // Assuming prescription notification type might be needed
  MEDICAL_RECORD: "medical-record", // Generic record update notification
};

// UI Constants
export const UI = {
  DEFAULT_PAGE_LIMIT: 10,
  DATE_FORMAT: "yyyy-MM-dd",
  TIME_FORMAT: "hh:mm a",
  DATE_TIME_FORMAT: "yyyy-MM-dd hh:mm a",
};

export default {
  ROLES,
  APPOINTMENT_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  LAB_TEST_STATUS,
  RADIOLOGY_STATUS,
  REFERRAL_STATUS,
  NOTIFICATION_TYPES,
  UI,
};
