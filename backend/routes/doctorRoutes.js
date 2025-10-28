import express from "express";
import { verifyToken, isVerified } from "../middleware/auth.js";
import { isDoctor } from "../middleware/roleCheck.js";
import { uploadImage, uploadDocument } from "../middleware/multer.js";
import { validate } from "../middleware/validator.js"; // Import specific validations if needed
import {
  getDashboard,
  getProfile,
  updateProfile,
  toggleAvailability,
  getAppointments,
  getAppointmentDetails,
  completeAppointment,
  cancelAppointment,
  getPatients,
  getPatientDetails,
  getPatientMedicalHistory,
  createMedicalRecord,
  getMedicalRecords,
  requestLabTest,
  requestRadiologyTest,
  getLabResults,
  getRadiologyResults,
  createReferral,
  getReferrals,
  getPatientRecordsForReferral,
} from "../controllers/doctorController.js";

const router = express.Router();

// Apply verifyToken, isVerified, and isDoctor middleware to all doctor routes
// isDoctor also attaches doctor profile to req.doctor
router.use(verifyToken, isVerified, isDoctor);

// --- Dashboard ---
// @route   GET /api/doctor/dashboard
// @desc    Get doctor dashboard data
// @access  Private (Doctor)
router.get("/dashboard", getDashboard);

// --- Profile ---
// @route   GET /api/doctor/profile
// @desc    Get doctor profile
// @access  Private (Doctor)
router.get("/profile", getProfile);

// @route   PUT /api/doctor/profile
// @desc    Update doctor profile (About, Fees, Availability, Working Hours, Image)
// @access  Private (Doctor)
router.put("/profile", uploadImage.single("image"), updateProfile);

// @route   PUT /api/doctor/availability
// @desc    Toggle doctor availability status
// @access  Private (Doctor)
router.put("/availability", toggleAvailability);

// --- Appointments ---
// @route   GET /api/doctor/appointments
// @desc    Get doctor's appointments
// @access  Private (Doctor)
router.get("/appointments", getAppointments);

// @route   GET /api/doctor/appointments/:id
// @desc    Get specific appointment details
// @access  Private (Doctor)
router.get("/appointments/:id", getAppointmentDetails);

// @route   PUT /api/doctor/appointments/:id/complete
// @desc    Mark an appointment as completed
// @access  Private (Doctor)
router.put("/appointments/:id/complete", completeAppointment);

// @route   PUT /api/doctor/appointments/:id/cancel
// @desc    Cancel an appointment
// @access  Private (Doctor)
router.put("/appointments/:id/cancel", cancelAppointment);

// --- Patients ---
// @route   GET /api/doctor/patients
// @desc    Get patients treated by this doctor
// @access  Private (Doctor)
router.get("/patients", getPatients);

// @route   GET /api/doctor/patients/:id
// @desc    Get details of a specific patient treated by this doctor
// @access  Private (Doctor)
router.get("/patients/:id", getPatientDetails);

// @route   GET /api/doctor/patients/:id/medical-history
// @desc    Get full medical history of a patient treated by this doctor
// @access  Private (Doctor)
router.get("/patients/:id/medical-history", getPatientMedicalHistory);

router.get("/patients/:id/records", getPatientRecordsForReferral);

// --- Medical Records ---
// @route   POST /api/doctor/medical-records
// @desc    Create a new medical record for a patient
// @access  Private (Doctor)
router.post("/medical-records", createMedicalRecord);

// Add this route after the existing medical record routes
// @route   GET /api/doctor/medical-records
// @desc    Get medical records created by this doctor
// @access  Private (Doctor)
router.get("/medical-records", getMedicalRecords);

// --- Lab & Radiology ---
// @route   POST /api/doctor/lab-tests
// @desc    Request a lab test for a patient
// @access  Private (Doctor)
router.post("/lab-tests", requestLabTest);

// @route   POST /api/doctor/radiology-tests
// @desc    Request a radiology test for a patient
// @access  Private (Doctor)
router.post("/radiology-tests", requestRadiologyTest);

// @route   GET /api/doctor/lab-results
// @desc    Get lab results requested by this doctor
// @access  Private (Doctor)
router.get("/lab-results", getLabResults);

// @route   GET /api/doctor/radiology-results
// @desc    Get radiology results requested by this doctor
// @access  Private (Doctor)
router.get("/radiology-results", getRadiologyResults);

// --- Referrals ---
// @route   POST /api/doctor/referrals
// @desc    Create a referral for a patient
// @access  Private (Doctor)
router.post("/referrals", createReferral);

// @route   GET /api/doctor/referrals
// @desc    Get referrals created by this doctor
// @access  Private (Doctor)
router.get("/referrals", getReferrals);

export default router;
