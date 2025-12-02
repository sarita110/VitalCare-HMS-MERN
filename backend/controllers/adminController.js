// controllers/adminController.js
import Hospital from "../models/Hospital.js";
import Department from "../models/Department.js";
import User from "../models/User.js";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import Staff from "../models/Staff.js";
import Receptionist from "../models/Receptionist.js";
import Appointment from "../models/Appointment.js";
import MedicalRecord from "../models/MedicalRecord.js";
import Payment from "../models/Payment.js";
import { v2 as cloudinary } from "cloudinary";
import emailService from "../services/emailService.js";
import reportService from "../services/reportService.js"; // Import the refactored service
import { ROLES } from "../utils/constants.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { verifyToken } from "../middleware/auth.js"; // Need verifyToken for the route
import mongoose from "mongoose"; // Import mongoose for ObjectId validation
import mime from "mime-types"; // Import mime for file type detection

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reportsBaseDir = path.join(__dirname, "..", "uploads", "reports"); // Consistent reports dir

// --- Dashboard ---

/**
 * Get admin dashboard data
 * @route GET /api/admin/dashboard
 * @access Private (Admin)
 */
export const getDashboard = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const totalDoctors = await User.countDocuments({
      hospital: hospitalId,
      role: ROLES.DOCTOR,
      isActive: true,
    });
    const totalPatients = await Patient.countDocuments({ hospitalId });
    const totalAppointments = await Appointment.countDocuments({ hospitalId });
    const totalDepartments = await Department.countDocuments({
      hospital: hospitalId,
    });

    const recentAppointments = await Appointment.find({ hospitalId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "name email image" },
      })
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name email image" },
      });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAppointments = await Appointment.countDocuments({
      hospitalId,
      dateTime: { $gte: today, $lt: tomorrow },
    });

    const payments = await Payment.find({ hospitalId, status: "completed" }); // Only completed payments for revenue

    const totalRevenue = payments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    const recentPatients = await Patient.find({ hospitalId })
      .sort({ registrationDate: -1 })
      .limit(5)
      .populate("userId", "name email image");

    res.status(200).json({
      success: true,
      dashboardData: {
        counts: {
          doctors: totalDoctors,
          patients: totalPatients,
          appointments: totalAppointments,
          departments: totalDepartments,
          todayAppointments,
        },
        revenue: { total: totalRevenue },
        recentAppointments,
        recentPatients,
      },
    });
  } catch (error) {
    console.error("Get admin dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get dashboard data",
      error: error.message,
    });
  }
};

// --- Hospital Profile ---

/**
 * Get hospital profile
 * @route GET /api/admin/hospital-profile
 * @access Private (Admin)
 */
export const getHospitalProfile = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res
        .status(404)
        .json({ success: false, message: "Hospital not found" });
    }

    const departmentsCount = await Department.countDocuments({
      hospital: hospitalId,
    });
    const doctorsCount = await User.countDocuments({
      hospital: hospitalId,
      role: ROLES.DOCTOR,
      isActive: true,
    });
    const patientsCount = await Patient.countDocuments({ hospitalId });
    const staffCount = await User.countDocuments({
      hospital: hospitalId,
      role: { $in: ["receptionist", "labTechnician", "radiologist"] },
      isActive: true,
    });

    res.status(200).json({
      success: true,
      hospital: {
        ...hospital.toObject(),
        stats: {
          departments: departmentsCount,
          doctors: doctorsCount,
          patients: patientsCount,
          staff: staffCount,
        },
      },
    });
  } catch (error) {
    console.error("Get hospital profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get hospital profile",
      error: error.message,
    });
  }
};

/**
 * Update hospital profile
 * @route PUT /api/admin/hospital-profile
 * @access Private (Admin)
 */
export const updateHospitalProfile = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { name, contactNumber, email, website, description, address } =
      req.body;

    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res
        .status(404)
        .json({ success: false, message: "Hospital not found" });
    }

    if (email && email !== hospital.email) {
      const hospitalWithEmail = await Hospital.findOne({ email });
      if (
        hospitalWithEmail &&
        hospitalWithEmail._id.toString() !== hospitalId.toString()
      ) {
        return res.status(400).json({
          success: false,
          message: "Email already in use by another hospital",
        });
      }
    }

    if (name) hospital.name = name;
    if (contactNumber) hospital.contactNumber = contactNumber;
    if (email) hospital.email = email;
    if (website) hospital.website = website;
    if (description) hospital.description = description;
    if (address)
      hospital.address =
        typeof address === "string" ? JSON.parse(address) : address; // Ensure address is parsed

    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "hospitals/logos",
          resource_type: "image",
        });
        hospital.logo = result.secure_url;
        // Clean up local file
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Failed to delete temp logo file:", err);
        });
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        // Clean up local file even on error
        if (req.file?.path)
          fs.unlink(req.file.path, (err) => {
            if (err)
              console.error("Failed to delete temp logo file on error:", err);
          });
        return res.status(500).json({
          success: false,
          message: "Failed to upload logo",
          error: uploadError.message,
        });
      }
    }

    await hospital.save();

    res.status(200).json({
      success: true,
      message: "Hospital profile updated successfully",
      hospital,
    });
  } catch (error) {
    console.error("Update hospital profile error:", error);
    // Clean up local file if error occurs after upload but before save
    if (req.file?.path)
      fs.unlink(req.file.path, (err) => {
        if (err)
          console.error("Failed to delete temp logo file on error:", err);
      });
    res.status(500).json({
      success: false,
      message: "Failed to update hospital profile",
      error: error.message,
    });
  }
};

