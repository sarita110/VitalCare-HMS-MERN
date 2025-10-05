import User from "../models/User.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
import Payment from "../models/Payment.js";
import MedicalRecord from "../models/MedicalRecord.js";
import LabTest from "../models/LabTest.js";
import RadiologyReport from "../models/RadiologyReport.js";
import Referral from "../models/Referral.js";
import Hospital from "../models/Hospital.js";
import { v2 as cloudinary } from "cloudinary";
import emailService from "../services/emailService.js";
import notificationService from "../services/notificationService.js";
import { formatSlotDate, generateOTP } from "../utils/helpers.js";

/**
 * Get receptionist dashboard data
 * @route GET /api/receptionist/dashboard
 * @access Private (Receptionist)
 */
export const getDashboard = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;

    // Get today's appointments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAppointments = await Appointment.find({
      hospitalId,
      dateTime: {
        $gte: today,
        $lt: tomorrow,
      },
    })
      .sort({ dateTime: 1 })
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email image" },
      })
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name image" },
      });

    // Get pending payments
    const pendingPayments = await Payment.find({
      hospitalId,
      status: "pending",
      paymentMethod: "cash",
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("patientId", "userId")
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email" },
      });

    // Get recent registrations
    const recentPatients = await Patient.find({
      hospitalId,
    })
      .sort({ registrationDate: -1 })
      .limit(5)
      .populate("userId", "name email image");

    // Get pending referrals
    const pendingReferrals = await Referral.find({
      toHospitalId: hospitalId,
      status: "pending",
    })
      .sort({ referralDate: -1 })
      .limit(5)
      .populate("patientId", "userId")
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email" },
      })
      .populate("fromHospitalId", "name")
      .populate({
        path: "referringDoctorId",
        populate: { path: "userId", select: "name" },
      });

    // Get counts
    const todayAppointmentsCount = await Appointment.countDocuments({
      hospitalId,
      dateTime: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    const pendingPaymentsCount = await Payment.countDocuments({
      hospitalId,
      status: "pending",
      paymentMethod: "cash",
    });

    const pendingReferralsCount = await Referral.countDocuments({
      toHospitalId: hospitalId,
      status: "pending",
    });

    const registeredTodayCount = await Patient.countDocuments({
      hospitalId,
      registrationDate: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    res.status(200).json({
      success: true,
      dashboardData: {
        todayAppointments,
        pendingPayments,
        recentPatients,
        pendingReferrals,
        stats: {
          todayAppointmentsCount,
          pendingPaymentsCount,
          pendingReferralsCount,
          registeredTodayCount,
        },
      },
    });
  } catch (error) {
    console.error("Receptionist dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get dashboard data",
      error: error.message,
    });
  }
};

/**
 * Get receptionist profile
 * @route GET /api/receptionist/profile
 * @access Private (Receptionist)
 */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    // Get receptionist details
    const receptionistProfile = await Receptionist.findOne({
      userId: user._id,
    });

    // Get hospital details
    const hospital = await Hospital.findById(user.hospital).select(
      "name address contactNumber"
    );

    res.status(200).json({
      success: true,
      profile: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          image: user.image,
        },
        receptionistDetails: receptionistProfile,
        hospital,
      },
    });
  } catch (error) {
    console.error("Get receptionist profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
      error: error.message,
    });
  }
};

