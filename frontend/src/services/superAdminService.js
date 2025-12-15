// src/services/superAdminService.js
import api from "./api";

// --- Dashboard & Reports ---
export const getSuperAdminDashboard = async () => {
  const response = await api.get("/super-admin/dashboard");
  return response.data; // { success, dashboardData }
};

export const generateSystemReport = async (params = {}) => {
  // { format, type, startDate, endDate }
  const response = await api.get("/super-admin/reports", { params });
  return response.data; // { success, message, report: { fileName, downloadUrl } }
};

// --- Hospital Management ---
export const createHospital = async (formData) => {
  // Requires Content-Type: multipart/form-data if logo included
  const response = await api.post("/super-admin/hospitals", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data; // { success, message, hospital }
};

export const updateHospital = async (id, formData) => {
  // Requires Content-Type: multipart/form-data if logo included
  const response = await api.put(`/super-admin/hospitals/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data; // { success, message, hospital }
};

export const getHospitals = async (params = {}) => {
  // { page, limit, search, status }
  const response = await api.get("/super-admin/hospitals", { params });
  return response.data; // { success, hospitals, pagination }
};

export const getHospitalDetails = async (id) => {
  const response = await api.get(`/super-admin/hospitals/${id}`);
  return response.data; // { success, hospital }
};

export const updateHospitalStatus = async (id, statusData) => {
  // { isActive: boolean }
  const response = await api.put(
    `/super-admin/hospitals/${id}/status`,
    statusData
  );
  return response.data; // { success, message, isActive }
};

// --- Hospital Admin Management ---
export const createHospitalAdmin = async (adminData) => {
  const response = await api.post("/super-admin/hospital-admins", adminData);
  return response.data; // { success, message, admin }
};

export const getHospitalAdmins = async (params = {}) => {
  // { hospitalId, page, limit, search, status }
  const response = await api.get("/super-admin/hospital-admins", { params });
  return response.data; // { success, admins, pagination }
};

export const getHospitalAdminDetails = async (id) => {
  const response = await api.get(`/super-admin/hospital-admins/${id}`);
  return response.data; // { success, admin }
};

export const updateHospitalAdminStatus = async (id, statusData) => {
  // { isActive: boolean }
  const response = await api.put(
    `/super-admin/hospital-admins/${id}/status`,
    statusData
  );
  return response.data; // { success, message, isActive }
};

export const deleteHospitalAdmin = async (id) => {
  const response = await api.delete(`/super-admin/hospital-admins/${id}`);
  return response.data; // { success, message }
};

export default {
  getSuperAdminDashboard,
  generateSystemReport,
  createHospital,
  updateHospital,
  getHospitals,
  getHospitalDetails,
  updateHospitalStatus,
  createHospitalAdmin,
  getHospitalAdmins,
  getHospitalAdminDetails,
  updateHospitalAdminStatus,
  deleteHospitalAdmin,
};
