import Hospital from "../models/Hospital.js";
import Department from "../models/Department.js";
import Doctor from "../models/Doctor.js";
import User from "../models/User.js";
import { v2 as cloudinary } from "cloudinary";
import { ROLES } from "../utils/constants.js";

/**
 * Get hospital details
 * @route GET /api/hospitals/:id
 * @access Public
 */
export const getHospitalDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const hospital = await Hospital.findById(id);

    if (!hospital || !hospital.isActive) {
      return res
        .status(404)
        .json({ success: false, message: "Hospital not found" });
    }

    const departments = await Department.find({
      hospital: id,
      isActive: true,
    }).select("name");
    const departmentNames = departments.map((dept) => dept.name);

    // Fetch Doctor profiles directly, then populate their User details
    const doctorProfiles = await Doctor.find() // Find Doctor documents
      .populate({
        // Populate their associated User document
        path: "userId",
        match: { hospital: id, role: ROLES.DOCTOR, isActive: true }, // Filter users
        select: "name email image department",
        populate: { path: "department", select: "name" }, // Populate department within user
      })
      .lean(); // Use .lean() for performance

    const activeDoctorsInHospital = doctorProfiles.filter((doc) => doc.userId); // Filter out doctors whose user didn't match (e.g. inactive or wrong hospital)

    const doctorsForPublicView = activeDoctorsInHospital.map((docProfile) => ({
      id: docProfile._id, // <<< THIS IS THE DOCTOR PROFILE ID
      name: docProfile.userId.name,
      image: docProfile.userId.image,
      department: docProfile.userId.department?.name || null,
      speciality: docProfile.speciality,
      // Add other summary fields you want to show in the list on HospitalDetailsPage
    }));

    const doctorsCount = activeDoctorsInHospital.length;

    const specialties = [
      ...new Set(
        activeDoctorsInHospital.map((d) => d.speciality).filter(Boolean)
      ),
    ];

    const publicHospitalDetails = {
      _id: hospital._id,
      name: hospital.name,
      address: hospital.address,
      contactNumber: hospital.contactNumber,
      email: hospital.email,
      website: hospital.website,
      logo: hospital.logo,
      description: hospital.description,
      departments: departmentNames,
      specialties,
      stats: {
        departments: departments.length,
        doctors: doctorsCount,
      },
    };

    res.status(200).json({
      success: true,
      hospital: publicHospitalDetails,
      doctors: doctorsForPublicView, // Send this structured list
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
 * Get public doctor profile by ID
 * @route GET /api/hospitals/doctors/:id
 * @access Public
 */
export const getDoctorPublicProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the doctor profile
    const doctor = await Doctor.findById(id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Get user data (with department info)
    const user = await User.findById(doctor.userId)
      .select("name email image department")
      .populate("department", "name");

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Get hospital data
    const hospital = await Hospital.findById(user.hospital).select(
      "name address contactNumber"
    );

    // Create public doctor profile
    const doctorProfile = {
      _id: doctor._id,
      speciality: doctor.speciality,
      degree: doctor.degree,
      experience: doctor.experience,
      about: doctor.about,
      available: doctor.available,
      fees: doctor.fees,
      workingHours: doctor.workingHours,
      consultationTime: doctor.consultationTime,
      registrationNumber: doctor.registrationNumber,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        department: user.department,
      },
      hospital: hospital,
    };

    res.status(200).json({
      success: true,
      profile: doctorProfile,
    });
  } catch (error) {
    console.error("Get doctor public profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get doctor profile",
      error: error.message,
    });
  }
};

/**
 * Get all active hospitals
 * @route GET /api/hospitals
 * @access Public
 */
