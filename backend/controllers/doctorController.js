import Doctor from "../models/Doctor.js";
import User from "../models/User.js";
import Patient from "../models/Patient.js";
import Appointment from "../models/Appointment.js";
import MedicalRecord from "../models/MedicalRecord.js";
import LabTest from "../models/LabTest.js";
import LabReport from "../models/LabReport.js";
import RadiologyReport from "../models/RadiologyReport.js";
import Referral from "../models/Referral.js";
import Hospital from "../models/Hospital.js";
import { v2 as cloudinary } from "cloudinary";
import emailService from "../services/emailService.js";
import notificationService from "../services/notificationService.js";
import { formatSlotDate } from "../utils/helpers.js";
import {
  LAB_TEST_COSTS,
  LAB_TEST_TYPES,
  RADIOLOGY_COSTS,
} from "../utils/constants.js";
import mongoose from "mongoose";

/**
 * Get doctor dashboard data
 * @route GET /api/doctor/dashboard
 * @access Private (Doctor)
 */
export const getDashboard = async (req, res) => {
  try {
    const doctor = req.doctor;
    const hospitalId = req.user.hospital;

    // Get today's appointments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAppointments = await Appointment.find({
      doctorId: doctor._id,
      dateTime: {
        $gte: today,
        $lt: tomorrow,
      },
    })
      .sort({ dateTime: 1 })
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email image" },
      });

    // Get upcoming appointments (next 7 days)
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingAppointments = await Appointment.find({
      doctorId: doctor._id,
      dateTime: {
        $gt: tomorrow,
        $lt: nextWeek,
      },
      status: { $in: ["scheduled", "confirmed"] },
    })
      .sort({ dateTime: 1 })
      .limit(5)
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email image" },
      });

    // Get total statistics
    const totalAppointments = await Appointment.countDocuments({
      doctorId: doctor._id,
    });

    const completedAppointments = await Appointment.countDocuments({
      doctorId: doctor._id,
      status: "completed",
    });

    // Get recent medical records
    const recentRecords = await MedicalRecord.find({
      doctorId: doctor._id,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name" },
      });

    // Get pending lab and radiology tests
    const pendingLabTests = await LabTest.countDocuments({
      doctorId: doctor._id,
      status: { $nin: ["completed", "cancelled"] },
    });

    const pendingRadiologyTests = await RadiologyReport.countDocuments({
      doctorId: doctor._id,
      status: { $nin: ["completed", "cancelled"] },
    });

    // Calculate completion rate
    const completionRate =
      totalAppointments > 0
        ? (completedAppointments / totalAppointments) * 100
        : 0;

    res.status(200).json({
      success: true,
      dashboardData: {
        todayAppointments,
        upcomingAppointments,
        stats: {
          totalAppointments,
          completedAppointments,
          pendingLabTests,
          pendingRadiologyTests,
          completionRate: completionRate.toFixed(2),
        },
        recentRecords,
      },
    });
  } catch (error) {
    console.error("Doctor dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get dashboard data",
      error: error.message,
    });
  }
};

/**
 * Get doctor profile
 * @route GET /api/doctor/profile
 * @access Private (Doctor)
 */
export const getProfile = async (req, res) => {
  try {
    const doctor = req.doctor;

    // Get user data
    const user = await User.findById(doctor.userId)
      .select("-password")
      .populate("department", "name");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    // Get hospital data
    const hospital = await Hospital.findById(user.hospital).select(
      "name address"
    );

    res.status(200).json({
      success: true,
      profile: {
        ...doctor.toObject(),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          image: user.image,
          department: user.department,
        },
        hospital,
      },
    });
  } catch (error) {
    console.error("Get doctor profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get doctor profile",
      error: error.message,
    });
  }
};

/**
 * Update doctor profile
 * @route PUT /api/doctor/profile
 * @access Private (Doctor)
 */