// --- Department Management ---

/**
 * Create department
 * @route POST /api/admin/departments
 * @access Private (Admin)
 */
export const createDepartment = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { name, description, headId } = req.body;

    // Check if department with same name exists in this hospital
    const departmentExists = await Department.findOne({
      name,
      hospital: hospitalId,
    });

    if (departmentExists) {
      return res.status(400).json({
        success: false,
        message: "Department already exists in this hospital",
      });
    }

    // Check head doctor if provided
    if (headId) {
      const doctorExists = await User.findOne({
        _id: headId,
        hospital: hospitalId,
        role: ROLES.DOCTOR,
      });

      if (!doctorExists) {
        return res.status(404).json({
          success: false,
          message: "Head doctor not found in this hospital",
        });
      }
    }

    // Create department without using a transaction
    const department = await Department.create({
      name,
      description,
      hospital: hospitalId,
      head: headId || null,
    });

    // Update the hospital's departments array
    await Hospital.findByIdAndUpdate(hospitalId, {
      $push: { departments: department._id },
    });

    res.status(201).json({
      success: true,
      message: "Department created successfully",
      department,
    });
  } catch (error) {
    console.error("Create department error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create department",
      error: error.message,
    });
  }
};

/**
 * Update department
 * @route PUT /api/admin/departments/:id
 * @access Private (Admin)
 */
export const updateDepartment = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { id } = req.params;
    const { name, description, headId, isActive } = req.body;

    // Find department and verify it belongs to admin's hospital
    const department = await Department.findOne({
      _id: id,
      hospital: hospitalId,
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    // Check for department name conflicts
    if (name && name !== department.name) {
      const departmentExists = await Department.findOne({
        name,
        hospital: hospitalId,
        _id: { $ne: id },
      });

      if (departmentExists) {
        return res.status(400).json({
          success: false,
          message: "Department name already exists in this hospital",
        });
      }
      department.name = name;
    }

    // Verify head doctor if provided
    if (headId) {
      const doctorExists = await User.findOne({
        _id: headId,
        hospital: hospitalId,
        role: ROLES.DOCTOR,
      });

      if (!doctorExists) {
        return res.status(404).json({
          success: false,
          message: "Head doctor not found in this hospital",
        });
      }
      department.head = headId;
    } else if (headId === null || headId === "") {
      department.head = null;
    }

    if (description !== undefined) department.description = description;
    if (isActive !== undefined) department.isActive = isActive;

    await department.save();

    res.status(200).json({
      success: true,
      message: "Department updated successfully",
      department,
    });
  } catch (error) {
    console.error("Update department error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update department",
      error: error.message,
    });
  }
};

/**
 * Delete department
 * @route DELETE /api/admin/departments/:id
 * @access Private (Admin)
 */
export const deleteDepartment = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { id } = req.params;

    // Find department and verify it belongs to admin's hospital
    const department = await Department.findOne({
      _id: id,
      hospital: hospitalId,
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    // Check if department has associated doctors
    const doctorsCount = await User.countDocuments({
      hospital: hospitalId,
      department: id,
      role: ROLES.DOCTOR,
      isActive: true,
    });

    if (doctorsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department. ${doctorsCount} active doctor(s) are assigned. Please reassign them first.`,
      });
    }

    // Check for lab technicians and radiologists
    const staffCount = await User.countDocuments({
      hospital: hospitalId,
      department: id,
      role: { $in: [ROLES.LAB_TECHNICIAN, ROLES.RADIOLOGIST] },
      isActive: true,
    });

    if (staffCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department. ${staffCount} active staff member(s) are assigned. Please reassign them first.`,
      });
    }

    // Remove department from hospital's departments array
    await Hospital.findByIdAndUpdate(hospitalId, {
      $pull: { departments: id },
    });

    // Delete the department
    await Department.deleteOne({ _id: id });

    res.status(200).json({
      success: true,
      message: "Department deleted successfully",
    });
  } catch (error) {
    console.error("Delete department error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete department",
      error: error.message,
    });
  }
};

/**
 * Get departments
 * @route GET /api/admin/departments
 * @access Private (Admin)
 */
export const getDepartments = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { status } = req.query;

    // Validate hospital ID
    if (!hospitalId) {
      return res.status(400).json({
        success: false,
        message:
          "Admin hospital ID is missing. Please complete your account setup.",
      });
    }

    // Build query to get departments for this hospital only
    const query = { hospital: hospitalId };

    // Filter by status if provided
    if (status === "active") query.isActive = true;
    else if (status === "inactive") query.isActive = false;

    // Get departments with head doctor's name
    const departments = await Department.find(query)
      .populate("head", "name")
      .sort({ name: 1 });

    // Get doctor counts for each department
    const departmentsWithCounts = await Promise.all(
      departments.map(async (dept) => {
        const doctorsCount = await User.countDocuments({
          hospital: hospitalId,
          department: dept._id,
          role: ROLES.DOCTOR,
          isActive: true,
        });

        // Include count of lab technicians and radiologists
        const staffCount = await User.countDocuments({
          hospital: hospitalId,
          department: dept._id,
          role: { $in: [ROLES.LAB_TECHNICIAN, ROLES.RADIOLOGIST] },
          isActive: true,
        });

        return {
          ...dept.toObject(),
          doctorsCount,
          staffCount,
          totalAssociatedUsers: doctorsCount + staffCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      departments: departmentsWithCounts,
    });
  } catch (error) {
    console.error("Get departments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get departments",
      error: error.message,
    });
  }
};