/**
 * Update receptionist profile
 * @route PUT /api/receptionist/profile
 * @access Private (Receptionist)
 */
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    const { name, phone } = req.body;

    // Upload profile image if provided
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "staff",
        resource_type: "image",
      });
      user.image = result.secure_url;
    }

    // Update user fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      profile: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          image: user.image,
        },
      },
    });
  } catch (error) {
    console.error("Update receptionist profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

/**
 * Register patient
 * @route POST /api/receptionist/patients/register
 * @access Private (Receptionist)
 */
export const registerPatient = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const {
      name,
      email,
      phone,
      dob,
      gender,
      bloodGroup,
      address,
      emergencyContact,
      allergies,
      chronicDiseases,
    } = req.body;

    // Check if user with email already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Generate random password
    const password = Math.random().toString(36).slice(-8);

    // Upload image if provided
    let imageUrl =
      "https://res.cloudinary.com/vitalcare/image/upload/v1/default-avatar.png";
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "patients",
        resource_type: "image",
      });
      imageUrl = result.secure_url;
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: "patient",
      phone: phone || "",
      hospital: hospitalId,
      image: imageUrl,
      isVerified: true,
    });

    // Create patient profile
    const patient = await Patient.create({
      userId: user._id,
      hospitalId,
      dob: new Date(dob),
      gender,
      bloodGroup: bloodGroup || "",
      address: address ? JSON.parse(address) : {},
      emergencyContact: emergencyContact ? JSON.parse(emergencyContact) : {},
      allergies: allergies ? JSON.parse(allergies) : [],
      chronicDiseases: chronicDiseases ? JSON.parse(chronicDiseases) : [],
      registrationDate: new Date(),
      insuranceInfo: {},
    });

    // Send welcome email with credentials
    await emailService.sendEmail({
      to: email,
      subject: "Welcome to VitalCare",
      html: `
        <p>Hello ${name},</p>
        <p>You have been registered as a patient at ${
          (
            await Hospital.findById(hospitalId)
          ).name
        } on VitalCare.</p>
        <p>Your login credentials:</p>
        <p>Email: ${email}</p>
        <p>Password: ${password}</p>
        <p>Please log in and change your password immediately.</p>
        <p>Login at: ${process.env.FRONTEND_URL}/login</p>
      `,
    });

    res.status(201).json({
      success: true,
      message: "Patient registered successfully",
      patient: {
        ...patient.toObject(),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          image: user.image,
        },
      },
    });
  } catch (error) {
    console.error("Register patient error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register patient",
      error: error.message,
    });
  }
};

/**
 * Get patients
 * @route GET /api/receptionist/patients
 * @access Private (Receptionist)
 */
export const getPatients = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { page = 1, limit = 10, search } = req.query;

    // Build query
    const query = { hospitalId };

    // Handle search
    if (search) {
      // Find users with matching names or emails
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ],
        role: "patient",
        hospital: hospitalId,
      }).select("_id");

      const userIds = users.map((user) => user._id);

      if (userIds.length > 0) {
        query.userId = { $in: userIds };
      } else {
        // If no users match, search in patient-specific fields
        // This will likely return no results, but prevents errors
        query.$or = [{ bloodGroup: { $regex: search, $options: "i" } }];
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

    res.status(200).json({
      success: true,
      patients,
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
 * @route GET /api/receptionist/patients/:id
 * @access Private (Receptionist)
 */
export const getPatientDetails = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { id } = req.params;

    // Find patient
    const patient = await Patient.findOne({
      _id: id,
      hospitalId,
    }).populate("userId", "name email image phone");

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Get patient appointments
    const appointments = await Appointment.find({
      patientId: patient._id,
    })
      .sort({ dateTime: -1 })
      .limit(5)
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name image" },
      });

    // Get recent medical records
    const medicalRecords = await MedicalRecord.find({
      patientId: patient._id,
    })
      .sort({ date: -1 })
      .limit(5)
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      });

    // Get pending payments
    const pendingPayments = await Payment.find({
      patientId: patient._id,
      status: "pending",
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      patient,
      patientData: {
        appointments,
        medicalRecords,
        pendingPayments,
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
 * Update patient details
 * @route PUT /api/receptionist/patients/:id
 * @access Private (Receptionist)
 */
export const updatePatientDetails = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { id } = req.params;
    const {
      name,
      phone,
      dob,
      gender,
      bloodGroup,
      address,
      emergencyContact,
      allergies,
      chronicDiseases,
      insuranceInfo,
    } = req.body;

    // Find patient
    const patient = await Patient.findOne({
      _id: id,
      hospitalId,
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Get user
    const user = await User.findById(patient.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Upload image if provided
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "patients",
        resource_type: "image",
      });
      user.image = result.secure_url;
    }

    // Update user fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    await user.save();

    // Update patient fields
    if (dob) patient.dob = new Date(dob);
    if (gender) patient.gender = gender;
    if (bloodGroup) patient.bloodGroup = bloodGroup;
    if (address) patient.address = JSON.parse(address);
    if (emergencyContact)
      patient.emergencyContact = JSON.parse(emergencyContact);
    if (allergies) patient.allergies = JSON.parse(allergies);
    if (chronicDiseases) patient.chronicDiseases = JSON.parse(chronicDiseases);
    if (insuranceInfo) patient.insuranceInfo = JSON.parse(insuranceInfo);
    await patient.save();

    res.status(200).json({
      success: true,
      message: "Patient details updated successfully",
      patient: {
        ...patient.toObject(),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          image: user.image,
        },
      },
    });
  } catch (error) {
    console.error("Update patient details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update patient details",
      error: error.message,
    });
  }
};

