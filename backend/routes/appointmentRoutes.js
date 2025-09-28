import express from "express";
import { verifyToken, isVerified } from "../middleware/auth.js";
import {
  isPatient,
  isDoctor,
  isReceptionist,
  isAdmin,
} from "../middleware/roleCheck.js";
import { validate, appointmentValidation } from "../middleware/validator.js";
import {
  createAppointment,
  getAppointments,
  getAppointmentDetails,
  updateAppointmentStatus,
  cancelAppointment,
  rescheduleAppointment,
} from "../controllers/appointmentController.js";

const router = express.Router();

// Apply verifyToken and isVerified middleware to all appointment routes
router.use(verifyToken, isVerified);

// --- Create Appointment ---
// @route   POST /api/appointments
// @desc    Create a new appointment (Patients and Receptionists)
// @access  Private (Patient, Receptionist)
router.post(
  "/",
  (req, res, next) => {
    // Custom role check middleware
    if (req.user.role === "patient" || req.user.role === "receptionist") {
      next();
    } else {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }
  },
  appointmentValidation.create, // Add validation
  validate,
  createAppointment
);

// --- Get Appointments ---
// @route   GET /api/appointments
// @desc    Get appointments based on user role and filters
// @access  Private (All logged-in roles)
router.get("/", getAppointments);

// --- Get Specific Appointment Details ---
// @route   GET /api/appointments/:id
// @desc    Get details of a specific appointment
// @access  Private (Owner, Related Doctor, Admin, Receptionist, SuperAdmin)
router.get("/:id", getAppointmentDetails);

// --- Update Appointment Status ---
// @route   PUT /api/appointments/:id/status
// @desc    Update appointment status (Doctor, Receptionist, Admin)
// @access  Private (Doctor, Receptionist, Admin)
router.put(
  "/:id/status",
  (req, res, next) => {
    // Custom role check middleware
    if (
      req.user.role === "doctor" ||
      req.user.role === "receptionist" ||
      req.user.role === "admin"
    ) {
      next();
    } else {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }
  },
  appointmentValidation.update, // Add validation
  validate,
  updateAppointmentStatus
);

// --- Cancel Appointment ---
// @route   PUT /api/appointments/:id/cancel
// @desc    Cancel an appointment
// @access  Private (Owner, Related Doctor, Admin, Receptionist)
router.put("/:id/cancel", cancelAppointment);

// --- Reschedule Appointment ---
// @route   PUT /api/appointments/:id/reschedule
// @desc    Reschedule an appointment
// @access  Private (Owner, Related Doctor, Admin, Receptionist)
router.put("/:id/reschedule", rescheduleAppointment);

export default router;
