// backend/config/email.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config();

// Check if email credentials are available
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  console.error("Email credentials missing! Check your .env file.");
}

// Create the transporter with more detailed config
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  // debug: process.env.NODE_ENV === "development", // Enable debugging in development
  // logger: process.env.NODE_ENV === "development", // Log SMTP traffic in development
  debug: false,
  logger: false,
});

// Verify connection configuration
transporter.verify(function (error, success) {
  if (error) {
    console.error("Email transporter error:", error.message);
  } else {
    console.log("Email server is ready to send messages");
  }
});

export default transporter;
