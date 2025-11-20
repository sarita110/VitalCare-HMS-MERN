// src/services/radiologyService.js
import api from "./api";

// --- Dashboard & Profile ---
export const getRadiologyDashboard = async () => {
  const response = await api.get("/radiology/dashboard");
  return response.data; // { success, dashboardData }
};

export const getRadiologyProfile = async () => {
  const response = await api.get("/radiology/profile");
  return response.data; // { success, profile }
};

export const updateRadiologyProfile = async (formData) => {
  // Requires Content-Type: multipart/form-data if image is included
  const response = await api.put("/radiology/profile", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data; // { success, message, profile }
};

// --- Radiology Requests ---
export const getRadiologyRequests = async (params = {}) => {
  // { page, limit, status, priority, search }
  const response = await api.get("/radiology/requests", { params });
  return response.data; // { success, radiologyRequests, pagination }
};

export const getRadiologyRequestDetails = async (id) => {
  const response = await api.get(`/radiology/requests/${id}`);
  return response.data; // { success, radiologyReport, relatedReports }
};

export const updateRadiologyRequestStatus = async (id, statusData) => {
  // { status, scheduledDate?, notes? }
  const response = await api.put(
    `/radiology/requests/${id}/status`,
    statusData
  );
  return response.data; // { success, message, radiologyReport }
};

// --- Radiology Results ---
export const uploadRadiologyResults = async (id, formData) => {
  // Requires Content-Type: multipart/form-data for images
  const response = await api.post(`/radiology/results/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data; // { success, message, radiologyReport }
};

export const getRadiologyResults = async (params = {}) => {
  // { page, limit, search, onlyMine }
  const response = await api.get("/radiology/results", { params });
  return response.data; // { success, radiologyReports, pagination }
};

export const getRadiologyReportDetails = async (reportId) => {
  const response = await api.get(`/radiology/results/${reportId}`);
  return response.data; // { success, report }
};

export default {
  getRadiologyDashboard,
  getRadiologyProfile,
  updateRadiologyProfile,
  getRadiologyRequests,
  getRadiologyRequestDetails,
  updateRadiologyRequestStatus,
  uploadRadiologyResults,
  getRadiologyResults,
  getRadiologyReportDetails,
};
