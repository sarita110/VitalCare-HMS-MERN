import express from "express";
import { verifyToken, isVerified } from "../middleware/auth.js";
import { isLabTechnician } from "../middleware/roleCheck.js";
import { uploadDocument } from "../middleware/multer.js";
import { validate, labTestValidation } from "../middleware/validator.js"; // Import specific validations
import {
  getDashboard,
  getProfile,
  updateProfile,
  getLabRequests,
  getLabRequestDetails,
  updateTestStatus,
  uploadLabResults,
  getLabResults,
  getLabReportDetails,
} from "../controllers/labController.js";

const router = express.Router();

// Apply verifyToken, isVerified, and isLabTechnician middleware
router.use(verifyToken, isVerified, isLabTechnician);

// --- Dashboard & Profile ---
// @route   GET /api/lab/dashboard
// @desc    Get lab technician dashboard data
// @access  Private (Lab Technician)
router.get("/dashboard", getDashboard);

// @route   GET /api/lab/profile
// @desc    Get lab technician profile
// @access  Private (Lab Technician)
router.get("/profile", getProfile);

// @route   PUT /api/lab/profile
// @desc    Update lab technician profile (Name, Phone)
// @access  Private (Lab Technician)
router.put("/profile", updateProfile); // No image upload needed based on controller

// --- Lab Requests ---
// @route   GET /api/lab/requests
// @desc    Get lab test requests for the hospital
// @access  Private (Lab Technician)
router.get("/requests", getLabRequests);

// @route   GET /api/lab/requests/:id
// @desc    Get details of a specific lab test request
// @access  Private (Lab Technician)
router.get("/requests/:id", getLabRequestDetails);

// @route   PUT /api/lab/requests/:id/status
// @desc    Update the status of a lab test request
// @access  Private (Lab Technician)
router.put(
  "/requests/:id/status",
  labTestValidation.updateStatus, // Add validation
  validate,
  updateTestStatus
);

// --- Lab Results ---
// @route   POST /api/lab/results/:testId
// @desc    Upload results for a lab test
// @access  Private (Lab Technician)
router.post(
  "/results/:testId",
  uploadDocument.single("attachment"),
  uploadLabResults
); // Use uploadDocument for result file

// @route   GET /api/lab/results
// @desc    Get completed lab results (reports)
// @access  Private (Lab Technician)
router.get("/results", getLabResults);

// @route   GET /api/lab/results/:reportId
// @desc    Get details of a specific lab report
// @access  Private (Lab Technician)
router.get("/results/:reportId", getLabReportDetails);

export default router;
