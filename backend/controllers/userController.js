// controllers/userController.js
import User from "../models/User.js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs"; // Import file system module for deleting temp files
import path from "path"; // Import path module
import { body, validationResult } from "express-validator"; // For validation
import bcrypt from "bcryptjs"; // For password comparison

/**
 * Update user profile (name, phone, image)
 * @route PUT /api/users/profile
 * @access Private
 */
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id; // Get user ID from authenticated request
    const { name, phone } = req.body;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Handle image upload if file exists
    let imageUrl = user.image; // Keep existing image by default
    if (req.file) {
      try {
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "user-profiles", // Specify a folder in Cloudinary
          resource_type: "image",
        });
        imageUrl = result.secure_url;

        // Delete the temporary file saved by Multer
        fs.unlink(req.file.path, (err) => {
          if (err) {
            console.error("Failed to delete temporary image file:", err);
            // Log error but don't fail the request just for this
          }
        });
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        // Delete temp file even if upload fails
        fs.unlink(req.file.path, (err) => {
          if (err)
            console.error("Failed to delete temp file on upload error:", err);
        });
        return res.status(500).json({
          success: false,
          message: "Failed to upload profile image",
          error: uploadError.message,
        });
      }
    }

    // Update user fields
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone; // Allow setting empty phone
    user.image = imageUrl; // Update image URL

    // Save updated user
    const updatedUser = await user.save();

    // Return updated user info (excluding sensitive fields)
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        image: updatedUser.image,
        phone: updatedUser.phone,
        hospital: updatedUser.hospital, // Include hospital if needed
        isVerified: updatedUser.isVerified,
        isActive: updatedUser.isActive,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    // Clean up uploaded file if request fails after upload but before DB save
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Failed to delete temp file on error:", err);
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

/**
 * Change user password
 * @route POST /api/users/change-password
 * @access Private
 */
export const changePassword = async (req, res) => {
  // Run validation checks
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user registered with Google and has no password set
    if (user.googleId && !user.password) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot change password for accounts registered via Google without a password set.",
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect current password",
      });
    }

    // Update to new password (pre-save hook will hash it)
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change password",
      error: error.message,
    });
  }
};

// Validation rules for changePassword
export const changePasswordValidationRules = () => {
  return [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("New password must be at least 8 characters")
      .matches(/[A-Z]/)
      .withMessage("Password must contain an uppercase letter")
      .matches(/[a-z]/)
      .withMessage("Password must contain a lowercase letter")
      .matches(/[0-9]/)
      .withMessage("Password must contain a number")
      .matches(/[^A-Za-z0-9]/)
      .withMessage("Password must contain a special character"),
  ];
};

export default {
  updateUserProfile,
  changePassword,
  changePasswordValidationRules,
};