export const updateProfile = async (req, res) => {
  try {
    const doctor = req.doctor;
    const { about, fees, available, workingHours, consultationTime } = req.body;

    // Get user
    const user = await User.findById(doctor.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    // Upload profile image if provided
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "doctors",
        resource_type: "image",
      });
      user.image = result.secure_url;
      await user.save();
    }

    // Update doctor profile fields
    if (about !== undefined) doctor.about = about;
    if (fees !== undefined) doctor.fees = Number(fees);
    if (available !== undefined) doctor.available = available;
    if (workingHours) doctor.workingHours = JSON.parse(workingHours);
    if (consultationTime) doctor.consultationTime = Number(consultationTime);

    await doctor.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      profile: {
        ...doctor.toObject(),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          image: user.image,
        },
      },
    });
  } catch (error) {
    console.error("Update doctor profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

/**
 * Toggle doctor availability
 * @route PUT /api/doctor/availability
 * @access Private (Doctor)
 */
export const toggleAvailability = async (req, res) => {
  try {
    const doctor = req.doctor;

    // Toggle availability
    doctor.available = !doctor.available;
    await doctor.save();

    res.status(200).json({
      success: true,
      message: `You are now ${
        doctor.available ? "available" : "unavailable"
      } for appointments`,
      available: doctor.available,
    });
  } catch (error) {
    console.error("Toggle availability error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update availability",
      error: error.message,
    });
  }
};

/**
 * Get doctor appointments
 * @route GET /api/doctor/appointments
 * @access Private (Doctor)
 */
export const getAppointments = async (req, res) => {
  try {
    const doctor = req.doctor;
    const {
      page = 1,
      limit = 10,
      status,
      date,
      search,
      sortBy = "dateTime",
      sortOrder = "asc",
    } = req.query;

    // Build query
    const query = { doctorId: doctor._id };

    if (status) {
      query.status = status;
    }

    if (date) {
      const selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0);

      const nextDay = new Date(selectedDate);
      nextDay.setDate(selectedDate.getDate() + 1);

      query.dateTime = {
        $gte: selectedDate,
        $lt: nextDay,
      };
    }

    // Handle search
    if (search) {
      // Find patients with matching names
      const patients = await Patient.find()
        .populate({
          path: "userId",
          match: { name: { $regex: search, $options: "i" } },
          select: "_id",
        })
        .select("_id")
        .lean();

      const matchingPatientIds = patients
        .filter((p) => p.userId) // Filter out patients whose user didn't match
        .map((p) => p._id);

      if (matchingPatientIds.length > 0) {
        query.patientId = { $in: matchingPatientIds };
      } else {
        // If no patients match, search in appointment fields
        query.$or = [
          { reason: { $regex: search, $options: "i" } },
          { notes: { $regex: search, $options: "i" } },
        ];
      }
    }

    // Determine sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Count total matching appointments
    const total = await Appointment.countDocuments(query);

    // Get paginated appointments
    const appointments = await Appointment.find(query)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email image" },
      });

    res.status(200).json({
      success: true,
      appointments,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error("Get doctor appointments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get appointments",
      error: error.message,
    });
  }
};

/**
 * Get appointment details
 * @route GET /api/doctor/appointments/:id
 * @access Private (Doctor)
 */
export const getAppointmentDetails = async (req, res) => {
  try {
    const doctor = req.doctor;
    const { id } = req.params;

    // Validate appointment ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid appointment ID" });
    }

    // Find appointment
    const appointment = await Appointment.findOne({
      _id: id,
      doctorId: doctor._id,
    }).populate({
      path: "patientId",
      populate: { path: "userId", select: "name email image phone" },
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Get patient's medical history
    const medicalRecords = await MedicalRecord.find({
      patientId: appointment.patientId._id,
      doctorId: doctor._id,
    }).sort({ date: -1 });

    // Get lab tests for this patient by this doctor
    const labTests = await LabTest.find({
      patientId: appointment.patientId._id,
      doctorId: doctor._id,
    }).sort({ requestDate: -1 });

    // Get radiology tests for this patient by this doctor
    const radiologyTests = await RadiologyReport.find({
      patientId: appointment.patientId._id,
      doctorId: doctor._id,
    }).sort({ requestDate: -1 });

    res.status(200).json({
      success: true,
      appointment,
      patientData: {
        medicalRecords,
        labTests,
        radiologyTests,
      },
    });
  } catch (error) {
    console.error("Get appointment details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get appointment details",
      error: error.message,
    });
  }
};

/**
 * Complete appointment
 * @route PUT /api/doctor/appointments/:id/complete
 * @access Private (Doctor)
 */
export const completeAppointment = async (req, res) => {
  try {
    const doctor = req.doctor;
    const { id } = req.params;
    const { notes } = req.body;

    // Find appointment
    const appointment = await Appointment.findOne({
      _id: id,
      doctorId: doctor._id,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check and potentially auto-cancel before proceeding
    appointment = await handleExpiredPendingPayment(id);

    // Check if appointment can be completed
    if (appointment.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot complete a cancelled appointment",
      });
    }

    if (appointment.status === "completed") {
      return res.status(400).json({
        success: false,
        message:
          "Appointment is already completed (may be due to non-payment).",
      });
    }

    // Update appointment
    appointment.status = "completed";
    if (notes) {
      appointment.notes = notes;
    }
    await appointment.save();

    // Notify patient
    await notificationService.createAppointmentNotification({
      appointment,
      recipient: await User.findById(
        (
          await Patient.findById(appointment.patientId)
        ).userId
      ),
      action: "completed",
    });

    res.status(200).json({
      success: true,
      message: "Appointment completed successfully",
      appointment,
    });
  } catch (error) {
    console.error("Complete appointment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete appointment",
      error: error.message,
    });
  }
};

