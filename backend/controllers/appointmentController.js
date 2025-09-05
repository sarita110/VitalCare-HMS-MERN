import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import User from "../models/User.js";
import MedicalRecord from "../models/MedicalRecord.js"; //
import LabTest from "../models/LabTest.js"; //
import RadiologyReport from "../models/RadiologyReport.js"; //
import notificationService from "../services/notificationService.js"; //
import emailService from "../services/emailService.js"; //
import { formatSlotDate, convertTo24HourFormat } from "../utils/helpers.js"; //
import Hospital from "../models/Hospital.js"; // Ensure Hospital model is imported

// --- HELPER for Auto-Cancellation ---
async function handleExpiredPendingPayment(appointmentId) {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) return null; // Appointment not found

  const now = new Date();
  const appointmentTime = new Date(appointment.dateTime);
  const hoursDifference = (appointmentTime - now) / (1000 * 60 * 60);

  if (
    appointment.status === "scheduled" &&
    appointment.payment?.status === "pending" &&
    hoursDifference < 24
  ) {
    console.log(
      `Auto-cancelling appointment ${appointmentId} due to pending payment.`
    );
    appointment.status = "cancelled";
    appointment.notes =
      (appointment.notes || "") +
      "\nAuto-cancelled due to non-payment within 24 hours.";
    await appointment.save();

    // Release slot
    const doctor = await Doctor.findById(appointment.doctorId);
    if (doctor) {
      const slotDate = formatSlotDate(appointmentTime);
      // Get time in 24hr format for comparison and removal
      const slotTime = appointmentTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      if (doctor.slots_booked && doctor.slots_booked[slotDate]) {
        doctor.slots_booked[slotDate] = doctor.slots_booked[slotDate].filter(
          (time) => convertTo24HourFormat(time) !== slotTime
        );
        // Clean up empty date array
        if (doctor.slots_booked[slotDate].length === 0) {
          delete doctor.slots_booked[slotDate];
        }
        doctor.markModified("slots_booked");
        await doctor.save();
      }
    }

    // Notify patient and doctor of auto-cancellation
    try {
      const patientUser = await User.findById(
        await Patient.findById(appointment.patientId).userId
      );
      const doctorUser = await User.findById(
        await Doctor.findById(appointment.doctorId).userId
      );

      if (patientUser) {
        await notificationService.createNotification({
          recipientId: patientUser._id,
          type: "appointment",
          title: "Appointment Cancelled",
          message: `Your appointment scheduled for ${appointmentTime.toLocaleString()} was automatically cancelled due to pending payment.`,
          relatedTo: { model: "Appointment", id: appointment._id },
          isEmail: true,
          priority: "medium",
        });
      }
      if (doctorUser) {
        await notificationService.createNotification({
          recipientId: doctorUser._id,
          type: "appointment",
          title: "Appointment Auto-Cancelled",
          message: `The appointment for ${
            patientUser?.name || "a patient"
          } scheduled for ${appointmentTime.toLocaleString()} was automatically cancelled due to non-payment. The slot has been released.`,
          relatedTo: { model: "Appointment", id: appointment._id },
          isEmail: false, // Doctors might not need email for this
          priority: "low",
        });
      }
    } catch (notifyError) {
      console.error("Error sending auto-cancel notification:", notifyError);
    }

    return appointment; // Return the updated (cancelled) appointment
  }
  return appointment; // Return original if not expired/pending
}
// --- END HELPER ---

/**
 * Create appointment
 * @route POST /api/appointments
 * @access Private (Patient/Receptionist)
 */