/**
 * Get department details
 * @route GET /api/admin/departments/:id
 * @access Private (Admin)
 */
export const getDepartmentDetails = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { id } = req.params;

    const department = await Department.findOne({
      _id: id,
      hospital: hospitalId,
    })
      .populate("head", "name email")
      .populate({ path: "hospital", select: "name" });

    if (!department) {
      return res
        .status(404)
        .json({ success: false, message: "Department not found" });
    }

    const doctorsCount = await User.countDocuments({
      hospital: hospitalId,
      department: id,
      role: ROLES.DOCTOR,
      isActive: true,
    });

    res.status(200).json({
      success: true,
      department: { ...department.toObject(), doctorsCount },
    });
  } catch (error) {
    console.error("Get department details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get department details",
      error: error.message,
    });
  }
};

// --- Doctor Management ---

/**
 * Create doctor
 * @route POST /api/admin/doctors
 * @access Private (Admin)
 */
export const createDoctor = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const {
      name,
      email,
      password,
      speciality,
      degree,
      experience,
      fees,
      about,
      departmentId,
      registrationNumber,
    } = req.body;

    // Validate email uniqueness
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Validate department existence and belongs to this hospital
    if (departmentId) {
      const departmentExists = await Department.findOne({
        _id: departmentId,
        hospital: hospitalId,
      });
      if (!departmentExists) {
        return res.status(404).json({
          success: false,
          message: "Department not found or doesn't belong to your hospital",
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Department is required",
      });
    }

    // Handle image upload if provided
    let imageUrl =
      "https://res.cloudinary.com/vitalcare/image/upload/v1/default-avatar.png";
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "doctors",
          resource_type: "image",
        });
        imageUrl = result.secure_url;
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Failed to delete temp doctor image:", err);
        });
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        if (req.file?.path)
          fs.unlink(req.file.path, (err) => {
            if (err)
              console.error(
                "Failed to delete temp doctor image on error:",
                err
              );
          });
        return res.status(500).json({
          success: false,
          message: "Failed to upload doctor image",
          error: uploadError.message,
        });
      }
    }

    // Create user without transaction
    const user = await User.create({
      name,
      email,
      password,
      role: ROLES.DOCTOR,
      hospital: hospitalId,
      department: departmentId,
      image: imageUrl,
      isVerified: true,
    });

    // Create doctor profile
    const doctor = await Doctor.create({
      userId: user._id,
      speciality,
      degree,
      experience,
      about,
      fees: Number(fees),
      registrationNumber,
      // Initialize working hours with defaults
      workingHours: {
        monday: { start: "09:00", end: "17:00", isActive: true },
        tuesday: { start: "09:00", end: "17:00", isActive: true },
        wednesday: { start: "09:00", end: "17:00", isActive: true },
        thursday: { start: "09:00", end: "17:00", isActive: true },
        friday: { start: "09:00", end: "17:00", isActive: true },
        saturday: { start: "09:00", end: "17:00", isActive: false },
        sunday: { start: "09:00", end: "17:00", isActive: true },
      },
    });

    // Send welcome email
    await emailService.sendEmail({
      to: email,
      subject: "Welcome to VitalCare as Doctor",
      html: `<p>Hello ${name},</p><p>You have been added as a doctor at ${
        req.user.hospitalInfo?.name || "our hospital"
      } on VitalCare.</p><p>Your login credentials:</p><p>Email: ${email}</p><p>Password: ${password}</p><p>Please log in and change your password immediately.</p><p>Login at: ${
        process.env.FRONTEND_URL
      }/login</p>`,
    });

    res.status(201).json({
      success: true,
      message: "Doctor created successfully",
      doctor: {
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
    console.error("Create doctor error:", error);
    if (req.file?.path) {
      // Clean up uploaded image on error...
      fs.unlink(req.file.path, (err) => {
        if (err)
          console.error("Failed to delete temp doctor image on error:", err);
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to create doctor",
      error: error.message,
    });
  }
};

/**
 * Update doctor
 * @route PUT /api/admin/doctors/:id (Doctor Profile ID)
 * @access Private (Admin)
 */
export const updateDoctor = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { id } = req.params; // This is Doctor Profile ID
    const {
      name,
      email,
      speciality,
      degree,
      experience,
      fees,
      about,
      departmentId,
      isActive,
      registrationNumber,
    } = req.body;

    // Find doctor profile
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    // Verify doctor belongs to admin's hospital
    const user = await User.findOne({
      _id: doctor.userId,
      hospital: hospitalId,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Doctor user account not found or doesn't belong to this hospital",
      });
    }

    // Check email uniqueness if changed
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: user._id } });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already in use by another user",
        });
      }
      user.email = email;
    }

    // Validate department if changing it
    if (departmentId) {
      const departmentExists = await Department.findOne({
        _id: departmentId,
        hospital: hospitalId,
      });
      if (!departmentExists) {
        return res.status(404).json({
          success: false,
          message: "Department not found or doesn't belong to your hospital",
        });
      }
      user.department = departmentId;
    }

    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "doctors",
          resource_type: "image",
        });
        user.image = result.secure_url;
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Failed to delete temp doctor image:", err);
        });
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        if (req.file?.path)
          fs.unlink(req.file.path, (err) => {
            if (err)
              console.error(
                "Failed to delete temp doctor image on error:",
                err
              );
          });
        return res.status(500).json({
          success: false,
          message: "Failed to upload doctor image",
          error: uploadError.message,
        });
      }
    }

    // Update user fields
    if (name) user.name = name;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    // Update doctor profile fields
    if (speciality) doctor.speciality = speciality;
    if (degree) doctor.degree = degree;
    if (experience) doctor.experience = experience;
    if (fees) doctor.fees = Number(fees);
    if (about) doctor.about = about;
    if (registrationNumber) doctor.registrationNumber = registrationNumber;

    await doctor.save();

    res.status(200).json({
      success: true,
      message: "Doctor updated successfully",
      doctor: {
        ...doctor.toObject(),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          image: user.image,
          isActive: user.isActive,
        },
      },
    });
  } catch (error) {
    console.error("Update doctor error:", error);
    if (req.file?.path) {
      // Clean up temporary file...
      fs.unlink(req.file.path, (err) => {
        if (err)
          console.error("Failed to delete temp doctor image on error:", err);
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to update doctor",
      error: error.message,
    });
  }
};