/**
 * Book appointment
 * @route POST /api/receptionist/appointments
 * @access Private (Receptionist)
 */
export const bookAppointment = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const {
      patientId,
      doctorId,
      dateTime,
      reason,
      type = "regular",
      notes,
    } = req.body;

    // Check if patient exists and belongs to this hospital
    const patient = await Patient.findOne({
      _id: patientId,
      hospitalId,
    });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Check if doctor is available
    if (!doctor.available) {
      return res.status(400).json({
        success: false,
        message: "Doctor is not available for appointments",
      });
    }

    // Check if doctor belongs to this hospital
    const doctorUser = await User.findById(doctor.userId);
    if (
      !doctorUser ||
      doctorUser.hospital.toString() !== hospitalId.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: "Doctor does not belong to this hospital",
      });
    }

    // Check if slot is available
    const appointmentDate = new Date(dateTime);
    const slotDate = formatSlotDate(appointmentDate);

    // Get slot time
    const slotTime = appointmentDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Check if slot is already booked
    if (
      doctor.slots_booked[slotDate] &&
      doctor.slots_booked[slotDate].includes(slotTime)
    ) {
      return res.status(400).json({
        success: false,
        message: "This slot is already booked",
      });
    }

    // Calculate end time (default to 30 minutes)
    const consultationMinutes = doctor.consultationTime || 30;
    const endTime = new Date(appointmentDate);
    endTime.setMinutes(endTime.getMinutes() + consultationMinutes);

    // Create appointment
    const appointment = await Appointment.create({
      hospitalId,
      patientId,
      doctorId,
      dateTime: appointmentDate,
      endTime,
      status: "confirmed", // Receptionist-booked appointments are automatically confirmed
      type,
      reason,
      notes,
      payment: {
        status: "pending",
        amount: doctor.fees,
        method: "cash",
      },
      createdBy: req.user._id,
    });

    // --- Start Corrected Section ---
    // Update doctor's slots_booked
    if (!doctor.slots_booked) {
      // Initialize if null/undefined
      doctor.slots_booked = {};
    }
    if (!doctor.slots_booked[slotDate]) {
      // Initialize array for the date
      doctor.slots_booked[slotDate] = [];
    }
    doctor.slots_booked[slotDate].push(slotTime); // Add the booked time slot

    // *** Explicitly mark 'slots_booked' as modified ***
    doctor.markModified("slots_booked");

    await doctor.save(); // Save the updated doctor document
    // --- End Corrected Section ---

    // Notify doctor
    await notificationService.createNotification({
      recipientId: doctorUser._id,
      type: "appointment",
      title: "New Appointment",
      message: `A new appointment has been scheduled for ${appointmentDate.toLocaleString()}`,
      relatedTo: {
        model: "Appointment",
        id: appointment._id,
      },
      isEmail: true,
    });

    // Notify patient
    const patientUser = await User.findById(patient.userId);
    if (patientUser) {
      await notificationService.createNotification({
        recipientId: patientUser._id,
        type: "appointment",
        title: "Appointment Scheduled",
        message: `An appointment with Dr. ${
          doctorUser.name
        } has been scheduled for ${appointmentDate.toLocaleString()}`,
        relatedTo: {
          model: "Appointment",
          id: appointment._id,
        },
        isEmail: true,
      });
    }

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
 * @route GET /api/receptionist/appointments
 * @access Private (Receptionist)
 */
export const getAppointments = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const {
      page = 1,
      limit = 10,
      status,
      date,
      doctorId,
      patientId,
      search,
    } = req.query;

    // Build query
    const query = { hospitalId };

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

    if (doctorId) {
      query.doctorId = doctorId;
    }

    if (patientId) {
      query.patientId = patientId;
    }

    // Handle search
    if (search) {
      // Find patients with matching names
      const patients = await Patient.find({ hospitalId })
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

      // Find doctors with matching names
      const doctors = await Doctor.find()
        .populate({
          path: "userId",
          match: {
            name: { $regex: search, $options: "i" },
            hospital: hospitalId,
          },
          select: "_id",
        })
        .select("_id")
        .lean();

      const matchingDoctorIds = doctors
        .filter((d) => d.userId) // Filter out doctors whose user didn't match
        .map((d) => d._id);

      if (matchingPatientIds.length > 0 || matchingDoctorIds.length > 0) {
        query.$or = [];

        if (matchingPatientIds.length > 0) {
          query.$or.push({ patientId: { $in: matchingPatientIds } });
        }

        if (matchingDoctorIds.length > 0) {
          query.$or.push({ doctorId: { $in: matchingDoctorIds } });
        }
      } else {
        // If no patients or doctors match, search in appointment fields
        query.$or = [
          { reason: { $regex: search, $options: "i" } },
          { notes: { $regex: search, $options: "i" } },
        ];
      }
    }

    // Count total appointments
    const total = await Appointment.countDocuments(query);

    // Get paginated appointments
    const appointments = await Appointment.find(query)
      .sort({ dateTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email image" },
      })
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name email image" },
      })
      .populate("createdBy", "name role");

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
 * Update appointment
 * @route PUT /api/receptionist/appointments/:id
 * @access Private (Receptionist)
 */