export const createAppointment = async (req, res) => {
  try {
    const {
      // hospitalId, // This might not be sent directly by patient anymore
      patientId,
      doctorId,
      dateTime,
      reason,
      type = "regular",
      notes,
    } = req.body;

    // Determine hospitalId based on who is making the request
    let hospitalIdForAppointment;

    if (req.user.role === "patient") {
      const doctorForPatient = await Doctor.findById(doctorId).populate({
        path: "userId",
        select: "hospital",
      });
      if (
        !doctorForPatient ||
        !doctorForPatient.userId ||
        !doctorForPatient.userId.hospital
      ) {
        return res
          .status(404)
          .json({
            success: false,
            message: "Doctor or doctor's hospital not found.",
          });
      }
      hospitalIdForAppointment = doctorForPatient.userId.hospital;
    } else if (req.user.role === "receptionist") {
      hospitalIdForAppointment = req.user.hospital; // Receptionist's hospital
      // Additional check: ensure doctorId belongs to receptionist's hospital
      const doctorForStaff = await Doctor.findById(doctorId).populate(
        "userId",
        "hospital"
      );
      if (
        !doctorForStaff ||
        doctorForStaff.userId.hospital.toString() !==
          hospitalIdForAppointment.toString()
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Selected doctor does not belong to your hospital.",
          });
      }
    } else {
      return res
        .status(403)
        .json({
          success: false,
          message: "Unauthorized to create appointment.",
        });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

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

    const doctorUser = await User.findById(doctor.userId);
    if (
      !doctorUser ||
      doctorUser.hospital.toString() !== hospitalIdForAppointment.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: "Doctor does not belong to the specified hospital",
      });
    }

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

    const status =
      req.user.role === "receptionist" || req.user.role === "admin"
        ? "confirmed"
        : "scheduled";

    const appointment = await Appointment.create({
      hospitalId: hospitalIdForAppointment,
      patientId,
      doctorId,
      dateTime: appointmentDate,
      endTime,
      status,
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

    if (!doctor.slots_booked) doctor.slots_booked = {};
    if (!doctor.slots_booked[slotDate]) doctor.slots_booked[slotDate] = [];
    doctor.slots_booked[slotDate].push(slotTime);
    doctor.markModified("slots_booked");
    await doctor.save();

    // Notifications
    const patientUserForNotify = await User.findById(patient.userId); // For patient notification
    const hospitalOfAppointment = await Hospital.findById(
      hospitalIdForAppointment
    );

    if (patientUserForNotify) {
      await emailService.sendAppointmentConfirmationEmail(
        patientUserForNotify,
        appointment,
        { name: doctorUser.name },
        hospitalOfAppointment
      );
      await notificationService.createNotification({
        recipientId: patientUserForNotify._id,
        type: "appointment",
        title: `Appointment ${
          status === "confirmed" ? "Confirmed" : "Scheduled"
        }`,
        message: `Your appointment with Dr. ${
          doctorUser.name
        } on ${appointmentDate.toLocaleString()} is ${status}.`,
        relatedTo: { model: "Appointment", id: appointment._id },
        isEmail: false, // Email already sent
      });
    }

    await notificationService.createNotification({
      recipientId: doctorUser._id,
      type: "appointment",
      title: "New Appointment",
      message: `A new appointment has been ${status} for ${appointmentDate.toLocaleString()} with patient ${
        patientUserForNotify?.name || "N/A"
      }.`,
      relatedTo: { model: "Appointment", id: appointment._id },
      isEmail: true,
    });

    res.status(201).json({
      success: true,
      message: `Appointment ${status} successfully`,
      appointment,
    });
  } catch (error) {
    console.error("Create appointment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to book appointment",
      error: error.message,
    });
  }
};

/**
 * Get appointments
 * @route GET /api/appointments
 * @access Private
 */
