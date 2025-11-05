import express from "express";
import { verifyToken, isVerified } from "../middleware/auth.js";
import { isRadiologist } from "../middleware/roleCheck.js";
import { uploadImage } from "../middleware/multer.js"; // Assuming image uploads for radiology
import { validate } from "../middleware/validator.js"; // Import specific validations if needed
import {
  getDashboard,
  getProfile,
  updateProfile,
  getRadiologyRequests,
  getRadiologyRequestDetails,
  updateRequestStatus,
  uploadRadiologyResults,
  getRadiologyResults,
  getRadiologyReportDetails,
} from "../controllers/radiologyController.js";

const router = express.Router();

// Apply verifyToken, isVerified, and isRadiologist middleware
router.use(verifyToken, isVerified, isRadiologist);

// --- Dashboard & Profile ---
// @route   GET /api/radiology/dashboard
// @desc    Get radiologist dashboard data
// @access  Private (Radiologist)
router.get("/dashboard", getDashboard);

// @route   GET /api/radiology/profile
// @desc    Get radiologist profile
// @access  Private (Radiologist)
router.get("/profile", getProfile);

// @route   PUT /api/radiology/profile
// @desc    Update radiologist profile (Name, Phone, Image)
// @access  Private (Radiologist)
router.put("/profile", uploadImage.single("image"), updateProfile);

// --- Radiology Requests ---
// @route   GET /api/radiology/requests
// @desc    Get radiology requests for the hospital
// @access  Private (Radiologist)
router.get("/requests", getRadiologyRequests);

// @route   GET /api/radiology/requests/:id
// @desc    Get details of a specific radiology request
// @access  Private (Radiologist)
router.get("/requests/:id", getRadiologyRequestDetails);

// @route   PUT /api/radiology/requests/:id/status
// @desc    Update the status of a radiology request
// @access  Private (Radiologist)
router.put("/requests/:id/status", updateRequestStatus);

// --- Radiology Results ---
// @route   POST /api/radiology/results/:id
// @desc    Upload results (findings, images) for a radiology request
// @access  Private (Radiologist)
router.post(
  "/results/:id",
  uploadImage.array("images", 10),
  uploadRadiologyResults
); // Allow multiple image uploads

// @route   GET /api/radiology/results
// @desc    Get completed radiology results (reports)
// @access  Private (Radiologist)
router.get("/results", getRadiologyResults);

// @route   GET /api/radiology/results/:reportId
// @desc    Get details of a specific radiology report
// @access  Private (Radiologist)
router.get("/results/:reportId", getRadiologyReportDetails);

export default router;
