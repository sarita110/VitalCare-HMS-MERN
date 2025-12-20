// backend/services/emailService.js
import transporter from "../config/email.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load email templates
const getTemplate = (templateName) => {
  try {
    const templatePath = path.join(
      __dirname,
      "..",
      "templates",
      "emails",
      `${templateName}.html`
    );
    return fs.readFileSync(templatePath, "utf8");
  } catch (error) {
    console.error(`Email template ${templateName} not found:`, error);
    // Return a simple fallback template
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

// Send email with better error handling
const sendEmail = async (options) => {
  try {
    if (!options.to) {
      throw new Error("Recipient email (to) is required");
    }

    if (!options.subject) {
      throw new Error("Email subject is required");
    }

    if (!options.html && !options.text) {
      throw new Error("Email content (html or text) is required");
    }

    const mailOptions = {
      from: `"VitalCare" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text, // Plain text fallback
    };

    if (options.attachments) {
      mailOptions.attachments = options.attachments;
    }

    console.log(`Attempting to send email to: ${options.to}`);
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    // Continue application flow even if email fails
    return {
      success: false,
      error: error.message,
      // Add this flag to indicate whether the application should continue
      isCritical: options.isCritical || false,
    };
  }
};

// Send welcome email with fallback content if template fails
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
      // Fallback to basic HTML if template fails
      html = `
        <h2>Welcome to VitalCare, ${user.name}!</h2>
        <p>Your account has been created successfully.</p>
        <p>You can login at: <a href="${process.env.FRONTEND_URL}/login">${process.env.FRONTEND_URL}/login</a></p>
      `;
    }

    return await sendEmail({
      to: user.email,
      subject: "Welcome to VitalCare",
      html,
      // Fallback plain text
      text: `Welcome to VitalCare, ${user.name}! Your account has been created successfully. You can login at: ${process.env.FRONTEND_URL}/login`,
    });
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return { success: false, error: error.message };
  }
};

// Password reset email
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
      // Fallback content
      html = `
        <h2>Password Reset Request</h2>
        <p>Hello ${user.name},</p>
        <p>We received a request to reset your VitalCare password.</p>
        <p>Please click the link below to reset your password:</p>
        <p><a href="${resetLink}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `;
    }

    return await sendEmail({
      to: user.email,
      subject: "Reset Your VitalCare Password",
      html,
      text: `Hello ${user.name}, we received a request to reset your VitalCare password. Please visit this link to reset your password: ${resetLink} (expires in 1 hour). If you didn't request this, please ignore this email.`,
    });
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return { success: false, error: error.message };
  }
};

// OTP verification email (simplified with better error handling)
const sendOtpEmail = async (user, otp) => {
  try {
    if (!user || !user.email || !otp) {
      throw new Error("Missing required data for OTP email");
    }

    let html = `
      <h2>Verify Your VitalCare Account</h2>
      <p>Hello ${user.name},</p>
      <p>Your verification code is: <strong>${otp}</strong></p>
      <p>This code will expire in 10 minutes.</p>
    `;

    try {
      const template = getTemplate("verify-otp");
      html = replacePlaceholders(template, {
        name: user.name,
        otp,
      });
    } catch (templateError) {
      // We already have fallback HTML above
      console.log("Using fallback OTP email template");
    }

    return await sendEmail({
      to: user.email,
      subject: "Verify Your VitalCare Account",
      html,
      text: `Hello ${user.name}, your verification code is: ${otp}. This code will expire in 10 minutes.`,
    });
  } catch (error) {
    console.error("Error sending OTP email:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Send hospital admin welcome email
 * @param {Object} user - The admin user object
 * @param {string} password - The temporary password
 * @param {Object} hospital - The hospital object
 * @returns {Promise<Object>} Email sending result
 */
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
    console.error("Error sending hospital admin welcome email:", error);
    // Fallback to basic HTML if template fails
    const html = `
      <h2>Welcome to VitalCare!</h2>
      <p>Hello ${user.name},</p>
      <p>You have been added as an administrator for ${hospital.name} on VitalCare.</p>
      <p><strong>Your login credentials:</strong></p>
      <p>Email: ${user.email}</p>
      <p>Password: ${password}</p>
      <p>Please log in and change your password immediately.</p>
      <p>Login at: <a href="${process.env.FRONTEND_URL}/login">${process.env.FRONTEND_URL}/login</a></p>
    `;

    return await sendEmail({
      to: user.email,
      subject: `Welcome to VitalCare - ${hospital.name} Administrator Account`,
      html,
    });
  }
};

// Other methods remain unchanged
// ...

export default {
  sendEmail,
  sendWelcomeEmail,
  sendHospitalAdminWelcomeEmail,
  sendPasswordResetEmail,
  sendOtpEmail,
  // Include other methods from the original file
  sendAppointmentConfirmationEmail: async (
    user,
    appointment,
    doctor,
    hospital
  ) => {
    // Implementation with try/catch and fallbacks
    try {
      // Basic fallback content
      let html = `
        <h2>Appointment Confirmed</h2>
        <p>Hello ${user.name},</p>
        <p>Your appointment with Dr. ${doctor.name} at ${
        hospital.name
      } has been confirmed.</p>
        <p>Date: ${new Date(appointment.dateTime).toLocaleDateString()}</p>
        <p>Time: ${new Date(appointment.dateTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}</p>
      `;

      return await sendEmail({
        to: user.email,
        subject: "Appointment Confirmation - VitalCare",
        html,
      });
    } catch (error) {
      console.error("Error sending appointment confirmation email:", error);
      return { success: false, error: error.message };
    }
  },

  sendAppointmentRescheduleEmail: async (
    user,
    appointment,
    doctor,
    hospital,
    oldDateTime
  ) => {
    try {
      // Basic content specifically for rescheduled appointments
      let html = `
      <h2>Appointment Rescheduled</h2>
      <p>Hello ${user.name},</p>
      <p>Your appointment with Dr. ${doctor.name} at ${
        hospital.name
      } has been rescheduled.</p>
      <p>Previous Date/Time: ${new Date(oldDateTime).toLocaleString()}</p>
      <p>New Date: ${new Date(appointment.dateTime).toLocaleDateString()}</p>
      <p>New Time: ${new Date(appointment.dateTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}</p>
    `;

      return await sendEmail({
        to: user.email,
        subject: "Appointment Rescheduled - VitalCare",
        html,
      });
    } catch (error) {
      console.error("Error sending appointment reschedule email:", error);
      return { success: false, error: error.message };
    }
  },

  sendPaymentConfirmationEmail: async (user, payment, relatedData) => {
    // Implementation with try/catch and fallbacks
    try {
      // Basic fallback content
      let html = `
        <h2>Payment Confirmation</h2>
        <p>Hello ${user.name},</p>
        <p>Your payment of ${payment.amount} ${
        payment.currency
      } has been confirmed.</p>
        <p>Date: ${new Date(payment.paymentDate).toLocaleDateString()}</p>
        <p>Payment Method: ${payment.paymentMethod}</p>
        <p>Receipt Number: ${payment.receiptNumber}</p>
      `;

      return await sendEmail({
        to: user.email,
        subject: "Payment Confirmation - VitalCare",
        html,
      });
    } catch (error) {
      console.error("Error sending payment confirmation email:", error);
      return { success: false, error: error.message };
    }
  },

  sendLabResultEmail: async (user, testName) => {
    // Implementation with try/catch and fallbacks
    try {
      // Basic fallback content
      let html = `
        <h2>Lab Results Available</h2>
        <p>Hello ${user.name},</p>
        <p>Your lab results for ${testName} are now available.</p>
        <p>Please login to your VitalCare account to view them.</p>
        <p><a href="${process.env.FRONTEND_URL}/patient/lab-results">View Results</a></p>
      `;

      return await sendEmail({
        to: user.email,
        subject: "Your Lab Results Are Ready - VitalCare",
        html,
      });
    } catch (error) {
      console.error("Error sending lab result email:", error);
      return { success: false, error: error.message };
    }
  },
};
