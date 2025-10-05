import express from "express";
import { verifyToken, isVerified } from "../middleware/auth.js";
import { isReceptionist } from "../middleware/roleCheck.js";
import { uploadImage, uploadDocument } from "../middleware/multer.js";
import {
  validate,
  appointmentValidation,
  paymentValidation,
} from "../middleware/validator.js"; // Import validations
import {
  getDashboard,
  getProfile,
  updateProfile,
  registerPatient,
  getPatients,
  getPatientDetails,
  updatePatientDetails,
  bookAppointment,
  getAppointments,
  updateAppointment,
  cancelAppointment,
  getDoctors,
  getDoctorAvailability,
  processPayment,
  getPayments,
  uploadReport,
  createReferral,
  getReferrals,
  getReferralRecords,
} from "../controllers/receptionistController.js";

const router = express.Router();

// Apply verifyToken, isVerified, and isReceptionist middleware
router.use(verifyToken, isVerified, isReceptionist);

// --- Dashboard ---
// @route   GET /api/receptionist/dashboard
// @desc    Get receptionist dashboard data
// @access  Private (Receptionist)
router.get("/dashboard", getDashboard);

// --- Profile ---
// @route   GET /api/receptionist/profile
// @desc    Get receptionist profile
// @access  Private (Receptionist)
router.get("/profile", getProfile);

// @route   PUT /api/receptionist/profile
// @desc    Update receptionist profile (Name, Phone, Image)
// @access  Private (Receptionist)
router.put("/profile", uploadImage.single("image"), updateProfile);

// --- Patient Management ---
// @route   POST /api/receptionist/patients/register
// @desc    Register a new patient
// @access  Private (Receptionist)
router.post("/patients/register", uploadImage.single("image"), registerPatient);

// @route   GET /api/receptionist/patients
// @desc    Get patients list for the hospital
// @access  Private (Receptionist)
router.get("/patients", getPatients);

// @route   GET /api/receptionist/patients/:id
// @desc    Get specific patient details
// @access  Private (Receptionist)
router.get("/patients/:id", getPatientDetails);

// @route   PUT /api/receptionist/patients/:id
// @desc    Update patient details
// @access  Private (Receptionist)
router.put("/patients/:id", uploadImage.single("image"), updatePatientDetails);

// --- Appointment Management ---
// @route   POST /api/receptionist/appointments
// @desc    Book an appointment for a patient
// @access  Private (Receptionist)
router.post(
  "/appointments",
  appointmentValidation.create, // Add validation if needed
  validate,
  bookAppointment
);

// @route   GET /api/receptionist/appointments
// @desc    Get appointments for the hospital
// @access  Private (Receptionist)
router.get("/appointments", getAppointments);

// @route   PUT /api/receptionist/appointments/:id
// @desc    Update an appointment (e.g., reschedule, change status)
// @access  Private (Receptionist)
router.put("/appointments/:id", updateAppointment);

// @route   PUT /api/receptionist/appointments/:id/cancel
// @desc    Cancel an appointment
// @access  Private (Receptionist)
router.put("/appointments/:id/cancel", cancelAppointment);

// --- Doctor Availability ---
// @route   GET /api/receptionist/doctors
// @desc    Get list of doctors in the hospital
// @access  Private (Receptionist)
router.get("/doctors", getDoctors);

// @route   GET /api/receptionist/doctors/:id/availability
// @desc    Get doctor availability for scheduling
// @access  Private (Receptionist)
router.get("/doctors/:id/availability", getDoctorAvailability);

// --- Payments ---
// @route   POST /api/receptionist/payments
// @desc    Process a cash payment
// @access  Private (Receptionist)
router.post(
  "/payments",
  paymentValidation.create, // Add basic validation if needed
  validate,
  processPayment
);

// @route   GET /api/receptionist/payments
// @desc    Get payment history for the hospital
// @access  Private (Receptionist)
router.get("/payments", getPayments);

// --- Reports & Referrals ---
// @route   POST /api/receptionist/upload-report
// @desc    Upload a medical report/document for a patient
// @access  Private (Receptionist)
router.post(
  "/upload-report",
  uploadDocument.single("reportFile"),
  uploadReport
);

// @route   POST /api/receptionist/referrals
// @desc    Create a referral for a patient
// @access  Private (Receptionist)
router.post("/referrals", createReferral);

// @route   GET /api/receptionist/referrals
// @desc    Get incoming and outgoing referrals for the hospital
// @access  Private (Receptionist)
router.get("/referrals", getReferrals);

router.get("/referrals/:id/records", getReferralRecords);

export default router;
