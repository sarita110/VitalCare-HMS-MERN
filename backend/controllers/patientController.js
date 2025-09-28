import User from "../models/User.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
import MedicalRecord from "../models/MedicalRecord.js"; //
import LabTest from "../models/LabTest.js"; //
import LabReport from "../models/LabReport.js"; //
import RadiologyReport from "../models/RadiologyReport.js"; //
import Payment from "../models/Payment.js"; //
import Hospital from "../models/Hospital.js"; //
import Department from "../models/Department.js"; //
import { v2 as cloudinary } from "cloudinary"; //
import khaltiService from "../services/khaltiService.js"; //
import emailService from "../services/emailService.js"; //
import notificationService from "../services/notificationService.js"; //
import { formatSlotDate, convertTo24HourFormat } from "../utils/helpers.js"; //
import mongoose from "mongoose"; // For ObjectId validation

/**
 * Get patient dashboard data
 * @route GET /api/patient/dashboard
 * @access Private (Patient)
 */
export const getDashboard = async (req, res) => {
  try {
    const patient = req.patient; //
    // Get upcoming appointments
    const now = new Date(); //
    const upcomingAppointments = await Appointment.find({
      patientId: patient._id,
      dateTime: { $gt: now },
      status: { $in: ["scheduled", "confirmed"] }, //
    })
      .sort({ dateTime: 1 })
      .limit(3)
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name image" },
      }); //
    // Get recent appointments
    const recentAppointments = await Appointment.find({
      patientId: patient._id,
    })
      .sort({ dateTime: -1 })
      .limit(5)
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name image" },
      }); //
    // Get totals
    const totalAppointments = await Appointment.countDocuments({
      patientId: patient._id,
    }); //
    const pendingAppointments = await Appointment.countDocuments({
      patientId: patient._id,
      status: { $in: ["scheduled", "confirmed"] },
      dateTime: { $gt: now }, //
    });
    // Get recent medical records
    const recentRecords = await MedicalRecord.find({
      patientId: patient._id,
    })
      .sort({ date: -1 })
      .limit(3)
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      }); //
    // Get pending payments
    const pendingPayments = await Payment.countDocuments({
      patientId: patient._id,
      status: "pending",
    }); //
    // Get pending lab and radiology tests
    const pendingLabTests = await LabTest.countDocuments({
      patientId: patient._id,
      status: { $nin: ["completed", "cancelled"] },
    }); //
    const pendingRadiologyTests = await RadiologyReport.countDocuments({
      patientId: patient._id,
      status: { $nin: ["completed", "cancelled"] },
    }); //
    res.status(200).json({
      success: true,
      dashboardData: {
        upcomingAppointments,
        recentAppointments,
        recentRecords,
        stats: {
          totalAppointments,
          pendingAppointments,
          pendingPayments,
          pendingLabTests,
          pendingRadiologyTests, //
        },
      }, //
    });
  } catch (error) {
    console.error("Patient dashboard error:", error); //
    res.status(500).json({
      success: false,
      message: "Failed to get dashboard data",
      error: error.message,
    }); //
  }
};

/**
 * Get patient profile
 * @route GET /api/patient/profile
 * @access Private (Patient)
 */
export const getProfile = async (req, res) => {
  try {
    const patient = req.patient; //
    // Get user data
    const user = await User.findById(patient.userId).select("-password"); //
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      }); //
    }
    // Get hospital data
    const hospital = await Hospital.findById(patient.hospitalId).select(
      "name address contactNumber"
    ); //
    res.status(200).json({
      success: true,
      profile: {
        ...patient.toObject(),
        user: {
          name: user.name,
          email: user.email,
          phone: user.phone,
          image: user.image,
        }, //
        hospital, //
      },
    }); //
  } catch (error) {
    console.error("Get patient profile error:", error); //
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
      error: error.message,
    }); //
  }
};

/**
 * Update patient profile
 * @route PUT /api/patient/profile
 * @access Private (Patient)
 */
export const updateProfile = async (req, res) => {
  try {
    const patient = req.patient; //
    const {
      name,
      phone,
      address,
      emergencyContact,
      bloodGroup,
      allergies,
      chronicDiseases,
    } = req.body; //
    // Get user
    const user = await User.findById(patient.userId); //
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      }); //
    }
    // Upload profile image if provided
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "patients",
        resource_type: "image",
      }); //
      user.image = result.secure_url; //
    }
    // Update user fields
    if (name) user.name = name; //
    if (phone) user.phone = phone; //
    await user.save(); //
    // Update patient fields
    if (address) patient.address = JSON.parse(address); //
    if (emergencyContact)
      patient.emergencyContact = JSON.parse(emergencyContact); //
    if (bloodGroup) patient.bloodGroup = bloodGroup; //
    if (allergies) patient.allergies = JSON.parse(allergies); //
    if (chronicDiseases) patient.chronicDiseases = JSON.parse(chronicDiseases); //
    await patient.save(); //
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      profile: {
        ...patient.toObject(),
        user: {
          name: user.name,
          email: user.email,
          phone: user.phone,
          image: user.image,
        }, //
      },
    }); //
  } catch (error) {
    console.error("Update patient profile error:", error); //
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    }); //
  }
};

/**
 * Book appointment
 * @route POST /api/patient/appointments
 * @access Private (Patient)
 */
