// src/services/reportService.js
import api from "./api";
import config from "../config";
import { ROLES } from "../constants";

/**
 * Fetches report data for dashboard charts (Admin panel).
 * @param {object} params - Query parameters (e.g., { reportType: 'financial', period: 'month' })
 * @returns {Promise<object>} Response data { success, reportData }
 */
const getAdminReportData = async (params = {}) => {
  const response = await api.get("/admin/reports", { params });
  return response.data;
};

/**
 * Initiates the generation of a downloadable hospital-specific report (Admin panel).
 * @param {object} params - Query parameters (e.g., { format: 'pdf', reportType: 'APPOINTMENT_DETAIL', startDate?, endDate? })
 * @returns {Promise<object>} Response data { success, message, report: { fileName } }
 */
const generateAdminHospitalReport = async (params = {}) => {
  const response = await api.get("/admin/generate-report", { params });
  return response.data;
};

/**
 * Initiates the generation of a downloadable system-wide report (SuperAdmin panel).
 * @param {object} params - Query parameters (e.g., { format: 'pdf', reportType: 'SYSTEM_OVERVIEW', startDate?, endDate? })
 * @returns {Promise<object>} Response data { success, message, report: { fileName } }
 */
const generateSystemReport = async (params = {}) => {
  // --- CORRECTED ENDPOINT ---
  const response = await api.get("/super-admin/reports/generate", { params });
  return response.data;
};

/**
 * Constructs the full download URL for a generated report.
 * @param {string} fileName - The filename received from the generate report API call.
 * @param {string} userRole - The role of the current user ('admin' or 'superAdmin').
 * @returns {string|null} The full URL for downloading the report, or null if role is invalid.
 */
const getReportDownloadUrl = (fileName, userRole) => {
  if (!fileName) return null;

  const baseDownloadUrl = `${config.backendUrl}/api`;

  if (userRole === ROLES.ADMIN) {
    return `${baseDownloadUrl}/admin/reports/download/${encodeURIComponent(
      fileName
    )}`;
  } else if (userRole === ROLES.SUPER_ADMIN) {
    // <-- ADDED SUPER ADMIN CASE
    return `${baseDownloadUrl}/super-admin/reports/download/${encodeURIComponent(
      fileName
    )}`;
  } else {
    console.error("Invalid user role for report download URL generation.");
    return null;
  }
};

export default {
  getAdminReportData,
  generateAdminHospitalReport,
  generateSystemReport,
  getReportDownloadUrl,
};
