// src/services/labService.js
import api from "./api";

// --- Dashboard & Profile ---
export const getLabDashboard = async () => {
  const response = await api.get("/lab/dashboard");
  return response.data; // { success, dashboardData }
};

export const getLabProfile = async () => {
  const response = await api.get("/lab/profile");
  return response.data; // { success, profile }
};

export const updateLabProfile = async (profileData) => {
  // Only name and phone are updatable via controller
  const response = await api.put("/lab/profile", profileData);
  return response.data; // { success, message, profile }
};

// --- Lab Requests ---
export const getLabRequests = async (params = {}) => {
  // { page, limit, status, priority, search }
  const response = await api.get("/lab/requests", { params });
  return response.data; // { success, labTests, pagination }
};

export const getLabRequestDetails = async (id) => {
  const response = await api.get(`/lab/requests/${id}`);
  return response.data; // { success, labTest, relatedTests }
};

export const updateLabTestStatus = async (id, statusData) => {
  // { status, scheduledDate?, notes? }
  const response = await api.put(`/lab/requests/${id}/status`, statusData);
  return response.data; // { success, message, labTest }
};

// --- Lab Results ---
export const uploadLabResults = async (testId, formData) => {
  // Requires Content-Type: multipart/form-data if attachment included
  const response = await api.post(`/lab/results/${testId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data; // { success, message, labReport }
};

export const getLabResults = async (params = {}) => {
  // { page, limit, search, onlyMine }
  const response = await api.get("/lab/results", { params });
  return response.data; // { success, labReports, pagination }
};

export const getLabReportDetails = async (reportId) => {
  const response = await api.get(`/lab/results/${reportId}`);
  return response.data; // { success, report }
};

export default {
  getLabDashboard,
  getLabProfile,
  updateLabProfile,
  getLabRequests,
  getLabRequestDetails,
  updateLabTestStatus,
  uploadLabResults,
  getLabResults,
  getLabReportDetails,
};
