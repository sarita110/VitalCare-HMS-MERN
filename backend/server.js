import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import passport from "passport";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

// Import configurations
import connectDB from "./config/db.js";
import connectCloudinary from "./config/cloudinary.js";
import configurePassport from "./config/passport.js";

// Import Routes
import authRoutes from "./routes/authRoutes.js";
import superAdminRoutes from "./routes/superAdminRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import hospitalRoutes from "./routes/hospitalRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import receptionistRoutes from "./routes/receptionistRoutes.js";
import labRoutes from "./routes/labRoutes.js";
import radiologyRoutes from "./routes/radiologyRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import sharedRoutes from "./routes/sharedRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

import devRoutes from "./routes/devRoutes.js"; // remove after use in prod

// ES Module equivalents for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();

// Connect Database
connectDB();

// Connect Cloudinary
connectCloudinary();

// Configure Passport
configurePassport();

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Body parser for JSON
app.use(express.urlencoded({ extended: true })); // Body parser for URL-encoded data
app.use(passport.initialize()); // Initialize Passport

// --- API Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/receptionist", receptionistRoutes);
app.use("/api/lab", labRoutes);
app.use("/api/radiology", radiologyRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/shared", sharedRoutes); // Shared routes for referrals, etc.
app.use("/api/users", userRoutes); // New user routes
app.use("/api/notifications", notificationRoutes);
app.use("/api/dev", devRoutes); // remove after use in prod

// --- Download Route (Example) ---
// Serve report files from a specific directory
// Ensure uploads/reports directory exists or is created
const reportsDir = path.join(__dirname, "uploads", "reports");
import fs from "fs";
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}
app.use("/api/downloads/reports", express.static(reportsDir));

// --- Basic Root Route ---
app.get("/", (req, res) => {
  res.send("VitalCare API Running");
});

// --- Error Handling Middleware (Basic) ---
// Not Found Handler
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// General Error Handler
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  console.error("Error:", err.message); // Log the error message
  // console.error(err.stack); // Log stack trace in development
  res.status(statusCode);
  res.json({
    message: err.message,
    // Provide stack trace only in development
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
});

// Server Port
const PORT = process.env.PORT || 5000; // Changed default to 5000 as per .env

// Start Server
app.listen(PORT, () =>
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);