export const updateAppointment = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { id } = req.params;
    const { dateTime, reason, type, notes, status } = req.body;

    // Find appointment
    const appointment = await Appointment.findOne({
      _id: id,
      hospitalId,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check if appointment can be updated
    if (appointment.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot update a completed appointment",
      });
    }

    // If rescheduling, check if new slot is available
    if (dateTime && dateTime !== appointment.dateTime.toISOString()) {
      const doctor = await Doctor.findById(appointment.doctorId);
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      // Release the old time slot
      const oldDate = appointment.dateTime;
      const oldSlotDate = formatSlotDate(oldDate);
      const oldSlotTime = oldDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      if (doctor.slots_booked[oldSlotDate]) {
        doctor.slots_booked[oldSlotDate] = doctor.slots_booked[
          oldSlotDate
        ].filter((time) => time !== oldSlotTime);
      }

      // Book the new time slot
      const newDate = new Date(dateTime);
      const newSlotDate = formatSlotDate(newDate);
      const newSlotTime = newDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      // Check if new slot is already booked
      if (
        doctor.slots_booked[newSlotDate] &&
        doctor.slots_booked[newSlotDate].includes(newSlotTime)
      ) {
        return res.status(400).json({
          success: false,
          message: "Selected time slot is not available",
        });
      }

      if (!doctor.slots_booked[newSlotDate]) {
        doctor.slots_booked[newSlotDate] = [];
      }
      doctor.slots_booked[newSlotDate].push(newSlotTime);
      doctor.markModified("slots_booked");
      await doctor.save();

      // Calculate new end time
      const consultationMinutes = doctor.consultationTime || 30;
      const newEndTime = new Date(newDate);
      newEndTime.setMinutes(newEndTime.getMinutes() + consultationMinutes);

      // Update appointment date/time
      appointment.dateTime = newDate;
      appointment.endTime = newEndTime;
      appointment.isRescheduled = true;
    }

    // Update other fields
    if (reason) appointment.reason = reason;
    if (type) appointment.type = type;
    if (notes) appointment.notes = notes;
    if (status) appointment.status = status;

    await appointment.save();

    // Notify patient and doctor
    const patient = await Patient.findById(appointment.patientId);
    const patientUser = await User.findById(patient.userId);

    const doctor = await Doctor.findById(appointment.doctorId);
    const doctorUser = await User.findById(doctor.userId);

    // For reschedule
    if (dateTime && dateTime !== appointment.dateTime.toISOString()) {
      if (patientUser) {
        await notificationService.createNotification({
          recipientId: patientUser._id,
          type: "appointment",
          title: "Appointment Rescheduled",
          message: `Your appointment has been rescheduled to ${new Date(
            dateTime
          ).toLocaleString()}`,
          relatedTo: {
            model: "Appointment",
            id: appointment._id,
          },
          isEmail: true,
        });
      }

      if (doctorUser) {
        await notificationService.createNotification({
          recipientId: doctorUser._id,
          type: "appointment",
          title: "Appointment Rescheduled",
          message: `An appointment has been rescheduled to ${new Date(
            dateTime
          ).toLocaleString()}`,
          relatedTo: {
            model: "Appointment",
            id: appointment._id,
          },
          isEmail: true,
        });
      }
    }
    // For status change
    else if (status) {
      if (patientUser) {
        await notificationService.createNotification({
          recipientId: patientUser._id,
          type: "appointment",
          title: "Appointment Status Updated",
          message: `Your appointment status has been updated to ${status}`,
          relatedTo: {
            model: "Appointment",
            id: appointment._id,
          },
          isEmail: true,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Appointment updated successfully",
      appointment,
    });
  } catch (error) {
    console.error("Update appointment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update appointment",
      error: error.message,
    });
  }
};

/**
 * Cancel appointment
 * @route PUT /api/receptionist/appointments/:id/cancel
 * @access Private (Receptionist)
 */