/**
 * Cancel appointment
 * @route PUT /api/doctor/appointments/:id/cancel
 * @access Private (Doctor)
 */
export const cancelAppointment = async (req, res) => {
  try {
    const doctor = req.doctor;
    const { id } = req.params;
    const { reason } = req.body;

    // Find appointment
    const appointment = await Appointment.findOne({
      _id: id,
      doctorId: doctor._id,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check if appointment can be cancelled
    if (appointment.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Appointment is already cancelled",
      });
    }

    if (appointment.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a completed appointment",
      });
    }

    // Update appointment
    appointment.status = "cancelled";
    appointment.notes = reason
      ? `${appointment.notes || ""}\nCancellation reason: ${reason}`
      : appointment.notes;
    await appointment.save();

    // Release the time slot
    const date = new Date(appointment.dateTime);
    const slotDate = formatSlotDate(date);
    const slotTime = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Remove booked slot
    if (doctor.slots_booked[slotDate]) {
      doctor.slots_booked[slotDate] = doctor.slots_booked[slotDate].filter(
        (time) => time !== slotTime
      );
      doctor.markModified("slots_booked");
      await doctor.save();
    }

    // Notify patient
    const patient = await Patient.findById(appointment.patientId);
    const patientUser = await User.findById(patient.userId);

    await notificationService.createAppointmentNotification({
      appointment,
      recipient: patientUser,
      action: "cancelled",
    });

    // Send email notification
    await emailService.sendEmail({
      to: patientUser.email,
      subject: "Appointment Cancelled",
      html: `
          <p>Hello ${patientUser.name},</p>
          <p>Your appointment scheduled for ${new Date(
            appointment.dateTime
          ).toLocaleString()} has been cancelled by Dr. ${req.user.name}.</p>
          ${reason ? `<p>Reason: ${reason}</p>` : ""}
          <p>If you have any questions, please contact the hospital.</p>
        `,
    });

    res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully",
      appointment,
    });
  } catch (error) {
    console.error("Cancel appointment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel appointment",
      error: error.message,
    });
  }
};

/**
 * Get patients
 * @route GET /api/doctor/patients
 * @access Private (Doctor)
 */
export const getPatients = async (req, res) => {
  try {
    const doctor = req.doctor;
    const hospitalId = req.user.hospital;
    const { page = 1, limit = 10, search } = req.query;

    // Find all patients who had appointments with this doctor
    const appointmentsWithDoctor = await Appointment.find({
      doctorId: doctor._id,
    }).distinct("patientId");

    // Build query
    const query = {
      _id: { $in: appointmentsWithDoctor },
      hospitalId,
    };

    // Handle search
    if (search) {
      // Find users with matching names or emails
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
        role: "patient",
      }).select("_id");

      const userIds = users.map((user) => user._id);

      if (userIds.length > 0) {
        query.userId = { $in: userIds };
      } else {
        // If no users match, add other criteria to return no results
        query._id = null;
      }
    }

    // Count total patients
    const total = await Patient.countDocuments(query);

    // Get paginated patients
    const patients = await Patient.find(query)
      .sort({ registrationDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("userId", "name email image phone");

    // Get appointment counts for each patient
    const patientData = await Promise.all(
      patients.map(async (patient) => {
        const appointmentsCount = await Appointment.countDocuments({
          doctorId: doctor._id,
          patientId: patient._id,
        });

        const lastAppointment = await Appointment.findOne({
          doctorId: doctor._id,
          patientId: patient._id,
        }).sort({ dateTime: -1 });

        return {
          ...patient.toObject(),
          appointmentsCount,
          lastAppointment: lastAppointment ? lastAppointment.dateTime : null,
        };
      })
    );

    res.status(200).json({
      success: true,
      patients: patientData,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error("Get patients error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get patients",
      error: error.message,
    });
  }
};

/**
 * Get patient details
 * @route GET /api/doctor/patients/:id
 * @access Private (Doctor)
 */
export const getPatientDetails = async (req, res) => {
  try {
    const doctor = req.doctor;
    const { id } = req.params;

    // Find patient
    const patient = await Patient.findById(id).populate(
      "userId",
      "name email image phone"
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Validate doctor has treated this patient
    const appointmentExists = await Appointment.exists({
      doctorId: doctor._id,
      patientId: patient._id,
    });

    if (!appointmentExists) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this patient's records",
      });
    }

    // Get appointments with this doctor
    const appointments = await Appointment.find({
      doctorId: doctor._id,
      patientId: patient._id,
    }).sort({ dateTime: -1 });

    // Get medical records created by this doctor
    const medicalRecords = await MedicalRecord.find({
      doctorId: doctor._id,
      patientId: patient._id,
    }).sort({ date: -1 });

    // Get lab and radiology tests requested by this doctor
    const labTests = await LabTest.find({
      doctorId: doctor._id,
      patientId: patient._id,
    }).sort({ requestDate: -1 });

    const radiologyTests = await RadiologyReport.find({
      doctorId: doctor._id,
      patientId: patient._id,
    }).sort({ requestDate: -1 });

    res.status(200).json({
      success: true,
      patient,
      medicalData: {
        appointments,
        medicalRecords,
        labTests,
        radiologyTests,
      },
    });
  } catch (error) {
    console.error("Get patient details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get patient details",
      error: error.message,
    });
  }
};