/**
 * Get doctors
 * @route GET /api/admin/doctors
 * @access Private (Admin)
 */
export const getDoctors = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { page = 1, limit = 10, search, departmentId, status } = req.query;

    const userQuery = { hospital: hospitalId, role: ROLES.DOCTOR };

    if (status === "active") userQuery.isActive = true;
    else if (status === "inactive") userQuery.isActive = false;

    if (departmentId) userQuery.department = departmentId;

    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const total = await User.countDocuments(userQuery);

    const users = await User.find(userQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("department", "name");

    const doctorIds = users.map((user) => user._id);

    const doctorProfiles = await Doctor.find({ userId: { $in: doctorIds } });

    const doctorProfileMap = doctorProfiles.reduce((map, profile) => {
      map[profile.userId.toString()] = profile;
      return map;
    }, {});

    const doctors = users.map((user) => {
      const doctorProfile = doctorProfileMap[user._id.toString()];
      return {
        id: doctorProfile?._id, // Doctor Profile ID
        userId: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        department: user.department,
        speciality: doctorProfile?.speciality,
        degree: doctorProfile?.degree,
        experience: doctorProfile?.experience,
        fees: doctorProfile?.fees,
        available: doctorProfile?.available,
        isActive: user.isActive,
        registrationNumber: doctorProfile?.registrationNumber, // Added
        about: doctorProfile?.about, // Added
        createdAt: user.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      doctors,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
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
 * Get doctor details
 * @route GET /api/admin/doctors/:id (Doctor Profile ID)
 * @access Private (Admin)
 */
export const getDoctorDetails = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { id } = req.params; // Doctor Profile ID

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor profile not found" });
    }

    const user = await User.findOne({
      _id: doctor.userId,
      hospital: hospitalId,
    }).populate("department", "name");

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Doctor user account not found or doesn't belong to this hospital",
      });
    }

    const totalAppointments = await Appointment.countDocuments({
      doctorId: id,
    });

    const completedAppointments = await Appointment.countDocuments({
      doctorId: id,
      status: "completed",
    });

    res.status(200).json({
      success: true,
      doctor: {
        ...doctor.toObject(),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          image: user.image,
          phone: user.phone,
          isActive: user.isActive,
          createdAt: user.createdAt,
          department: user.department,
        },
        stats: { totalAppointments, completedAppointments },
      },
    });
  } catch (error) {
    console.error("Get doctor details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get doctor details",
      error: error.message,
    });
  }
};

/**
 * Toggle doctor availability
 * @route PUT /api/admin/doctors/:id/availability (Doctor Profile ID)
 * @access Private (Admin)
 */
export const toggleDoctorAvailability = async (req, res) => {
  try {
    const { id } = req.params; // Doctor Profile ID
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor profile not found" });
    }

    const user = await User.findOne({
      _id: doctor.userId,
      hospital: req.user.hospital,
    });

    if (!user) {
      return res.status(403).json({
        success: false,
        message: "Doctor does not belong to your hospital",
      });
    }

    doctor.available = !doctor.available;
    await doctor.save();

    res.status(200).json({
      success: true,
      message: `Doctor ${
        doctor.available ? "is now available" : "is now unavailable"
      }`,
      available: doctor.available,
    });
  } catch (error) {
    console.error("Toggle doctor availability error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update doctor availability",
      error: error.message,
    });
  }
};

/**
 * Delete doctor
 * @route DELETE /api/admin/doctors/:id (Doctor Profile ID)
 * @access Private (Admin)
 */
