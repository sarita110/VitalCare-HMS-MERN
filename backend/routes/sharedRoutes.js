// src/routes/sharedRoutes.js
import express from "express";
import { verifyToken, isVerified } from "../middleware/auth.js";
// Import the specific permission middleware
import { canAccessPatientRecords } from "../middleware/roleCheck.js";
// Import the new controller function
import { getPatientMedicalHistoryShared } from "../controllers/sharedController.js";

const router = express.Router();

// Route for fetching patient medical history by authorized staff
// URL uses Patient ID
// @route   GET /api/shared/patients/:id/medical-history
// @desc    Get medical history for a specific patient (for referrals etc.)
// @access  Private (Doctor, Receptionist of the same hospital)
router.get(
  "/patients/:id/medical-history",
  verifyToken, // Check login token
  isVerified, // Check email verification
  canAccessPatientRecords, // Check role (Doc/Rec) and hospital match
  getPatientMedicalHistoryShared // Execute controller logic
);

// Add other shared routes here if needed in the future

export default router;