export const bookAppointment = async (req, res) => {
  try {
    const patient = req.patient;
    const { doctorId, dateTime, reason, type = "regular" } = req.body;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    if (!doctor.available) {
      return res.status(400).json({
        success: false,
        message: "Doctor is not available for appointments",
      });
    }

    // Get the doctor's user record to find their hospital
    const doctorUser = await User.findById(doctor.userId);
    if (!doctorUser || !doctorUser.hospital) {
      return res.status(400).json({
        success: false,
        message: "Doctor is not associated with a hospital.",
      });
    }
    const hospitalIdForAppointment = doctorUser.hospital; // This is the hospital where the appointment will occur

    const appointmentDate = new Date(dateTime);
    const slotDate = formatSlotDate(appointmentDate);
    const slotTime = appointmentDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    if (
      doctor.slots_booked &&
      doctor.slots_booked[slotDate] &&
      doctor.slots_booked[slotDate].includes(slotTime)
    ) {
      return res.status(400).json({
        success: false,
        message: "This slot is already booked",
      });
    }

    const consultationMinutes = doctor.consultationTime || 30;
    const endTime = new Date(appointmentDate);
    endTime.setMinutes(endTime.getMinutes() + consultationMinutes);

    const appointment = await Appointment.create({
      hospitalId: hospitalIdForAppointment, // Use doctor's hospital
      patientId: patient._id,
      doctorId,
      dateTime: appointmentDate,
      endTime,
      status: "scheduled",
      type,
      reason,
      payment: {
        status: "pending",
        amount: doctor.fees,
        method: "cash", // Default or determine based on hospital settings later
      },
      createdBy: req.user._id,
    });

    if (!doctor.slots_booked) doctor.slots_booked = {};
    if (!doctor.slots_booked[slotDate]) doctor.slots_booked[slotDate] = [];
    doctor.slots_booked[slotDate].push(slotTime);
    doctor.markModified("slots_booked");
    await doctor.save();

    // Notify doctor
    await notificationService.createNotification({
      recipientId: doctorUser._id,
      type: "appointment",
      title: "New Appointment Booked",
      message: `${
        req.user.name
      } has booked an appointment with you on ${appointmentDate.toLocaleString()}.`,
      relatedTo: { model: "Appointment", id: appointment._id },
      isEmail: true,
    });

    // Send email confirmation to patient
    const hospitalOfAppointment = await Hospital.findById(
      hospitalIdForAppointment
    );
    await emailService.sendAppointmentConfirmationEmail(
      req.user,
      appointment,
      { name: doctorUser.name }, // doctor's user details
      hospitalOfAppointment // hospital where appointment is
    );

    res.status(201).json({
      success: true,
      message: "Appointment booked successfully",
      appointment,
    });
  } catch (error) {
    console.error("Book appointment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to book appointment",
      error: error.message,
    });
  }
};

/**
 * Get appointments
 * @route GET /api/patient/appointments
 * @access Private (Patient)
 */
export const getAppointments = async (req, res) => {
  try {
    const patient = req.patient;
    const { status, page = 1, limit = 10, upcoming, hospitalId } = req.query; // Added hospitalId
    const query = { patientId: patient._id };
    if (status) query.status = status;
    if (upcoming === "true") {
      query.dateTime = { $gte: new Date() };
      query.status = { $in: ["scheduled", "confirmed"] };
    }
    if (hospitalId) query.hospitalId = hospitalId; // <<< NEW FILTER

    const total = await Appointment.countDocuments(query);
    const appointments = await Appointment.find(query)
      .sort({ dateTime: upcoming === "true" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit)) // Ensure limit is an integer
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name email image" },
      })
      .populate("hospitalId", "name"); // <<< POPULATE HOSPITAL NAME FOR APPOINTMENT

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
    console.error("Get appointments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get appointments",
      error: error.message,
    });
  }
};

/**
 * Get appointment details
 * @route GET /api/patient/appointments/:id
 * @access Private (Patient)
 */
export const getAppointmentDetails = async (req, res) => {
  try {
    const patient = req.patient; //
    const { id } = req.params; //
    // Find appointment
    const appointment = await Appointment.findOne({
      _id: id,
      patientId: patient._id,
    })
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name email image department" },
      })
      .populate("hospitalId", "name address contactNumber email");
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      }); //
    }
    // Get doctor's department if available
    let department = null; //
    if (appointment.doctorId?.userId?.department) {
      // Added safe navigation
      department = await Department.findById(
        appointment.doctorId.userId.department
      ).select("name"); //
    }
    // Get related medical records
    const medicalRecords = await MedicalRecord.find({
      appointmentId: id,
    }).sort({ date: -1 }); //
    // Get related lab and radiology tests
    const labTests = await LabTest.find({
      appointmentId: id,
    }).sort({ requestDate: -1 }); //
    const radiologyTests = await RadiologyReport.find({
      appointmentId: id,
    }).sort({ requestDate: -1 }); //
    res.status(200).json({
      success: true,
      appointment: {
        ...appointment.toObject(),
        doctorDepartment: department,
      }, //
      medicalRecords,
      labTests,
      radiologyTests, //
    });
  } catch (error) {
    console.error("Get appointment details error:", error); //
    res.status(500).json({
      success: false,
      message: "Failed to get appointment details",
      error: error.message,
    }); //
  }
};

