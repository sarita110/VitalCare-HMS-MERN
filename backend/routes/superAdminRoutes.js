// routes/superAdminRoutes.js
import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { isSuperAdmin } from "../middleware/roleCheck.js";
import { hospitalValidation, validate } from "../middleware/validator.js";
import { uploadImage } from "../middleware/multer.js"; // Use uploadImage for logos
import {
  createHospital,
  updateHospital,
  getHospitals,
  getHospitalDetails,
  updateHospitalStatus,
  createHospitalAdmin,
  getHospitalAdmins,
  getHospitalAdminDetails,
  updateHospitalAdminStatus,
  deleteHospitalAdmin,
  getDashboardData,
  generateSystemReport, // Renamed from previous generateSystemReport endpoint if needed
  downloadSystemReport, // <-- Import download function
} from "../controllers/superAdminController.js";

const router = express.Router();

// Apply verifyToken and isSuperAdmin middleware to all routes
router.use(verifyToken, isSuperAdmin);

// --- Dashboard ---
// @route   GET /api/super-admin/dashboard
// @desc    Get super admin dashboard data
// @access  Private (Super Admin)
router.get("/dashboard", getDashboardData);

// --- Reports ---
// @route   GET /api/super-admin/reports/generate
// @desc    Generate system report (PDF/Excel)
// @access  Private (Super Admin)
router.get("/reports/generate", generateSystemReport); // <-- Updated Route Added

// @route   GET /api/super-admin/reports/download/:filename
// @desc    Download a generated system report file
// @access  Private (Super Admin)
router.get("/reports/download/:filename", downloadSystemReport); // <-- Updated Route Added

// --- Hospital Management ---
// @route   POST /api/super-admin/hospitals
// @desc    Create new hospital
// @access  Private (Super Admin)
router.post(
  "/hospitals",
  uploadImage.single("logo"), // Use uploadImage for single logo file
  hospitalValidation.create,
  validate,
  createHospital
);

// @route   PUT /api/super-admin/hospitals/:id
// @desc    Update hospital details
// @access  Private (Super Admin)
router.put(
  "/hospitals/:id",
  uploadImage.single("logo"), // Use uploadImage for single logo file
  hospitalValidation.update, // Assuming you have an update validation rule
  validate,
  updateHospital
);

// @route   GET /api/super-admin/hospitals
// @desc    Get all hospitals
// @access  Private (Super Admin)
router.get("/hospitals", getHospitals);

// @route   GET /api/super-admin/hospitals/:id
// @desc    Get hospital details
// @access  Private (Super Admin)
router.get("/hospitals/:id", getHospitalDetails);

// @route   PUT /api/super-admin/hospitals/:id/status
// @desc    Update hospital status (activate/deactivate)
// @access  Private (Super Admin)
router.put("/hospitals/:id/status", updateHospitalStatus);

// --- Hospital Admin Management ---
// @route   POST /api/super-admin/hospital-admins
// @desc    Create hospital admin
// @access  Private (Super Admin)
router.post(
  "/hospital-admins",
  // Add validation if needed
  createHospitalAdmin
);

// @route   GET /api/super-admin/hospital-admins
// @desc    Get hospital admins (optionally filter by hospital)
// @access  Private (Super Admin)
router.get("/hospital-admins", getHospitalAdmins);

// @route   GET /api/super-admin/hospital-admins/:id (User ID)
// @desc    Get hospital admin details
// @access  Private (Super Admin)
router.get("/hospital-admins/:id", getHospitalAdminDetails);

// @route   PUT /api/super-admin/hospital-admins/:id/status (User ID)
// @desc    Update hospital admin status (activate/deactivate)
// @access  Private (Super Admin)
router.put("/hospital-admins/:id/status", updateHospitalAdminStatus);

// @route   DELETE /api/super-admin/hospital-admins/:id (User ID)
// @desc    Delete hospital admin
// @access  Private (Super Admin)
router.delete("/hospital-admins/:id", deleteHospitalAdmin);

export default router;