export const deleteDoctor = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { id } = req.params; // Doctor Profile ID

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor profile not found" });
    }

    const user = await User.findOne({
      _id: doctor.userId,
      hospital: hospitalId,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Doctor user account not found or doesn't belong to this hospital",
      });
    }

    const activeAppointments = await Appointment.countDocuments({
      doctorId: id,
      status: { $in: ["scheduled", "confirmed"] },
    });

    if (activeAppointments > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete doctor. ${activeAppointments} active appointment(s) exist. Please cancel or reassign them first.`,
      });
    }

    await Doctor.deleteOne({ _id: id });
    await User.deleteOne({ _id: user._id });

    res
      .status(200)
      .json({ success: true, message: "Doctor deleted successfully" });
  } catch (error) {
    console.error("Delete doctor error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete doctor",
      error: error.message,
    });
  }
};

// --- Staff Management ---

/**
 * Create staff member
 * @route POST /api/admin/staff
 * @access Private (Admin)
 */
export const createStaff = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const {
      name,
      email,
      password,
      role,
      departmentId,
      employeeId,
      specialization,
      qualifications,
    } = req.body;

    const allowedRoles = ["receptionist", "labTechnician", "radiologist"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid role. Must be receptionist, labTechnician, or radiologist",
      });
    }

    // Check email uniqueness
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Validate department for roles that require it
    if (["labTechnician", "radiologist"].includes(role)) {
      if (!departmentId) {
        return res.status(400).json({
          success: false,
          message:
            "Department is required for Lab Technicians and Radiologists",
        });
      }
      const departmentExists = await Department.findOne({
        _id: departmentId,
        hospital: hospitalId,
      });
      if (!departmentExists) {
        return res.status(404).json({
          success: false,
          message: "Department not found or doesn't belong to your hospital",
        });
      }
    }

    let imageUrl =
      "https://res.cloudinary.com/vitalcare/image/upload/v1/default-avatar.png";
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "staff",
          resource_type: "image",
        });
        imageUrl = result.secure_url;
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Failed to delete temp staff image:", err);
        });
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        if (req.file?.path)
          fs.unlink(req.file.path, (err) => {
            if (err)
              console.error("Failed to delete temp staff image on error:", err);
          });
        return res.status(500).json({
          success: false,
          message: "Failed to upload staff image",
          error: uploadError.message,
        });
      }
    }

    // Create user without transaction
    const user = await User.create({
      name,
      email,
      password,
      role,
      hospital: hospitalId,
      department: ["labTechnician", "radiologist"].includes(role)
        ? departmentId
        : null,
      image: imageUrl,
      isVerified: true,
    });

    // Parse qualifications from JSON string if provided
    const parsedQualifications = qualifications
      ? JSON.parse(qualifications)
      : [];

    // Generate employee ID if not provided
    const empId =
      employeeId ||
      `${role.substring(0, 3).toUpperCase()}-${Date.now()
        .toString()
        .slice(-6)}`;

    // Create appropriate staff profile
    let staffProfile;
    if (role === "receptionist") {
      staffProfile = await Receptionist.create({
        userId: user._id,
        hospitalId,
        employeeId: empId,
      });
    } else {
      staffProfile = await Staff.create({
        userId: user._id,
        hospitalId,
        department: departmentId,
        staffType: role,
        employeeId: empId,
        qualifications: parsedQualifications,
        specialization,
      });
    }

    // Send welcome email
    await emailService.sendEmail({
      to: email,
      subject: `Welcome to VitalCare as ${
        role.charAt(0).toUpperCase() + role.slice(1)
      }`,
      html: `<p>Hello ${name},</p><p>You have been added as a ${role} at ${
        req.user.hospitalInfo?.name || "our hospital"
      } on VitalCare.</p><p>Your login credentials:</p><p>Email: ${email}</p><p>Password: ${password}</p><p>Please log in and change your password immediately.</p><p>Login at: ${
        process.env.FRONTEND_URL
      }/login</p>`,
    });

    res.status(201).json({
      success: true,
      message: "Staff member created successfully",
      staff: {
        ...staffProfile.toObject(),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        },
      },
    });
  } catch (error) {
    console.error("Create staff error:", error);
    if (req.file?.path)
      fs.unlink(req.file.path, (err) => {
        if (err)
          console.error("Failed to delete temp staff image on error:", err);
      });
    res.status(500).json({
      success: false,
      message: "Failed to create staff member",
      error: error.message,
    });
  }
};

/**
 * Update staff member
 * @route PUT /api/admin/staff/:id (User ID)
 * @access Private (Admin)
 */
export const updateStaff = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { id } = req.params; // User ID
    const {
      name,
      email,
      departmentId,
      employeeId,
      specialization,
      qualifications,
      isActive,
    } = req.body;

    // Find the user first to ensure it belongs to this admin's hospital
    const user = await User.findOne({
      _id: id,
      hospital: hospitalId,
      role: { $in: ["receptionist", "labTechnician", "radiologist"] },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found or not in your hospital",
      });
    }

    // Check email uniqueness if changed
    if (email && email !== user.email) {
      const emailExists = await User.findOne({
        email,
        _id: { $ne: user._id },
      });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }
      user.email = email;
    }

    // Department validation for roles that require it
    if (["labTechnician", "radiologist"].includes(user.role)) {
      if (departmentId) {
        const departmentExists = await Department.findOne({
          _id: departmentId,
          hospital: hospitalId,
        });
        if (!departmentExists) {
          return res.status(404).json({
            success: false,
            message: "Department not found or not in your hospital",
          });
        }
        user.department = departmentId;
      }
    } else {
      // Ensure roles that don't need department have it set to null
      user.department = null;
    }

    // Process image upload if provided
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "staff",
          resource_type: "image",
        });
        user.image = result.secure_url;
        // Clean up the temporary file
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Failed to delete temp staff image:", err);
        });
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        // Clean up on error
        if (req.file?.path) {
          fs.unlink(req.file.path, (err) => {
            if (err)
              console.error("Failed to delete temp staff image on error:", err);
          });
        }
        return res.status(500).json({
          success: false,
          message: "Failed to upload staff image",
          error: uploadError.message,
        });
      }
    }

    // Update user fields
    if (name) user.name = name;
    if (isActive !== undefined) user.isActive = isActive;

    // Save user updates without transaction
    await user.save();

    // Parse qualifications if provided
    const parsedQualifications = qualifications
      ? typeof qualifications === "string"
        ? JSON.parse(qualifications)
        : qualifications
      : undefined;

    // Update the appropriate staff profile
    let updatedStaffProfile;
    if (user.role === "receptionist") {
      updatedStaffProfile = await Receptionist.findOneAndUpdate(
        { userId: user._id },
        { $set: { employeeId: employeeId || undefined } },
        { new: true }
      );
    } else {
      // For lab technicians and radiologists
      const updateData = {};
      if (employeeId) updateData.employeeId = employeeId;
      if (specialization !== undefined)
        updateData.specialization = specialization;
      if (parsedQualifications !== undefined)
        updateData.qualifications = parsedQualifications;
      if (departmentId) updateData.department = departmentId;

      updatedStaffProfile = await Staff.findOneAndUpdate(
        { userId: user._id },
        { $set: updateData },
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      message: "Staff member updated successfully",
      staff: {
        ...(updatedStaffProfile ? updatedStaffProfile.toObject() : {}),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
          isActive: user.isActive,
        },
      },
    });
  } catch (error) {
    console.error("Update staff error:", error);
    // Clean up temporary file on any other error
    if (req.file?.path) {
      fs.unlink(req.file.path, (err) => {
        if (err)
          console.error("Failed to delete temp staff image on error:", err);
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to update staff member",
      error: error.message,
    });
  }
};
/**
 * Get staff members
 * @route GET /api/admin/staff
 * @access Private (Admin)
 */
export const getStaff = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { page = 1, limit = 10, search, role, status } = req.query;

    // Validate hospital ID
    if (!hospitalId) {
      return res.status(400).json({
        success: false,
        message:
          "Admin hospital ID is missing. Please complete your account setup.",
      });
    }

    // Build query for staff users in this hospital only
    const userQuery = {
      hospital: hospitalId,
      role: { $in: ["receptionist", "labTechnician", "radiologist"] },
    };

    // Role filter
    if (role) userQuery.role = role;

    // Status filter
    if (status === "active") userQuery.isActive = true;
    else if (status === "inactive") userQuery.isActive = false;

    // Search in name or email
    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Count total staff matching query
    const total = await User.countDocuments(userQuery);

    // Get paginated staff users
    const users = await User.find(userQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("department", "name");

    // Get staff profiles for these users
    const userIds = users.map((user) => user._id);

    // Get receptionist profiles
    const receptionistProfiles = await Receptionist.find({
      userId: { $in: userIds },
    }).lean();

    // Get other staff profiles
    const staffProfiles = await Staff.find({
      userId: { $in: userIds },
    }).lean();

    // Combine all profiles into a map for easier lookup
    const profileMap = [...receptionistProfiles, ...staffProfiles].reduce(
      (map, profile) => {
        map[profile.userId.toString()] = profile;
        return map;
      },
      {}
    );

    // Build staff member objects with combined data
    const staffMembers = users.map((user) => {
      const profile = profileMap[user._id.toString()];
      return {
        id: user._id, // User ID
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        department: user.department,
        employeeId: profile?.employeeId || null,
        specialization: profile?.specialization || null,
        qualifications: profile?.qualifications || [],
        isActive: user.isActive,
        createdAt: user.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      staff: staffMembers,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error("Get staff error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get staff members",
      error: error.message,
    });
  }
};

/**
 * Get staff details
 * @route GET /api/admin/staff/:id (User ID)
 * @access Private (Admin)
 */
export const getStaffDetails = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { id } = req.params; // User ID

    const user = await User.findOne({
      _id: id,
      hospital: hospitalId,
      role: { $in: ["receptionist", "labTechnician", "radiologist"] },
    }).populate("department", "name");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Staff member not found" });
    }

    let staffProfile;
    if (user.role === "receptionist") {
      staffProfile = await Receptionist.findOne({ userId: user._id }).lean();
    } else {
      staffProfile = await Staff.findOne({ userId: user._id }).lean();
    }

    res.status(200).json({
      success: true,
      staff: {
        ...(staffProfile || {}), // Spread profile details
        user: {
          // Nest user details
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
          phone: user.phone,
          isActive: user.isActive,
          createdAt: user.createdAt,
          department: user.department,
        },
      },
    });
  } catch (error) {
    console.error("Get staff details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get staff details",
      error: error.message,
    });
  }
};

/**
 * Delete staff member
 * @route DELETE /api/admin/staff/:id (User ID)
 * @access Private (Admin)
 */
export const deleteStaff = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { id } = req.params; // User ID

    const user = await User.findOne({
      _id: id,
      hospital: hospitalId,
      role: { $in: ["receptionist", "labTechnician", "radiologist"] },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Staff member not found" });
    }

    // Delete the specific staff profile first
    if (user.role === "receptionist") {
      await Receptionist.deleteOne({ userId: user._id });
    } else {
      await Staff.deleteOne({ userId: user._id });
    }

    // Delete the user
    await User.deleteOne({ _id: id });

    res
      .status(200)
      .json({ success: true, message: "Staff member deleted successfully" });
  } catch (error) {
    console.error("Delete staff error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete staff member",
      error: error.message,
    });
  }
};

// --- Appointment Management ---

/**
 * Get appointments
 * @route GET /api/admin/appointments
 * @access Private (Admin)
 */
export const getAppointments = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const {
      page = 1,
      limit = 10,
      search,
      status,
      dateFrom,
      dateTo,
      doctorId,
    } = req.query;

    const query = { hospitalId };

    if (status) query.status = status;

    if (dateFrom || dateTo) {
      query.dateTime = {};
      if (dateFrom) query.dateTime.$gte = new Date(dateFrom);
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999); // Include full end day
        query.dateTime.$lte = endOfDay;
      }
    }

    if (doctorId) query.doctorId = doctorId;

    if (search) {
      const patients = await Patient.find({ hospitalId })
        .populate({
          path: "userId",
          match: { name: { $regex: search, $options: "i" } },
          select: "_id",
        })
        .select("_id")
        .lean();

      const matchingPatientIds = patients
        .filter((p) => p.userId)
        .map((p) => p._id);

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
        .filter((d) => d.userId)
        .map((d) => d._id);

      const searchConditions = [];

      if (matchingPatientIds.length > 0)
        searchConditions.push({ patientId: { $in: matchingPatientIds } });

      if (matchingDoctorIds.length > 0)
        searchConditions.push({ doctorId: { $in: matchingDoctorIds } });

      searchConditions.push({ reason: { $regex: search, $options: "i" } });
      searchConditions.push({ notes: { $regex: search, $options: "i" } });

      if (searchConditions.length > 0) {
        query.$or = searchConditions;
      } else {
        query._id = null; // Force no results if search matches nothing relevant
      }
    }

    const total = await Appointment.countDocuments(query);

    const appointments = await Appointment.find(query)
      .sort({ dateTime: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
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
 * Cancel appointment
 * @route PUT /api/admin/appointments/:id/cancel
 * @access Private (Admin)
 */
export const cancelAppointment = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { id } = req.params;
    const { reason } = req.body;

    const appointment = await Appointment.findOne({ _id: id, hospitalId });
    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    }

    if (
      appointment.status === "cancelled" ||
      appointment.status === "completed"
    ) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a ${appointment.status} appointment`,
      });
    }

    appointment.status = "cancelled";
    appointment.notes = reason
      ? `${appointment.notes || ""}\nCancellation reason (Admin): ${reason}`
      : appointment.notes;

    await appointment.save();

    // Free up the doctor's slot if appointment was booked
    const doctor = await Doctor.findById(appointment.doctorId);
    if (doctor && doctor.slots_booked) {
      const date = new Date(appointment.dateTime);
      const slotDate = formatSlotDate(date);
      const slotTime = date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      if (doctor.slots_booked[slotDate]) {
        doctor.slots_booked[slotDate] = doctor.slots_booked[slotDate].filter(
          (time) => time !== slotTime
        );
        // MarkModified is needed if slots_booked is of type Mixed
        doctor.markModified("slots_booked");
        await doctor.save();
      }
    }

    // Notification code would go here

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

