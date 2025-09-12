// src/services/patientService.js
import api from "./api";

// --- Dashboard ---
export const getPatientDashboard = async () => {
  const response = await api.get("/patient/dashboard");
  return response.data;
};

// --- Profile ---
export const getPatientProfile = async () => {
  const response = await api.get("/patient/profile");
  return response.data;
};

export const updatePatientProfile = async (formData) => {
  const response = await api.put("/patient/profile", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

// --- Appointments ---
export const bookAppointment = async (appointmentData) => {
  // Backend will derive hospitalId from doctorId for patient bookings
  const response = await api.post("/patient/appointments", appointmentData);
  return response.data;
};

export const getPatientAppointments = async (params = {}) => {
  // Accepts hospitalId for filtering
  const response = await api.get("/patient/appointments", { params });
  return response.data;
};

export const getPatientAppointmentDetails = async (id) => {
  const response = await api.get(`/patient/appointments/${id}`);
  return response.data;
};

export const cancelPatientAppointment = async (id, reasonData) => {
  const response = await api.put(
    `/patient/appointments/${id}/cancel`,
    reasonData
  );
  return response.data;
};

export const reschedulePatientAppointment = async (id, rescheduleData) => {
  const response = await api.put(
    `/patient/appointments/${id}/reschedule`,
    rescheduleData
  );
  return response.data;
};

// --- Doctors ---
export const getDoctorsForPatient = async (params = {}) => {
  // Accepts hospitalId for filtering doctors by a specific hospital
  const response = await api.get("/patient/doctors", { params });
  return response.data;
};

export const getDoctorDetailsForPatient = async (id) => {
  const response = await api.get(`/patient/doctors/${id}`);
  return response.data;
};

// --- Medical Data (Patient's Own View) ---
export const getPatientMedicalRecords = async (params = {}) => {
  // Accepts hospitalId for filtering
  const response = await api.get("/patient/medical-records", { params });
  return response.data;
};

export const getMedicalRecordsForPatient = async (patientId, params = {}) => {
  // This is more for staff/doctor use, but kept for consistency
  if (!patientId) throw new Error("Patient ID is required to fetch records.");
  const response = await api.get(
    `/shared/patients/${patientId}/medical-history`, // Uses shared endpoint
    { params }
  );
  if (response.data.success && response.data.medicalHistory) {
    return {
      success: true,
      records: response.data.medicalHistory.records || [],
    };
  } else {
    return {
      success: false,
      records: [],
      message: response.data.message || "Failed to fetch records",
    };
  }
};

export const getPatientLabResults = async (params = {}) => {
  // Accepts hospitalId for filtering
  const response = await api.get("/patient/lab-results", { params });
  return response.data;
};

export const getPatientRadiologyResults = async (params = {}) => {
  // Accepts hospitalId for filtering
  const response = await api.get("/patient/radiology-results", { params });
  return response.data;
};

export const getPatientPrescriptions = async (params = {}) => {
  // Accepts hospitalId for filtering
  const response = await api.get("/patient/prescriptions", { params });
  return response.data;
};

// --- Payments ---
export const getPatientPaymentHistory = async (params = {}) => {
  // Accepts hospitalId for filtering
  const response = await api.get("/patient/payments", { params });
  return response.data;
};

export default {
  getPatientDashboard,
  getPatientProfile,
  updatePatientProfile,
  bookAppointment,
  getPatientAppointments,
  getPatientAppointmentDetails,
  cancelPatientAppointment,
  reschedulePatientAppointment,
  getDoctorsForPatient,
  getDoctorDetailsForPatient,
  getMedicalRecordsForPatient,
  getPatientMedicalRecords,
  getPatientLabResults,
  getPatientRadiologyResults,
  getPatientPrescriptions,
  getPatientPaymentHistory,
};
