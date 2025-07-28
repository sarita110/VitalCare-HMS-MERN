// controllers/authController.js
import User from "../models/User.js";
import Patient from "../models/Patient.js";
// Import other role models if needed for specific registration logic
// import Doctor from '../models/Doctor.js';
// import Staff from '../models/Staff.js';
// import Receptionist from '../models/Receptionist.js';
// import SuperAdmin from '../models/SuperAdmin.js';
import {
  generateToken,
  generateOTP,
  generateRandomToken,
} from "../utils/helpers.js";
import emailService from "../services/emailService.js";
import Hospital from "../models/Hospital.js"; // Ensure Hospital is imported
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
export const register = async (req, res) => {
  try {
    const { name, email, password, role, hospitalId, dob, gender } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    if (role === "superAdmin") {
      return res.status(400).json({
        success: false,
        message: "Cannot register as super admin",
      });
    }

    // For non-patient staff roles, hospitalId is still required
    if (role !== "patient" && role !== "superAdmin" && !hospitalId) {
      return res.status(400).json({
        success: false,
        message: "Hospital ID is required for staff roles",
      });
    }

    // If hospitalId is provided for a patient, validate it
    if (role === "patient" && hospitalId) {
      const hospitalExists = await Hospital.findById(hospitalId);
      if (!hospitalExists) {
        return res
          .status(400)
          .json({ success: false, message: "Selected hospital not found." });
      }
    }

    const otp = generateOTP(6);
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

    const newUser = await User.create({
      name,
      email,
      password,
      role,
      hospital: role === "patient" && !hospitalId ? null : hospitalId, // Assign null if patient and no hospitalId
      verificationOTP: otp,
      verificationOTPExpires: otpExpiry,
    });

    if (role === "patient") {
      if (!dob || !gender) {
        await User.findByIdAndDelete(newUser._id);
        return res.status(400).json({
          success: false,
          message:
            "Date of birth and gender are required for patient registration",
        });
      }
      await Patient.create({
        userId: newUser._id,
        hospitalId: hospitalId || null, // Store hospitalId if provided, otherwise null
        dob: new Date(dob),
        gender: gender,
        registrationDate: new Date(),
      });
    }

    // Add creation logic for other roles (Doctor, Receptionist, etc.) if needed here,
    // ensuring required fields are provided.

    // Send verification OTP
    await emailService.sendOtpEmail(newUser, otp); //

    // Create token with isVerified flag
    const token = generateToken({
      id: newUser._id,
      role: newUser.role,
      isVerified: false,
    }); //

    res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email.",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isVerified: false,
      }, //
    });
  } catch (error) {
    console.error("Registration error:", error); //
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    }); //
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body; //
    // Find user
    const user = await User.findOne({ email }); //
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      }); //
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact support.",
      }); //
    }

    // Check if user registered with Google and has no password
    if (user.googleId && !user.password) {
      return res.status(401).json({
        success: false,
        message: "Please log in using your Google account.",
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password); //
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      }); //
    }

    // Create token
    const token = generateToken({
      id: user._id,
      role: user.role,
      isVerified: user.isVerified,
    }); //

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        hospital: user.hospital,
      }, //
    });
  } catch (error) {
    console.error("Login error:", error); //
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    }); //
  }
};

/**
 * Google OAuth login
 * @route GET /api/auth/google
 * @access Public
 */
export const loginWithGoogle = (req, res) => {
  // Handled by passport middleware //
};

/**
 * Google OAuth callback
 * @route GET /api/auth/google/callback
 * @access Public
 */
export const googleCallback = (req, res) => {
  try {
    // Create token
    const token = generateToken({
      id: req.user._id,
      role: req.user.role,
      isVerified: true, // Google users are considered verified
    }); //

    // Redirect to frontend with token
    res.redirect(
      `${process.env.FRONTEND_URL}/auth/google-callback?token=${token}`
    ); //
  } catch (error) {
    console.error("Google callback error:", error); //
    res.redirect(`${process.env.FRONTEND_URL}/login?error=google_auth_failed`); //
  }
};

/**
 * Send OTP for verification
 * @route POST /api/auth/send-otp
 * @access Public
 */
