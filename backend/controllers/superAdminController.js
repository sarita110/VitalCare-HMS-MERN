// controllers/superAdminController.js
import Hospital from "../models/Hospital.js";
import User from "../models/User.js";
import Department from "../models/Department.js";
import { v2 as cloudinary } from "cloudinary";
import reportService from "../services/reportService.js"; // Import the refactored service
import emailService from "../services/emailService.js";
import notificationService from "../services/notificationService.js";
import { generateRandomToken } from "../utils/helpers.js";
import { ROLES } from "../utils/constants.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reportsBaseDir = path.join(__dirname, "..", "uploads", "reports"); // Define base dir for reports

// --- Dashboard ---
/**
 * Get super admin dashboard data
 * @route GET /api/super-admin/dashboard
 * @access Private (Super Admin)
 */
export const getDashboardData = async (req, res) => {
  try {
    const totalHospitals = await Hospital.countDocuments();
    const activeHospitals = await Hospital.countDocuments({ isActive: true });
    const totalUsers = await User.countDocuments();
    const usersByRole = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);
    const recentHospitals = await Hospital.find()
      .sort({ createdAt: -1 })
      .limit(5);
    const activeUsers = await User.countDocuments({ isActive: true });
    const roleCountsMap = usersByRole.reduce((obj, item) => {
      obj[item._id] = item.count;
      return obj;
    }, {});

    res.status(200).json({
      success: true,
      dashboardData: {
        hospitals: {
          total: totalHospitals,
          active: activeHospitals,
          inactive: totalHospitals - activeHospitals,
          recent: recentHospitals,
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          byRole: roleCountsMap,
        },
      },
    });
  } catch (error) {
    console.error("Get dashboard data error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get dashboard data",
      error: error.message,
    });
  }
};

// --- Hospital Management ---
/**
 * Create new hospital
 * @route POST /api/super-admin/hospitals
 * @access Private (Super Admin)
 */