// --- Patient Management ---

/**
 * Get patients
 * @route GET /api/admin/patients
 * @access Private (Admin)
 */
export const getPatients = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { page = 1, limit = 10, search } = req.query;

    const query = { hospitalId };

    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ],
        role: "patient",
        hospital: hospitalId, // Ensure user belongs to the admin's hospital
      }).select("_id");

      const userIds = users.map((user) => user._id);

      if (userIds.length > 0) {
        query.userId = { $in: userIds };
      } else {
        // If no users match, return no results
        query._id = null; // Force no results
      }
    }

    const total = await Patient.countDocuments(query);

    const patients = await Patient.find(query)
      .sort({ registrationDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("userId", "name email image phone isActive"); // Populate isActive from User

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
 * @route GET /api/admin/patients/:id (Patient ID)
 * @access Private (Admin)
 */
export const getPatientDetails = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { id } = req.params; // Patient ID

    const patient = await Patient.findOne({ _id: id, hospitalId }).populate(
      "userId",
      "name email image phone isActive createdAt"
    );

    if (!patient) {
      return res
        .status(404)
        .json({ success: false, message: "Patient not found" });
    }

    const appointments = await Appointment.find({ patientId: id })
      .sort({ dateTime: -1 })
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      })
      .limit(10);

    const payments = await Payment.find({ patientId: id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      patient: { ...patient.toObject(), user: patient.userId }, // Keep user nested for consistency
      history: { appointments, payments },
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
 * Update patient status
 * @route PUT /api/admin/patients/:id/status (Patient ID)
 * @access Private (Admin)
 */
export const updatePatientStatus = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { id } = req.params; // Patient ID
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    const patient = await Patient.findOne({ _id: id, hospitalId });
    if (!patient) {
      return res
        .status(404)
        .json({ success: false, message: "Patient not found" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      patient.userId,
      { isActive },
      { new: true }
    );

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "Patient user account not found" });
    }

    res.status(200).json({
      success: true,
      message: `Patient status updated to ${isActive ? "active" : "inactive"}`,
      isActive: updatedUser.isActive,
    });
  } catch (error) {
    console.error("Update patient status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update patient status",
      error: error.message,
    });
  }
};