export const cancelAppointment = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { id } = req.params;
    const { reason } = req.body;

    // Find appointment
    const appointment = await Appointment.findOne({
      _id: id,
      hospitalId,
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
    const doctor = await Doctor.findById(appointment.doctorId);
    if (doctor) {
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
    }

    // Notify patient and doctor
    const patient = await Patient.findById(appointment.patientId);
    const patientUser = await User.findById(patient.userId);

    if (patientUser) {
      await notificationService.createNotification({
        recipientId: patientUser._id,
        type: "appointment",
        title: "Appointment Cancelled",
        message: `Your appointment scheduled for ${appointment.dateTime.toLocaleString()} has been cancelled.`,
        relatedTo: {
          model: "Appointment",
          id: appointment._id,
        },
        isEmail: true,
      });
    }

    const doctorUser = await User.findById(
      (
        await Doctor.findById(appointment.doctorId)
      ).userId
    );
    if (doctorUser) {
      await notificationService.createNotification({
        recipientId: doctorUser._id,
        type: "appointment",
        title: "Appointment Cancelled",
        message: `An appointment scheduled for ${appointment.dateTime.toLocaleString()} has been cancelled.`,
        relatedTo: {
          model: "Appointment",
          id: appointment._id,
        },
        isEmail: true,
      });
    }

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
 * Get doctors
 * @route GET /api/receptionist/doctors
 * @access Private (Receptionist)
 */
export const getDoctors = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { speciality, available, departmentId } = req.query;

    // Build query for doctor users
    const userQuery = {
      hospital: hospitalId,
      role: "doctor",
      isActive: true,
    };

    if (departmentId) {
      userQuery.department = departmentId;
    }

    // Get doctor users
    const doctorUsers = await User.find(userQuery)
      .select("_id name email image department")
      .populate("department", "name");

    const userIds = doctorUsers.map((user) => user._id);

    // Build doctor query
    const doctorQuery = {
      userId: { $in: userIds },
    };

    if (speciality) {
      doctorQuery.speciality = speciality;
    }

    if (available) {
      doctorQuery.available = available === "true";
    }

    // Get doctors
    const doctors = await Doctor.find(doctorQuery).select("-slots_booked");

    // Combine doctor and user data
    const result = userIds
      .map((userId) => {
        const user = doctorUsers.find(
          (u) => u._id.toString() === userId.toString()
        );
        const doctor = doctors.find(
          (d) => d.userId.toString() === userId.toString()
        );

        if (!doctor) return null;

        return {
          id: doctor._id,
          userId: user._id,
          name: user.name,
          email: user.email,
          image: user.image,
          department: user.department,
          speciality: doctor.speciality,
          degree: doctor.degree,
          experience: doctor.experience,
          fees: doctor.fees,
          available: doctor.available,
        };
      })
      .filter(Boolean);

    res.status(200).json({
      success: true,
      doctors: result,
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
 * Get doctor availability
 * @route GET /api/receptionist/doctors/:id/availability
 * @access Private (Receptionist)
 */
export const getDoctorAvailability = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { id } = req.params;
    const { date } = req.query;

    // Find doctor
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Check if doctor belongs to this hospital
    const doctorUser = await User.findById(doctor.userId);
    if (
      !doctorUser ||
      doctorUser.hospital.toString() !== hospitalId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Doctor does not belong to this hospital",
      });
    }

    // Get availability for requested date or next 7 days
    const availableSlots = {};

    if (date) {
      // Get availability for specific date
      const requestedDate = new Date(date);
      const slotDate = formatSlotDate(requestedDate);

      // Check doctor's working hours for this day
      const dayOfWeek = requestedDate.toLocaleDateString("en-US", {
        weekday: "lowercase",
      });
      const workingHours =
        doctor.workingHours && doctor.workingHours[dayOfWeek];

      if (workingHours && workingHours.isActive) {
        const bookedSlots = doctor.slots_booked[slotDate] || [];
        const startTime = workingHours.start;
        const endTime = workingHours.end;

        if (startTime && endTime) {
          // Generate available slots based on consultation time
          const consultationMinutes = doctor.consultationTime || 30;
          const slots = [];

          // Parse start and end times
          const [startHour, startMinute] = startTime.split(":").map(Number);
          const [endHour, endMinute] = endTime.split(":").map(Number);

          // Create a start date
          const startDate = new Date(requestedDate);
          startDate.setHours(startHour, startMinute, 0, 0);

          // If it's today, only show future slots
          const now = new Date();
          if (
            requestedDate.getDate() === now.getDate() &&
            requestedDate.getMonth() === now.getMonth() &&
            requestedDate.getFullYear() === now.getFullYear()
          ) {
            if (startDate < now) {
              // Round up to the next slot time
              now.setMinutes(
                Math.ceil(now.getMinutes() / consultationMinutes) *
                  consultationMinutes
              );
              startDate.setHours(now.getHours(), now.getMinutes(), 0, 0);
            }
          }

          // Create end date
          const endDate = new Date(requestedDate);
          endDate.setHours(endHour, endMinute, 0, 0);

          // Generate slots
          let currentSlot = new Date(startDate);
          while (currentSlot < endDate) {
            const slotTime = currentSlot.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            if (!bookedSlots.includes(slotTime)) {
              slots.push({
                time: slotTime,
                dateTime: new Date(currentSlot),
              });
            }

            currentSlot.setMinutes(
              currentSlot.getMinutes() + consultationMinutes
            );
          }

          availableSlots[slotDate] = slots;
        }
      }
    } else {
      // Get availability for next 7 days
      const now = new Date();

      for (let i = 0; i < 7; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() + i);
        const slotDate = formatSlotDate(date);

        // Check doctor's working hours for this day
        const dayOfWeek = date.toLocaleDateString("en-US", {
          weekday: "lowercase",
        });
        const workingHours =
          doctor.workingHours && doctor.workingHours[dayOfWeek];

        if (workingHours && workingHours.isActive) {
          const bookedSlots = doctor.slots_booked[slotDate] || [];
          const startTime = workingHours.start;
          const endTime = workingHours.end;

          if (startTime && endTime) {
            // Generate available slots based on consultation time
            const consultationMinutes = doctor.consultationTime || 30;
            const slots = [];

            // Parse start and end times
            const [startHour, startMinute] = startTime.split(":").map(Number);
            const [endHour, endMinute] = endTime.split(":").map(Number);

            // Create a start date
            const startDate = new Date(date);
            startDate.setHours(startHour, startMinute, 0, 0);

            // If it's today, only show future slots
            if (i === 0) {
              if (startDate < now) {
                // Round up to the next slot time
                now.setMinutes(
                  Math.ceil(now.getMinutes() / consultationMinutes) *
                    consultationMinutes
                );
                startDate.setHours(now.getHours(), now.getMinutes(), 0, 0);
              }
            }

            // Create end date
            const endDate = new Date(date);
            endDate.setHours(endHour, endMinute, 0, 0);

            // Generate slots
            let currentSlot = new Date(startDate);
            while (currentSlot < endDate) {
              const slotTime = currentSlot.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              if (!bookedSlots.includes(slotTime)) {
                slots.push({
                  time: slotTime,
                  dateTime: new Date(currentSlot),
                });
              }

              currentSlot.setMinutes(
                currentSlot.getMinutes() + consultationMinutes
              );
            }

            availableSlots[slotDate] = slots;
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      doctor: {
        id: doctor._id,
        name: doctorUser.name,
        speciality: doctor.speciality,
        fees: doctor.fees,
        available: doctor.available,
        workingHours: doctor.workingHours,
        consultationTime: doctor.consultationTime,
      },
      availableSlots,
    });
  } catch (error) {
    console.error("Get doctor availability error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get doctor availability",
      error: error.message,
    });
  }
};

