// backend/config/email.js

/**
 * NOTE: This file is no longer actively used.
 * We migrated from Nodemailer (SMTP) to Brevo (HTTP API) to bypass
 * cloud provider SMTP port blocking (e.g., Render free tier).
 *
 * Email logic is now handled directly in /services/emailService.js using Axios.
 */

export default null;