/**
 * Delete patient
 * @route DELETE /api/admin/patients/:id (Patient ID)
 * @access Private (Admin)
 */
export const deletePatient = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { id } = req.params; // Patient ID

    const patient = await Patient.findOne({ _id: id, hospitalId });
    if (!patient) {
      return res
        .status(404)
        .json({ success: false, message: "Patient not found" });
    }

    // Consider adding checks for active appointments or unpaid bills before deleting
    await User.deleteOne({ _id: patient.userId });
    await Patient.deleteOne({ _id: id });

    // TODO: Cascade delete related data? (Appointments, Records, Payments?) - Use with caution!

    res
      .status(200)
      .json({ success: true, message: "Patient deleted successfully" });
  } catch (error) {
    console.error("Delete patient error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete patient",
      error: error.message,
    });
  }
};

// --- Reports --- (Refactored)

/**
 * Get report data for dashboard charts
 * @route GET /api/admin/reports
 * @access Private (Admin)
 */
export const getReports = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const { reportType = "appointments", period = "month" } = req.query;

    const options = { period }; // Pass period or specific dates if needed

    let reportData;

    // Fetch data using specific aggregation functions from reportService
    switch (reportType) {
      case "appointments":
        reportData = await reportService.getAppointmentSummaryData(
          hospitalId,
          options
        );
        break;
      case "financial":
        reportData = await reportService.getFinancialSummaryData(
          hospitalId,
          options
        );
        break;
      case "patients":
        reportData = await reportService.getPatientDemographicsData(
          hospitalId,
          options
        );
        break;
      case "doctors":
        reportData = await reportService.getDoctorPerformanceData(
          hospitalId,
          options
        );
        break;
      default:
        reportData = await reportService.getAppointmentSummaryData(
          hospitalId,
          options
        );
    }

    res.status(200).json({
      success: true,
      reportData: {
        type: reportType,
        period, // Include period used
        dateRange: reportData.dateRange, // Include actual date range
        data: reportData, // The aggregated data itself
      },
    });
  } catch (error) {
    console.error("Get reports error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate report data",
      error: error.message,
    });
  }
};

