import express from "express";
import passport from "passport";
import {
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
} from "../controllers/authController.js";
import { userValidation, validate } from "../middleware/validator.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post("/register", userValidation.register, validate, register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", userValidation.login, validate, login);

// @route   GET /api/auth/google
// @desc    Authenticate with Google
// @access  Public
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account", // <--- ADD THIS LINE
  })
);

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`, // Use environment variable for redirect
    session: false, 
  }),
  googleCallback 
);

// @route   POST /api/auth/send-otp
// @desc    Send verification OTP
// @access  Public
router.post("/send-otp", sendOTP);

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP
// @access  Public
router.post("/verify-otp", verifyOTP);

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post("/forgot-password", forgotPassword);

// @route   POST /api/auth/reset-password
// @desc    Reset password using token
// @access  Public
router.post(
  "/reset-password",
  userValidation.resetPassword,
  validate,
  resetPassword
);

// @route   GET /api/auth/check-auth
// @desc    Check authentication status and get user data
// @access  Private
router.get("/check-auth", verifyToken, checkAuth);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post("/logout", verifyToken, logout);

export default router;
