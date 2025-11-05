// controllers/radiologyController.js
import User from "../models/User.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import RadiologyReport from "../models/RadiologyReport.js";
import Staff from "../models/Staff.js"; // Import Staff model for profile details
import Hospital from "../models/Hospital.js"; // Import Hospital model for profile details
import { v2 as cloudinary } from "cloudinary";
import emailService from "../services/emailService.js";
import notificationService from "../services/notificationService.js";
import mongoose from "mongoose";

/**
 * Get radiologist dashboard data
 * @route GET /api/radiology/dashboard
 * @access Private (Radiologist)
 */
export const getDashboard = async (req, res) => {
  try {
    const hospitalId = req.user.hospital; //
    // Get pending requests
    const pendingRequests = await RadiologyReport.find({
      hospitalId,
      status: { $in: ["requested", "scheduled", "in-progress"] }, // Include in-progress
    })
      .sort({ requestDate: -1 })
      .limit(5)
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email image" },
      }) //
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" }, //
      });
    // Get recent completed reports (by this radiologist)
    const recentReports = await RadiologyReport.find({
      hospitalId,
      status: "completed",
      radiologist: req.user._id, // Filter by current radiologist
    })
      .sort({ completedDate: -1 })
      .limit(5)
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email image" },
      }) //
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" }, //
      });
    // Get counts
    const requestedCount = await RadiologyReport.countDocuments({
      hospitalId,
      status: "requested",
    }); //
    const scheduledCount = await RadiologyReport.countDocuments({
      hospitalId,
      status: "scheduled",
    }); //
    const inProgressCount = await RadiologyReport.countDocuments({
      hospitalId,
      status: "in-progress", // Count only in-progress explicitly
    }); //
    const completedCount = await RadiologyReport.countDocuments({
      hospitalId,
      status: "completed",
    }); //
    const myCompletedCount = await RadiologyReport.countDocuments({
      hospitalId,
      status: "completed",
      radiologist: req.user._id,
    }); //
    res.status(200).json({
      success: true,
      dashboardData: {
        pendingRequests,
        recentReports,
        stats: {
          requestedCount,
          scheduledCount,
          inProgressCount,
          completedCount,
          myCompletedCount,
        }, //
      },
    });
  } catch (error) {
    console.error("Radiology dashboard error:", error); //
    res.status(500).json({
      success: false,
      message: "Failed to get dashboard data",
      error: error.message,
    }); //
  }
};

/**
 * Get radiologist profile
 * @route GET /api/radiology/profile
 * @access Private (Radiologist)
 */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password")
      .populate("department", "name"); //
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      }); //
    }
    // Get staff details
    const staffProfile = await Staff.findOne({
      userId: user._id,
      staffType: "radiologist", // Ensure it's the correct staff type
    }); //
    // Get hospital details
    const hospital = await Hospital.findById(user.hospital).select(
      "name address contactNumber"
    ); //
    res.status(200).json({
      success: true,
      profile: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          image: user.image,
          department: user.department,
        }, //
        staffDetails: staffProfile, //
        hospital, //
      },
    });
  } catch (error) {
    console.error("Get radiologist profile error:", error); //
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
      error: error.message,
    }); //
  }
};

/**
 * Update radiologist profile
 * @route PUT /api/radiology/profile
 * @access Private (Radiologist)
 */
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id); //
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      }); //
    }
    const { name, phone } = req.body; //

    // Upload profile image if provided
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "staff", // Can reuse staff folder or create a new one
        resource_type: "image",
      });
      user.image = result.secure_url;
    }

    // Update user fields
    if (name) user.name = name; //
    if (phone) user.phone = phone; //
    await user.save(); //
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
        }, //
      },
    });
  } catch (error) {
    console.error("Update radiologist profile error:", error); //
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    }); //
  }
};

/**
 * Get radiology requests
 * @route GET /api/radiology/requests
 * @access Private (Radiologist)
 */