export const createHospital = async (req, res) => {
  try {
    const { name, contactNumber, email, website, description } = req.body;

    const hospitalExists = await Hospital.findOne({ email });
    if (hospitalExists) {
      return res.status(400).json({
        success: false,
        message: "Hospital with this email already exists",
      });
    }

    // Process address data - handle both JSON string and nested form fields
    let addressData;

    try {
      if (req.body.address) {
        // Try parsing if it's a JSON string
        if (typeof req.body.address === "string") {
          try {
            addressData = JSON.parse(req.body.address);
          } catch (parseErr) {
            console.error("Address parse error:", parseErr);
            // If parsing fails, it might not be JSON format
            return res.status(400).json({
              success: false,
              message: "Invalid address format",
              error: parseErr.message,
            });
          }
        } else if (typeof req.body.address === "object") {
          // If already an object, use directly
          addressData = req.body.address;
        }
      } else {
        // Look for flattened address fields (dot notation in form data)
        addressData = {
          street: req.body["address.street"],
          city: req.body["address.city"],
          state: req.body["address.state"],
          zipCode: req.body["address.zipCode"],
          country: req.body["address.country"],
        };
      }

      // Verify all required address fields exist
      const requiredFields = ["street", "city", "state", "zipCode", "country"];
      const missingFields = requiredFields.filter(
        (field) => !addressData[field]
      );

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required address fields: ${missingFields.join(
            ", "
          )}`,
        });
      }
    } catch (addressErr) {
      console.error("Address processing error:", addressErr);
      return res.status(400).json({
        success: false,
        message: "Failed to process address data",
        error: addressErr.message,
      });
    }

    // Process logo upload
    let logoUrl =
      "https://res.cloudinary.com/vitalcare/image/upload/v1/default-hospital.png";
    if (req.file) {
      try {
        // Create sanitized hospital name for filename
        const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
        const timestamp = Date.now();
        const customFilename = `${sanitizedName}-logo-${timestamp}`;

        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "hospitals/logos",
          resource_type: "image",
          public_id: customFilename, // Set custom filename
        });
        logoUrl = result.secure_url;

        // Clean up temp file
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Failed to delete temp logo file:", err);
        });
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        if (req.file?.path) {
          fs.unlink(req.file.path, (err) => {
            if (err)
              console.error("Failed to delete temp logo file on error:", err);
          });
        }
        return res.status(500).json({
          success: false,
          message: "Failed to upload logo",
          error: uploadError.message,
        });
      }
    }

    // Create the hospital
    const hospital = await Hospital.create({
      name,
      address: addressData,
      contactNumber,
      email,
      website,
      logo: logoUrl,
      description,
    });

    res.status(201).json({
      success: true,
      message: "Hospital created successfully",
      hospital,
    });
  } catch (error) {
    console.error("Create hospital error:", error);
    if (req.file?.path) {
      fs.unlink(req.file.path, (err) => {
        if (err)
          console.error("Failed to delete temp logo file on error:", err);
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to create hospital",
      error: error.message,
    });
  }
};

/**
 * Update hospital details
 * @route PUT /api/super-admin/hospitals/:id
 * @access Private (Super Admin)
 */

export const updateHospital = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contactNumber, email, website, description, isActive } =
      req.body;

    const hospital = await Hospital.findById(id);
    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: "Hospital not found",
      });
    }

    // Check for email uniqueness
    if (email && email !== hospital.email) {
      const hospitalWithEmail = await Hospital.findOne({
        email,
        _id: { $ne: id },
      });
      if (hospitalWithEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already in use by another hospital",
        });
      }
      hospital.email = email;
    }

    // Update basic fields
    if (name) hospital.name = name;
    if (contactNumber) hospital.contactNumber = contactNumber;
    if (website) hospital.website = website;
    if (description) hospital.description = description;
    if (isActive !== undefined) hospital.isActive = isActive;

    // Process address data - handle both JSON string and nested form fields
    try {
      if (req.body.address) {
        let addressData;

        // Try parsing if it's a JSON string
        if (typeof req.body.address === "string") {
          try {
            addressData = JSON.parse(req.body.address);
          } catch (parseErr) {
            console.error("Address parse error:", parseErr);
            return res.status(400).json({
              success: false,
              message: "Invalid address format",
              error: parseErr.message,
            });
          }
        } else if (typeof req.body.address === "object") {
          // If already an object, use directly
          addressData = req.body.address;
        }

        // Update only provided address fields, keep existing values for others
        hospital.address = {
          street: addressData.street || hospital.address.street,
          city: addressData.city || hospital.address.city,
          state: addressData.state || hospital.address.state,
          zipCode: addressData.zipCode || hospital.address.zipCode,
          country: addressData.country || hospital.address.country,
        };
      } else {
        // Look for flattened address fields (dot notation in form data)
        const addressUpdates = {};
        if (req.body["address.street"])
          addressUpdates.street = req.body["address.street"];
        if (req.body["address.city"])
          addressUpdates.city = req.body["address.city"];
        if (req.body["address.state"])
          addressUpdates.state = req.body["address.state"];
        if (req.body["address.zipCode"])
          addressUpdates.zipCode = req.body["address.zipCode"];
        if (req.body["address.country"])
          addressUpdates.country = req.body["address.country"];

        // Only update address if there are changes
        if (Object.keys(addressUpdates).length > 0) {
          hospital.address = {
            street: addressUpdates.street || hospital.address.street,
            city: addressUpdates.city || hospital.address.city,
            state: addressUpdates.state || hospital.address.state,
            zipCode: addressUpdates.zipCode || hospital.address.zipCode,
            country: addressUpdates.country || hospital.address.country,
          };
        }
      }
    } catch (addressErr) {
      console.error("Address processing error:", addressErr);
      return res.status(400).json({
        success: false,
        message: "Failed to process address data",
        error: addressErr.message,
      });
    }

    // Process logo upload
    if (req.file) {
      try {
        // Create sanitized hospital name for filename
        const hospitalName = name || hospital.name;
        const sanitizedName = hospitalName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-");
        const timestamp = Date.now();
        const customFilename = `${sanitizedName}-logo-${timestamp}`;

        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "hospitals/logos",
          resource_type: "image",
          public_id: customFilename, // Set custom filename
        });
        hospital.logo = result.secure_url;

        // Clean up temp file
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Failed to delete temp logo file:", err);
        });
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        if (req.file?.path) {
          fs.unlink(req.file.path, (err) => {
            if (err)
              console.error("Failed to delete temp logo file on error:", err);
          });
        }
        return res.status(500).json({
          success: false,
          message: "Failed to upload logo",
          error: uploadError.message,
        });
      }
    }

    // Save the updated hospital
    await hospital.save();

    res.status(200).json({
      success: true,
      message: "Hospital updated successfully",
      hospital,
    });
  } catch (error) {
    console.error("Update hospital error:", error);
    if (req.file?.path) {
      fs.unlink(req.file.path, (err) => {
        if (err)
          console.error("Failed to delete temp logo file on error:", err);
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to update hospital",
      error: error.message,
    });
  }
};

/**
 * Get all hospitals
 * @route GET /api/super-admin/hospitals
 * @access Private (Super Admin)
 */
export const getHospitals = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { "address.city": { $regex: search, $options: "i" } },
      ];
    }
    if (status === "active") query.isActive = true;
    else if (status === "inactive") query.isActive = false;

    const total = await Hospital.countDocuments(query);
    const hospitals = await Hospital.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      hospitals,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error("Get hospitals error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get hospitals",
      error: error.message,
    });
  }
};

/**
 * Get hospital details
 * @route GET /api/super-admin/hospitals/:id
 * @access Private (Super Admin)
 */
export const getHospitalDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const hospital = await Hospital.findById(id);
    if (!hospital) {
      return res
        .status(404)
        .json({ success: false, message: "Hospital not found" });
    }
    const departmentsCount = await Department.countDocuments({ hospital: id });
    const adminsCount = await User.countDocuments({
      hospital: id,
      role: "admin",
      isActive: true,
    });
    const usersCount = await User.countDocuments({ hospital: id });

    res.status(200).json({
      success: true,
      hospital: {
        ...hospital.toObject(),
        departmentsCount,
        adminsCount,
        usersCount,
      },
    });
  } catch (error) {
    console.error("Get hospital details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get hospital details",
      error: error.message,
    });
  }
};

/**
 * Update hospital status
 * @route PUT /api/super-admin/hospitals/:id/status
 * @access Private (Super Admin)
 */
export const updateHospitalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }
    const hospital = await Hospital.findById(id);
    if (!hospital) {
      return res
        .status(404)
        .json({ success: false, message: "Hospital not found" });
    }
    hospital.isActive = isActive;
    await hospital.save();
    // --- START NOTIFICATION ---
    // Notify all active admins of this hospital
    const hospitalAdmins = await User.find({
      hospital: hospital._id,
      role: "admin",
      isActive: true, // Only notify active admins
    }).select("_id");

    const statusText = isActive ? "activated" : "deactivated";
    const message = `The status of your hospital (${hospital.name}) has been updated to ${statusText} by the Super Admin.`;

    for (const admin of hospitalAdmins) {
      await notificationService.createNotification({
        recipientId: admin._id,
        type: "system", // Or maybe 'hospital-management'
        title: `Hospital Status Updated: ${hospital.name}`,
        message: message,
        relatedTo: {
          model: "Hospital",
          id: hospital._id,
        },
        isEmail: true, // Admins might want email for this
        priority: "medium",
      });
    }
    // --- END NOTIFICATION ---
    res.status(200).json({
      success: true,
      message: `Hospital ${
        isActive ? "activated" : "deactivated"
      } successfully`,
      isActive: hospital.isActive,
    });
  } catch (error) {
    console.error("Update hospital status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update hospital status",
      error: error.message,
    });
  }
};

// --- Hospital Admin Management ---

/**
 * Create hospital admin
 * @route POST /api/super-admin/hospital-admins
 * @access Private (Super Admin)
 */
export const createHospitalAdmin = async (req, res) => {
  try {
    const { name, email, hospitalId } = req.body;

    // Validate required fields
    if (!name || !email || !hospitalId) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and hospital ID are required",
      });
    }

    // Find hospital
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: "Hospital not found",
      });
    }

    if (!hospital.isActive) {
      return res.status(400).json({
        success: false,
        message: "Cannot add admin to an inactive hospital",
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Generate temporary password
    const password = generateRandomToken(8);

    // Create the admin user
    const newAdmin = await User.create({
      name,
      email,
      password,
      role: "admin",
      hospital: hospitalId,
      isVerified: true,
      isActive: true,
    });

    // Update hospital document
    hospital.admins.push(newAdmin._id);
    await hospital.save();

    // Use the new specialized function to send welcome email
    const emailResult = await emailService.sendHospitalAdminWelcomeEmail(
      { name, email },
      password,
      hospital
    );

    // Log email status but don't prevent admin creation if email fails
    if (!emailResult.success) {
      console.log(
        `Admin created but email failed to send: ${emailResult.error}`
      );
    }

    // Return success response
    res.status(201).json({
      success: true,
      message: "Hospital admin created successfully",
      admin: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        hospital: hospitalId,
      },
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error("Create hospital admin error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create hospital admin",
      error: error.message,
    });
  }
};

/**
 * Get hospital admins
 * @route GET /api/super-admin/hospital-admins
 * @access Private (Super Admin)
 */
export const getHospitalAdmins = async (req, res) => {
  try {
    const { hospitalId, page = 1, limit = 10, search, status } = req.query;
    const query = { role: ROLES.ADMIN };
    if (hospitalId) query.hospital = hospitalId;
    if (search)
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    if (status === "active") query.isActive = true;
    else if (status === "inactive") query.isActive = false;

    const total = await User.countDocuments(query);
    const admins = await User.find(query)
      .select(
        "-password -resetPasswordToken -resetPasswordExpires -verificationOTP -verificationOTPExpires"
      )
      .populate("hospital", "name isActive")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      admins,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error("Get hospital admins error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get hospital admins",
      error: error.message,
    });
  }
};

/**
 * Get hospital admin details
 * @route GET /api/super-admin/hospital-admins/:id (User ID)
 * @access Private (Super Admin)
 */
export const getHospitalAdminDetails = async (req, res) => {
  try {
    const { id } = req.params; // User ID
    const admin = await User.findOne({ _id: id, role: ROLES.ADMIN })
      .select(
        "-password -resetPasswordToken -resetPasswordExpires -verificationOTP -verificationOTPExpires"
      )
      .populate("hospital", "name isActive address contactNumber email");
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Hospital admin not found" });
    }
    res.status(200).json({ success: true, admin });
  } catch (error) {
    console.error("Get hospital admin details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get hospital admin details",
      error: error.message,
    });
  }
};

/**
 * Update hospital admin status
 * @route PUT /api/super-admin/hospital-admins/:id/status (User ID)
 * @access Private (Super Admin)
 */
export const updateHospitalAdminStatus = async (req, res) => {
  try {
    const { id } = req.params; // User ID
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }
    const admin = await User.findOneAndUpdate(
      { _id: id, role: ROLES.ADMIN },
      { isActive },
      { new: true }
    );
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Hospital admin not found" });
    }
    // --- START NOTIFICATION ---
    const statusText = isActive ? "active" : "inactive";
    await notificationService.createNotification({
      recipientId: admin._id,
      type: "system", // Or 'account-status'
      title: "Your Account Status Updated",
      message: `Your admin account status has been updated to ${statusText} by the Super Admin.`,
      relatedTo: {
        model: "User",
        id: admin._id,
      },
      isEmail: true, // Important status change
      priority: "medium",
    });
    // --- END NOTIFICATION ---

    res.status(200).json({
      success: true,
      message: `Admin status updated to ${isActive ? "active" : "inactive"}`,
      isActive: admin.isActive,
    });
  } catch (error) {
    console.error("Update hospital admin status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update admin status",
      error: error.message,
    });
  }
};

/**
 * Delete hospital admin
 * @route DELETE /api/super-admin/hospital-admins/:id (User ID)
 * @access Private (Super Admin)
 */
export const deleteHospitalAdmin = async (req, res) => {
  try {
    const { id } = req.params; // User ID
    const admin = await User.findOne({ _id: id, role: ROLES.ADMIN });
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Hospital admin not found" });
    }
    if (admin.hospital) {
      await Hospital.findByIdAndUpdate(admin.hospital, {
        $pull: { admins: admin._id },
      });
    }
    await User.deleteOne({ _id: id });
    res
      .status(200)
      .json({ success: true, message: "Hospital admin deleted successfully" });
  } catch (error) {
    console.error("Delete hospital admin error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete hospital admin",
      error: error.message,
    });
  }
};

// --- Reports --- (Refactored)

/**
 * Generate system-wide report
 * @route GET /api/super-admin/reports/generate
 * @access Private (Super Admin)
 */
export const generateSystemReport = async (req, res) => {
  try {
    const {
      format = "pdf",
      reportType = "SYSTEM_OVERVIEW", // Default report type
      startDate,
      endDate,
      // Add other specific filters based on reportType if needed
      role,
      hospitalId,
      status, // For USER_LIST
    } = req.query;

    let reportData;
    const options = { startDate, endDate, role, hospitalId, status }; // Pass filters

    // Fetch data based on reportType using reportService
    const dataFetcher =
      reportService[
        `get${
          reportType.charAt(0).toUpperCase() +
          reportType
            .slice(1)
            .toLowerCase()
            .replace(/_([a-z])/g, (g) => g[1].toUpperCase())
        }Data`
      ];

    if (!dataFetcher || typeof dataFetcher !== "function") {
      // Attempt mapping common names if direct match fails
      const typeMap = {
        SYSTEM_OVERVIEW: reportService.getSystemOverviewData,
        HOSPITAL_ACTIVITY_SUMMARY: reportService.getHospitalActivitySummaryData,
        USER_LIST: reportService.getUserListData,
      };
      if (typeMap[reportType]) {
        reportData = await typeMap[reportType](options); // Pass options directly for system reports
      } else {
        return res.status(400).json({
          success: false,
          message: `Invalid report type '${reportType}' specified for Super Admin.`,
        });
      }
    } else {
      reportData = await dataFetcher(options); // Pass options directly for system reports
    }

    // Generate the report file using the fetched data
    const reportResult = await reportService.generateReport(
      reportType,
      format,
      reportData
    );

    if (!reportResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate report file",
        error: reportResult.error,
      });
    }

    // Return only the filename for the secure download route
    res.status(200).json({
      success: true,
      message: "Report generated successfully. Use the download link.",
      report: {
        fileName: reportResult.fileName,
      },
    });
  } catch (error) {
    console.error("Generate system report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate system report",
      error: error.message,
    });
  }
};

/**
 * Download a generated report file (SuperAdmin version)
 * @route GET /api/super-admin/reports/download/:filename
 * @access Private (Super Admin)
 */
export const downloadSystemReport = async (req, res) => {
  try {
    const { filename } = req.params;

    // **Security:** Basic sanitization
    const safeFilename = path.basename(filename);
    if (safeFilename !== filename || filename.includes("..")) {
      // Added includes('..')
      return res
        .status(400)
        .json({ success: false, message: "Invalid filename." });
    }

    const filePath = path.join(reportsBaseDir, safeFilename);

    // **CRITICAL: Check file existence BEFORE proceeding**
    if (!fs.existsSync(filePath)) {
      console.log(`Report file not found at: ${filePath}`);
      return res.status(404).json({
        success: false,
        message:
          "Report file not found or has already been downloaded/deleted.",
      });
    }

    // **Set Correct Headers based on file type**
    const mimeType = mime.lookup(filePath) || "application/octet-stream"; // Get MIME type dynamically
    const fileExtension = path.extname(safeFilename).toLowerCase();

    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeFilename}"`
    ); // Use safeFilename

    console.log(
      `Attempting to send file: ${filePath} with Content-Type: ${mimeType}`
    );

    // **Use Streaming for Robustness**
    const fileStream = fs.createReadStream(filePath);

    // Handle stream errors
    fileStream.on("error", (streamError) => {
      console.error(
        `Error reading file stream for ${safeFilename}:`,
        streamError
      );
      if (!res.headersSent) {
        res
          .status(500)
          .json({ success: false, message: "Could not read the report file." });
      }
      // Clean up the stream? (Usually handled automatically on error)
    });

    // Pipe the stream to the response
    fileStream.pipe(res);

    // **IMPORTANT: Remove file deletion from here.**
    // File deletion should happen via a separate cleanup mechanism (e.g., cron job)
    // Do NOT delete the file immediately after starting the stream.
    // stream.on('close', () => { // Or 'finish' for res? Test which works reliably
    //     fs.unlink(filePath, (unlinkErr) => { ... }); // <<-- DO NOT UNLINK HERE
    // });
  } catch (error) {
    console.error("Download report error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Server error during report download.",
        error: error.message,
      });
    }
  }
};

// --- Export all functions ---
export default {
  getDashboardData,
  createHospital,
  updateHospital,
  getHospitals,
  getHospitalDetails,
  updateHospitalStatus,
  createHospitalAdmin,
  getHospitalAdmins,
  getHospitalAdminDetails,
  updateHospitalAdminStatus,
  deleteHospitalAdmin,
  generateSystemReport,
  downloadSystemReport,
};
