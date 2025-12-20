// routes/userRoutes.js
import express from "express";
import { verifyToken, isVerified } from "../middleware/auth.js";
import { uploadImage } from "../middleware/multer.js"; // Use multer for image uploads
import { validate } from "../middleware/validator.js"; // Import general validator middleware
import {
  updateUserProfile,
  changePassword,
  changePasswordValidationRules, // Import specific validation rules
} from "../controllers/userController.js";

const router = express.Router();

// Apply verifyToken to all routes in this file
// Ensures user is logged in for profile actions
router.use(verifyToken);

// --- Update User Profile ---
// @route   PUT /api/users/profile
// @desc    Update profile for the logged-in user (name, phone, image)
// @access  Private
router.put(
  "/profile",
  isVerified, // Optional: Ensure user is verified to update profile
  uploadImage.single("image"), // Middleware to handle single image upload with field name 'image'
  // Add validation middleware here if needed for name/phone
  updateUserProfile
);

// --- Change Password ---
// @route   POST /api/users/change-password
// @desc    Change password for the logged-in user
// @access  Private
router.post(
  "/change-password",
  isVerified, // Optional: Ensure user is verified to change password
  changePasswordValidationRules(), // Apply validation rules for passwords
  validate, // Middleware to check validation results
  changePassword
);

export default router;