export const getAppointments = async (req, res) => {
  try {
    const {
      hospitalId,
      doctorId,
      patientId,
      status,
      date,
      page = 1,
      limit = 10,
    } = req.query; //

    // Build query based on user role
    const query = {}; //
    // Add filters
    if (hospitalId) query.hospitalId = hospitalId; //
    if (doctorId) query.doctorId = doctorId; //
    if (patientId) query.patientId = patientId; //
    if (status) query.status = status; //

    // Date filter
    if (date) {
      const selectedDate = new Date(date); //
      selectedDate.setHours(0, 0, 0, 0); //
      const nextDay = new Date(selectedDate); //
      nextDay.setDate(selectedDate.getDate() + 1); //
      query.dateTime = {
        $gte: selectedDate,
        $lt: nextDay,
      }; //
    }

    // Role-based access
    if (req.user.role === "doctor") {
      // Doctors see only their appointments
      const doctor = await Doctor.findOne({ userId: req.user._id }); //
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: "Doctor profile not found",
        }); //
      }
      query.doctorId = doctor._id; //
    } else if (req.user.role === "patient") {
      // Patients see only their appointments
      const patient = await Patient.findOne({ userId: req.user._id }); //
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: "Patient profile not found",
        }); //
      }
      query.patientId = patient._id; //
    } else if (req.user.role === "receptionist" || req.user.role === "admin") {
      // Receptionists and admins see appointments from their hospital
      query.hospitalId = req.user.hospital; //
    }

    // Count total appointments
    const total = await Appointment.countDocuments(query); //
    // Get paginated appointments
    const appointments = await Appointment.find(query)
      .sort({ dateTime: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email image" },
      }) //
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name email image" }, //
      })
      .populate("createdBy", "name role"); //

    res.status(200).json({
      success: true,
      appointments,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      }, //
    });
  } catch (error) {
    console.error("Get appointments error:", error); //
    res.status(500).json({
      success: false,
      message: "Failed to get appointments",
      error: error.message,
    }); //
  }
};

/**
 * Get appointment details
 * @route GET /api/appointments/:id
 * @access Private
 */
export const getAppointmentDetails = async (req, res) => {
  try {
    const { id } = req.params;
    // Find appointment first
    const appointment = await Appointment.findById(id)
      .populate({
        // Populating necessary fields for access check and response
        path: "patientId",
        select: "userId hospitalId", // Select hospitalId here too
      })
      .populate({
        path: "doctorId",
        select: "userId", // Select userId for doctor check
      })
      .populate("hospitalId", "name") // Populate hospital name for context
      .populate("createdBy", "name role"); // Populate creator info

    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    }

    // Check and potentially auto-cancel BEFORE checking access
    // appointment = await handleExpiredPendingPayment(id); // Keep this if implemented

    // --- Access check logic ---
    let hasAccess = false;
    const userRole = req.user.role;
    const userHospitalId = req.user.hospital?.toString(); // Use optional chaining

    if (userRole === "superAdmin") {
      hasAccess = true;
    } else if (userRole === "admin" || userRole === "receptionist") {
      // **** CRITICAL CHECK: Ensure appointment has hospitalId populated ****
      const appointmentHospitalId = appointment.hospitalId?._id?.toString(); // Get the ID string
      if (!appointmentHospitalId) {
        console.error(`Appointment ${id} missing hospitalId for access check.`);
        return res.status(500).json({
          success: false,
          message: "Internal data error: Hospital missing on appointment.",
        });
      }
      hasAccess = appointmentHospitalId === userHospitalId;
    } else if (userRole === "doctor") {
      const doctor = await Doctor.findOne({ userId: req.user._id }).lean(); // Use lean for performance
      hasAccess =
        doctor &&
        appointment.doctorId?._id?.toString() === doctor._id.toString(); // Check doctor profile ID
    } else if (userRole === "patient") {
      const patient = await Patient.findOne({ userId: req.user._id }).lean(); // Use lean
      hasAccess =
        patient &&
        appointment.patientId?._id?.toString() === patient._id.toString();
    }

    if (!hasAccess) {
      console.warn(
        `Access Denied: User ${
          req.user._id
        } (Role: ${userRole}, Hospital: ${userHospitalId}) tried to access Appointment ${id} (Hospital: ${appointment.hospitalId?._id?.toString()})`
      );
      return res.status(403).json({ success: false, message: "Access Denied" });
    }
    // --- End Access Check ---

    // Fetch related data AFTER access check
    const medicalRecords = await MedicalRecord.find({ appointmentId: id }).sort(
      { date: -1 }
    );
    const labTests = await LabTest.find({ appointmentId: id }).sort({
      requestDate: -1,
    });
    const radiologyTests = await RadiologyReport.find({
      appointmentId: id,
    }).sort({ requestDate: -1 });

    // Repopulate user details for response after the main object is fetched
    await appointment.populate([
      {
        path: "patientId",
        populate: { path: "userId", select: "name email image phone" },
      },
      {
        path: "doctorId",
        populate: { path: "userId", select: "name email image" },
      },
    ]);

    res.status(200).json({
      success: true,
      appointment,
      medicalRecords,
      labTests,
      radiologyTests,
    });
  } catch (error) {
    console.error(
      `Get appointment details error for ID ${req.params.id}:`,
      error
    ); // Log the specific ID
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid appointment ID format." });
    }
    res.status(500).json({
      success: false,
      message: "Failed to get appointment details",
      error: error.message,
    });
  }
};

