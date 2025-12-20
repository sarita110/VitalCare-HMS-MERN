// src/services/userService.js
import api from "./api";

/**
 * Get the profile of the currently logged-in user.
 * Note: AuthContext might already hold this, but this provides an explicit fetch.
 * @returns {Promise<object>} Response data including user details.
 */
export const getMyProfile = async () => {
  // Backend endpoint might be /api/auth/check-auth or a dedicated /api/users/profile/me
  // Using /auth/check-auth based on existing authController
  const response = await api.get("/auth/check-auth");
  return response.data; // { success: true, user }
};

/**
 * Update the profile of the currently logged-in user.
 * Handles basic info like name, phone, and potentially image upload.
 * @param {FormData} formData - FormData containing updated fields (name, phone, image file).
 * @returns {Promise<object>} Response data including the updated user info.
 */
export const updateUserProfile = async (formData) => {
  // Assuming a backend endpoint like PUT /api/users/profile exists
  // This endpoint needs to be created in the backend (e.g., in userRoutes.js)
  // It should handle file uploads using multer similar to other update routes.
  const response = await api.put("/users/profile", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data; // { success, message, user } -> containing updated user fields
};

/**
 * Change the password for the currently logged-in user.
 * @param {object} passwordData - { currentPassword: '...', newPassword: '...' }
 * @returns {Promise<object>} Response data confirming password change.
 */
export const changePassword = async (passwordData) => {
  // Assuming a backend endpoint like POST /api/users/change-password exists
  // This endpoint needs to be created in the backend (e.g., in userRoutes.js or authRoutes.js)
  const response = await api.post("/users/change-password", passwordData);
  return response.data; // { success, message }
};

export default {
  getMyProfile,
  updateUserProfile,
  changePassword,
};
