// src/services/authService.js
import api from "./api";

/**
 * Register a new user.
 * @param {object} userData - User registration data (name, email, password, role, hospitalId?, dob?, gender?)
 * @returns {Promise<object>} Response data including token and user info.
 */
export const register = async (userData) => {
  const response = await api.post("/auth/register", userData);
  return response.data; // { success: true, message, token, user }
};

/**
 * Log in a user.
 * @param {object} credentials - User login credentials (email, password)
 * @returns {Promise<object>} Response data including token and user info.
 */
export const login = async (credentials) => {
  const response = await api.post("/auth/login", credentials);
  return response.data; // { success: true, message, token, user }
};

/**
 * Send OTP for email verification.
 * @param {string} email - User's email address.
 * @returns {Promise<object>} Response data.
 */
export const sendOtp = async (email) => {
  const response = await api.post("/auth/send-otp", { email });
  return response.data; // { success: true, message }
};

/**
 * Verify OTP for email verification.
 * @param {string} email - User's email address.
 * @param {string} otp - The OTP entered by the user.
 * @returns {Promise<object>} Response data including new token and user info.
 */
export const verifyOtp = async (email, otp) => {
  const response = await api.post("/auth/verify-otp", { email, otp });
  return response.data; // { success: true, message, token, user }
};

/**
 * Send password reset link.
 * @param {string} email - User's email address.
 * @returns {Promise<object>} Response data.
 */
export const forgotPassword = async (email) => {
  const response = await api.post("/auth/forgot-password", { email });
  return response.data; // { success: true, message }
};

/**
 * Reset password using the token.
 * @param {string} token - The password reset token.
 * @param {string} password - The new password.
 * @returns {Promise<object>} Response data.
 */
export const resetPassword = async (token, password) => {
  const response = await api.post("/auth/reset-password", { token, password });
  return response.data; // { success: true, message }
};

/**
 * Check the current authentication status using the stored token.
 * @returns {Promise<object>} Response data including user info.
 */
export const checkAuthStatus = async () => {
  const response = await api.get("/auth/check-auth");
  return response.data; // { success: true, user }
};

/**
 * Log out the user (Server-side doesn't do much for JWT, client clears token).
 * @returns {Promise<object>} Response data.
 */
export const logout = async () => {
  // Inform the backend if needed (e.g., invalidate refresh tokens if used)
  // For basic JWT, this might just be a client-side action, but we can call an endpoint if it exists.
  try {
    // If a backend logout endpoint exists for logging or session cleanup:
    // const response = await api.post('/auth/logout');
    // return response.data;
    return { success: true, message: "Logout successful" }; // Simulate success if no backend endpoint
  } catch (error) {
    // Handle potential errors if a backend endpoint is called
    console.error("Logout API call failed (if implemented):", error);
    // Even if backend fails, proceed with client-side logout
    return { success: true, message: "Logout successful (client-side)" };
  }
};

// Note: Google OAuth flow is typically handled by redirects, not direct API calls from JS frontend like this.
// The frontend will redirect to `/api/auth/google`, and handle the callback redirect with the token.

export default {
  register,
  login,
  sendOtp,
  verifyOtp,
  forgotPassword,
  resetPassword,
  checkAuthStatus,
  logout,
};
