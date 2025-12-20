// src/services/hospitalService.js
import api from "./api";

/**
 * Get a list of all active hospitals (public).
 * @param {object} params - Query parameters (page, limit, search)
 * @returns {Promise<object>} Response data including hospitals list and pagination.
 */
export const getAllHospitals = async (params = {}) => {
  const response = await api.get("/hospitals", { params });
  return response.data; // { success: true, hospitals, pagination }
};

/**
 * Get details for a specific active hospital (public).
 * @param {string} hospitalId - The ID of the hospital.
 * @returns {Promise<object>} Response data including hospital details and doctors list.
 */
export const getHospitalDetails = async (hospitalId) => {
  if (!hospitalId) throw new Error("Hospital ID is required");
  const response = await api.get(`/hospitals/${hospitalId}`);
  return response.data; // { success: true, hospital, doctors }
};

/**
 * Get public doctor profile by ID
 * @param {string} doctorId - The ID of the doctor
 * @returns {Promise<object>} Response data with doctor profile
 */
export const getDoctorProfileById = async (doctorId) => {
  if (!doctorId) throw new Error("Doctor ID is required");

  const response = await api.get(`/hospitals/doctors/${doctorId}`);
  return response.data; // { success, profile }
};

/**
 * Get active departments for a specific hospital (public).
 * @param {string} hospitalId - The ID of the hospital.
 * @returns {Promise<object>} Response data including departments list.
 */
export const getHospitalDepartments = async (hospitalId) => {
  if (!hospitalId) throw new Error("Hospital ID is required");
  const response = await api.get(`/hospitals/${hospitalId}/departments`);
  return response.data; // { success: true, departments }
};

/**
 * Get active doctors for a specific department within a hospital (public).
 * @param {string} hospitalId - The ID of the hospital.
 * @param {string} departmentId - The ID of the department.
 * @returns {Promise<object>} Response data including doctors list and department name.
 */
export const getDepartmentDoctors = async (hospitalId, departmentId) => {
  if (!hospitalId || !departmentId)
    throw new Error("Hospital ID and Department ID are required");
  const response = await api.get(
    `/hospitals/${hospitalId}/departments/${departmentId}/doctors`
  );
  return response.data; // { success: true, department, doctors }
};

/**
 * Upload/Update hospital logo (protected route for admin).
 * @param {string} hospitalId - The ID of the hospital.
 * @param {FormData} formData - FormData containing the image file under 'hospitalImage' key.
 * @returns {Promise<object>} Response data including the new logo URL.
 */
export const uploadHospitalImage = async (hospitalId, formData) => {
  if (!hospitalId) throw new Error("Hospital ID is required");
  const response = await api.post(
    `/hospitals/${hospitalId}/upload-image`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data", // Important for file uploads
      },
    }
  );
  return response.data; // { success: true, message, logo }
};

export default {
  getAllHospitals,
  getHospitalDetails,
  getHospitalDepartments,
  getDepartmentDoctors,
  uploadHospitalImage,
  getDoctorProfileById,
};