/**
 * Generate hospital-specific report (PDF/Excel)
 * @route GET /api/admin/generate-report
 * @access Private (Admin)
 */
export const generateHospitalReport = async (req, res) => {
  try {
    const hospitalId = req.user.hospital;
    const {
      format = "pdf",
      reportType = "APPOINTMENT_SUMMARY", // Default report type
      startDate,
      endDate,
      // Add other specific filters based on reportType if needed
      doctorId,
      status,
    } = req.query;

    let reportData;
    const options = { startDate, endDate, doctorId, status }; // Pass filters

    // Fetch data based on reportType using reportService
    const dataFetcher =
      reportService[
        `get${
          reportType.charAt(0).toUpperCase() +
          reportType
            .slice(1)
            .toLowerCase()
            .replace(/\_([a-z])/g, (g) => g[1].toUpperCase())
        }Data`
      ];

    if (!dataFetcher || typeof dataFetcher !== "function") {
      // Attempt mapping common names if direct match fails
      const typeMap = {
        APPOINTMENT_DETAIL: reportService.getAppointmentDetailData,
        FINANCIAL_SUMMARY: reportService.getFinancialSummaryData,
        PATIENT_DEMOGRAPHICS: reportService.getPatientDemographicsData,
        DOCTOR_PERFORMANCE: reportService.getDoctorPerformanceData,
        APPOINTMENT_SUMMARY: reportService.getAppointmentSummaryData,
      };

      if (typeMap[reportType]) {
        reportData = await typeMap[reportType](hospitalId, options);
      } else {
        return res.status(400).json({
          success: false,
          message: `Invalid report type '${reportType}' specified for Admin.`,
        });
      }
    } else {
      reportData = await dataFetcher(hospitalId, options);
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
    console.error("Generate hospital report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate hospital report",
      error: error.message,
    });
  }
};

/**
 * Download a generated report file
 * @route GET /api/admin/reports/download/:filename
 * @access Private (Admin)
 */
export const downloadReport = async (req, res) => {
  // Or downloadSystemReport
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
      return res
        .status(404)
        .json({
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
      res
        .status(500)
        .json({
          success: false,
          message: "Server error during report download.",
          error: error.message,
        });
    }
  }
};

// Helper function for date formatting (needed for appointment cancellation)
function formatSlotDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

// --- Export all functions ---
export default {
  getDashboard,
  getHospitalProfile,
  updateHospitalProfile,
  createDepartment,
  updateDepartment,
  getDepartments,
  getDepartmentDetails,
  deleteDepartment,
  createDoctor,
  updateDoctor,
  getDoctors,
  getDoctorDetails,
  toggleDoctorAvailability,
  deleteDoctor,
  createStaff,
  updateStaff,
  getStaff,
  getStaffDetails,
  deleteStaff,
  getAppointments,
  cancelAppointment,
  getPatients,
  getPatientDetails,
  updatePatientStatus,
  deletePatient,
  getReports,
  generateHospitalReport,
  downloadReport,
};