export const getRadiologyRequests = async (req, res) => {
  try {
    const hospitalId = req.user.hospital; //
    const { page = 1, limit = 10, status, priority, search } = req.query; //
    // Build query
    const query = { hospitalId }; //
    if (status) {
      if (status === "pending") {
        query.status = { $in: ["requested", "scheduled", "in-progress"] }; // Include in-progress
      } else {
        query.status = status; //
      }
    }
    if (priority) {
      query.priority = priority; //
    }
    // Handle search
    if (search) {
      // Find patients with matching names
      const patients = await Patient.find({ hospitalId })
        .populate({
          path: "userId",
          match: { name: { $regex: search, $options: "i" } },
          select: "_id",
        }) //
        .select("_id") //
        .lean(); //
      const matchingPatientIds = patients
        .filter((p) => p.userId) // Filter out patients whose user didn't match
        .map((p) => p._id); //
      // Find doctors with matching names
      const doctors = await Doctor.find()
        .populate({
          path: "userId",
          match: {
            name: { $regex: search, $options: "i" },
            hospital: hospitalId,
          }, //
          select: "_id",
        }) //
        .select("_id") //
        .lean(); //
      const matchingDoctorIds = doctors
        .filter((d) => d.userId) // Filter out doctors whose user didn't match
        .map((d) => d._id); //

      const searchConditions = [];

      if (matchingPatientIds.length > 0) {
        searchConditions.push({ patientId: { $in: matchingPatientIds } });
      }
      if (matchingDoctorIds.length > 0) {
        searchConditions.push({ doctorId: { $in: matchingDoctorIds } });
      }

      // Also search in report fields
      searchConditions.push({
        procedureType: { $regex: search, $options: "i" },
      });
      searchConditions.push({ bodyPart: { $regex: search, $options: "i" } });
      searchConditions.push({ notes: { $regex: search, $options: "i" } });

      if (searchConditions.length > 0) {
        query.$or = searchConditions;
      } else {
        query._id = null; // Force no results
      }
    }
    // Count total requests
    const total = await RadiologyReport.countDocuments(query); //
    // Get paginated requests
    const radiologyRequests = await RadiologyReport.find(query)
      .sort({ requestDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email image" },
      }) //
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" }, //
      })
      .populate("radiologist", "name") //
      .select('+payment.status');

    res.status(200).json({
      success: true,
      radiologyRequests,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      }, //
    });
  } catch (error) {
    console.error("Get radiology requests error:", error); //
    res.status(500).json({
      success: false,
      message: "Failed to get radiology requests",
      error: error.message,
    }); //
  }
};

/**
 * Get radiology request details
 * @route GET /api/radiology/requests/:id
 * @access Private (Radiologist)
 */
/**
 * Get radiology request details
 * @route GET /api/radiology/requests/:id
 * @access Private (Radiologist)
 */
export const getRadiologyRequestDetails = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { id } = req.params;

    // Add robust ID validation using imported mongoose
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid radiology report ID format",
      });
    }

    const radiologyReport = await RadiologyReport.findOne({
      _id: id,
      hospitalId,
    })
      // ... rest of the populates remain the same
      .populate({
        path: "patientId",
        populate: {
          path: "userId",
          select: "name email image phone dob gender",
        }, // Include more patient details
      })
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name email" },
      })
      .populate("appointmentId", "dateTime reason") // Populate related appointment info
      .populate("radiologist", "name email"); //

    if (!radiologyReport) {
      return res.status(404).json({
        success: false,
        message: "Radiology request not found",
      }); //
    }
    // Get related radiology reports for this patient
    const relatedReports = await RadiologyReport.find({
      patientId: radiologyReport.patientId._id,
      hospitalId,
      _id: { $ne: id },
    })
      .sort({ requestDate: -1 })
      .limit(5)
      .select("procedureType bodyPart status requestDate completedDate"); //

    res.status(200).json({
      success: true,
      radiologyReport,
      relatedReports, //
    });
  } catch (error) {
    // Log the actual error for server-side debugging
    console.error(
      `Get radiology request details error for ID ${req.params.id}:`,
      error
    );
    // Check if it's a CastError (often due to invalid ID format despite the check)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid radiology report ID format provided.",
        error: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to get radiology request details",
      error: error.message,
    }); //
  }
};

/**
 * Update request status
 * @route PUT /api/radiology/requests/:id/status
 * @access Private (Radiologist)
 */