/**
 * Cancel appointment
 * @route PUT /api/patient/appointments/:id/cancel
 * @access Private (Patient)
 */
export const cancelAppointment = async (req, res) => {
  try {
    const patient = req.patient; //
    const { id } = req.params; //
    const { reason } = req.body; //
    // Find appointment
    const appointment = await Appointment.findOne({
      _id: id,
      patientId: patient._id,
    }); //
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      }); //
    }
    // Check if appointment can be cancelled
    if (appointment.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Appointment is already cancelled",
      }); //
    }
    if (appointment.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a completed appointment",
      }); //
    }
    // Check if appointment is within 24 hours
    const now = new Date(); //
    const appointmentTime = new Date(appointment.dateTime); //
    const hoursDifference = (appointmentTime - now) / (1000 * 60 * 60); //
    if (hoursDifference < 24) {
      return res.status(400).json({
        success: false,
        message:
          "Appointments can only be cancelled at least 24 hours in advance",
      }); //
    }
    // Update appointment
    appointment.status = "cancelled"; //
    appointment.notes = reason
      ? `${appointment.notes || ""}\nCancellation reason: ${reason}`
      : appointment.notes; //
    await appointment.save(); //
    // Release the time slot
    const doctor = await Doctor.findById(appointment.doctorId); //
    if (doctor) {
      const date = new Date(appointment.dateTime); //
      const slotDate = formatSlotDate(date); //
      const slotTime = date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }); //
      // Remove booked slot
      if (doctor.slots_booked[slotDate]) {
        doctor.slots_booked[slotDate] = doctor.slots_booked[slotDate].filter(
          (time) => time !== slotTime
        ); //

        doctor.markModified("slots_booked");
        await doctor.save(); //
      }
    }
    // Notify doctor
    const doctorUser = await User.findById(
      (
        await Doctor.findById(appointment.doctorId)
      ).userId
    ); //
    if (doctorUser) {
      await notificationService.createNotification({
        recipientId: doctorUser._id,
        type: "appointment",
        title: "Appointment Cancelled",
        message: `${
          req.user.name
        } has cancelled their appointment scheduled for ${appointmentTime.toLocaleString()}.`,
        relatedTo: {
          model: "Appointment",
          id: appointment._id,
        }, //
        isEmail: true, //
      });
    }
    res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully",
      appointment,
    }); //
  } catch (error) {
    console.error("Cancel appointment error:", error); //
    res.status(500).json({
      success: false,
      message: "Failed to cancel appointment",
      error: error.message,
    }); //
  }
};

/**
 * Reschedule appointment
 * @route PUT /api/patient/appointments/:id/reschedule
 * @access Private (Patient)
 */
export const rescheduleAppointment = async (req, res) => {
  try {
    const patient = req.patient;
    const { id } = req.params;
    const { dateTime } = req.body;

    // Find appointment
    const appointment = await Appointment.findOne({
      _id: id,
      patientId: patient._id,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check if appointment can be rescheduled
    if (appointment.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot reschedule a cancelled appointment",
      });
    }

    if (appointment.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot reschedule a completed appointment",
      });
    }

    // Check if appointment is within 24 hours
    const now = new Date();
    const appointmentTime = new Date(appointment.dateTime);
    const hoursDifference = (appointmentTime - now) / (1000 * 60 * 60);

    if (hoursDifference < 24) {
      return res.status(400).json({
        success: false,
        message:
          "Appointments can only be rescheduled at least 24 hours in advance",
      });
    }

    // Get doctor
    const doctor = await Doctor.findById(appointment.doctorId);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Check if doctor is available for the new slot
    const newAppointmentDate = new Date(dateTime);
    const newSlotDate = formatSlotDate(newAppointmentDate);

    // Get slot time in both formats for thorough checking
    const newSlotTime12Hour = newAppointmentDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newSlotTime24Hour = newAppointmentDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Check if new slot is already booked by someone else
    if (doctor.slots_booked && doctor.slots_booked[newSlotDate]) {
      const bookedSlots = doctor.slots_booked[newSlotDate];
      const isBooked = bookedSlots.some((time) => {
        // Convert booked time to standard format for comparison
        const bookedTime24Hour = convertTo24HourFormat(time);
        return (
          bookedTime24Hour === newSlotTime24Hour || time === newSlotTime12Hour
        );
      });

      if (isBooked) {
        return res.status(400).json({
          success: false,
          message: "Selected time slot is not available",
        });
      }
    }

    // Release the old time slot
    const oldSlotDate = formatSlotDate(appointmentTime);

    // Get the old slot time in both formats for thorough checking
    const oldSlotTime12Hour = appointmentTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const oldSlotTime24Hour = appointmentTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Remove the old slot in whatever format it's stored
    if (doctor.slots_booked && doctor.slots_booked[oldSlotDate]) {
      doctor.slots_booked[oldSlotDate] = doctor.slots_booked[
        oldSlotDate
      ].filter((time) => {
        // Convert to standard format for comparison
        const bookedTime24Hour = convertTo24HourFormat(time);
        return (
          bookedTime24Hour !== oldSlotTime24Hour && time !== oldSlotTime12Hour
        );
      });
    }

    // Book the new time slot
    if (!doctor.slots_booked[newSlotDate]) {
      doctor.slots_booked[newSlotDate] = [];
    }

    // Store the time in a consistent format (24-hour format)
    doctor.slots_booked[newSlotDate].push(newSlotTime24Hour);
    doctor.markModified("slots_booked");
    await doctor.save();

    // Calculate new end time
    const consultationMinutes = doctor.consultationTime || 30;
    const newEndTime = new Date(newAppointmentDate);
    newEndTime.setMinutes(newEndTime.getMinutes() + consultationMinutes);

    // Update appointment
    const oldDateTime = appointment.dateTime;
    appointment.dateTime = newAppointmentDate;
    appointment.endTime = newEndTime;
    appointment.isRescheduled = true;
    appointment.status = "scheduled"; // Reset to scheduled status
    appointment.notes = `${
      appointment.notes || ""
    }\nRescheduled from ${oldDateTime.toLocaleString()} to ${newAppointmentDate.toLocaleString()}`;

    await appointment.save();

    // Notify doctor
    const doctorUser = await User.findById(doctor.userId);
    if (doctorUser) {
      await notificationService.createNotification({
        recipientId: doctorUser._id,
        type: "appointment",
        title: "Appointment Rescheduled",
        message: `${
          req.user.name
        } has rescheduled their appointment from ${oldDateTime.toLocaleString()} to ${newAppointmentDate.toLocaleString()}.`,
        relatedTo: {
          model: "Appointment",
          id: appointment._id,
        },
        isEmail: true,
      });

      // Send email notification to patient about the rescheduled appointment
      const hospital = await Hospital.findById(
        appointment.hospitalId || patient.hospitalId
      );

      // Using specialized email function for rescheduled appointments
      await emailService.sendAppointmentRescheduleEmail(
        req.user,
        appointment,
        { name: doctorUser.name },
        hospital,
        oldDateTime
      );

      // Also create a notification for the patient
      await notificationService.createNotification({
        recipientId: req.user._id,
        type: "appointment",
        title: "Appointment Rescheduled",
        message: `Your appointment with Dr. ${
          doctorUser.name
        } has been rescheduled from ${oldDateTime.toLocaleString()} to ${newAppointmentDate.toLocaleString()}.`,
        relatedTo: {
          model: "Appointment",
          id: appointment._id,
        },
        isEmail: false, // Email was already sent above
      });
    }

    res.status(200).json({
      success: true,
      message: "Appointment rescheduled successfully",
      appointment,
    });
  } catch (error) {
    console.error("Reschedule appointment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reschedule appointment",
      error: error.message,
    });
  }
};

