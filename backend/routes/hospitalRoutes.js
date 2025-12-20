import express from "express";
import { uploadImage } from "../middleware/multer.js"; // For image uploads if needed
import { verifyToken } from "../middleware/auth.js"; // Optional: for protected routes like image upload
import { isAdmin } from "../middleware/roleCheck.js"; // Optional: for protected routes like image upload
import {
  getHospitalDetails,
  getAllHospitals,
  getHospitalDepartments,
  getDepartmentDoctors,
  uploadHospitalImage, // Assuming this function exists in the controller
  getDoctorPublicProfile,
} from "../controllers/hospitalController.js";

const router = express.Router();

// --- Public Routes ---
// @route   GET /api/hospitals
// @desc    Get all active hospitals (public)
// @access  Public
router.get("/", getAllHospitals);

// @route   GET /api/hospitals/:id
// @desc    Get specific hospital details (public)
// @access  Public
router.get("/:id", getHospitalDetails);

// @route   GET /api/hospitals/doctors/:id
// @desc    Get public doctor profile by ID (public)
// @access  Public
router.get("/doctors/:id", getDoctorPublicProfile);

// @route   GET /api/hospitals/:id/departments
// @desc    Get active departments for a hospital (public)
// @access  Public
router.get("/:id/departments", getHospitalDepartments);

// @route   GET /api/hospitals/:hospitalId/departments/:departmentId/doctors
// @desc    Get active doctors for a specific department (public)
// @access  Public
router.get(
  "/:hospitalId/departments/:departmentId/doctors",
  getDepartmentDoctors
);

// --- Protected Route (Example: Image Upload) ---
// @route   POST /api/hospitals/:id/upload-image
// @desc    Upload/Update hospital logo or image
// @access  Private (Admin of that hospital)
router.post(
  "/:id/upload-image",
  verifyToken, // Require login
  isAdmin, // Require admin role
  (req, res, next) => {
    // Middleware to check if admin belongs to this hospital
    if (req.user.hospital.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }
    next();
  },
  uploadImage.single("hospitalImage"), // Define the field name for the image
  uploadHospitalImage // Controller function to handle the upload
);

export default router;