/**
 * Update appointment status
 * @route PUT /api/appointments/:id/status
 * @access Private (Doctor, Receptionist, Admin)
 */

export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    let appointment = await Appointment.findById(id);
    if (!appointment) {
      /* handle not found */
    }

    // Check and potentially auto-cancel first
    appointment = await handleExpiredPendingPayment(id);

    // Check permissions (as before)...
    let hasPermission = false;
    if (req.user.role === "superAdmin" || req.user.role === "admin") {
      hasPermission = true;
    } else if (req.user.role === "receptionist") {
      hasPermission =
        appointment.hospitalId.toString() === req.user.hospital.toString();
    } else if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      hasPermission =
        doctor && appointment.doctorId.toString() === doctor._id.toString();
    }

    if (!hasPermission) {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    // Prevent changing status if it was auto-cancelled, unless the new status IS cancelled
    if (appointment.status === "cancelled" && status !== "cancelled") {
      return res.status(400).json({
        success: false,
        message:
          "Cannot update status of a cancelled appointment (may be due to non-payment).",
      });
    }

    // Prevent changing status of completed appointment
    if (appointment.status === "completed" && status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot change status of a completed appointment",
      });
    }

    // Update appointment
    appointment.status = status;
    if (notes) {
      appointment.notes = appointment.notes
        ? `${appointment.notes}\n${notes}`
        : notes;
    }
    await appointment.save();

    // Notify patient/doctor (as before)...

    res.status(200).json({
      success: true,
      message: "Appointment status updated",
      appointment,
    });
  } catch (error) {
    console.error("Update appointment status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update status",
      error: error.message,
    });
  }
};

/**
 * Cancel appointment
 * @route PUT /api/appointments/:id/cancel
 * @access Private
 */
