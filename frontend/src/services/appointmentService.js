// src/services/appointmentService.js
import api from "./api";

/**
 * Create a new appointment.
 * @param {object} appointmentData - Data for the new appointment.
 * @returns {Promise<object>} Response data.
 */
export const createAppointment = async (appointmentData) => {
  const response = await api.post("/appointments", appointmentData);
  return response.data; // { success, message, appointment }
};

/**
 * Get appointments based on filters and user role.
 * @param {object} params - Query parameters (hospitalId, doctorId, patientId, status, date, page, limit)
 * @returns {Promise<object>} Response data.
 */
export const getAppointments = async (params = {}) => {
  const response = await api.get("/appointments", { params });
  return response.data; // { success, appointments, pagination }
};

/**
 * Get details of a specific appointment.
 * @param {string} id - Appointment ID.
 * @returns {Promise<object>} Response data.
 */
export const getAppointmentDetails = async (id) => {
  const response = await api.get(`/appointments/${id}`);
  return response.data; // { success, appointment, medicalRecords, labTests, radiologyTests }
};

/**
 * Update the status of an appointment.
 * @param {string} id - Appointment ID.
 * @param {object} statusData - Data containing the new status and optional notes ({ status: '...', notes: '...' }).
 * @returns {Promise<object>} Response data.
 */
export const updateAppointmentStatus = async (id, statusData) => {
  const response = await api.put(`/appointments/${id}/status`, statusData);
  return response.data; // { success, message, appointment }
};

/**
 * Cancel an appointment.
 * @param {string} id - Appointment ID.
 * @param {object} reasonData - Data containing the cancellation reason ({ reason: '...' }).
 * @returns {Promise<object>} Response data.
 */
export const cancelAppointment = async (id, reasonData) => {
  const response = await api.put(`/appointments/${id}/cancel`, reasonData);
  return response.data; // { success, message, appointment }
};

/**
 * Reschedule an appointment.
 * @param {string} id - Appointment ID.
 * @param {object} rescheduleData - Data containing the new dateTime and optional notes ({ dateTime: '...', notes: '...' }).
 * @returns {Promise<object>} Response data.
 */
export const rescheduleAppointment = async (id, rescheduleData) => {
  const response = await api.put(
    `/appointments/${id}/reschedule`,
    rescheduleData
  );
  return response.data; // { success, message, appointment }
};

export default {
  createAppointment,
  getAppointments,
  getAppointmentDetails,
  updateAppointmentStatus,
  cancelAppointment,
  rescheduleAppointment,
};
