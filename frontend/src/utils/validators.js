// src/utils/validators.js
import * as Yup from "yup";

// --- Yup Validation Schemas ---

// Basic User Info
export const userProfileSchema = Yup.object({
  name: Yup.string().required("Name is required").min(2, "Name is too short"),
  phone: Yup.string()
    .matches(/^(?:\+977|0)?(?:98|97)\d{8}$/, "Invalid Nepali phone number")
    .nullable(), // Allow empty phone number initially
});

// Authentication Schemas
export const loginSchema = Yup.object({
  email: Yup.string()
    .email("Invalid email address")
    .required("Email or Password is required"),
  password: Yup.string().required("Email or Password is required"),
});

export const registerSchema = Yup.object({
  name: Yup.string().required("Name is required").min(2, "Name is too short"),
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  password: Yup.string()
    .required("Password is required")
    .min(8, "Password must be at least 8 characters")
    .matches(/[A-Z]/, "Password must contain an uppercase letter")
    .matches(/[a-z]/, "Password must contain a lowercase letter")
    .matches(/[0-9]/, "Password must contain a number")
    .matches(
      /[!@#$%^&*(),.?":{}|<>]/,
      "Password must contain a special character"
    ),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password"), null], "Passwords must match")
    .required("Confirm Password is required"),
  role: Yup.string()
    .oneOf(["patient"], "Registration only available for patients currently") // Still assumes patient role for this specific schema
    .required("Role is required"),
  // hospitalId is no longer directly part of the patient registration form UI flow
  // It's now optional in User model for patients.
  // It will be derived or set differently, not from main registration form.
  // hospitalId: Yup.string().when("role", (role, schema) => { // OLD
  //   return role && role !== "patient" && role !== "superAdmin"
  //     ? schema.required("Hospital is required for staff")
  //     : schema.optional().nullable();
  // }),
  dob: Yup.date().when("role", {
    is: "patient",
    then: (schema) =>
      schema
        .required("Date of Birth is required")
        .max(new Date(), "Date of Birth cannot be in the future"),
    otherwise: (schema) => schema.optional().nullable(),
  }),
  gender: Yup.string().when("role", {
    is: "patient",
    then: (schema) =>
      schema
        .required("Gender is required")
        .oneOf(["Male", "Female", "Other"], "Invalid gender"),
    otherwise: (schema) => schema.optional().nullable(),
  }),
});

export const forgotPasswordSchema = Yup.object({
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
});

export const resetPasswordSchema = Yup.object({
  password: Yup.string()
    .required("Password is required")
    .min(8, "Password must be at least 8 characters")
    .matches(/[A-Z]/, "Password must contain an uppercase letter")
    .matches(/[a-z]/, "Password must contain a lowercase letter")
    .matches(/[0-9]/, "Password must contain a number")
    .matches(
      /[!@#$%^&*(),.?":{}|<>]/,
      "Password must contain a special character"
    ),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password"), null], "Passwords must match")
    .required("Confirm Password is required"),
});

export const otpSchema = Yup.object({
  otp: Yup.string()
    .required("OTP is required")
    .matches(/^[0-9]{6}$/, "OTP must be 6 digits"),
});

// Appointment Schema
export const appointmentSchema = Yup.object({
  doctorId: Yup.string().required("Doctor is required"),
  dateTime: Yup.date()
    .required("Date and Time are required")
    .min(new Date(), "Appointment date must be in the future"),
  reason: Yup.string()
    .required("Reason for appointment is required")
    .min(5, "Reason is too short"),
  type: Yup.string().optional(),
});

// Medical Record Schema
export const medicalRecordSchema = Yup.object({
  type: Yup.string()
    .required("Record type is required")
    .oneOf(
      [
        "diagnosis",
        "prescription",
        "lab",
        "radiology",
        "surgery",
        "follow-up",
        "other",
      ],
      "Invalid record type"
    ),
  diagnosis: Yup.string().when("type", (type, schema) => {
    return type === "diagnosis"
      ? schema.required("Diagnosis is required")
      : schema;
  }),
  symptoms: Yup.string().optional(),
  treatment: Yup.string().optional(),
  notes: Yup.string().optional(),
  prescriptions: Yup.string().when("type", (type, schema) => {
    return type === "prescription"
      ? schema.required("Prescriptions are required")
      : schema;
  }),
});

// --- Basic Regex Validators (Example - can be replaced by Yup) ---

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - Is valid email
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email).toLowerCase());
};

/**
 * Validate basic password requirements (e.g., length)
 * @param {string} password - Password to validate
 * @returns {boolean} - Is valid password (basic check)
 */
export const isPasswordStrongEnough = (password) => {
  return password && password.length >= 8;
};

/**
 * Validate Nepali phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - Is valid Nepali phone number
 */
export const isValidNepaliPhone = (phone) => {
  if (!phone) return false;
  const phoneRegex = /^(?:\+977|0)?(?:98|97)\d{8}$/;
  return phoneRegex.test(String(phone));
};