/**
 * Get patient medical history
 * @route GET /api/doctor/patients/:id/medical-history
 * @access Private (Doctor)
 */
export const getPatientMedicalHistory = async (req, res) => {
  try {
    const doctor = req.doctor;
    const hospitalId = req.user.hospital;
    const { id } = req.params;

    // Find patient
    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Validate doctor has treated this patient
    const appointmentExists = await Appointment.exists({
      doctorId: doctor._id,
      patientId: patient._id,
    });

    if (!appointmentExists) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this patient's records",
      });
    }

    // Get all medical records for this patient (from all doctors in this hospital)
    const medicalRecords = await MedicalRecord.find({
      patientId: patient._id,
      hospitalId,
    })
      .sort({ date: -1 })
      .populate("doctorId", "userId")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      });

    // Get all lab tests for this patient
    const labTests = await LabTest.find({
      patientId: patient._id,
      hospitalId,
    })
      .sort({ requestDate: -1 })
      .populate("doctorId", "userId")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      })
      .populate("resultId");

    // Get all radiology tests for this patient
    const radiologyTests = await RadiologyReport.find({
      patientId: patient._id,
      hospitalId,
    })
      .sort({ requestDate: -1 })
      .populate("doctorId", "userId")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      });

    // Get all prescriptions as a subset of medical records
    const prescriptions = medicalRecords.filter(
      (record) =>
        record.type === "prescription" &&
        record.prescriptions &&
        record.prescriptions.length > 0
    );

    res.status(200).json({
      success: true,
      medicalHistory: {
        records: medicalRecords,
        labTests,
        radiologyTests,
        prescriptions,
      },
    });
  } catch (error) {
    console.error("Get patient medical history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get patient medical history",
      error: error.message,
    });
  }
};

/**
 * @desc    Create a new medical record for a patient
 * @route   POST /api/doctor/medical-records
 * @access  Private (Doctor)
 */
