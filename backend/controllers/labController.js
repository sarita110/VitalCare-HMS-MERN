import User from "../models/User.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import LabTest from "../models/LabTest.js";
import LabReport from "../models/LabReport.js";
import Staff from "../models/Staff.js"; // Import Staff model for profile details
import Hospital from "../models/Hospital.js"; // Import Hospital model for profile details
import { v2 as cloudinary } from "cloudinary";
import emailService from "../services/emailService.js";
import notificationService from "../services/notificationService.js";
import MedicalRecord from "../models/MedicalRecord.js"; // Import MedicalRecord model for updating records
import mongoose from "mongoose";

/**
 * Get lab technician dashboard data
 * @route GET /api/lab/dashboard
 * @access Private (Lab Technician)
 */
export const getDashboard = async (req, res) => {
  try {
    const hospitalId = req.user.hospital; //
    // Get pending tests
    const pendingTests = await LabTest.find({
      hospitalId,
      status: {
        $in: ["requested", "scheduled", "sample-collected", "in-progress"],
      }, // Include in-progress here too
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
    // Get recent results (completed by this tech)
    const recentResults = await LabReport.find({
      hospitalId,
      technician: req.user._id, // Filter by current technician
    })
      .sort({ reportDate: -1 })
      .limit(5)
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email image" },
      }) //
      .populate("testId", "testName testType"); // Populate test name/type from LabTest

    // Get counts
    const requestedCount = await LabTest.countDocuments({
      hospitalId,
      status: "requested",
    }); //
    const scheduledCount = await LabTest.countDocuments({
      hospitalId,
      status: "scheduled",
    }); //
    const inProgressCount = await LabTest.countDocuments({
      hospitalId,
      status: { $in: ["sample-collected", "in-progress"] },
    }); //
    const completedCount = await LabTest.countDocuments({
      hospitalId,
      status: "completed",
    }); //
    const myCompletedCount = await LabReport.countDocuments({
      hospitalId,
      technician: req.user._id,
    }); //

    res.status(200).json({
      success: true,
      dashboardData: {
        pendingTests,
        recentResults,
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
    console.error("Lab dashboard error:", error); //
    res.status(500).json({
      success: false,
      message: "Failed to get dashboard data",
      error: error.message,
    }); //
  }
};

/**
 * Get lab technician profile
 * @route GET /api/lab/profile
 * @access Private (Lab Technician)
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
      staffType: "labTechnician", // Ensure it's the correct staff type
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
    console.error("Get lab profile error:", error); //
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
      error: error.message,
    }); //
  }
};

/**
 * Update lab technician profile
 * @route PUT /api/lab/profile
 * @access Private (Lab Technician)
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
    console.error("Update lab profile error:", error); //
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    }); //
  }
};

/**
 * Get lab requests
 * @route GET /api/lab/requests
 * @access Private (Lab Technician)
 */
export const getLabRequests = async (req, res) => {
  try {
    const hospitalId = req.user.hospital; //
    const { page = 1, limit = 10, status, priority, search } = req.query; //
    // Build query
    const query = { hospitalId }; //
    if (status) {
      if (status === "pending") {
        query.status = {
          $in: ["requested", "scheduled", "sample-collected", "in-progress"],
        }; //
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

      // Also search in test fields directly
      searchConditions.push({ testName: { $regex: search, $options: "i" } });
      searchConditions.push({ testType: { $regex: search, $options: "i" } });
      searchConditions.push({ description: { $regex: search, $options: "i" } });

      if (searchConditions.length > 0) {
        query.$or = searchConditions;
      } else {
        // If search term doesn't match patients or doctors, and it's not in test fields, return empty
        query._id = null; // Force no results if search doesn't match anything potentially
      }
    }
    // Count total lab tests
    const total = await LabTest.countDocuments(query); //
    // Get paginated lab tests
    const labTests = await LabTest.find(query)
      .sort({ requestDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email image" },
      }) //
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" }, //
      })
      .populate("resultId", "reportDate isVerified") // Populate only needed fields from report
      .populate("assignedTo", "name"); //

    res.status(200).json({
      success: true,
      labTests,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      }, //
    });
  } catch (error) {
    console.error("Get lab requests error:", error); //
    res.status(500).json({
      success: false,
      message: "Failed to get lab requests",
      error: error.message,
    }); //
  }
};

/**
 * Get lab request details
 * @route GET /api/lab/requests/:id
 * @access Private (Lab Technician)
 */
export const getLabRequestDetails = async (req, res) => {
  try {
    const hospitalId = req.user.hospital; //
    const { id } = req.params; //
    // Find lab test
    const labTest = await LabTest.findOne({
      _id: id,
      hospitalId,
    })
      .populate({
        path: "patientId",
        populate: {
          path: "userId",
          select: "name email image phone dob gender bloodGroup",
        }, // Include more patient details
      })
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name email" },
      })
      .populate("resultId") // Populate full report if needed here
      .populate("appointmentId", "dateTime reason") // Populate related appointment info
      .populate("assignedTo", "name email"); //

    if (!labTest) {
      return res.status(404).json({
        success: false,
        message: "Lab test not found",
      }); //
    }
    // Get related lab tests for this patient
    const relatedTests = await LabTest.find({
      patientId: labTest.patientId._id,
      hospitalId,
      _id: { $ne: id },
    })
      .sort({ requestDate: -1 })
      .limit(5)
      .select("testName testType status requestDate resultId") // Select only needed fields
      .populate("resultId", "reportDate isVerified"); // Populate only needed fields from report

    res.status(200).json({
      success: true,
      labTest,
      relatedTests, //
    });
  } catch (error) {
    console.error("Get lab request details error:", error); //
    res.status(500).json({
      success: false,
      message: "Failed to get lab request details",
      error: error.message,
    }); //
  }
};