export const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params; //
    const { reason } = req.body; //
    // Find appointment
    const appointment = await Appointment.findById(id); //
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      }); //
    }

    // Check permission based on role
    let hasPermission = false; //
    if (req.user.role === "superAdmin" || req.user.role === "admin") {
      hasPermission = true; //
    } else if (req.user.role === "receptionist") {
      hasPermission =
        appointment.hospitalId.toString() === req.user.hospital.toString(); //
    } else if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: req.user._id }); //
      hasPermission =
        doctor && appointment.doctorId.toString() === doctor._id.toString(); //
    } else if (req.user.role === "patient") {
      const patient = await Patient.findOne({ userId: req.user._id }); //
      hasPermission =
        patient && appointment.patientId.toString() === patient._id.toString(); //
      // Patients can only cancel appointments at least 24 hours in advance
      if (hasPermission) {
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
      }
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to cancel this appointment",
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

    // Update appointment
    appointment.status = "cancelled"; //
    appointment.notes = reason
      ? `${appointment.notes || ""}\nCancellation reason: ${reason}` //
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

    // Notify relevant parties
    const patient = await Patient.findById(appointment.patientId); //
    const patientUser = await User.findById(patient.userId); //
    if (patientUser && req.user.role !== "patient") {
      await notificationService.createNotification({
        recipientId: patientUser._id,
        type: "appointment",
        title: "Appointment Cancelled",
        message: `Your appointment scheduled for ${new Date(
          appointment.dateTime
        ).toLocaleString()} has been cancelled.`,
        relatedTo: {
          model: "Appointment", //
          id: appointment._id,
        },
        isEmail: true,
      }); //
    }

    const doctorUser = await User.findById(
      (
        await Doctor.findById(appointment.doctorId)
      ).userId
    ); //
    if (doctorUser && req.user.role !== "doctor") {
      await notificationService.createNotification({
        recipientId: doctorUser._id,
        type: "appointment",
        title: "Appointment Cancelled",
        message: `An appointment scheduled for ${new Date(
          appointment.dateTime
        ).toLocaleString()} has been cancelled.`,
        relatedTo: {
          model: "Appointment",
          id: appointment._id, //
        },
        isEmail: true,
      }); //
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
 * @route PUT /api/appointments/:id/reschedule
 * @access Private
 */
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

    // Check and potentially auto-cancel first
    appointment = await handleExpiredPendingPayment(id);

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

    // Get old appointment info for comparison and logging
    const oldAppointmentTime = new Date(appointment.dateTime);
    const oldSlotDate = formatSlotDate(oldAppointmentTime);

    // Get the old slot time in 24-hour format for consistency
    const oldSlotTime = oldAppointmentTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Prepare new appointment information
    const newAppointmentDate = new Date(dateTime);
    const newSlotDate = formatSlotDate(newAppointmentDate);

    // Get the new slot time in 24-hour format
    const newSlotTime = newAppointmentDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    console.log("Rescheduling appointment:");
    console.log("Old slot date key:", oldSlotDate);
    console.log("Old slot time:", oldSlotTime);
    console.log("New slot date key:", newSlotDate);
    console.log("New slot time:", newSlotTime);

    // Check if new slot is already booked
    if (doctor.slots_booked && doctor.slots_booked[newSlotDate]) {
      const bookedSlots = doctor.slots_booked[newSlotDate];
      console.log("Booked slots for the new date:", bookedSlots);

      // Check if the new slot is already booked by comparing time strings
      const isBooked = bookedSlots.some((time) => {
        const bookedTime24Hour = convertTo24HourFormat(time);
        return bookedTime24Hour === newSlotTime;
      });

      if (isBooked) {
        return res.status(400).json({
          success: false,
          message: "Selected time slot is not available",
        });
      }
    }

    // Initialize slots_booked if it doesn't exist
    if (!doctor.slots_booked) {
      doctor.slots_booked = {};
    }

    // Remove the old slot from the doctor's booked slots
    if (doctor.slots_booked[oldSlotDate]) {
      console.log(
        "Before removing old slot:",
        doctor.slots_booked[oldSlotDate]
      );

      doctor.slots_booked[oldSlotDate] = doctor.slots_booked[
        oldSlotDate
      ].filter((time) => {
        // Compare the time strings directly and also in 24-hour format for robustness
        const bookedTime24Hour = convertTo24HourFormat(time);
        return bookedTime24Hour !== oldSlotTime;
      });

      console.log("After removing old slot:", doctor.slots_booked[oldSlotDate]);

      // Clean up empty arrays
      if (doctor.slots_booked[oldSlotDate].length === 0) {
        delete doctor.slots_booked[oldSlotDate];
      }
    }

    // Book the new time slot
    if (!doctor.slots_booked[newSlotDate]) {
      doctor.slots_booked[newSlotDate] = [];
    }

    // Add the new slot time in 24-hour format for consistency
    doctor.slots_booked[newSlotDate].push(newSlotTime);

    console.log("Updated doctor.slots_booked:", doctor.slots_booked);

    // Save the doctor document with updated slots
    doctor.markModified("slots_booked");
    const savedDoctor = await doctor.save();
    console.log("Saved doctor successfully:", !!savedDoctor);

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

    // Save the updated appointment
    const savedAppointment = await appointment.save();
    console.log("Saved appointment successfully:", !!savedAppointment);

    // Notify doctor (code from your original implementation)
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

export default {
  createAppointment,
  getAppointments,
  getAppointmentDetails,
  updateAppointmentStatus,
  cancelAppointment,
  rescheduleAppointment,
};