/**
 * Process payment
 * @route POST /api/receptionist/payments
 * @access Private (Receptionist)
 */
export const processPayment = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const {
      patientId,
      relatedTo,
      relatedId,
      amount,
      paymentMethod,
      transactionId,
      notes,
    } = req.body;

    // Check if patient exists and belongs to this hospital
    const patient = await Patient.findOne({
      _id: patientId,
      hospitalId,
    });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Validate related item
    let relatedItem;
    switch (relatedTo) {
      case "appointment":
        relatedItem = await Appointment.findOne({
          _id: relatedId,
          hospitalId,
          patientId,
        });
        break;
      case "labTest":
        relatedItem = await LabTest.findOne({
          _id: relatedId,
          hospitalId,
          patientId,
        });
        break;
      case "radiologyReport":
        relatedItem = await RadiologyReport.findOne({
          _id: relatedId,
          hospitalId,
          patientId,
        });
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid payment type",
        });
    }

    if (!relatedItem) {
      return res.status(404).json({
        success: false,
        message: "Related item not found",
      });
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({
      patientId,
      relatedTo,
      relatedId,
      status: "completed",
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: "Payment already completed for this item",
      });
    }

    // Create payment
    const payment = await Payment.create({
      hospitalId,
      patientId,
      relatedTo,
      relatedId,
      amount: Number(amount),
      currency: "NPR",
      paymentMethod,
      status: "completed",
      transactionId,
      paymentDate: new Date(),
      notes,
      receiptNumber: `RCP-${Date.now().toString().slice(-6)}`,
      processedBy: req.user._id,
    });

    // Update related item payment status
    switch (relatedTo) {
      case "appointment":
        await Appointment.findByIdAndUpdate(relatedId, {
          "payment.status": "completed",
          "payment.method": paymentMethod,
          "payment.transactionId": transactionId,
          "payment.date": new Date(),
        });
        break;
      case "labTest":
        await LabTest.findByIdAndUpdate(relatedId, {
          "payment.status": "completed",
          "payment.transactionId": transactionId,
        });
        break;
      case "radiologyReport":
        await RadiologyReport.findByIdAndUpdate(relatedId, {
          "payment.status": "completed",
          "payment.transactionId": transactionId,
        });
        break;
    }

    // Notify patient
    const patientUser = await User.findById(patient.userId);
    if (patientUser) {
      await notificationService.createNotification({
        recipientId: patientUser._id,
        type: "payment",
        title: "Payment Received",
        message: `Your payment of NPR ${amount} has been processed successfully.`,
        relatedTo: {
          model: "Payment",
          id: payment._id,
        },
        isEmail: true,
      });
    }

    res.status(201).json({
      success: true,
      message: "Payment processed successfully",
      payment,
    });
  } catch (error) {
    console.error("Process payment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process payment",
      error: error.message,
    });
  }
};