/**
 * Get doctors list for patient
 * @route GET /api/patient/doctors
 * @access Private (Patient)
 */
export const getDoctors = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      speciality,
      departmentId,
      available,
      search,
      hospitalId, // New: Allow filtering by a specific hospital
    } = req.query;

    const userQuery = {
      role: "doctor",
      isActive: true,
    };

    if (hospitalId) {
      // If a specific hospital is requested
      userQuery.hospital = hospitalId;
    } else {
      // If no specific hospital, ensure doctors are from an active hospital
      const activeHospitalIds = await Hospital.find({ isActive: true })
        .select("_id")
        .lean();
      userQuery.hospital = { $in: activeHospitalIds.map((h) => h._id) };
    }

    if (departmentId) {
      userQuery.department = departmentId;
    }
    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const totalDoctorUsers = await User.countDocuments(userQuery);

    const doctorUsers = await User.find(userQuery)
      .select("_id name email image department hospital") // Include hospital in user selection
      .populate("department", "name")
      .populate("hospital", "name") // Populate hospital name for display
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const userIds = doctorUsers.map((user) => user._id);

    const doctorQuery = {
      userId: { $in: userIds },
    };
    if (available) {
      doctorQuery.available = available === "true";
    }
    if (speciality) {
      doctorQuery.speciality = speciality;
    }

    const doctors = await Doctor.find(doctorQuery);

    const result = doctorUsers
      .map((user) => {
        const doctorData = doctors.find(
          (doc) => doc.userId.toString() === user._id.toString()
        );
        if (!doctorData) return null;

        return {
          id: doctorData._id, // Doctor Profile ID
          userId: user._id,
          name: user.name,
          email: user.email,
          image: user.image,
          department: user.department,
          hospitalName: user.hospital?.name || "N/A", // Add hospital name
          hospitalId: user.hospital?._id || null, // Add hospital ID
          speciality: doctorData.speciality,
          degree: doctorData.degree,
          experience: doctorData.experience,
          fees: doctorData.fees,
          about: doctorData.about,
          available: doctorData.available || false,
        };
      })
      .filter(Boolean);

    res.status(200).json({
      success: true,
      doctors: result,
      pagination: {
        total: totalDoctorUsers,
        page: Number(page),
        pages: Math.ceil(totalDoctorUsers / limit),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error("Get doctors error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get doctors",
      error: error.message,
    });
  }
};

/**
 * Get doctor details (for patient view) - MODIFIED
 * @route GET /api/patient/doctors/:id (Doctor Profile ID)
 * @access Private (Patient)
 */
