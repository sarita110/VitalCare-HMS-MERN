// backend/services/emailService.js
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load email templates
const getTemplate = (templateName) => {
  try {
    const templatePath = path.join(__dirname, "..", "templates", "emails", `${templateName}.html`);
    return fs.readFileSync(templatePath, "utf8");
  } catch (error) {
    console.error(`Email template ${templateName} not found:`, error);
    return `<!DOCTYPE html><html><body><p>{{content}}</p></body></html>`;
  }
};

// Replace placeholders in template
const replacePlaceholders = (template, replacements) => {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return result;
};

// Send email using Brevo's HTTP API (Bypasses Render's SMTP Block)
const sendEmail = async (options) => {
  try {
    if (!options.to) throw new Error("Recipient email (to) is required");
    if (!options.subject) throw new Error("Email subject is required");

    console.log(`Attempting to send HTTP email via Brevo to: ${options.to}`);

    // Call Brevo API
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: "VitalCare", email: process.env.EMAIL_USER }, // MUST match your Brevo account email
        to: [{ email: options.to }],
        subject: options.subject,
        htmlContent: options.html || `<p>${options.text}</p>`,
      },
      {
        headers: {
          'accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json'
        }
      }
    );

    console.log("Email sent successfully via API!");
    return { success: true };
  } catch (error) {
    console.error("Error sending email via API:", error.response?.data || error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

// ------------------------------------------------------------------
// The rest of your functions remain EXACTLY the same!
// ------------------------------------------------------------------

const sendWelcomeEmail = async (user) => {
  try {
    let html;
    try {
      const template = getTemplate("welcome");
      html = replacePlaceholders(template, {
        name: user.name,
        loginLink: `${process.env.FRONTEND_URL}/login`,
        content: `Welcome to VitalCare! You can login at ${process.env.FRONTEND_URL}/login`,
      });
    } catch (templateError) {
      html = `<h2>Welcome to VitalCare, ${user.name}!</h2><p>Your account has been created successfully.</p>`;
    }

    return await sendEmail({
      to: user.email,
      subject: "Welcome to VitalCare",
      html,
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const sendPasswordResetEmail = async (user, resetToken) => {
  try {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    let html;
    try {
      const template = getTemplate("reset-password");
      html = replacePlaceholders(template, {
        name: user.name,
        resetLink,
        content: `Reset your password by clicking here: ${resetLink}`,
      });
    } catch (templateError) {
      html = `<h2>Password Reset Request</h2><p>Please click the link below to reset your password:</p><p><a href="${resetLink}">Reset Password</a></p>`;
    }

    return await sendEmail({
      to: user.email,
      subject: "Reset Your VitalCare Password",
      html,
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const sendOtpEmail = async (user, otp) => {
  try {
    let html = `<h2>Verify Your VitalCare Account</h2><p>Your verification code is: <strong>${otp}</strong></p>`;
    try {
      const template = getTemplate("verify-otp");
      html = replacePlaceholders(template, { name: user.name, otp });
    } catch (templateError) {}

    return await sendEmail({
      to: user.email,
      subject: "Verify Your VitalCare Account",
      html,
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const sendHospitalAdminWelcomeEmail = async (user, password, hospital) => {
  try {
    const template = getTemplate("admin-welcome");
    const currentYear = new Date().getFullYear();

    const html = replacePlaceholders(template, {
      name: user.name,
      hospitalName: hospital.name,
      email: user.email,
      password: password,
      loginUrl: `${process.env.FRONTEND_URL}/login`,
      currentYear: currentYear,
    });

    return await sendEmail({
      to: user.email,
      subject: `Welcome to VitalCare - ${hospital.name} Administrator Account`,
      html,
    });
  } catch (error) {
    return await sendEmail({
      to: user.email,
      subject: `Welcome to VitalCare - ${hospital.name} Administrator Account`,
      html: `<h2>Welcome!</h2><p>Email: ${user.email}</p><p>Password: ${password}</p>`,
    });
  }
};

export default {
  sendEmail,
  sendWelcomeEmail,
  sendHospitalAdminWelcomeEmail,
  sendPasswordResetEmail,
  sendOtpEmail,
  sendAppointmentConfirmationEmail: async (user, appointment, doctor, hospital) => {
    try {
      let html = `<h2>Appointment Confirmed</h2><p>Your appointment with Dr. ${doctor.name} at ${hospital.name} has been confirmed.</p>`;
      return await sendEmail({ to: user.email, subject: "Appointment Confirmation - VitalCare", html });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  sendAppointmentRescheduleEmail: async (user, appointment, doctor, hospital, oldDateTime) => {
    try {
      let html = `<h2>Appointment Rescheduled</h2><p>Your appointment with Dr. ${doctor.name} at ${hospital.name} has been rescheduled.</p>`;
      return await sendEmail({ to: user.email, subject: "Appointment Rescheduled - VitalCare", html });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  sendPaymentConfirmationEmail: async (user, payment, relatedData) => {
    try {
      let html = `<h2>Payment Confirmation</h2><p>Your payment of ${payment.amount} ${payment.currency} has been confirmed.</p>`;
      return await sendEmail({ to: user.email, subject: "Payment Confirmation - VitalCare", html });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  sendLabResultEmail: async (user, testName) => {
    try {
      let html = `<h2>Lab Results Available</h2><p>Your lab results for ${testName} are now available.</p>`;
      return await sendEmail({ to: user.email, subject: "Your Lab Results Are Ready - VitalCare", html });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};