/**
 * Get payments
 * @route GET /api/receptionist/payments
 * @access Private (Receptionist)
 */
export const getPayments = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const {
      page = 1,
      limit = 10,
      status,
      patientId,
      paymentMethod,
      search,
    } = req.query;

    // Build query
    const query = { hospitalId };

    if (status) {
      query.status = status;
    }

    if (patientId) {
      query.patientId = patientId;
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    // Handle search
    if (search) {
      // Find patients with matching names
      const patients = await Patient.find({ hospitalId })
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
        // If no patients match, search in receipt or transaction id
        query.$or = [
          { receiptNumber: { $regex: search, $options: "i" } },
          { transactionId: { $regex: search, $options: "i" } },
        ];
      }
    }

    // Count total payments
    const total = await Payment.countDocuments(query);

    // Get paginated payments
    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("patientId", "userId")
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email" },
      })
      .populate("processedBy", "name");

    res.status(200).json({
      success: true,
      payments,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error("Get payments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get payments",
      error: error.message,
    });
  }
};

/**
 * Upload report
 * @route POST /api/receptionist/upload-report
 * @access Private (Receptionist)
 */
export const uploadReport = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { patientId, recordType, description, appointmentId, doctorId } =
      req.body;

    // Check if patient exists and belongs to this hospital
    const patient = await Patient.findOne({
      _id: patientId,
      hospitalId,
    });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Check if doctor exists
    if (doctorId) {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      // Check if doctor belongs to this hospital
      const doctorUser = await User.findById(doctor.userId);
      if (
        !doctorUser ||
        doctorUser.hospital.toString() !== hospitalId.toString()
      ) {
        return res.status(400).json({
          success: false,
          message: "Doctor does not belong to this hospital",
        });
      }
    }

    // Check if appointment exists if provided
    if (appointmentId) {
      const appointment = await Appointment.findOne({
        _id: appointmentId,
        hospitalId,
        patientId,
      });

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: "Appointment not found",
        });
      }
    }

    // Upload report file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "medical-reports",
      resource_type: "auto",
    });

    // Create medical record
    const medicalRecord = await MedicalRecord.create({
      patientId,
      hospitalId,
      appointmentId: appointmentId || null,
      doctorId: doctorId || null,
      type: recordType || "other",
      date: new Date(),
      notes: description,
      attachments: [
        {
          name: req.file.originalname,
          url: result.secure_url,
          type: req.file.mimetype,
          uploadedBy: req.user._id,
          uploadedAt: new Date(),
        },
      ],
      createdBy: req.user._id,
    });

    // Notify patient
    const patientUser = await User.findById(patient.userId);
    if (patientUser) {
      await notificationService.createNotification({
        recipientId: patientUser._id,
        type: "medical-record",
        title: "New Medical Report Added",
        message: `A new ${
          recordType || "medical"
        } report has been added to your records.`,
        relatedTo: {
          model: "MedicalRecord",
          id: medicalRecord._id,
        },
        isEmail: true,
      });
    }

    // Notify doctor if provided
    if (doctorId) {
      const doctorUser = await User.findById(
        (
          await Doctor.findById(doctorId)
        ).userId
      );
      if (doctorUser) {
        await notificationService.createNotification({
          recipientId: doctorUser._id,
          type: "medical-record",
          title: "New Medical Report Added",
          message: `A new ${
            recordType || "medical"
          } report has been added for your patient ${patientUser.name}.`,
          relatedTo: {
            model: "MedicalRecord",
            id: medicalRecord._id,
          },
          isEmail: false, // Don't email doctors for every report
        });
      }
    }

    res.status(201).json({
      success: true,
      message: "Report uploaded successfully",
      medicalRecord,
    });
  } catch (error) {
    console.error("Upload report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload report",
      error: error.message,
    });
  }
};

