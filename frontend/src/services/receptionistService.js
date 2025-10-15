// src/services/receptionistService.js
import api from "./api";

// --- Dashboard ---
export const getReceptionistDashboard = async () => {
  const response = await api.get("/receptionist/dashboard");
  return response.data; // { success, dashboardData }
};

// --- Profile ---
export const getReceptionistProfile = async () => {
  const response = await api.get("/receptionist/profile");
  return response.data; // { success, profile }
};

export const updateReceptionistProfile = async (formData) => {
  // Requires Content-Type: multipart/form-data if image is included
  const response = await api.put("/receptionist/profile", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data; // { success, message, profile }
};

// --- Patient Management ---
export const registerPatient = async (formData) => {
  // Requires Content-Type: multipart/form-data if image is included
  const response = await api.post("/receptionist/patients/register", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data; // { success, message, patient }
};

export const getReceptionistPatients = async (params = {}) => {
  // { page, limit, search }
  const response = await api.get("/receptionist/patients", { params });
  return response.data; // { success, patients, pagination }
};

export const getReceptionistPatientDetails = async (id) => {
  const response = await api.get(`/receptionist/patients/${id}`);
  return response.data; // { success, patient, patientData }
};

export const updateReceptionistPatientDetails = async (id, formData) => {
  // Requires Content-Type: multipart/form-data if image is included
  const response = await api.put(`/receptionist/patients/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data; // { success, message, patient }
};

// --- Appointment Management ---
export const bookReceptionistAppointment = async (appointmentData) => {
  const response = await api.post(
    "/receptionist/appointments",
    appointmentData
  );
  return response.data; // { success, message, appointment }
};

export const getReceptionistAppointments = async (params = {}) => {
  // { page, limit, status, date, doctorId, patientId, search }
  const response = await api.get("/receptionist/appointments", { params });
  return response.data; // { success, appointments, pagination }
};

export const updateReceptionistAppointment = async (id, appointmentData) => {
  const response = await api.put(
    `/receptionist/appointments/${id}`,
    appointmentData
  );
  return response.data; // { success, message, appointment }
};

export const cancelReceptionistAppointment = async (id, reasonData) => {
  // { reason: '...' }
  const response = await api.put(
    `/receptionist/appointments/${id}/cancel`,
    reasonData
  );
  return response.data; // { success, message, appointment }
};

// --- Doctor Availability ---
export const getDoctorsForReceptionist = async (params = {}) => {
  // { speciality, available, departmentId }
  const response = await api.get("/receptionist/doctors", { params });
  return response.data; // { success, doctors }
};

export const getDoctorAvailabilityForReceptionist = async (id, params = {}) => {
  // { date }
  const response = await api.get(`/receptionist/doctors/${id}/availability`, {
    params,
  });
  return response.data; // { success, doctor, availableSlots }
};

// --- Payments ---
// processCashPayment is in paymentService.js

export const getReceptionistPayments = async (params = {}) => {
  // { page, limit, status, patientId, paymentMethod, search }
  const response = await api.get("/receptionist/payments", { params });
  return response.data; // { success, payments, pagination }
};

// --- Reports & Referrals ---
export const uploadReport = async (formData) => {
  // Requires Content-Type: multipart/form-data
  const response = await api.post("/receptionist/upload-report", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data; // { success, message, medicalRecord }
};

export const createReceptionistReferral = async (referralData) => {
  const response = await api.post("/receptionist/referrals", referralData);
  return response.data; // { success, message, referral }
};

export const getReceptionistReferrals = async (params = {}) => {
  // { page, limit, direction, status, patientId }
  const response = await api.get("/receptionist/referrals", { params });
  return response.data; // { success, referrals, pagination }
};

export const getReferralMedicalRecords = async (referralId) => {
  const response = await api.get(
    `/receptionist/referrals/${referralId}/records`
  );
  return response.data; // { success, records }
};

export default {
  getReceptionistDashboard,
  getReceptionistProfile,
  updateReceptionistProfile,
  registerPatient,
  getReceptionistPatients,
  getReceptionistPatientDetails,
  updateReceptionistPatientDetails,
  bookReceptionistAppointment,
  getReceptionistAppointments,
  updateReceptionistAppointment,
  cancelReceptionistAppointment,
  getDoctorsForReceptionist,
  getDoctorAvailabilityForReceptionist,
  getReceptionistPayments,
  uploadReport,
  createReceptionistReferral,
  getReceptionistReferrals,
  getReferralMedicalRecords,
};
