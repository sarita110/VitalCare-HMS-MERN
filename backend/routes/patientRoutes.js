import express from "express";
import { verifyToken, isVerified } from "../middleware/auth.js";
import { isPatient } from "../middleware/roleCheck.js";
import { uploadImage } from "../middleware/multer.js";
import { validate, appointmentValidation } from "../middleware/validator.js"; // Import validations as needed
import {
  getDashboard,
  getProfile,
  updateProfile,
  bookAppointment,
  getAppointments,
  getAppointmentDetails,
  cancelAppointment,
  rescheduleAppointment,
  getDoctors,
  getDoctorDetails,
  getMedicalRecords,
  getLabResults,
  getRadiologyResults,
  getPrescriptions,
  makePayment,
  verifyPayment,
  getPaymentHistory,
} from "../controllers/patientController.js";

const router = express.Router();

// Apply verifyToken, isVerified, and isPatient middleware to all patient routes
// isPatient also attaches patient profile to req.patient
router.use(verifyToken, isVerified, isPatient);

// --- Dashboard ---
// @route   GET /api/patient/dashboard
// @desc    Get patient dashboard data
// @access  Private (Patient)
router.get("/dashboard", getDashboard);

// --- Profile ---
// @route   GET /api/patient/profile
// @desc    Get patient profile
// @access  Private (Patient)
router.get("/profile", getProfile);

// @route   PUT /api/patient/profile
// @desc    Update patient profile (Name, Phone, Address, Emergency Contact, Image etc.)
// @access  Private (Patient)
router.put("/profile", uploadImage.single("image"), updateProfile);

// --- Appointments ---
// @route   POST /api/patient/appointments
// @desc    Book a new appointment
// @access  Private (Patient)
router.post(
  "/appointments",
  appointmentValidation.create, // Add validation if needed
  validate,
  bookAppointment
);

// @route   GET /api/patient/appointments
// @desc    Get patient's appointments
// @access  Private (Patient)
router.get("/appointments", getAppointments);

// @route   GET /api/patient/appointments/:id
// @desc    Get specific appointment details
// @access  Private (Patient)
router.get("/appointments/:id", getAppointmentDetails);

// @route   PUT /api/patient/appointments/:id/cancel
// @desc    Cancel an appointment
// @access  Private (Patient)
router.put("/appointments/:id/cancel", cancelAppointment);

// @route   PUT /api/patient/appointments/:id/reschedule
// @desc    Reschedule an appointment
// @access  Private (Patient)
router.put("/appointments/:id/reschedule", rescheduleAppointment);

// --- Doctors ---
// @route   GET /api/patient/doctors
// @desc    Get list of doctors in the patient's hospital
// @access  Private (Patient)
router.get("/doctors", getDoctors);

// @route   GET /api/patient/doctors/:id
// @desc    Get doctor details and availability
// @access  Private (Patient)
router.get("/doctors/:id", getDoctorDetails);

// --- Medical Data ---
// @route   GET /api/patient/medical-records
// @desc    Get patient's medical records
// @access  Private (Patient)
router.get("/medical-records", getMedicalRecords);

// @route   GET /api/patient/lab-results
// @desc    Get patient's lab results
// @access  Private (Patient)
router.get("/lab-results", getLabResults);

// @route   GET /api/patient/radiology-results
// @desc    Get patient's radiology results
// @access  Private (Patient)
router.get("/radiology-results", getRadiologyResults);

// @route   GET /api/patient/prescriptions
// @desc    Get patient's prescriptions
// @access  Private (Patient)
router.get("/prescriptions", getPrescriptions);

// --- Payments ---
// @route   POST /api/patient/payments/initiate
// @desc    Initiate payment for an appointment or test
// @access  Private (Patient)
router.post("/payments/initiate", makePayment); // Renamed from makePayment

// @route   POST /api/patient/payments/verify
// @desc    Verify payment (callback from Khalti or frontend check)
// @access  Private (Patient)
router.post("/payments/verify", verifyPayment);

// @route   GET /api/patient/payments
// @desc    Get patient's payment history
// @access  Private (Patient)
router.get("/payments", getPaymentHistory);

export default router;