export const getAllHospitals = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    // Build query for active hospitals only
    const query = { isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { "address.city": { $regex: search, $options: "i" } },
        { "address.state": { $regex: search, $options: "i" } },
      ];
    }

    // Count total active hospitals
    const total = await Hospital.countDocuments(query);

    // Get paginated hospitals
    const hospitals = await Hospital.find(query)
      .select("name address contactNumber email logo description")
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Get departments and doctors counts for each hospital
    const hospitalsWithCounts = await Promise.all(
      hospitals.map(async (hospital) => {
        const departmentsCount = await Department.countDocuments({
          hospital: hospital._id,
          isActive: true,
        });

        const doctorsCount = await User.countDocuments({
          hospital: hospital._id,
          role: ROLES.DOCTOR,
          isActive: true,
        });

        return {
          ...hospital.toObject(),
          stats: {
            departments: departmentsCount,
            doctors: doctorsCount,
          },
        };
      })
    );

    res.status(200).json({
      success: true,
      hospitals: hospitalsWithCounts,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error("Get all hospitals error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get hospitals",
      error: error.message,
    });
  }
};

/**
 * Get hospital departments
 * @route GET /api/hospitals/:id/departments
 * @access Public
 */
export const getHospitalDepartments = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if hospital exists and is active
    const hospital = await Hospital.findOne({
      _id: id,
      isActive: true,
    });

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: "Hospital not found",
      });
    }

    // Get active departments
    const departments = await Department.find({
      hospital: id,
      isActive: true,
    }).select("name");

    res.status(200).json({
      success: true,
      departments,
    });
  } catch (error) {
    console.error("Get hospital departments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get hospital departments",
      error: error.message,
    });
  }
};

/**
 * Get department doctors
 * @route GET /api/hospitals/:hospitalId/departments/:departmentId/doctors
 * @access Public
 */
export const getDepartmentDoctors = async (req, res) => {
  try {
    const { hospitalId, departmentId } = req.params;

    // Check if hospital exists and is active
    const hospital = await Hospital.findOne({
      _id: hospitalId,
      isActive: true,
    });

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: "Hospital not found",
      });
    }

    // Check if department exists and is active
    const department = await Department.findOne({
      _id: departmentId,
      hospital: hospitalId,
      isActive: true,
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    // Get doctors in this department
    const doctors = await User.find({
      hospital: hospitalId,
      department: departmentId,
      role: ROLES.DOCTOR,
      isActive: true,
    }).select("name image");

    // Get doctor details
    const doctorIds = doctors.map((d) => d._id);
    const doctorDetails = await Doctor.find({
      userId: { $in: doctorIds },
    }).select("userId speciality degree experience about fees available");

    // Combine user and doctor data
    const doctorsWithDetails = doctors.map((user) => {
      const doctorData = doctorDetails.find(
        (doc) => doc.userId.toString() === user._id.toString()
      );

      return {
        id: user._id,
        name: user.name,
        image: user.image,
        speciality: doctorData?.speciality || null,
        degree: doctorData?.degree || null,
        experience: doctorData?.experience || null,
        about: doctorData?.about || null,
        fees: doctorData?.fees || 0,
        available: doctorData?.available || false,
      };
    });

    res.status(200).json({
      success: true,
      department: department.name,
      doctors: doctorsWithDetails,
    });
  } catch (error) {
    console.error("Get department doctors error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get department doctors",
      error: error.message,
    });
  }
};

/**
 * Upload hospital image
 * @route POST /api/hospitals/:id/upload-image
 * @access Private (Admin)
 */
export const uploadHospitalImage = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if hospital exists
    const hospital = await Hospital.findById(id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: "Hospital not found",
      });
    }

    // Check if user has permission (admin of this hospital)
    if (
      req.user.role !== ROLES.SUPER_ADMIN &&
      (req.user.role !== ROLES.ADMIN || req.user.hospital.toString() !== id)
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Not authorized to update this hospital",
      });
    }

    // Upload image
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "hospitals",
      resource_type: "image",
    });

    // Update hospital
    hospital.logo = result.secure_url;
    await hospital.save();

    res.status(200).json({
      success: true,
      message: "Hospital image uploaded successfully",
      logo: hospital.logo,
    });
  } catch (error) {
    console.error("Upload hospital image error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload hospital image",
      error: error.message,
    });
  }
};
