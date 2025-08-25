import Hospital from "../models/Hospital.js";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";

// Middleware to check user roles
export const isSuperAdmin = (req, res, next) => {
  if (req.user.role !== "superAdmin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Super Admin access required.",
    });
  }
  next();
};

export const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin access required.",
    });
  }
  next();
};

export const isDoctor = async (req, res, next) => {
  if (req.user.role !== "doctor") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Doctor access required.",
    });
  }

  try {
    // Get doctor details to attach to request
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found.",
      });
    }
    req.doctor = doctor;
    next();
  } catch (error) {
    console.error("Doctor role check error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error in doctor authorization.",
    });
  }
};

export const isPatient = async (req, res, next) => {
  if (req.user.role !== "patient") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Patient access required.",
    });
  }

  try {
    // Get patient details to attach to request
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found.",
      });
    }
    req.patient = patient;
    next();
  } catch (error) {
    console.error("Patient role check error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error in patient authorization.",
    });
  }
};

export const isReceptionist = (req, res, next) => {
  if (req.user.role !== "receptionist") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Receptionist access required.",
    });
  }
  next();
};

export const isLabTechnician = (req, res, next) => {
  if (req.user.role !== "labTechnician") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Lab Technician access required.",
    });
  }
  next();
};

export const isRadiologist = (req, res, next) => {
  if (req.user.role !== "radiologist") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Radiologist access required.",
    });
  }
  next();
};

// --- Shared Permissions Middleware ---

/**
 * Middleware to check if the logged-in user (Doctor or Receptionist)
 * has permission to access a specific patient's records based on hospital affiliation.
 */
export const canAccessPatientRecords = async (req, res, next) => {
  try {
    const allowedRoles = [ROLES.DOCTOR, ROLES.RECEPTIONIST];
    const userRole = req.user.role;
    const userHospitalId = req.user.hospital?.toString(); // Use optional chaining and convert to string
    const patientId = req.params.id; // Patient ID from URL parameter

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient role permissions.",
      });
    }

    if (!patientId) {
      return res
        .status(400)
        .json({ success: false, message: "Patient ID parameter is missing." });
    }

    // Find the patient using their Patient model ID (not User ID)
    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res
        .status(404)
        .json({ success: false, message: "Patient not found." });
    }

    const patientHospitalId = patient.hospitalId?.toString(); // Use optional chaining

    // Check if user and patient belong to the same hospital
    if (
      !userHospitalId ||
      !patientHospitalId ||
      userHospitalId !== patientHospitalId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. User and patient are not in the same hospital.",
      });
    }

    // If all checks pass
    req.targetPatient = patient; // Optionally attach patient profile for the controller
    next();
  } catch (error) {
    console.error("canAccessPatientRecords middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during patient record access check.",
    });
  }
};

// Check if user belongs to a specific hospital
export const belongsToHospital = (hospitalParamName = "hospitalId") => {
  return async (req, res, next) => {
    try {
      const hospitalId =
        req.params[hospitalParamName] || req.body[hospitalParamName];

      if (!hospitalId) {
        return res.status(400).json({
          success: false,
          message: "Hospital ID is required.",
        });
      }

      // Super admin can access any hospital
      if (req.user.role === "superAdmin") {
        return next();
      }

      // Check if user belongs to the specified hospital
      if (
        req.user.hospital &&
        req.user.hospital.toString() === hospitalId.toString()
      ) {
        return next();
      }

      // For admins, check if they're assigned to this hospital
      if (req.user.role === "admin") {
        const hospital = await Hospital.findById(hospitalId);
        if (
          hospital &&
          hospital.admins.some(
            (adminId) => adminId.toString() === req.user._id.toString()
          )
        ) {
          return next();
        }
      }

      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission for this hospital.",
      });
    } catch (error) {
      console.error("Hospital check error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error in hospital authorization.",
      });
    }
  };
};
