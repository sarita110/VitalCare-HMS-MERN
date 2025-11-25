import express from "express";
import { verifyToken, isVerified } from "../middleware/auth.js";
import { isPatient, isReceptionist, isAdmin } from "../middleware/roleCheck.js";
import { validate, paymentValidation } from "../middleware/validator.js";
import {
  initiatePayment,
  handleKhaltiCallback,
  processCashPayment,
  getPaymentDetails,
  getPayments,
} from "../controllers/paymentController.js";

const router = express.Router();

// Apply verifyToken and isVerified middleware to all payment routes
router.use(verifyToken, isVerified);

// --- Initiate Payment ---
// @route   POST /api/payments/initiate
// @desc    Initiate payment for an item (Appointment, Lab Test, etc.)
// @access  Private (Patient)
router.post("/initiate", isPatient, initiatePayment);

// --- Verify Khalti Payment ---
// @route   GET /api/payments/verify-callback
// @desc    Verify Khalti payment after redirect
// @access  Private (Patient - usually called from frontend after Khalti redirect)
router.get("/verify-callback", isPatient, handleKhaltiCallback);

// --- Process Cash Payment ---
// @route   POST /api/payments/process-cash
// @desc    Process a cash payment at reception
// @access  Private (Receptionist)
router.post(
  "/process-cash",
  isReceptionist,
  // Add validation if needed
  processCashPayment
);

// --- Get Payment Details ---
// @route   GET /api/payments/:id
// @desc    Get details of a specific payment
// @access  Private (Owner, Admin, Receptionist, SuperAdmin)
router.get("/:id", getPaymentDetails);

// --- Get Payments List ---
// @route   GET /api/payments
// @desc    Get payments list based on user role and filters
// @access  Private (Patient, Admin, Receptionist, SuperAdmin)
router.get("/", getPayments);

export default router;
