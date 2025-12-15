// routes/adminRoutes.js
import express from "express";
import { verifyToken, isVerified } from "../middleware/auth.js";
import { isAdmin, belongsToHospital } from "../middleware/roleCheck.js";
import { uploadImage, uploadDocument } from "../middleware/multer.js";
import {
  userValidation, // Import userValidation if needed for staff/doctor creation
  doctorValidation,
  appointmentValidation,
  validate,
} from "../middleware/validator.js"; // Import other validations as needed
import {
  getDashboard,
  getHospitalProfile,
  updateHospitalProfile,
  createDepartment,
  updateDepartment,
  getDepartments,
  getDepartmentDetails,
  deleteDepartment,
  createDoctor,
  updateDoctor,
  getDoctors,
  getDoctorDetails,
  toggleDoctorAvailability,
  deleteDoctor,
  createStaff,
  updateStaff,
  getStaff,
  getStaffDetails,
  deleteStaff,
  getAppointments,
  cancelAppointment,
  getPatients,
  getPatientDetails,
  updatePatientStatus,
  deletePatient,
  getReports, // For dashboard charts
  generateHospitalReport, // For generating downloadable reports
  downloadReport, // For downloading generated reports
} from "../controllers/adminController.js";

const router = express.Router();

// Apply verifyToken, isVerified, and isAdmin middleware to all admin routes
router.use(verifyToken, isVerified, isAdmin);

// --- Dashboard ---
// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard data
// @access  Private (Admin)
router.get("/dashboard", getDashboard);

// --- Hospital Profile ---
// @route   GET /api/admin/hospital-profile
// @desc    Get hospital profile for the admin's hospital
// @access  Private (Admin)
router.get("/hospital-profile", getHospitalProfile);

// @route   PUT /api/admin/hospital-profile
// @desc    Update hospital profile for the admin's hospital
// @access  Private (Admin)
router.put(
  "/hospital-profile",
  uploadImage.single("logo"), // Field name for logo upload
  // Add validation if needed
  updateHospitalProfile
);

// --- Department Management ---
// @route   POST /api/admin/departments
// @desc    Create a new department
// @access  Private (Admin)
router.post(
  "/departments",
  // Add validation if needed
  createDepartment
);

// @route   PUT /api/admin/departments/:id
// @desc    Update department details
// @access  Private (Admin)
router.put(
  "/departments/:id",
  // Add validation if needed
  updateDepartment
);

// @route   GET /api/admin/departments
// @desc    Get all departments in the admin's hospital
// @access  Private (Admin)
router.get("/departments", getDepartments);

// @route   GET /api/admin/departments/:id
// @desc    Get department details
// @access  Private (Admin)
router.get("/departments/:id", getDepartmentDetails);

// @route   DELETE /api/admin/departments/:id
// @desc    Delete a department
// @access  Private (Admin)
router.delete("/departments/:id", deleteDepartment);

// --- Doctor Management ---
// @route   POST /api/admin/doctors
// @desc    Create a new doctor
// @access  Private (Admin)
router.post(
  "/doctors",
  uploadImage.single("image"), // Field name for doctor's image
  doctorValidation.create, // Add validation if needed, ensure it exists
  validate,
  createDoctor
);

// @route   PUT /api/admin/doctors/:id (Doctor Profile ID)
// @desc    Update doctor details
// @access  Private (Admin)
router.put(
  "/doctors/:id",
  uploadImage.single("image"), // Field name for doctor's image
  // Add validation rules if needed
  updateDoctor
);

// @route   GET /api/admin/doctors
// @desc    Get all doctors in the admin's hospital
// @access  Private (Admin)
router.get("/doctors", getDoctors);

// @route   GET /api/admin/doctors/:id (Doctor Profile ID)
// @desc    Get doctor details
// @access  Private (Admin)
router.get("/doctors/:id", getDoctorDetails);

// @route   PUT /api/admin/doctors/:id/availability (Doctor Profile ID)
// @desc    Toggle doctor availability
// @access  Private (Admin)
router.put("/doctors/:id/availability", toggleDoctorAvailability);

// @route   DELETE /api/admin/doctors/:id (Doctor Profile ID)
// @desc    Delete a doctor
// @access  Private (Admin)
router.delete("/doctors/:id", deleteDoctor);

// --- Staff Management ---
// @route   POST /api/admin/staff
// @desc    Create a new staff member (Receptionist, Lab Tech, Radiologist)
// @access  Private (Admin)
router.post(
  "/staff",
  uploadImage.single("image"), // Field name for staff image
  // Add validation if needed
  createStaff
);

// @route   PUT /api/admin/staff/:id (User ID)
// @desc    Update staff member details
// @access  Private (Admin)
router.put(
  "/staff/:id",
  uploadImage.single("image"), // Field name for staff image
  // Add validation if needed
  updateStaff
);

// @route   GET /api/admin/staff
// @desc    Get all staff members in the admin's hospital
// @access  Private (Admin)
router.get("/staff", getStaff);

// @route   GET /api/admin/staff/:id (User ID)
// @desc    Get staff member details
// @access  Private (Admin)
router.get("/staff/:id", getStaffDetails);

// @route   DELETE /api/admin/staff/:id (User ID)
// @desc    Delete a staff member
// @access  Private (Admin)
router.delete("/staff/:id", deleteStaff);

// --- Appointment Management ---
// @route   GET /api/admin/appointments
// @desc    Get all appointments in the admin's hospital
// @access  Private (Admin)
router.get("/appointments", getAppointments);

// @route   PUT /api/admin/appointments/:id/cancel
// @desc    Cancel an appointment
// @access  Private (Admin)
router.put(
  "/appointments/:id/cancel",
  // Add validation if needed
  cancelAppointment
);

// --- Patient Management ---
// @route   GET /api/admin/patients
// @desc    Get all patients in the admin's hospital
// @access  Private (Admin)
router.get("/patients", getPatients);

// @route   GET /api/admin/patients/:id (Patient ID)
// @desc    Get patient details
// @access  Private (Admin)
router.get("/patients/:id", getPatientDetails);

// @route   PUT /api/admin/patients/:id/status (Patient ID)
// @desc    Update patient status (activate/deactivate)
// @access  Private (Admin)
router.put("/patients/:id/status", updatePatientStatus);

// @route   DELETE /api/admin/patients/:id (Patient ID)
// @desc    Delete a patient
// @access  Private (Admin)
router.delete("/patients/:id", deletePatient);

// --- Reports ---
// @route   GET /api/admin/reports
// @desc    Get report data for dashboard charts
// @access  Private (Admin)
router.get("/reports", getReports);

// @route   GET /api/admin/generate-report
// @desc    Generate downloadable PDF/Excel report for the hospital
// @access  Private (Admin)
router.get("/generate-report", generateHospitalReport);

// @route   GET /api/admin/reports/download/:filename
// @desc    Download a generated report file
// @access  Private (Admin)
router.get("/reports/download/:filename", downloadReport); // <-- Updated Route Added

export default router;