/**
 * Create referral
 * @route POST /api/receptionist/referrals
 * @access Private (Receptionist)
 */
export const createReferral = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const {
      patientId,
      toHospitalId,
      reason,
      details,
      priority,
      doctorId,
      medicalRecordIds,
    } = req.body;

    // Check if patient exists and belongs to this hospital
    const patient = await Patient.findOne({
      _id: patientId,
      hospitalId,
    });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
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

    // Validate doctor if provided
    let referringDoctorId = null;
    if (doctorId) {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      // Check if doctor belongs to this hospital
      const doctorUser = await User.findById(doctor.userId);
      if (
        !doctorUser ||
        doctorUser.hospital.toString() !== hospitalId.toString()
      ) {
        return res.status(400).json({
          success: false,
          message: "Doctor does not belong to this hospital",
        });
      }

      referringDoctorId = doctor._id;
    }

    // Validate medical records if provided and store records for later update
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
      referringDoctorId,
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
        message: `You have been referred to ${toHospital.name}.`,
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
        message: `A patient has been referred to your hospital from ${
          (
            await Hospital.findById(hospitalId)
          ).name
        }.`,
        relatedTo: {
          model: "Referral",
          id: referral._id,
        },
        isEmail: true,
        priority: priority === "urgent" ? "high" : "medium",
      });
    }

    // Notify referring doctor if provided
    if (referringDoctorId) {
      const doctorUser = await User.findById(
        (
          await Doctor.findById(referringDoctorId)
        ).userId
      );
      if (doctorUser) {
        await notificationService.createNotification({
          recipientId: doctorUser._id,
          type: "referral",
          title: "Patient Referral Created",
          message: `Your patient ${patientUser.name} has been referred to ${toHospital.name}.`,
          relatedTo: {
            model: "Referral",
            id: referral._id,
          },
          isEmail: false,
        });
      }
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
 * @route GET /api/receptionist/referrals
 * @access Private (Receptionist)
 */
export const getReferrals = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { page = 1, limit = 10, direction, status, patientId } = req.query;

    // Build query based on direction
    let query = {};

    if (direction === "outgoing") {
      query.fromHospitalId = hospitalId;
    } else if (direction === "incoming") {
      query.toHospitalId = hospitalId;
    } else {
      // If no direction specified, get both
      query.$or = [
        { fromHospitalId: hospitalId },
        { toHospitalId: hospitalId },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (patientId) {
      query.patientId = patientId;
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
      .populate("fromHospitalId", "name")
      .populate("toHospitalId", "name")
      .populate({
        path: "referringDoctorId",
        populate: { path: "userId", select: "name" },
      })
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

/**
 * Get medical records associated with a referral
 * @route GET /api/receptionist/referrals/:id/records
 * @access Private (Receptionist)
 */
export const getReferralRecords = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { id } = req.params;

    // Find referral
    const referral = await Referral.findOne({
      _id: id,
      $or: [{ fromHospitalId: hospitalId }, { toHospitalId: hospitalId }],
    });

    if (!referral) {
      return res.status(404).json({
        success: false,
        message: "Referral not found",
      });
    }

    // Fetch medical records
    const records = await MedicalRecord.find({
      _id: { $in: referral.medicalRecordIds || [] },
    })
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      })
      .populate({
        path: "labTests.testId",
        select: "testName testType status",
      })
      .populate({
        path: "radiologyTests.reportId",
        select: "procedureType bodyPart status",
      });

    res.status(200).json({
      success: true,
      records,
    });
  } catch (error) {
    console.error("Get referral records error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get referral records",
      error: error.message,
    });
  }
};
