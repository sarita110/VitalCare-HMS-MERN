// src/controllers/sharedController.js
import MedicalRecord from "../models/MedicalRecord.js";
import LabTest from "../models/LabTest.js";
import RadiologyReport from "../models/RadiologyReport.js";
import Appointment from "../models/Appointment.js";
import Patient from "../models/Patient.js"; // Needed if patient isn't attached by middleware

/**
 * Get medical history for a specific patient (accessible by Doctor/Receptionist of same hospital).
 * Similar to doctorController.getPatientMedicalHistory but intended for shared access.
 * @route GET /api/shared/patients/:id/medical-history
 * @access Private (Doctor, Receptionist - verified by middleware)
 */
export const getPatientMedicalHistoryShared = async (req, res) => {
  try {
    const patientId = req.params.id; // Patient Model ID
    // Optional: Get patient profile if not attached by middleware
    // const patient = req.targetPatient || await Patient.findById(patientId);
    // if (!patient) return res.status(404)...

    // Assuming middleware verified access and patient exists

    // Fetch records for the patient
    // Note: No hospitalId filter needed here if middleware already checked hospital relationship
    const medicalRecords = await MedicalRecord.find({ patientId })
      .sort({ date: -1 })
      .populate({
        // Populate doctor info if needed
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      });

    // Optionally fetch other history types if needed for referrals (e.g., tests)
    // const labTests = await LabTest.find({ patientId })...
    // const radiologyTests = await RadiologyReport.find({ patientId })...

    res.status(200).json({
      success: true,
      // Structure the response consistently, e.g., matching doctor's endpoint
      medicalHistory: {
        records: medicalRecords,
        // labTests,
        // radiologyTests,
      },
    });
  } catch (error) {
    console.error("Get shared patient medical history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get patient medical history",
      error: error.message,
    });
  }
};

export default {
  getPatientMedicalHistoryShared,
};