/**
 * Update test status
 * @route PUT /api/lab/requests/:id/status
 * @access Private (Lab Technician)
 */
export const updateTestStatus = async (req, res) => {
  try {
    const hospitalId = req.user.hospital; //
    const { id } = req.params; //
    const { status, scheduledDate, notes } = req.body; //

    // Validate status
    const validStatuses = [
      "requested",
      "scheduled",
      "sample-collected",
      "in-progress",
      "completed",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    // Find lab test
    const labTest = await LabTest.findOne({
      _id: id,
      hospitalId,
    }); //
    if (!labTest) {
      return res.status(404).json({
        success: false,
        message: "Lab test not found",
      }); //
    }

    // Check if test can be updated
    // --- ADD THIS CHECK ---
    const allowedUpdateStatuses = [
      "scheduled",
      "sample-collected",
      "in-progress",
      "cancelled",
    ];
    if (
      allowedUpdateStatuses.includes(status) &&
      labTest.status !== "confirmed"
    ) {
      if (labTest.status === "requested") {
        return res.status(400).json({
          success: false,
          message:
            'Payment must be confirmed before updating status beyond "requested".',
        });
      } else if (labTest.status !== "in-progress" && status === "in-progress") {
        // Allow moving to in-progress only from confirmed or sample-collected
        if (
          labTest.status !== "confirmed" &&
          labTest.status !== "sample-collected"
        ) {
          return res.status(400).json({
            success: false,
            message: `Cannot move test to 'in-progress' from status '${labTest.status}'. Payment may be pending.`,
          });
        }
      }
      // Add other specific transitions if needed
    }
    // --- END CHECK ---

    // Update test status if provided and different
    if (status && status !== labTest.status) {
      labTest.status = status; //
      // Assign to self if taking ownership
      if (
        ["sample-collected", "in-progress"].includes(status) &&
        !labTest.assignedTo
      ) {
        labTest.assignedTo = req.user._id; //
      }
    }

    if (scheduledDate) {
      labTest.scheduledDate = new Date(scheduledDate); //
    }

    if (notes) {
      labTest.notes = notes; //
    }

    await labTest.save(); //

    // Populate necessary fields for notification
    await labTest.populate([
      { path: "patientId", populate: { path: "userId", select: "name email" } },
      { path: "doctorId", populate: { path: "userId", select: "name email" } },
    ]);

    // Notify patient
    const patientUser = labTest.patientId.userId; // Already populated
    if (patientUser) {
      await notificationService.createNotification({
        recipientId: patientUser._id,
        type: "lab-result",
        title: "Lab Test Status Updated",
        message: `Your ${labTest.testName} status has been updated to ${labTest.status}.`, // Use updated status
        relatedTo: {
          model: "LabTest",
          id: labTest._id,
        },
        isEmail: ["completed", "cancelled"].includes(labTest.status), // Only email for final statuses
      }); //
    }
    // Notify doctor
    const doctorUser = labTest.doctorId.userId; // Already populated
    if (doctorUser) {
      await notificationService.createNotification({
        recipientId: doctorUser._id,
        type: "lab-result",
        title: "Lab Test Status Updated",
        message: `The lab test ${labTest.testName} for patient ${patientUser.name} has been updated to ${labTest.status}.`,
        relatedTo: {
          model: "LabTest",
          id: labTest._id,
        },
        isEmail: labTest.status === "completed", // Only email doctor when completed
      }); //
    }
    res.status(200).json({
      success: true,
      message: "Test status updated successfully",
      labTest, // Return the updated test object
    });
  } catch (error) {
    console.error("Update test status error:", error); //
    res.status(500).json({
      success: false,
      message: "Failed to update test status",
      error: error.message,
    }); //
  }
};

/**
 * Upload lab results
 * @route POST /api/lab/results/:testId
 * @access Private (Lab Technician)
 */
export const uploadLabResults = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { testId } = req.params;
    const {
      summary,
      conclusion,
      recommendations,
      results, // Expect results as a JSON string
    } = req.body;

    // Find lab test
    const labTest = await LabTest.findOne({
      _id: testId,
      hospitalId,
    });

    if (!labTest) {
      return res.status(404).json({
        success: false,
        message: "Lab test not found",
      });
    }

    // --- ADD THIS CHECK ---
    // Allow upload only if test is confirmed or already in progress
    if (!["confirmed", "in-progress"].includes(labTest.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot upload results for test with status '${labTest.status}'. Payment may be pending or test not started.`,
      });
    }
    // --- END CHECK ---

    // Check if results already exist
    if (labTest.resultId) {
      const existingReport = await LabReport.findById(labTest.resultId);
      if (existingReport) {
        return res.status(400).json({
          success: false,
          message:
            "Results already exist for this test. Use the update endpoint instead.",
        });
      }
      console.warn(
        `LabTest ${testId} has resultId ${labTest.resultId} but LabReport not found. Creating new report.`
      );
      labTest.resultId = null; // Clear inconsistent ID
    }

    // Validate results structure if provided
    let parsedResults = [];
    if (results) {
      try {
        parsedResults = JSON.parse(results);
        if (!Array.isArray(parsedResults)) {
          throw new Error("Results must be an array.");
        }
        parsedResults.forEach((r) => {
          if (!r.parameter || !r.value) {
            throw new Error("Each result must have a parameter and value.");
          }
        });
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid results format. Must be a valid JSON array of result objects.",
          error: parseError.message,
        });
      }
    }

    // Upload attachment if provided
    let attachmentData = undefined;
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "lab-results",
        resource_type: "auto",
      });
      attachmentData = {
        url: result.secure_url,
        name: req.file.originalname,
        mimetype: req.file.mimetype,
      };
    }

    // Create lab report
    const labReport = await LabReport.create({
      testId,
      hospitalId: labTest.hospitalId,
      patientId: labTest.patientId,
      reportDate: new Date(),
      results: parsedResults,
      summary,
      conclusion,
      recommendations,
      attachment: attachmentData,
      isVerified: true, // Assuming lab tech verifies upon upload
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
      technician: req.user._id, // Link the technician who uploaded
    });

    // Update lab test
    labTest.resultId = labReport._id;
    labTest.status = "completed";
    await labTest.save();

    // --- NEW: Update corresponding Medical Record ---
    if (labTest.appointmentId) {
      try {
        await MedicalRecord.findOneAndUpdate(
          { appointmentId: labTest.appointmentId },
          { $addToSet: { labTests: labTest._id } }, // Use $addToSet to avoid duplicates
          { new: true, timestamps: false } // timestamps: false to prevent only updating updatedAt
        );
      } catch (medRecordError) {
        console.error(
          "Failed to update medical record with lab test ID:",
          medRecordError
        );
        // Decide if this should be a critical error or just logged
      }
    }
    // --- End NEW ---

    // Populate necessary fields for notification
    await labTest.populate([
      { path: "patientId", populate: { path: "userId", select: "name email" } },
      { path: "doctorId", populate: { path: "userId", select: "name email" } },
    ]);

    // Notify patient
    const patientUser = labTest.patientId.userId;
    if (patientUser) {
      await notificationService.createLabResultNotification({
        labReport: {
          _id: labReport._id, // Pass report ID
          testName: labTest.testName,
        },
        recipient: patientUser,
      });
      await emailService.sendLabResultEmail(patientUser, labTest.testName);
    }

    // Notify doctor
    const doctorUser = labTest.doctorId.userId;
    if (doctorUser) {
      await notificationService.createNotification({
        recipientId: doctorUser._id,
        type: "lab-result",
        title: "Lab Results Available",
        message: `The lab results for ${labTest.testName} for patient ${patientUser.name} are now available.`,
        relatedTo: {
          model: "LabReport",
          id: labReport._id, // Use LabReport ID
        },
        isEmail: true,
      });
    }

    res.status(201).json({
      success: true,
      message: "Lab results uploaded successfully",
      labReport,
    });
  } catch (error) {
    console.error("Upload lab results error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload lab results",
      error: error.message,
    });
  }
};

/**
 * Get lab results (completed reports)
 * @route GET /api/lab/results
 * @access Private (Lab Technician)
 */
export const getLabResults = async (req, res) => {
  try {
    const hospitalId = req.user.hospital; // Get hospital from authenticated user
    const userId = req.user._id; // Get user ID for 'onlyMine' filter
    const { page = 1, limit = 10, search, onlyMine } = req.query;

    // --- CORRECTED QUERY LOGIC ---
    // Build query targeting the LabReport collection
    const query = { hospitalId }; // Base query for the hospital

    // Apply 'onlyMine' filter based on the 'technician' field in LabReport
    if (onlyMine === "true") {
      query.technician = userId; // Filter by the logged-in technician's User ID
    }

    // Handle search - This needs to search related fields (Patient, Doctor, TestName)
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };

      // Find patients matching the search term within the hospital
      const patients = await Patient.find({ hospitalId })
        .populate({
          path: "userId",
          match: { name: searchRegex },
          select: "_id",
        })
        .select("_id")
        .lean();
      const matchingPatientIds = patients
        .filter((p) => p.userId)
        .map((p) => p._id);

      // Find LabTests matching the search term (test name/type) within the hospital
      const matchingTests = await LabTest.find({
        hospitalId,
        $or: [{ testName: searchRegex }, { testType: searchRegex }],
      })
        .select("_id") // We only need the IDs to filter reports
        .lean();
      const matchingTestIds = matchingTests.map((t) => t._id);

      // Find doctors matching search (to find tests requested by them)
      const doctors = await Doctor.find({ hospitalId })
        .populate({
          path: "userId",
          match: { name: searchRegex },
          select: "_id",
        })
        .select("_id")
        .lean();
      const matchingDoctorIds = doctors
        .filter((d) => d.userId)
        .map((d) => d._id);
      const testsByMatchingDoctors = await LabTest.find({
        hospitalId,
        doctorId: { $in: matchingDoctorIds },
      })
        .select("_id")
        .lean();
      const testIdsByMatchingDoctors = testsByMatchingDoctors.map((t) => t._id);

      const searchConditions = [];

      // Add conditions if matches were found
      if (matchingPatientIds.length > 0) {
        searchConditions.push({ patientId: { $in: matchingPatientIds } });
      }
      if (matchingTestIds.length > 0) {
        searchConditions.push({ testId: { $in: matchingTestIds } });
      }
      if (testIdsByMatchingDoctors.length > 0) {
        // If doctor matches, find reports whose testId is in the tests requested by that doctor
        searchConditions.push({ testId: { $in: testIdsByMatchingDoctors } });
      }

      // Search directly in LabReport fields (summary, conclusion)
      searchConditions.push({ summary: searchRegex });
      searchConditions.push({ conclusion: searchRegex });
      // You could add search on results.parameter here, but it might be less efficient

      if (searchConditions.length > 0) {
        query.$or = searchConditions;
      } else {
        // If search term matches nothing relevant, force no results
        query._id = null; // Or use a non-existent field
      }
    }

    // Count total matching lab reports
    const total = await LabReport.countDocuments(query);

    // Get paginated lab reports
    // Populate necessary fields from related collections
    const labReports = await LabReport.find(query) // <<< Query LabReport collection
      .sort({ reportDate: -1 }) // Sort by report date descending
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email image" },
      })
      .populate({
        path: "testId", // Populate the linked LabTest
        select: "testName testType doctorId requestDate", // Select needed fields from LabTest
        populate: {
          // Nested populate for the doctor within LabTest
          path: "doctorId",
          populate: { path: "userId", select: "name" }, // Populate the User within Doctor
        },
      })
      .populate("technician", "name") // Populate the technician who created the report
      .populate("verifiedBy", "name") // Populate verifier if needed
      .lean(); // Use lean for performance if not modifying docs

    // --- END CORRECTED QUERY LOGIC ---

    res.status(200).json({
      success: true,
      labReports, // Send labReports (not labTests)
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
 * Get Lab Report Details by ID
 * @route GET /api/lab/results/:reportId
 * @access Private (Lab Technician, Doctor, Admin)
 */
export const getLabReportDetails = async (req, res) => {
  try {
    const { reportId } = req.params;
    const hospitalId = req.user.hospital;

    const report = await LabReport.findById(reportId)
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email image dob gender" },
      })
      .populate({
        path: "testId",
        select: "testName testType requestDate doctorId appointmentId",
        populate: {
          path: "doctorId",
          populate: { path: "userId", select: "name" },
        },
      })
      .populate("technician", "name")
      .populate("verifiedBy", "name");

    if (!report) {
      return res
        .status(404)
        .json({ success: false, message: "Lab report not found" });
    }

    // Check access: Techs/Admins/Receptionists from the same hospital, or the requesting Doctor, or the Patient
    let hasAccess = false;
    if (
      ["admin", "receptionist", "labTechnician", "radiologist"].includes(
        req.user.role
      )
    ) {
      hasAccess = report.hospitalId.toString() === hospitalId.toString();
    } else if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      hasAccess =
        doctor && report.testId?.doctorId?.toString() === doctor._id.toString();
    } else if (req.user.role === "patient") {
      const patient = await Patient.findOne({ userId: req.user._id });
      hasAccess =
        patient && report.patientId._id.toString() === patient._id.toString();
    }

    if (!hasAccess && req.user.role !== "superAdmin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.status(200).json({ success: true, report });
  } catch (error) {
    console.error("Get lab report details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get lab report details",
      error: error.message,
    });
  }
};

export default {
  getDashboard,
  getProfile,
  updateProfile,
  getLabRequests,
  getLabRequestDetails,
  updateTestStatus,
  uploadLabResults,
  getLabResults,
  getLabReportDetails, // Added new function
};
