// src/services/adminService.js
import api from "./api";
import appointmentService from "./appointmentService";

// --- Dashboard ---
export const getAdminDashboard = async () => {
  const response = await api.get("/admin/dashboard");
  return response.data; // { success, dashboardData }
};

// --- Hospital Profile (Managed by Admin for their own hospital) ---
export const getAdminHospitalProfile = async () => {
  const response = await api.get("/admin/hospital-profile");
  return response.data; // { success, hospital }
};

export const updateAdminHospitalProfile = async (formData) => {
  // Requires Content-Type: multipart/form-data if logo is included
  const response = await api.put("/admin/hospital-profile", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data; // { success, message, hospital }
};

// --- Department Management ---
export const createDepartment = async (departmentData) => {
  try {
    const response = await api.post("/admin/departments", departmentData);
    return response.data; // { success, message, department }
  } catch (error) {
    console.error("Error creating department:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to create department",
    };
  }
};

export const updateDepartment = async (id, departmentData) => {
  try {
    const response = await api.put(`/admin/departments/${id}`, departmentData);
    return response.data; // { success, message, department }
  } catch (error) {
    console.error("Error updating department:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to update department",
    };
  }
};

export const getDepartments = async (params = {}) => {
  try {
    // e.g., { status: 'active' }
    const response = await api.get("/admin/departments", { params });
    return response.data; // { success, departments }
  } catch (error) {
    console.error("Error fetching departments:", error);
    return {
      success: false,
      departments: [],
      message: error.response?.data?.message || "Failed to fetch departments",
    };
  }
};

export const getDepartmentDetails = async (id) => {
  try {
    const response = await api.get(`/admin/departments/${id}`);
    return response.data; // { success, department }
  } catch (error) {
    console.error("Error getting department details:", error);
    return {
      success: false,
      message:
        error.response?.data?.message || "Failed to get department details",
    };
  }
};

export const deleteDepartment = async (id) => {
  try {
    const response = await api.delete(`/admin/departments/${id}`);
    return response.data; // { success, message }
  } catch (error) {
    console.error("Error deleting department:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to delete department",
    };
  }
};

// --- Doctor Management ---
export const createDoctor = async (formData) => {
  // Requires Content-Type: multipart/form-data if image is included
  const response = await api.post("/admin/doctors", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data; // { success, message, doctor }
};

export const updateDoctor = async (id, formData) => {
  // Requires Content-Type: multipart/form-data if image is included
  const response = await api.put(`/admin/doctors/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data; // { success, message, doctor }
};

export const getDoctors = async (params = {}) => {
  // { page, limit, search, departmentId, status }
  const response = await api.get("/admin/doctors", { params });
  return response.data; // { success, doctors, pagination }
};

export const getDoctorDetails = async (id) => {
  const response = await api.get(`/admin/doctors/${id}`);
  return response.data; // { success, doctor }
};

export const toggleDoctorAvailability = async (id) => {
  // Backend expects PUT, no body needed based on controller
  const response = await api.put(`/admin/doctors/${id}/availability`);
  return response.data; // { success, message, available }
};

export const deleteDoctor = async (id) => {
  const response = await api.delete(`/admin/doctors/${id}`);
  return response.data; // { success, message }
};

// --- Staff Management ---
export const createStaff = async (formData) => {
  // Requires Content-Type: multipart/form-data if image is included
  const response = await api.post("/admin/staff", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data; // { success, message, staff }
};

export const updateStaff = async (id, formData) => {
  // Requires Content-Type: multipart/form-data if image is included
  const response = await api.put(`/admin/staff/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data; // { success, message, staff }
};

export const getStaff = async (params = {}) => {
  // { page, limit, search, role, status }
  const response = await api.get("/admin/staff", { params });
  return response.data; // { success, staff, pagination }
};

export const getStaffDetails = async (id) => {
  const response = await api.get(`/admin/staff/${id}`);
  return response.data; // { success, staff }
};

export const deleteStaff = async (id) => {
  const response = await api.delete(`/admin/staff/${id}`);
  return response.data; // { success, message }
};

// --- Appointment Management (Admin View/Cancel) ---
export const getAdminAppointments = async (params = {}) => {
  // { page, limit, search, status, dateFrom, dateTo, doctorId }
  const response = await api.get("/admin/appointments", { params });
  return response.data; // { success, appointments, pagination }
};

// --- ADDED: Get Single Appointment Details (for Admin) ---
/**
 * Get details of a specific appointment (Admin View).
 * Uses the generic appointment service internally.
 * @param {string} appointmentId - The ID of the appointment.
 * @returns {Promise<object>} Response data including appointment details.
 */
export const getAdminAppointmentDetails = async (appointmentId) => {
  // No specific admin endpoint needed, use the generic one.
  // Backend authorization will handle access control based on admin's hospital.
  return await appointmentService.getAppointmentDetails(appointmentId);
};
// --- END ADDED FUNCTION ---

export const cancelAdminAppointment = async (id, reasonData) => {
  // reasonData = { reason: '...' }
  const response = await api.put(
    `/admin/appointments/${id}/cancel`,
    reasonData
  );
  return response.data; // { success, message, appointment }
};

// --- Patient Management ---
export const getAdminPatients = async (params = {}) => {
  // { page, limit, search }
  const response = await api.get("/admin/patients", { params });
  return response.data; // { success, patients, pagination }
};

export const getAdminPatientDetails = async (id) => {
  const response = await api.get(`/admin/patients/${id}`);
  return response.data; // { success, patient, history }
};

export const updatePatientStatus = async (id, statusData) => {
  // statusData = { isActive: boolean }
  const response = await api.put(`/admin/patients/${id}/status`, statusData);
  return response.data; // { success, message, isActive }
};

export const deletePatient = async (id) => {
  const response = await api.delete(`/admin/patients/${id}`);
  return response.data; // { success, message }
};

// --- Reports ---
export const getAdminReportsData = async (params = {}) => {
  // { reportType, period }
  const response = await api.get("/admin/reports", { params });
  return response.data; // { success, reportData }
};

export const generateAdminHospitalReport = async (params = {}) => {
  // { format, type, startDate, endDate }
  const response = await api.get("/admin/generate-report", { params });
  return response.data; // { success, message, report: { fileName, downloadUrl } }
};

export default {
  getAdminDashboard,
  getAdminHospitalProfile,
  updateAdminHospitalProfile,
  createDepartment,
  updateDepartment,
  getDepartments,
  getDepartmentDetails,
  deleteDepartment,
  createDoctor,
  updateDoctor,
  getDoctors,
  getDoctorDetails,
  toggleDoctorAvailability,
  deleteDoctor,
  createStaff,
  updateStaff,
  getStaff,
  getStaffDetails,
  deleteStaff,
  getAdminAppointments,
  getAdminAppointmentDetails,
  cancelAdminAppointment,
  getAdminPatients,
  getAdminPatientDetails,
  updatePatientStatus,
  deletePatient,
  getAdminReportsData,
  generateAdminHospitalReport,
};
