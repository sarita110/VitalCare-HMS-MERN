// services/doctorService.js

import api from "./api";

// --- Dashboard ---
export const getDoctorDashboard = async () => {
  const response = await api.get("/doctor/dashboard");
  return response.data; // { success, dashboardData }
};

// --- Profile ---
export const getDoctorProfile = async () => {
  const response = await api.get("/doctor/profile");
  return response.data; // { success, profile }
};

export const updateDoctorProfile = async (formData) => {
  const response = await api.put("/doctor/profile", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data; // { success, message, profile }
};

export const toggleDoctorAvailability = async () => {
  const response = await api.put("/doctor/availability");
  return response.data; // { success, message, available }
};

// --- Appointments ---
export const getDoctorAppointments = async (params = {}) => {
  const response = await api.get("/doctor/appointments", { params });
  return response.data; // { success, appointments, pagination }
};

export const getDoctorAppointmentDetails = async (id) => {
  const response = await api.get(`/doctor/appointments/${id}`);
  return response.data; // { success, appointment, patientData }
};

export const completeAppointment = async (id, data) => {
  const response = await api.put(`/doctor/appointments/${id}/complete`, data);
  return response.data; // { success, message, appointment }
};

export const cancelDoctorAppointment = async (id, reasonData) => {
  const response = await api.put(
    `/doctor/appointments/${id}/cancel`,
    reasonData
  );
  return response.data; // { success, message, appointment }
};

// --- Patients ---
export const getDoctorPatients = async (params = {}) => {
  const response = await api.get("/doctor/patients", { params });
  return response.data; // { success, patients, pagination }
};

export const getDoctorPatientDetails = async (id) => {
  const response = await api.get(`/doctor/patients/${id}`);
  return response.data; // { success, patient, medicalData }
};

export const getPatientMedicalHistoryForDoctor = async (id) => {
  const response = await api.get(`/doctor/patients/${id}/medical-history`);
  return response.data; // { success, medicalHistory }
};

// --- Medical Records ---
export const createMedicalRecord = async (recordData) => {
  const response = await api.post("/doctor/medical-records", recordData);
  return response.data; // { success, message, medicalRecord }
};

export const getPatientMedicalRecords = async (params = {}) => {
  const response = await api.get("/doctor/medical-records", { params });
  return response.data; // { success, medicalRecords, pagination }
};

// --- Lab & Radiology ---
export const requestLabTest = async (testData) => {
  const response = await api.post("/doctor/lab-tests", testData);
  return response.data; // { success, message, labTest, cost }
};

export const requestRadiologyTest = async (testData) => {
  const response = await api.post("/doctor/radiology-tests", testData);
  return response.data; // { success, message, radiologyTest, cost }
};

export const getDoctorLabResults = async (params = {}) => {
  const response = await api.get("/doctor/lab-results", { params });
  return response.data; // { success, labTests, pagination }
};

export const getDoctorRadiologyResults = async (params = {}) => {
  const response = await api.get("/doctor/radiology-results", { params });
  return response.data; // { success, radiologyTests, pagination }
};

// --- Referrals ---
export const createReferral = async (referralData) => {
  const response = await api.post("/doctor/referrals", referralData);
  return response.data; // { success, message, referral }
};

export const getDoctorReferrals = async (params = {}) => {
  const response = await api.get("/doctor/referrals", { params });
  return response.data; // { success, referrals, pagination }
};

export const getPatientRecordsForReferral = async (patientId) => {
  const response = await api.get(`/doctor/patients/${patientId}/records`);
  return response.data; // { success, records }
};

export default {
  getDoctorDashboard,
  getDoctorProfile,
  updateDoctorProfile,
  toggleDoctorAvailability,
  getDoctorAppointments,
  getDoctorAppointmentDetails,
  completeAppointment,
  cancelDoctorAppointment,
  getDoctorPatients,
  getDoctorPatientDetails,
  getPatientMedicalHistoryForDoctor,
  createMedicalRecord,
  getPatientMedicalRecords,
  requestLabTest,
  requestRadiologyTest,
  getDoctorLabResults,
  getDoctorRadiologyResults,
  createReferral,
  getDoctorReferrals,
  getPatientRecordsForReferral,
};
