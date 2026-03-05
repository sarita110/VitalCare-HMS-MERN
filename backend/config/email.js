// backend/config/email.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config();

// Check if email credentials are available
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  console.error("Email credentials missing! Check your .env file.");
}

// Create the transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // Notice we removed the "service" line completely
  port: 587,
  secure: false, // true for 465, false for other ports
  requireTLS: true,
  family: 4, // <--- THIS IS THE MAGIC FIX: Forces IPv4 instead of IPv6
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
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