export const getDoctorDetails = async (req, res) => {
  try {
    const { id: doctorProfileId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(doctorProfileId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid doctor ID format." });
    }

    const doctor = await Doctor.findById(doctorProfileId);
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor profile not found" });
    }

    // Populate user details along with their department and hospital
    const doctorUser = await User.findById(doctor.userId)
      .populate("department", "name") // Populate department name
      .populate("hospital", "name address"); // Populate hospital name and address

    if (!doctorUser) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor user account not found" });
    }

    // Ensure the doctor's account is active for patients to view/book
    if (!doctorUser.isActive) {
      return res.status(403).json({
        success: false,
        message: "This doctor's account is currently inactive.",
      });
    }
    if (!doctor.available) {
      // Also check the doctor's own availability flag
      // You might want to allow viewing details even if not available, but prevent booking.
      // For now, let's assume details can be viewed, booking form will handle 'available' flag.
      // If details should be hidden if !doctor.available, uncomment below:
      return res.status(403).json({
        success: false,
        message: "This doctor is currently not available for appointments.",
      });
    }

    // Construct the response object carefully, handling potential nulls
    const responseDoctorDetails = {
      ...doctor.toObject(), // Doctor model fields (speciality, fees, workingHours, slots_booked, etc.)
      _id: doctor._id, // Explicitly include Doctor Profile ID
      userId: doctorUser._id, // User ID
      name: doctorUser.name,
      email: doctorUser.email,
      image: doctorUser.image,
      phone: doctorUser.phone,
      department: doctorUser.department
        ? {
            // Check if department exists
            _id: doctorUser.department._id,
            name: doctorUser.department.name,
          }
        : null,
      hospital: doctorUser.hospital
        ? {
            // Check if hospital exists
            _id: doctorUser.hospital._id,
            name: doctorUser.hospital.name,
            address: doctorUser.hospital.address,
          }
        : null,
      // available: doctor.available, // Already part of doctor.toObject()
      // consultationTime: doctor.consultationTime, // Already part of doctor.toObject()
      // workingHours: doctor.workingHours, // Already part of doctor.toObject()
      // slots_booked: doctor.slots_booked, // Already part of doctor.toObject()
    };

    res.status(200).json({
      success: true,
      doctor: responseDoctorDetails,
    });
  } catch (error) {
    console.error("Get doctor details error in patient controller:", error);
    // Specific check for CastError which usually means invalid ObjectId format
    if (error.name === "CastError" && error.path === "_id") {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format provided for doctor.",
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to get doctor details due to a server error.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "An unexpected error occurred.",
    });
  }
};

/**
 * Get medical records for the patient
 * @route GET /api/patient/medical-records
 * @access Private (Patient)
 */