export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body; //
    // Find user
    const user = await User.findOne({ email }); //
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      }); //
    }
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    // Generate new OTP
    const otp = generateOTP(6); //
    const otpExpiry = new Date(); //
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); //

    // Update user with new OTP
    user.verificationOTP = otp; //
    user.verificationOTPExpires = otpExpiry; //
    await user.save(); //

    // Send OTP via email
    await emailService.sendOtpEmail(user, otp); //

    res.status(200).json({
      success: true,
      message: "OTP sent to your email",
    }); //
  } catch (error) {
    console.error("Send OTP error:", error); //
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error.message,
    }); //
  }
};

/**
 * Verify OTP
 * @route POST /api/auth/verify-otp
 * @access Public
 */
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body; //
    // Find user
    const user = await User.findOne({
      email,
      verificationOTP: otp,
      verificationOTPExpires: { $gt: new Date() },
    }); //

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      }); //
    }

    // Mark user as verified
    user.isVerified = true; //
    user.verificationOTP = undefined; //
    user.verificationOTPExpires = undefined; //
    await user.save(); //

    // Create new token with verified status
    const token = generateToken({
      id: user._id,
      role: user.role,
      isVerified: true,
    }); //

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: true,
        hospital: user.hospital,
      }, //
    });
  } catch (error) {
    console.error("Verify OTP error:", error); //
    res.status(500).json({
      success: false,
      message: "OTP verification failed",
      error: error.message,
    }); //
  }
};

/**
 * Forgot password
 * @route POST /api/auth/forgot-password
 * @access Public
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body; //
    // Find user
    const user = await User.findOne({ email }); //
    if (!user) {
      // Send a generic success message even if user not found for security
      return res.status(200).json({
        success: true,
        message:
          "If an account with that email exists, password reset instructions have been sent.",
      });
    }

    // Don't allow password reset for Google-only accounts
    if (user.googleId && !user.password) {
      return res.status(400).json({
        success: false,
        message: "Cannot reset password for accounts registered via Google.",
      });
    }

    // Generate reset token
    const resetToken = generateRandomToken(); //
    const resetTokenExpiry = new Date(); //
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Token valid for 1 hour //

    // Update user with reset token
    user.resetPasswordToken = resetToken; //
    user.resetPasswordExpires = resetTokenExpiry; //
    await user.save(); //

    // Send password reset email
    await emailService.sendPasswordResetEmail(user, resetToken); //

    res.status(200).json({
      success: true,
      message: "Password reset instructions sent to your email",
    }); //
  } catch (error) {
    console.error("Forgot password error:", error); //
    res.status(500).json({
      success: false,
      message: "Failed to process forgot password request",
      error: error.message,
    }); //
  }
};

/**
 * Reset password
 * @route POST /api/auth/reset-password
 * @access Public
 */
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body; //

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    }); //

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      }); //
    }

    // Don't allow password reset for Google-only accounts
    if (user.googleId && !user.password) {
      // Although the forgotPassword should prevent this, add a check here too
      return res.status(400).json({
        success: false,
        message: "Cannot set password for accounts registered via Google.",
      });
    }

    // Update password
    user.password = password; //
    // Will be hashed by pre-save hook
    user.resetPasswordToken = undefined; //
    user.resetPasswordExpires = undefined; //
    await user.save(); //

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    }); //
  } catch (error) {
    console.error("Reset password error:", error); //
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message,
    }); //
  }
};

/**
 * Check auth status
 * @route GET /api/auth/check-auth
 * @access Private
 */
export const checkAuth = async (req, res) => {
  try {
    // User is already attached by middleware
    const user = await User.findById(req.user._id).select("-password"); //
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      }); //
    }
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        hospital: user.hospital,
        image: user.image,
      }, //
    });
  } catch (error) {
    console.error("Check auth error:", error); //
    res.status(500).json({
      success: false,
      message: "Failed to check auth status",
      error: error.message,
    }); //
  }
};

/**
 * Logout user
 * @route POST /api/auth/logout
 * @access Private
 */
export const logout = async (req, res) => {
  try {
    // Nothing to do on server side for JWT auth
    // The client should remove the token
    res.status(200).json({
      success: true,
      message: "Logout successful",
    }); //
  } catch (error) {
    console.error("Logout error:", error); //
    res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message,
    }); //
  }
};

export default {
  register,
  login,
  loginWithGoogle,
  googleCallback,
  sendOTP,
  verifyOTP,
  forgotPassword,
  resetPassword,
  checkAuth,
  logout,
};