export const createMedicalRecord = async (req, res) => {
  try {
    // 1. Extract Data and Context
    const doctor = req.doctor;
    const user = req.user;
    const hospitalId = user.hospital;
    const {
      patientId,
      appointmentId,
      type,
      diagnosis,
      symptoms, // <<< RECEIVED AS ARRAY FROM FRONTEND NOW
      treatment,
      notes,
      prescriptions, // <<< RECEIVED AS ARRAY FROM FRONTEND NOW
    } = req.body;

    // 2. Input Validation (Basic)
    if (!patientId || !type || !doctor?._id || !hospitalId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: patientId, type.",
      });
    }
    if (type !== "other" && !diagnosis) {
      return res.status(400).json({
        success: false,
        message: "Diagnosis is required for this record type.",
      });
    }
    if (!["diagnosis", "surgery", "follow-up", "other"].includes(type)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid record type specified." });
    }

    // 3. Authorization & Patient Validation
    const patient = await Patient.findById(patientId).select("userId").lean();
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found.",
      });
    }

    // Authorization: Verify doctor can create record for this patient
    if (appointmentId) {
      const validAppointment = await Appointment.exists({
        _id: appointmentId,
        doctorId: doctor._id,
        patientId: patientId,
      });
      if (!validAppointment) {
        return res.status(403).json({
          success: false,
          message:
            "Appointment ID provided is invalid or does not belong to you for this patient.",
        });
      }
    } else {
      const previousAppointmentExists = await Appointment.exists({
        doctorId: doctor._id,
        patientId: patientId,
      });
      if (!previousAppointmentExists) {
        return res.status(403).json({
          success: false,
          message:
            "You have no prior appointments with this patient and no specific appointment was linked.",
        });
      }
    }

    // 4. Prepare Data for Creation
    // --- MODIFICATION START ---
    // REMOVE the .split() call. Use the received array directly.
    // Add check to ensure it's an array, default to empty if not.
    const symptomsArray = Array.isArray(symptoms) ? symptoms : [];
    const prescriptionsArray = Array.isArray(prescriptions)
      ? prescriptions
      : [];
    // --- MODIFICATION END ---

    // 5. Create Initial Medical Record
    console.log("[MedicalRecord Create] Creating initial record...");
    const medicalRecord = new MedicalRecord({
      patientId,
      hospitalId,
      appointmentId: appointmentId || null,
      doctorId: doctor._id,
      type,
      date: new Date(),
      diagnosis: diagnosis || null,
      symptoms: symptomsArray, // <<< USE THE ARRAY DIRECTLY
      treatment: treatment || null,
      notes: notes || null,
      prescriptions: prescriptionsArray, // <<< USE THE ARRAY DIRECTLY
      labTests: [],
      radiologyTests: [],
      createdBy: user._id,
    });

    // 6. Handle Appointment Linking (Conditional Test Linking)
    let needsSaveAgain = false;
    if (appointmentId) {
      console.log(
        `[MedicalRecord Create] Checking tests for appointmentId: ${appointmentId}`
      );

      const linkedLabTests = await LabTest.find({
        appointmentId: appointmentId,
      })
        .select("_id")
        .lean();
      console.log(
        `[MedicalRecord Create] Found ${linkedLabTests.length} linked lab tests.`
      );
      if (linkedLabTests.length > 0) {
        medicalRecord.labTests = linkedLabTests.map((test) => ({
          testId: test._id,
        }));
        needsSaveAgain = true;
      }

      const linkedRadiologyReports = await RadiologyReport.find({
        appointmentId: appointmentId,
      })
        .select("_id procedureType bodyPart")
        .lean();
      console.log(
        `[MedicalRecord Create] Found ${linkedRadiologyReports.length} linked radiology reports.`
      );
      if (linkedRadiologyReports.length > 0) {
        medicalRecord.radiologyTests = linkedRadiologyReports.map((report) => ({
          type: report.procedureType,
          description: report.bodyPart,
          reportId: report._id,
        }));
        needsSaveAgain = true;
      }
    }

    // 7. Save the Record
    console.log(
      `[MedicalRecord Create] Attempting to save record... Needs second save: ${needsSaveAgain}`
    );
    await medicalRecord.save();
    console.log(
      `[MedicalRecord Create] Record saved successfully. ID: ${medicalRecord._id}`
    );

    // 8. Send Notification
    if (patient.userId) {
      const doctorUser = await User.findById(user._id).select("name").lean();
      const doctorName = doctorUser?.name || "Your Doctor";

      console.log(
        `[MedicalRecord Create] Sending notification to patient user: ${patient.userId}`
      );
      try {
        await notificationService.createNotification({
          recipientId: patient.userId,
          type: type === "prescription" ? "prescription" : "medical-record",
          title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Added`,
          message: `Dr. ${doctorName} has added a new ${type} record related to your recent consultation.`,
          relatedTo: {
            model: "MedicalRecord",
            id: medicalRecord._id,
          },
          isEmail: true,
        });
        console.log(`[MedicalRecord Create] Notification sent successfully.`);
      } catch (notificationError) {
        console.error(
          `[MedicalRecord Create] Failed to send notification for record ${medicalRecord._id}:`,
          notificationError
        );
      }
    } else {
      console.log(
        `[MedicalRecord Create] Patient ${patientId} has no linked user account, skipping notification.`
      );
    }

    // 9. Send Success Response
    res.status(201).json({
      success: true,
      message: "Medical record created successfully",
      medicalRecord,
    });
  } catch (error) {
    // 10. Error Handling
    console.error("Create medical record error:", error); // Log the specific error

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed: " + messages.join(", "),
        errors: error.errors,
      });
    }

    // Send specific error for the TypeError
    if (error instanceof TypeError) {
      return res.status(500).json({
        success: false,
        message: "Internal server error processing input data.",
        // error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    // General server error
    res.status(500).json({
      success: false,
      message:
        "Failed to create medical record due to an internal server error.",
      // error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get medical records created by doctor
 * @route GET /api/doctor/medical-records
 * @access Private (Doctor)
 */
export const getMedicalRecords = async (req, res) => {
  try {
    const doctor = req.doctor;
    const hospitalId = req.user.hospital;
    const { page = 1, limit = 10, type, patientId, search } = req.query;

    // Build query
    const query = {
      doctorId: doctor._id,
      hospitalId,
    };

    if (type) {
      query.type = type;
    }

    if (patientId) {
      query.patientId = patientId;
    }

    // Handle search
    if (search) {
      // Find patients with matching names
      const patients = await Patient.find()
        .populate({
          path: "userId",
          match: { name: { $regex: search, $options: "i" } },
          select: "_id",
        })
        .select("_id")
        .lean();

      const matchingPatientIds = patients
        .filter((p) => p.userId) // Filter out patients whose user didn't match
        .map((p) => p._id);

      if (matchingPatientIds.length > 0) {
        query.patientId = { $in: matchingPatientIds };
      } else {
        // If no patients match, search in record fields
        query.$or = [
          { diagnosis: { $regex: search, $options: "i" } },
          { notes: { $regex: search, $options: "i" } },
        ];
      }
    }

    // Count total records
    const total = await MedicalRecord.countDocuments(query);

    // Get paginated records
    const medicalRecords = await MedicalRecord.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email image" },
      })
      .populate("appointmentId", "dateTime status")
      .lean();

    res.status(200).json({
      success: true,
      medicalRecords,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error("Get medical records error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get medical records",
      error: error.message,
    });
  }
};

/**
 * Request radiology test
 * @route POST /api/doctor/radiology-tests
 * @access Private (Doctor)
 */

export const requestRadiologyTest = async (req, res) => {
  try {
    const doctor = req.doctor;
    const hospitalId = req.user.hospital;
    const {
      patientId,
      appointmentId,
      procedureType,
      bodyPart,
      description,
      priority,
      notes,
      scheduledDate,
    } = req.body;

    // Validate that the procedure type is one of the allowed types
    if (!RADIOLOGY_COSTS[procedureType]) {
      return res.status(400).json({
        success: false,
        message: "Invalid procedure type",
        validProcedures: Object.keys(RADIOLOGY_COSTS),
      });
    }

    // Get the fixed cost for this procedure type
    const cost = RADIOLOGY_COSTS[procedureType];

    // Validate patient
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Validate doctor has treated this patient
    const appointmentExists = await Appointment.exists({
      doctorId: doctor._id,
      patientId,
    });
    if (!appointmentExists) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to request tests for this patient",
      });
    }

    // Create radiology test request with 'requested' status
    const radiologyTest = await RadiologyReport.create({
      hospitalId,
      patientId,
      doctorId: doctor._id,
      appointmentId: appointmentId || null,
      procedureType,
      bodyPart,
      requestDate: new Date(),
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      status: "requested", // <-- Ensure status is requested
      priority: priority || "routine",
      notes,
      payment: {
        status: "pending", // <-- Payment is pending
        amount: cost,
      },
      createdBy: req.user._id,
    });

    // If appointmentId is provided, add this test to the corresponding medical record
    if (appointmentId) {
      // Find existing medical record for this appointment
      const existingRecord = await MedicalRecord.findOne({ appointmentId });

      if (existingRecord) {
        // Update the medical record with this radiology test
        existingRecord.radiologyTests.push({
          type: procedureType,
          description: bodyPart,
          reportId: radiologyTest._id,
        });
        await existingRecord.save();
      }
      // Note: If no medical record exists yet, it will be added when the doctor
      // creates one for this appointment
    }

    // Notify patient about the request and required payment
    const patientUser = await User.findById(patient.userId);
    if (patientUser) {
      await notificationService.createNotification({
        recipientId: patientUser._id,
        type: "payment", // <-- Changed type to 'payment'
        title: "Payment Required for Radiology Test", // <-- Changed title
        message: `Dr. ${req.user.name} has requested a ${procedureType} for your ${bodyPart}. Payment of Rs ${cost} is required to proceed. Please visit the payments section.`, // <-- Updated message
        relatedTo: { model: "RadiologyReport", id: radiologyTest._id },
        isEmail: true,
        priority: "medium",
      });
    }

    res.status(201).json({
      success: true,
      message: "Radiology test requested successfully. Payment required.", // <-- Update message
      radiologyTest,
      cost,
    });
  } catch (error) {
    console.error("Request radiology test error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to request radiology test",
      error: error.message,
    });
  }
};

/**
 * Request lab test
 * @route POST /api/doctor/lab-tests
 * @access Private (Doctor)
 */

export const requestLabTest = async (req, res) => {
  try {
    const doctor = req.doctor;
    const hospitalId = req.user.hospital;
    const {
      patientId,
      appointmentId,
      testName,
      testType,
      description,
      instructions,
      priority,
      scheduledDate,
    } = req.body;

    // Validate that the test name is one of the allowed tests
    if (!LAB_TEST_COSTS[testName]) {
      return res.status(400).json({
        success: false,
        message: "Invalid test name",
        validTests: Object.keys(LAB_TEST_COSTS),
      });
    }

    // Validate that the test type is one of the allowed types
    if (!LAB_TEST_TYPES[testType]) {
      return res.status(400).json({
        success: false,
        message: "Invalid test type",
        validTypes: Object.keys(LAB_TEST_TYPES),
      });
    }

    // Get the fixed cost for this test
    const cost = LAB_TEST_COSTS[testName];

    // Validate patient
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Validate doctor has treated this patient
    const appointmentExists = await Appointment.exists({
      doctorId: doctor._id,
      patientId,
    });
    if (!appointmentExists) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to request tests for this patient",
      });
    }

    // Create lab test request with fixed cost
    const labTest = await LabTest.create({
      hospitalId,
      patientId,
      doctorId: doctor._id,
      appointmentId: appointmentId || null,
      testName,
      testType,
      description,
      instructions,
      priority: priority || "routine",
      requestDate: new Date(),
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      status: "requested", // <-- Ensure status is requested
      payment: {
        status: "pending", // <-- Payment is pending
        amount: cost,
      },
      createdBy: req.user._id,
    });

    // If appointmentId is provided, add this test to the corresponding medical record
    if (appointmentId) {
      // Find existing medical record for this appointment
      const existingRecord = await MedicalRecord.findOne({ appointmentId });

      if (existingRecord) {
        // Update the medical record with this lab test
        existingRecord.labTests.push({ testId: labTest._id });
        await existingRecord.save();
      }
      // Note: If no medical record exists yet, it will be added when the doctor
      // creates one for this appointment
    }

    // Notify patient
    const patientUser = await User.findById(patient.userId);
    if (patientUser) {
      await notificationService.createNotification({
        recipientId: patientUser._id,
        type: "payment", // <-- Changed type to 'payment'
        title: "Payment Required for Lab Test", // <-- Changed title
        message: `Dr. ${req.user.name} has requested a ${testName} lab test. Payment of Rs ${cost} is required to proceed. Please visit the payments section.`, // <-- Updated message
        relatedTo: { model: "LabTest", id: labTest._id },
        isEmail: true,
        priority: "medium",
      });
    }

    res.status(201).json({
      success: true,
      message: "Lab test requested successfully. Payment required.", // <-- Update message
      labTest,
      cost,
    });
  } catch (error) {
    console.error("Request lab test error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to request lab test",
      error: error.message,
    });
  }
};

/**
 * Get lab results
 * @route GET /api/doctor/lab-results
 * @access Private (Doctor)
 */
export const getLabResults = async (req, res) => {
  try {
    const doctor = req.doctor;
    const { page = 1, limit = 10, status, patientId } = req.query;

    // Build query
    const query = { doctorId: doctor._id };

    if (status) {
      query.status = status;
    }

    if (patientId) {
      query.patientId = patientId;
    }

    // Count total lab tests
    const total = await LabTest.countDocuments(query);

    // Get paginated lab tests
    const labTests = await LabTest.find(query)
      .sort({ requestDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email image" },
      })
      .populate("resultId");

    res.status(200).json({
      success: true,
      labTests,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error("Get lab results error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get lab results",
      error: error.message,
    });
  }
};

/**
 * Get radiology results
 * @route GET /api/doctor/radiology-results
 * @access Private (Doctor)
 */
export const getRadiologyResults = async (req, res) => {
  try {
    const doctor = req.doctor;
    const { page = 1, limit = 10, status, patientId } = req.query;

    // Build query
    const query = { doctorId: doctor._id };

    if (status) {
      query.status = status;
    }

    if (patientId) {
      query.patientId = patientId;
    }

    // Count total radiology tests
    const total = await RadiologyReport.countDocuments(query);

    // Get paginated radiology tests
    const radiologyTests = await RadiologyReport.find(query)
      .sort({ requestDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email image" },
      });

    res.status(200).json({
      success: true,
      radiologyTests,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error("Get radiology results error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get radiology results",
      error: error.message,
    });
  }
};

/**
 * Create referral
 * @route POST /api/doctor/referrals
 * @access Private (Doctor)
 */

/**
 * Get medical records for a patient (used in referral creation)
 * @route GET /api/doctor/patients/:id/records
 * @access Private (Doctor)
 */
export const getPatientRecordsForReferral = async (req, res) => {
  try {
    const doctor = req.doctor;
    const hospitalId = req.user.hospital;
    const { id: patientId } = req.params;

    // Validate doctor has treated this patient
    const appointmentExists = await Appointment.exists({
      doctorId: doctor._id,
      patientId,
    });

    if (!appointmentExists) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this patient's records",
      });
    }

    // Get all medical records for this patient from this hospital
    // that the doctor has created or the patient has shared
    const records = await MedicalRecord.find({
      patientId,
      hospitalId,
      $or: [
        { doctorId: doctor._id }, // Created by this doctor
        { isShared: true }, // Shared records within hospital
      ],
    })
      .sort({ date: -1 })
      .select("_id type date diagnosis notes doctorId labTests radiologyTests");

    res.status(200).json({
      success: true,
      records,
    });
  } catch (error) {
    console.error("Get patient records for referral error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get patient records",
      error: error.message,
    });
  }
};

export const createReferral = async (req, res) => {
  try {
    const doctor = req.doctor;
    const hospitalId = req.user.hospital;
    const {
      patientId,
      toHospitalId,
      reason,
      details,
      priority,
      medicalRecordIds,
    } = req.body;

    // Validate patient
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Validate doctor has treated this patient
    const appointmentExists = await Appointment.exists({
      doctorId: doctor._id,
      patientId,
    });
    if (!appointmentExists) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to refer this patient",
      });
    }

    // Validate destination hospital
    const toHospital = await Hospital.findById(toHospitalId);
    if (!toHospital) {
      return res.status(404).json({
        success: false,
        message: "Destination hospital not found",
      });
    }

    // Validate medical records if provided
    let records = [];
    if (medicalRecordIds && medicalRecordIds.length > 0) {
      const recordIds = JSON.parse(medicalRecordIds);
      records = await MedicalRecord.find({
        _id: { $in: recordIds },
        patientId,
        hospitalId,
      });

      if (records.length !== recordIds.length) {
        return res.status(404).json({
          success: false,
          message: "One or more medical records not found",
        });
      }
    }

    // Create referral
    const referral = await Referral.create({
      patientId,
      fromHospitalId: hospitalId,
      toHospitalId,
      referringDoctorId: doctor._id,
      reason,
      details,
      status: "pending",
      priority: priority || "normal",
      referralDate: new Date(),
      medicalRecordIds: medicalRecordIds ? JSON.parse(medicalRecordIds) : [],
      processedById: null,
    });

    // Update medical records to mark as shared with the target hospital
    for (const record of records) {
      // Add the destination hospital to referralHospitalIds
      record.referralHospitalIds.push({
        hospitalId: toHospitalId,
        sharedAt: new Date(),
        referralId: referral._id,
      });
      record.isShared = true;
      await record.save();
    }

    // Notify patient
    const patientUser = await User.findById(patient.userId);
    if (patientUser) {
      await notificationService.createNotification({
        recipientId: patientUser._id,
        type: "referral",
        title: "Referral Created",
        message: `Dr. ${req.user.name} has referred you to ${toHospital.name}.`,
        relatedTo: {
          model: "Referral",
          id: referral._id,
        },
        isEmail: true,
      });
    }

    // Notify destination hospital admin(s)
    const hospitalAdmins = await User.find({
      hospital: toHospitalId,
      role: "admin",
      isActive: true,
    });

    for (const admin of hospitalAdmins) {
      await notificationService.createNotification({
        recipientId: admin._id,
        type: "referral",
        title: "New Patient Referral",
        message: `A patient has been referred to your hospital by Dr. ${
          req.user.name
        } from ${(await Hospital.findById(hospitalId)).name}.`,
        relatedTo: {
          model: "Referral",
          id: referral._id,
        },
        isEmail: true,
        priority: priority === "urgent" ? "high" : "medium",
      });
    }

    res.status(201).json({
      success: true,
      message: "Referral created successfully",
      referral,
    });
  } catch (error) {
    console.error("Create referral error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create referral",
      error: error.message,
    });
  }
};

/**
 * Get referrals
 * @route GET /api/doctor/referrals
 * @access Private (Doctor)
 */
export const getReferrals = async (req, res) => {
  try {
    const doctor = req.doctor;
    const hospitalId = req.user.hospital;
    const { page = 1, limit = 10, status } = req.query;

    // Build query
    const query = {
      referringDoctorId: doctor._id,
    };

    if (status) {
      query.status = status;
    }

    // Count total referrals
    const total = await Referral.countDocuments(query);

    // Get paginated referrals
    const referrals = await Referral.find(query)
      .sort({ referralDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("patientId", "userId")
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email image" },
      })
      .populate("toHospitalId", "name")
      .populate("processedById", "name");

    res.status(200).json({
      success: true,
      referrals,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error("Get referrals error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get referrals",
      error: error.message,
    });
  }
};