export const getMedicalRecords = async (req, res) => {
  try {
    const patient = req.patient;
    const { page = 1, limit = 10, type, hospitalId } = req.query; // Added hospitalId
    const query = { patientId: patient._id };
    if (type) query.type = type;
    if (hospitalId) query.hospitalId = hospitalId; // <<< NEW FILTER

    const total = await MedicalRecord.countDocuments(query);
    const records = await MedicalRecord.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name image" },
      })
      .populate("appointmentId", "dateTime")
      .populate("hospitalId", "name"); // <<< POPULATE HOSPITAL NAME

    res.status(200).json({
      success: true,
      records,
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
 * Get lab results for the patient
 * @route GET /api/patient/lab-results
 * @access Private (Patient)
 */
export const getLabResults = async (req, res) => {
  try {
    const patient = req.patient;
    const { page = 1, limit = 10, status, hospitalId } = req.query; // Added hospitalId
    const query = { patientId: patient._id };
    if (status) query.status = status;
    if (hospitalId) query.hospitalId = hospitalId; // <<< NEW FILTER

    const total = await LabTest.countDocuments(query);
    const labTests = await LabTest.find(query)
      .sort({ requestDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name image" },
      })
      .populate("resultId")
      .populate("hospitalId", "name"); // <<< POPULATE HOSPITAL NAME

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
 * Get radiology results for the patient
 * @route GET /api/patient/radiology-results
 * @access Private (Patient)
 */
export const getRadiologyResults = async (req, res) => {
  try {
    const patient = req.patient;
    const { page = 1, limit = 10, status, hospitalId } = req.query; // Added hospitalId
    const query = { patientId: patient._id };
    if (status) query.status = status;
    if (hospitalId) query.hospitalId = hospitalId; // <<< NEW FILTER

    const total = await RadiologyReport.countDocuments(query);
    const radiologyTests = await RadiologyReport.find(query)
      .sort({ requestDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name image" },
      })
      .populate("radiologist", "name")
      .populate("verifiedBy", "name")
      .populate("hospitalId", "name"); // <<< POPULATE HOSPITAL NAME

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
 * Get prescriptions for the patient
 * @route GET /api/patient/prescriptions
 * @access Private (Patient)
 */
export const getPrescriptions = async (req, res) => {
  try {
    const patient = req.patient;
    const { page = 1, limit = 10, hospitalId } = req.query; // Added hospitalId
    const query = {
      patientId: patient._id,
      type: "prescription",
      "prescriptions.0": { $exists: true }, // Ensure there's at least one prescription
    };
    if (hospitalId) query.hospitalId = hospitalId; // <<< NEW FILTER

    const total = await MedicalRecord.countDocuments(query);
    const prescriptions = await MedicalRecord.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name image" },
      })
      .populate("hospitalId", "name"); // <<< POPULATE HOSPITAL NAME

    res.status(200).json({
      success: true,
      prescriptions, // This will be medical records of type 'prescription'
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error("Get prescriptions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get prescriptions",
      error: error.message,
    });
  }
};

/**
 * Make payment (Initiate)
 * @route POST /api/patient/payments/initiate
 * @access Private (Patient)
 */
export const makePayment = async (req, res) => {
  try {
    const patient = req.patient; //
    const { paymentFor, paymentId, paymentMethod } = req.body; // paymentId is the ID of the appointment/test
    let itemDetails; //
    let amount; //
    let relatedTo; //
    let relatedId; //
    let hospitalId = patient.hospitalId; // Use patient's registered hospital

    // Get item details based on payment type
    switch (paymentFor) {
      case "appointment":
        const appointment = await Appointment.findOne({
          _id: paymentId,
          patientId: patient._id,
        }).populate({
          path: "doctorId",
          populate: { path: "userId", select: "name" },
        }); //
        if (!appointment) {
          return res.status(404).json({
            success: false,
            message: "Appointment not found",
          }); //
        }
        if (appointment.payment.status === "completed") {
          return res.status(400).json({
            success: false,
            message: "Payment already completed",
          }); //
        }
        itemDetails = `Appointment with Dr. ${
          appointment.doctorId.userId.name
        } on ${new Date(appointment.dateTime).toLocaleString()}`; //
        amount = appointment.payment.amount; //
        relatedTo = "appointment"; //
        relatedId = appointment._id; //
        hospitalId = appointment.hospitalId; // Use the appointment's hospital ID
        break;
      case "labTest":
        const labTest = await LabTest.findOne({
          _id: paymentId,
          patientId: patient._id,
        }); //
        if (!labTest) {
          return res.status(404).json({
            success: false,
            message: "Lab test not found",
          }); //
        }
        if (labTest.payment.status === "completed") {
          return res.status(400).json({
            success: false,
            message: "Payment already completed",
          }); //
        }
        itemDetails = `Lab Test: ${labTest.testName}`; //
        amount = labTest.payment.amount; //
        relatedTo = "labTest"; //
        relatedId = labTest._id; //
        hospitalId = labTest.hospitalId; // Use the test's hospital ID
        break;
      case "radiologyTest":
        const radiologyTest = await RadiologyReport.findOne({
          _id: paymentId,
          patientId: patient._id,
        }); //
        if (!radiologyTest) {
          return res.status(404).json({
            success: false,
            message: "Radiology test not found",
          }); //
        }
        if (radiologyTest.payment.status === "completed") {
          return res.status(400).json({
            success: false,
            message: "Payment already completed",
          }); //
        }
        itemDetails = `Radiology Test: ${radiologyTest.procedureType} for ${radiologyTest.bodyPart}`; //
        amount = radiologyTest.payment.amount; //
        relatedTo = "radiologyReport"; //
        relatedId = radiologyTest._id; //
        hospitalId = radiologyTest.hospitalId; // Use the test's hospital ID
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid payment type",
        }); //
    }
    // Handle different payment methods
    if (paymentMethod === "khalti") {
      // Get frontend URL
      const returnUrl = `${process.env.FRONTEND_URL}/payment/verify`; //
      const websiteUrl = process.env.FRONTEND_URL; //
      // Prepare customer info
      const customerInfo = {
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone || "", //
      };
      // Create payment
      const payment = await Payment.create({
        hospitalId, // Use hospital ID from the item being paid for
        patientId: patient._id,
        relatedTo,
        relatedId,
        amount,
        currency: "NPR",
        paymentMethod: "khalti",
        status: "pending",
        createdAt: new Date(), //
      });
      // Initiate Khalti payment
      const khaltiResponse = await khaltiService.initiatePayment({
        amount: amount * 100, // Convert to paisa
        purchase_order_id: payment._id.toString(),
        purchase_order_name: itemDetails,
        customer_info: customerInfo,
        amount_breakdown: [
          {
            label: itemDetails,
            amount: amount * 100, //
          },
        ],
        product_details: [
          {
            identity: relatedId.toString(),
            name: itemDetails,
            total_price: amount * 100,
            quantity: 1, //
            unit_price: amount * 100, //
          },
        ],
        return_url: returnUrl,
        website_url: websiteUrl,
      }); //
      if (!khaltiResponse.success) {
        // Optionally delete the pending payment record if Khalti init fails
        await Payment.findByIdAndDelete(payment._id);
        return res.status(500).json({
          success: false,
          message: "Failed to initiate payment with Khalti",
          error: khaltiResponse.error,
        }); //
      }
      // Update payment with Khalti pidx
      payment.khaltiPidx = khaltiResponse.data.pidx; //
      await payment.save(); //
      res.status(200).json({
        success: true,
        payment: {
          id: payment._id,
          amount,
          method: "khalti",
          paymentUrl: khaltiResponse.data.payment_url,
          pidx: khaltiResponse.data.pidx,
        }, //
      });
    } else if (paymentMethod === "cash") {
      // Create cash payment (to be processed by receptionist)
      const payment = await Payment.create({
        hospitalId, // Use hospital ID from the item
        patientId: patient._id,
        relatedTo,
        relatedId,
        amount,
        currency: "NPR",
        paymentMethod: "cash",
        status: "pending",
        notes: "To be paid at hospital", //
        createdAt: new Date(),
      }); //
      res.status(200).json({
        success: true,
        message:
          "Cash payment request recorded. Please pay at the hospital reception.",
        payment: {
          id: payment._id,
          amount,
          method: "cash",
        }, //
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Unsupported payment method",
      }); //
    }
  } catch (error) {
    console.error("Make payment error:", error); //
    res.status(500).json({
      success: false,
      message: "Failed to initiate payment",
      error: error.message,
    }); //
  }
};

/**
 * Verify payment (Callback from Khalti/Frontend)
 * @route POST /api/patient/payments/verify
 * @access Private (Patient)
 */
export const verifyPayment = async (req, res) => {
  try {
    const { pidx, purchase_order_id } = req.body; // Get pidx and our payment ID

    if (!pidx || !purchase_order_id) {
      return res
        .status(400)
        .json({ success: false, message: "Missing pidx or purchase_order_id" });
    }

    // Verify payment with Khalti service
    const verificationResponse = await khaltiService.verifyPayment(pidx); //
    if (!verificationResponse.success) {
      // Find our payment record even if Khalti verification fails initially
      const payment = await Payment.findById(purchase_order_id);
      if (payment && payment.status === "pending") {
        payment.status = "failed";
        payment.notes = `Khalti verification failed: ${verificationResponse.error}`;
        await payment.save();
      }
      return res.status(400).json({
        success: false,
        message: "Payment verification failed with Khalti",
        error: verificationResponse.error,
      }); //
    }

    const khaltiData = verificationResponse.data;

    // Check if Khalti transaction is completed
    if (khaltiData.status !== "Completed") {
      // Update our payment status to reflect Khalti's status (e.g., failed, pending)
      const payment = await Payment.findById(purchase_order_id);
      if (payment && payment.status === "pending") {
        payment.status = khaltiData.status.toLowerCase(); // Match our enum if possible
        payment.notes = `Khalti payment status: ${khaltiData.status}`;
        await payment.save();
      }
      return res.status(400).json({
        success: false,
        message: `Payment status from Khalti: ${khaltiData.status}`,
      }); //
    }

    // Find and update our payment record
    const payment = await Payment.findById(purchase_order_id); //
    if (!payment) {
      // This case is unlikely if Khalti verification succeeded, but handle it.
      console.error(
        `Khalti payment ${pidx} verified but internal payment record ${purchase_order_id} not found.`
      );
      return res.status(404).json({
        success: false,
        message: "Internal payment record not found",
      }); //
    }

    // Avoid double processing
    if (payment.status === "completed") {
      console.warn(`Payment ${purchase_order_id} already marked as completed.`);
      return res.status(200).json({
        success: true,
        message: "Payment was already verified.",
        payment: {
          id: payment._id,
          amount: payment.amount,
          status: payment.status,
          method: payment.paymentMethod,
          transactionId: payment.transactionId,
          date: payment.paymentDate,
        },
      });
    }

    payment.status = "completed"; //
    payment.transactionId = khaltiData.transaction_id; // Use transaction_id from Khalti response
    payment.paymentDate = new Date(); //
    payment.paymentDetails = khaltiData; // Store the full Khalti response
    payment.khaltiPidx = pidx; // Ensure pidx is stored

    await payment.save(); //
    // Update related item payment status
    switch (payment.relatedTo) {
      case "appointment":
        await Appointment.findByIdAndUpdate(payment.relatedId, {
          "payment.status": "completed",
          "payment.method": "khalti",
          "payment.transactionId": khaltiData.transaction_id,
          "payment.khalti_pidx": pidx, // Store pidx here too if needed
          "payment.date": new Date(), //
        });
        break; //
      case "labTest":
        await LabTest.findByIdAndUpdate(payment.relatedId, {
          "payment.status": "completed",
          "payment.transactionId": khaltiData.transaction_id, //
        });
        break; //
      case "radiologyReport":
        await RadiologyReport.findByIdAndUpdate(payment.relatedId, {
          "payment.status": "completed",
          "payment.transactionId": khaltiData.transaction_id, //
        });
        break; //
    }
    // Send payment confirmation email to patient
    const patient = await Patient.findById(payment.patientId); //
    const user = await User.findById(patient.userId); //

    if (user) {
      await emailService.sendPaymentConfirmationEmail(user, payment, {
        type:
          payment.relatedTo === "appointment"
            ? "Appointment Payment"
            : payment.relatedTo === "labTest"
            ? "Lab Test Payment"
            : "Radiology Test Payment", //
      });
      // Create notification
      await notificationService.createPaymentNotification({
        payment,
        recipient: user,
        status: "completed", //
      });
    }
    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      payment: {
        id: payment._id,
        amount: payment.amount,
        status: payment.status,
        method: payment.paymentMethod,
        transactionId: payment.transactionId,
        date: payment.paymentDate,
      }, //
    });
  } catch (error) {
    console.error("Verify payment error:", error); //
    // Attempt to update payment status to failed if an unexpected error occurs during processing
    if (req.body.purchase_order_id) {
      try {
        const payment = await Payment.findById(req.body.purchase_order_id);
        if (payment && payment.status === "pending") {
          payment.status = "failed";
          payment.notes = `Verification processing error: ${error.message}`;
          await payment.save();
        }
      } catch (updateError) {
        console.error(
          "Failed to mark payment as failed during error handling:",
          updateError
        );
      }
    }

    res.status(500).json({
      success: false,
      message: "Failed to verify payment",
      error: error.message,
    }); //
  }
};

/**
 * Get payment history for the patient
 * @route GET /api/patient/payments
 * @access Private (Patient)
 */
/**
 * Get payment history for the patient
 * @route GET /api/patient/payments
 * @access Private (Patient)
 */
export const getPaymentHistory = async (req, res) => {
  try {
    const patient = req.patient;
    const {
      page = 1,
      limit = 15,
      status,
      paymentMethod,
      relatedTo,
      search,
      hospitalId, // <<< NEW
    } = req.query;

    const query = { patientId: patient._id };
    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (relatedTo) query.relatedTo = relatedTo;
    if (hospitalId) query.hospitalId = hospitalId; // <<< NEW FILTER

    if (search) {
      // ... (existing search logic can remain, ensure it doesn't conflict)
      // If search targets items, those items also need hospitalId context
      const searchRegex = new RegExp(search, "i");
      const itemQueryConditions = { patientId: patient._id };
      if (hospitalId) itemQueryConditions.hospitalId = hospitalId; // Apply hospital filter to item search too

      const matchingAppointments = await Appointment.find({
        ...itemQueryConditions, // Apply hospital filter here
        $or: [{ reason: searchRegex }],
      })
        .select("_id")
        .lean();

      const matchingLabTests = await LabTest.find({
        ...itemQueryConditions, // Apply hospital filter here
        testName: searchRegex,
      })
        .select("_id")
        .lean();

      const matchingRadiology = await RadiologyReport.find({
        ...itemQueryConditions, // Apply hospital filter here
        $or: [{ procedureType: searchRegex }, { bodyPart: searchRegex }],
      })
        .select("_id")
        .lean();

      const relatedIds = [
        ...matchingAppointments.map((a) => a._id),
        ...matchingLabTests.map((l) => l._id),
        ...matchingRadiology.map((r) => r._id),
      ];

      query.$or = [
        { transactionId: searchRegex },
        { receiptNumber: searchRegex },
        { notes: searchRegex },
        { relatedId: { $in: relatedIds } },
      ];
      // Ensure the $or for relatedIds is combined correctly if search is broad
      if (query.$or.length === 3 && relatedIds.length === 0 && hospitalId) {
        // if search didn't find related items but hospitalId is set,
        // and we only have text search, then this query might be too restrictive.
        // It might be better to make sure that even for direct payment field search,
        // the hospitalId constraint is met.
        // E.g. query.transactionId = searchRegex; query.hospitalId = hospitalId;
        // This part needs careful thought on how search interacts with hospital filter for payments.
        // For now, let's assume if hospitalId is set, all payments MUST match it.
      }
    }

    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("processedBy", "name")
      .populate("hospitalId", "name"); // <<< POPULATE HOSPITAL NAME

    // ... (rest of payment detail population logic remains the same)
    const paymentDetails = await Promise.all(
      payments.map(async (payment) => {
        let relatedItem;
        let itemDetails = {};
        try {
          switch (payment.relatedTo) {
            case "appointment":
              relatedItem = await Appointment.findById(payment.relatedId)
                .populate({
                  path: "doctorId",
                  populate: { path: "userId", select: "name" },
                })
                .lean();
              if (relatedItem) {
                itemDetails = {
                  type: "Appointment",
                  details: {
                    doctor: relatedItem.doctorId?.userId?.name || "N/A",
                    date: relatedItem.dateTime,
                    status: relatedItem.status,
                  },
                };
              }
              break;
            case "labTest":
              relatedItem = await LabTest.findById(payment.relatedId).lean();
              if (relatedItem) {
                itemDetails = {
                  type: "Lab Test",
                  details: {
                    name: relatedItem.testName,
                    date: relatedItem.requestDate,
                    status: relatedItem.status,
                  },
                };
              }
              break;
            case "radiologyReport":
              relatedItem = await RadiologyReport.findById(
                payment.relatedId
              ).lean();
              if (relatedItem) {
                itemDetails = {
                  type: "Radiology Test",
                  details: {
                    name: `${relatedItem.procedureType} for ${relatedItem.bodyPart}`,
                    date: relatedItem.requestDate,
                    status: relatedItem.status,
                  },
                };
              }
              break;
          }
        } catch (popError) {
          console.error(
            `Error populating related item for payment ${payment._id}:`,
            popError
          );
          itemDetails = {
            type: payment.relatedTo,
            details: { name: "Error loading details" },
          };
        }
        return {
          ...payment.toObject(),
          itemDetails,
        };
      })
    );

    res.status(200).json({
      success: true,
      payments: paymentDetails,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error("Get payment history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get payment history",
      error: error.message,
    });
  }
};

export default {
  getDashboard,
  getProfile,
  updateProfile,
  bookAppointment,
  getAppointments,
  getAppointmentDetails,
  cancelAppointment,
  rescheduleAppointment,
  getDoctors,
  getDoctorDetails,
  getMedicalRecords,
  getLabResults,
  getRadiologyResults,
  getPrescriptions,
  makePayment,
  verifyPayment,
  getPaymentHistory,
};