export const updateRequestStatus = async (req, res) => {
  try {
    const hospitalId = req.user.hospital; //
    const { id } = req.params; //
    const { status, scheduledDate, notes } = req.body; //

    // Validate status
    const validStatuses = [
      "requested",
      "scheduled",
      "in-progress",
      "completed",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    // Find radiology report
    const radiologyReport = await RadiologyReport.findOne({
      _id: id,
      hospitalId,
    }); //
    if (!radiologyReport) {
      return res.status(404).json({
        success: false,
        message: "Radiology request not found",
      }); //
    }
    // Check if report can be updated
    // --- ADD THIS CHECK ---
    const allowedUpdateStatuses = ["scheduled", "in-progress", "cancelled"];
    if (
      allowedUpdateStatuses.includes(status) &&
      radiologyReport.status !== "confirmed"
    ) {
      if (radiologyReport.status === "requested") {
        return res.status(400).json({
          success: false,
          message:
            'Payment must be confirmed before updating status beyond "requested".',
        });
      } else if (
        status === "in-progress" &&
        radiologyReport.status !== "confirmed" &&
        radiologyReport.status !== "scheduled"
      ) {
        // Allow moving to in-progress only from confirmed or scheduled
        return res.status(400).json({
          success: false,
          message: `Cannot move test to 'in-progress' from status '${radiologyReport.status}'. Payment may be pending.`,
        });
      }
      // Add other specific transitions if needed
    }
    // --- END CHECK ---

    // Update test status if provided and different
    if (status && status !== radiologyReport.status) {
      radiologyReport.status = status; //
      // Assign to self if taking ownership
      if (status === "in-progress" && !radiologyReport.radiologist) {
        radiologyReport.radiologist = req.user._id; //
      }
      // Set completed date if completed
      if (status === "completed") {
        radiologyReport.completedDate = new Date(); //
      }
    }

    if (scheduledDate) {
      radiologyReport.scheduledDate = new Date(scheduledDate); //
    }
    if (notes) {
      radiologyReport.notes = notes; //
    }

    await radiologyReport.save(); //

    // Populate necessary fields for notification
    await radiologyReport.populate([
      { path: "patientId", populate: { path: "userId", select: "name email" } },
      { path: "doctorId", populate: { path: "userId", select: "name email" } },
    ]);

    // Notify patient
    const patientUser = radiologyReport.patientId.userId; //
    if (patientUser) {
      await notificationService.createNotification({
        recipientId: patientUser._id,
        type: "radiology-result",
        title: "Radiology Request Status Updated",
        message: `Your ${radiologyReport.procedureType} for ${radiologyReport.bodyPart} status has been updated to ${radiologyReport.status}.`,
        relatedTo: {
          model: "RadiologyReport",
          id: radiologyReport._id, //
        },
        isEmail: ["completed", "cancelled"].includes(radiologyReport.status), // Only email for final statuses
      }); //
    }
    // Notify doctor
    const doctorUser = radiologyReport.doctorId.userId; //
    if (doctorUser) {
      await notificationService.createNotification({
        recipientId: doctorUser._id,
        type: "radiology-result",
        title: "Radiology Request Status Updated",
        message: `The radiology request ${radiologyReport.procedureType} for patient ${patientUser.name} has been updated to ${radiologyReport.status}.`,
        relatedTo: {
          model: "RadiologyReport",
          id: radiologyReport._id, //
        },
        isEmail: radiologyReport.status === "completed", // Only email doctor when completed
      }); //
    }
    res.status(200).json({
      success: true,
      message: "Request status updated successfully",
      radiologyReport, // Return updated report
    });
  } catch (error) {
    console.error("Update request status error:", error); //
    res.status(500).json({
      success: false,
      message: "Failed to update request status",
      error: error.message,
    }); //
  }
};

/**
 * Upload radiology results (report findings and images)
 * @route POST /api/radiology/results/:id
 * @access Private (Radiologist)
 */
export const uploadRadiologyResults = async (req, res) => {
  try {
    const hospitalId = req.user.hospital; //
    const { id } = req.params; // RadiologyReport ID
    const { findings, impression, recommendations } = req.body; //

    // Find radiology report
    const radiologyReport = await RadiologyReport.findOne({
      _id: id,
      hospitalId,
    }); //
    if (!radiologyReport) {
      return res.status(404).json({
        success: false,
        message: "Radiology request not found",
      }); //
    }
    // Check if report is in a valid state
    // --- ADD THIS CHECK ---
    // Allow upload only if test is confirmed or already in progress
    if (!["confirmed", "in-progress"].includes(radiologyReport.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot upload results for request with status '${radiologyReport.status}'. Payment may be pending or test not started.`,
      });
    }
    // --- END CHECK ---

    // Check if files are uploaded (for images)
    if (!req.files || req.files.length === 0) {
      // Allow updating findings without new images? Yes.
      // If findings/impression are also missing, then require images.
      if (
        !findings &&
        !impression &&
        (!radiologyReport.images || radiologyReport.images.length === 0)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Findings, impression, or images are required to complete the report.",
        });
      }
    }

    // Upload images if provided
    const uploadedImages = []; //
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "radiology-images",
          resource_type: "image", // Assuming images for radiology
        }); //
        uploadedImages.push({
          url: result.secure_url, //
          description: file.originalname, //
          uploadedAt: new Date(), //
        });
      }
    }

    // Update radiology report
    radiologyReport.status = "completed"; // Mark as completed when results are added
    radiologyReport.completedDate = new Date(); //
    radiologyReport.findings = findings; //
    radiologyReport.impression = impression; //
    radiologyReport.recommendations = recommendations; //
    // Append new images to existing ones, if any
    radiologyReport.images = [
      ...(radiologyReport.images || []),
      ...uploadedImages,
    ]; //
    radiologyReport.radiologist = req.user._id; // Assign the current radiologist
    radiologyReport.isVerified = true; // Assume verified on upload
    radiologyReport.verifiedBy = req.user._id; //
    radiologyReport.verifiedAt = new Date(); //
    await radiologyReport.save(); //

    // Populate necessary fields for notification
    await radiologyReport.populate([
      { path: "patientId", populate: { path: "userId", select: "name email" } },
      { path: "doctorId", populate: { path: "userId", select: "name email" } },
    ]);

    // Notify patient
    const patientUser = radiologyReport.patientId.userId; //
    if (patientUser) {
      await notificationService.createNotification({
        recipientId: patientUser._id,
        type: "radiology-result",
        title: "Radiology Results Available",
        message: `Your ${radiologyReport.procedureType} results are now available.`,
        relatedTo: {
          model: "RadiologyReport",
          id: radiologyReport._id, //
        },
        isEmail: true, //
      });
    }
    // Notify doctor
    const doctorUser = radiologyReport.doctorId.userId; //
    if (doctorUser) {
      await notificationService.createNotification({
        recipientId: doctorUser._id,
        type: "radiology-result",
        title: "Radiology Results Available",
        message: `The radiology results for ${radiologyReport.procedureType} for patient ${patientUser.name} are now available.`,
        relatedTo: {
          model: "RadiologyReport",
          id: radiologyReport._id, //
        },
        isEmail: true, //
      });
    }
    res.status(200).json({
      success: true,
      message: "Radiology results uploaded successfully",
      radiologyReport,
    }); //
  } catch (error) {
    console.error("Upload radiology results error:", error); //
    res.status(500).json({
      success: false,
      message: "Failed to upload radiology results",
      error: error.message,
    }); //
  }
};

/**
 * Get radiology results (completed reports)
 * @route GET /api/radiology/results
 * @access Private (Radiologist)
 */
export const getRadiologyResults = async (req, res) => {
  try {
    const hospitalId = req.user.hospital; //
    const { page = 1, limit = 10, search, onlyMine } = req.query; //
    // Build query
    const query = {
      hospitalId,
      status: "completed", // Only fetch completed reports
    }; //
    if (onlyMine === "true") {
      query.radiologist = req.user._id; // Filter by current radiologist
    }
    // Handle search
    if (search) {
      // Find patients with matching names
      const patients = await Patient.find({ hospitalId })
        .populate({
          path: "userId",
          match: { name: { $regex: search, $options: "i" } },
          select: "_id",
        }) //
        .select("_id") //
        .lean(); //
      const matchingPatientIds = patients
        .filter((p) => p.userId) // Filter out patients whose user didn't match
        .map((p) => p._id); //

      const searchConditions = [];
      if (matchingPatientIds.length > 0) {
        searchConditions.push({ patientId: { $in: matchingPatientIds } });
      }

      // Search in radiology report fields
      searchConditions.push({
        procedureType: { $regex: search, $options: "i" },
      });
      searchConditions.push({ bodyPart: { $regex: search, $options: "i" } });
      searchConditions.push({ findings: { $regex: search, $options: "i" } });
      searchConditions.push({ impression: { $regex: search, $options: "i" } });

      if (searchConditions.length > 0) {
        query.$or = searchConditions;
      } else {
        query._id = null; // Force no results if search matches nothing
      }
    }
    // Count total reports
    const total = await RadiologyReport.countDocuments(query); //
    // Get paginated reports
    const radiologyReports = await RadiologyReport.find(query)
      .sort({ completedDate: -1 }) // Sort by completion date
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email image" },
      }) //
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" }, //
      })
      .populate("radiologist", "name"); //

    res.status(200).json({
      success: true,
      radiologyReports,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      }, //
    });
  } catch (error) {
    console.error("Get radiology results error:", error); //
    res.status(500).json({
      success: false,
      message: "Failed to get radiology results",
      error: error.message,
    }); //
  }
};

/**
 * Get Radiology Report Details by ID
 * @route GET /api/radiology/results/:reportId
 * @access Private (Radiologist, Doctor, Admin)
 */
/**
 * Get Radiology Report Details by ID (Usually for viewing completed ones)
 * @route GET /api/radiology/results/:reportId
 * @access Private (Radiologist, Doctor, Admin, Patient)
 */
export const getRadiologyReportDetails = async (req, res) => {
  try {
    const { reportId } = req.params;
    const hospitalId = req.user.hospital; // Assuming hospital context is needed

    // Validate ID format
    if (!reportId || !mongoose.isValidObjectId(reportId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid radiology report ID format",
      });
    }

    const report = await RadiologyReport.findById(reportId)
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email image dob gender" },
      })
      .populate({
        path: "doctorId", // Doctor who requested
        populate: { path: "userId", select: "name" },
      })
      .populate({
        // Populate appointment if linked
        path: "appointmentId",
        select: "doctorId dateTime", // Select necessary fields
        populate: { path: "doctorId", select: "_id" }, // Populate doctorId from appointment
      })
      .populate("radiologist", "name") // Radiologist who completed
      .populate("verifiedBy", "name");

    if (!report) {
      return res
        .status(404)
        .json({ success: false, message: "Radiology report not found" });
    }

    // Check access: Users from the same hospital, or the requesting Doctor, or the doctor from the linked appointment, or the Patient themselves
    let hasAccess = false;
    const userRole = req.user.role;
    const userId = req.user._id;

    if (
      [
        "admin",
        "receptionist",
        "labTechnician",
        "radiologist",
        "nurse",
      ].includes(userRole)
    ) {
      // Staff from the same hospital
      hasAccess = report.hospitalId.toString() === hospitalId?.toString();
    } else if (userRole === "doctor") {
      const doctor = await Doctor.findOne({ userId: userId }).lean();
      if (doctor) {
        // Doctor requested it OR doctor treated patient in the linked appointment
        const isRequestingDoctor =
          report.doctorId &&
          report.doctorId.toString() === doctor._id.toString();
        const isAppointmentDoctor =
          report.appointmentId &&
          report.appointmentId.doctorId &&
          report.appointmentId.doctorId.toString() === doctor._id.toString();
        hasAccess = isRequestingDoctor || isAppointmentDoctor;
      }
    } else if (userRole === "patient") {
      const patient = await Patient.findOne({ userId: userId }).lean();
      hasAccess =
        patient && report.patientId._id.toString() === patient._id.toString();
    }

    // Allow Super Admin always
    if (!hasAccess && userRole !== "superAdmin") {
      return res
        .status(403)
        .json({ success: false, message: "Access denied to view this report" });
    }

    res.status(200).json({ success: true, report });
  } catch (error) {
    console.error(
      `Get radiology report details error for ID ${req.params.reportId}:`,
      error
    );
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid radiology report ID format provided.",
        error: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to get radiology report details",
      error: error.message,
    });
  }
};

export default {
  getDashboard,
  getProfile,
  updateProfile,
  getRadiologyRequests,
  getRadiologyRequestDetails,
  updateRequestStatus,
  uploadRadiologyResults,
  getRadiologyResults,
  getRadiologyReportDetails, // Added
};
