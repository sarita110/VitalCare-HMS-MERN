// src/pages/patient/ProfilePage.jsx
import React, { useContext, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import PatientContext from "../../context/PatientContext";
import AuthContext from "../../context/AuthContext"; // Needed for basic user info from token if context is loading
import patientService from "../../services/patientService"; //
import Card from "../../components/common/Card"; //
import Button from "../../components/common/Button"; //
import FormInput from "../../components/common/FormInput"; //
import ImageUpload from "../../components/common/ImageUpload"; //
import LoadingSpinner from "../../components/common/LoadingSpinner"; //
import Modal from "../../components/common/Modal"; //
import Avatar from "../../components/common/Avatar"; //
import {
  UserIcon,
  CalendarDaysIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  HeartIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon,
  IdentificationIcon,
} from "@heroicons/react/24/outline";
import { formatDate, calculateAge } from "../../utils/helpers"; //

// Schema for editing patient-specific details
const patientDetailsSchema = Yup.object({
  // Fields from UserProfilePage are handled there
  dob: Yup.date()
    .required("Date of Birth is required")
    .max(new Date(), "Date of Birth cannot be in the future"),
  gender: Yup.string()
    .required("Gender is required")
    .oneOf(["Male", "Female", "Other"]),
  bloodGroup: Yup.string()
    .oneOf(
      ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""],
      "Invalid blood group"
    )
    .nullable(),
  address: Yup.object({
    street: Yup.string().required("Street is required"),
    city: Yup.string().required("City is required"),
    state: Yup.string().required("State is required"),
    zipCode: Yup.string().required("Zip code is required"),
    country: Yup.string().required("Country is required"),
  }),
  emergencyContact: Yup.object({
    name: Yup.string().required("Emergency contact name is required"),
    relationship: Yup.string().required("Relationship is required"),
    phone: Yup.string()
      .matches(/^(?:\+977|0)?(?:98|97)\d{8}$/, {
        message: "Invalid Nepali phone number",
        excludeEmptyString: false,
      })
      .required("Emergency contact phone is required"), // Allow empty string check within matches
  }),
  allergies: Yup.string().nullable(), // Input as comma-separated
  chronicDiseases: Yup.string().nullable(), // Input as comma-separated
  insuranceInfo: Yup.object({
    provider: Yup.string().nullable(),
    policyNumber: Yup.string().nullable(),
    expiryDate: Yup.date()
      .min(new Date(), "Expiry date must be in the future")
      .nullable(),
  }).nullable(),
});

const ProfilePage = () => {
  const { user: authUser } = useContext(AuthContext); // Get basic user info immediately
  // Use PatientContext which fetches detailed profile
  const {
    patientProfile,
    loadingProfile,
    profileError,
    updateLocalPatientProfile,
    fetchPatientProfile,
  } = useContext(PatientContext);

  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const formik = useFormik({
    initialValues: {
      dob: "",
      gender: "",
      bloodGroup: "",
      address: { street: "", city: "", state: "", zipCode: "", country: "" },
      emergencyContact: { name: "", relationship: "", phone: "" },
      allergies: "",
      chronicDiseases: "",
      insuranceInfo: { provider: "", policyNumber: "", expiryDate: "" },
    },
    validationSchema: patientDetailsSchema,
    onSubmit: async (values) => {
      setActionLoading(true);
      try {
        // Prepare payload, converting comma-separated strings to arrays
        const payload = {
          ...values,
          allergies: values.allergies
            ? values.allergies
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
          chronicDiseases: values.chronicDiseases
            ? values.chronicDiseases
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
          // Ensure insurance expiry date is handled correctly (might need adjustment based on backend)
          insuranceInfo: {
            ...values.insuranceInfo,
            expiryDate: values.insuranceInfo.expiryDate || null,
          },
        };
        // This service function should only update patient-specific fields
        // The common UserProfilePage handles name, phone, image updates
        const response = await patientService.updatePatientProfile(payload); // Assuming updatePatientProfile only sends patient data

        if (response.success && response.profile) {
          updateLocalPatientProfile(response.profile); // Update context
          toast.success("Patient details updated successfully!");
          setIsEditingDetails(false); // Exit edit mode
        } else {
          throw new Error(
            response.message || "Failed to update patient details"
          );
        }
      } catch (error) {
        console.error("Patient details update error:", error);
        toast.error(error.message || "Could not update patient details.");
      } finally {
        setActionLoading(false);
      }
    },
    enableReinitialize: true, // Update form when context data changes
  });

  // Populate form when patientProfile loads or changes
  useEffect(() => {
    if (patientProfile) {
      formik.setValues({
        dob: patientProfile.dob
          ? formatDate(patientProfile.dob, "yyyy-MM-dd")
          : "", // Format for date input
        gender: patientProfile.gender || "",
        bloodGroup: patientProfile.bloodGroup || "",
        address: {
          street: patientProfile.address?.street || "",
          city: patientProfile.address?.city || "",
          state: patientProfile.address?.state || "",
          zipCode: patientProfile.address?.zipCode || "",
          country: patientProfile.address?.country || "",
        },
        emergencyContact: {
          name: patientProfile.emergencyContact?.name || "",
          relationship: patientProfile.emergencyContact?.relationship || "",
          phone: patientProfile.emergencyContact?.phone || "",
        },
        allergies: patientProfile.allergies?.join(", ") || "", // Join array for input
        chronicDiseases: patientProfile.chronicDiseases?.join(", ") || "", // Join array for input
        insuranceInfo: {
          provider: patientProfile.insuranceInfo?.provider || "",
          policyNumber: patientProfile.insuranceInfo?.policyNumber || "",
          expiryDate: patientProfile.insuranceInfo?.expiryDate
            ? formatDate(patientProfile.insuranceInfo.expiryDate, "yyyy-MM-dd")
            : "", // Format for date input
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientProfile]);

  const handleEditToggle = () => {
    if (isEditingDetails) {
      formik.resetForm(); // Reset to original values
    }
    setIsEditingDetails(!isEditingDetails);
  };

  if (loadingProfile && !patientProfile) {
    return <LoadingSpinner />;
  }

  if (profileError) {
    return (
      <div className="text-center text-danger-500 py-4">{profileError}</div>
    );
  }

  // Use authUser for immediate display while patientProfile loads
  const displayUser = patientProfile?.user || authUser;
  const displayProfile = patientProfile || {}; // Use empty object if profile still loading

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">My Profile</h1>

      {/* Basic Info (from common component/context) */}
      <Card>
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
          <Avatar src={displayUser?.image} alt={displayUser?.name} size="xl" />
          <div className="flex-grow text-center md:text-left">
            <h2 className="text-xl font-bold text-gray-900">
              {displayUser?.name || "N/A"}
            </h2>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
              <span className="flex items-center">
                <EnvelopeIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                {displayUser?.email || "N/A"}
              </span>
              <span className="flex items-center">
                <PhoneIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                {displayUser?.phone || "N/A"}
              </span>
              <span className="flex items-center">
                <BuildingOfficeIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                Hospital: {displayProfile.hospital?.name || "N/A"}
              </span>
              <span className="flex items-center">
                <CalendarDaysIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                Registered:{" "}
                {formatDate(displayProfile.registrationDate) || "N/A"}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
              <Link to="/profile">
                <Button size="sm" variant="outline">
                  Edit Basic Info
                </Button>
              </Link>
              <Link to="/settings">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Cog6ToothIcon className="w-4 h-4" />}
                >
                  Account Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* Patient Specific Details */}
      <Card title="Medical & Contact Information">
        <div className="flex justify-end mb-4">
          <Button
            onClick={handleEditToggle}
            variant={isEditingDetails ? "outline" : "secondary"}
            size="sm"
          >
            {isEditingDetails ? "Cancel Edit" : "Edit Details"}
          </Button>
        </div>

        {!isEditingDetails ? (
          // View Mode
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-medium">Date of Birth:</span>{" "}
              {formatDate(displayProfile.dob) || "N/A"} (
              {calculateAge(displayProfile.dob) ?? "N/A"} years)
            </p>
            <p>
              <span className="font-medium">Gender:</span>{" "}
              {displayProfile.gender || "N/A"}
            </p>
            <p>
              <span className="font-medium">Blood Group:</span>{" "}
              {displayProfile.bloodGroup || "N/A"}
            </p>
            <p>
              <span className="font-medium">Address:</span>{" "}
              {displayProfile.address
                ? `${displayProfile.address.street}, ${displayProfile.address.city}, ...`
                : "N/A"}
            </p>
            <p>
              <span className="font-medium">Emergency Contact:</span>{" "}
              {displayProfile.emergencyContact?.name} (
              {displayProfile.emergencyContact?.relationship}):{" "}
              {displayProfile.emergencyContact?.phone || "N/A"}
            </p>
            <p>
              <span className="font-medium">Allergies:</span>{" "}
              {displayProfile.allergies?.join(", ") || "None reported"}
            </p>
            <p>
              <span className="font-medium">Chronic Diseases:</span>{" "}
              {displayProfile.chronicDiseases?.join(", ") || "None reported"}
            </p>
            <div className="pt-2 border-t mt-2">
              <h4 className="font-medium text-xs uppercase text-gray-500">
                Insurance (if applicable)
              </h4>
              <p>Provider: {displayProfile.insuranceInfo?.provider || "N/A"}</p>
              <p>
                Policy No: {displayProfile.insuranceInfo?.policyNumber || "N/A"}
              </p>
              <p>
                Expiry:{" "}
                {formatDate(displayProfile.insuranceInfo?.expiryDate) || "N/A"}
              </p>
            </div>
          </div>
        ) : (
          // Edit Mode
          <form onSubmit={formik.handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormInput
                label="Date of Birth"
                id="dob"
                name="dob"
                type="date"
                required
                max={new Date().toISOString().split("T")[0]}
                {...formik.getFieldProps("dob")}
                error={formik.errors.dob}
                touched={formik.touched.dob}
              />
              <div>
                <label htmlFor="gender" className="form-label">
                  Gender <span className="text-danger-600">*</span>
                </label>
                <select
                  id="gender"
                  name="gender"
                  required
                  {...formik.getFieldProps("gender")}
                  className={`form-input ${
                    formik.touched.gender && formik.errors.gender
                      ? "border-danger-500"
                      : ""
                  }`}
                >
                  <option value="" disabled>
                    Select...
                  </option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {formik.touched.gender && formik.errors.gender ? (
                  <p className="form-error">{formik.errors.gender}</p>
                ) : null}
              </div>
              <div>
                <label htmlFor="bloodGroup" className="form-label">
                  Blood Group
                </label>
                <select
                  id="bloodGroup"
                  name="bloodGroup"
                  {...formik.getFieldProps("bloodGroup")}
                  className={`form-input ${
                    formik.touched.bloodGroup && formik.errors.bloodGroup
                      ? "border-danger-500"
                      : ""
                  }`}
                >
                  <option value="">Select...</option>
                  <option value="A+">A+</option> <option value="A-">A-</option>
                  <option value="B+">B+</option> <option value="B-">B-</option>
                  <option value="AB+">AB+</option>{" "}
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option> <option value="O-">O-</option>
                </select>
                {formik.touched.bloodGroup && formik.errors.bloodGroup ? (
                  <p className="form-error">{formik.errors.bloodGroup}</p>
                ) : null}
              </div>
            </div>
            {/* Address */}
            <fieldset className="border p-4 rounded mt-4">
              <legend className="text-sm font-medium px-1">Address</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Street"
                  id="address.street"
                  name="address.street"
                  required
                  {...formik.getFieldProps("address.street")}
                  error={formik.errors.address?.street}
                  touched={formik.touched.address?.street}
                />
                <FormInput
                  label="City"
                  id="address.city"
                  name="address.city"
                  required
                  {...formik.getFieldProps("address.city")}
                  error={formik.errors.address?.city}
                  touched={formik.touched.address?.city}
                />
                <FormInput
                  label="State"
                  id="address.state"
                  name="address.state"
                  required
                  {...formik.getFieldProps("address.state")}
                  error={formik.errors.address?.state}
                  touched={formik.touched.address?.state}
                />
                <FormInput
                  label="Zip Code"
                  id="address.zipCode"
                  name="address.zipCode"
                  required
                  {...formik.getFieldProps("address.zipCode")}
                  error={formik.errors.address?.zipCode}
                  touched={formik.touched.address?.zipCode}
                />
                <FormInput
                  label="Country"
                  id="address.country"
                  name="address.country"
                  required
                  {...formik.getFieldProps("address.country")}
                  error={formik.errors.address?.country}
                  touched={formik.touched.address?.country}
                />
              </div>
            </fieldset>
            {/* Emergency Contact */}
            <fieldset className="border p-4 rounded mt-4">
              <legend className="text-sm font-medium px-1">
                Emergency Contact
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormInput
                  label="Name"
                  id="emergencyContact.name"
                  name="emergencyContact.name"
                  required
                  {...formik.getFieldProps("emergencyContact.name")}
                  error={formik.errors.emergencyContact?.name}
                  touched={formik.touched.emergencyContact?.name}
                />
                <FormInput
                  label="Relationship"
                  id="emergencyContact.relationship"
                  name="emergencyContact.relationship"
                  required
                  {...formik.getFieldProps("emergencyContact.relationship")}
                  error={formik.errors.emergencyContact?.relationship}
                  touched={formik.touched.emergencyContact?.relationship}
                />
                <FormInput
                  label="Phone"
                  id="emergencyContact.phone"
                  name="emergencyContact.phone"
                  type="tel"
                  required
                  {...formik.getFieldProps("emergencyContact.phone")}
                  error={formik.errors.emergencyContact?.phone}
                  touched={formik.touched.emergencyContact?.phone}
                />
              </div>
            </fieldset>
            {/* Allergies & Chronic Diseases */}
            <FormInput
              label="Allergies (comma-separated)"
              id="allergies"
              name="allergies"
              {...formik.getFieldProps("allergies")}
              error={formik.errors.allergies}
              touched={formik.touched.allergies}
            />
            <FormInput
              label="Chronic Diseases (comma-separated)"
              id="chronicDiseases"
              name="chronicDiseases"
              {...formik.getFieldProps("chronicDiseases")}
              error={formik.errors.chronicDiseases}
              touched={formik.touched.chronicDiseases}
            />

            {/* Insurance */}
            <fieldset className="border p-4 rounded mt-4">
              <legend className="text-sm font-medium px-1">
                Insurance Information (Optional)
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormInput
                  label="Provider"
                  id="insuranceInfo.provider"
                  name="insuranceInfo.provider"
                  {...formik.getFieldProps("insuranceInfo.provider")}
                  error={formik.errors.insuranceInfo?.provider}
                  touched={formik.touched.insuranceInfo?.provider}
                />
                <FormInput
                  label="Policy Number"
                  id="insuranceInfo.policyNumber"
                  name="insuranceInfo.policyNumber"
                  {...formik.getFieldProps("insuranceInfo.policyNumber")}
                  error={formik.errors.insuranceInfo?.policyNumber}
                  touched={formik.touched.insuranceInfo?.policyNumber}
                />
                <FormInput
                  label="Expiry Date"
                  id="insuranceInfo.expiryDate"
                  name="insuranceInfo.expiryDate"
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  {...formik.getFieldProps("insuranceInfo.expiryDate")}
                  error={formik.errors.insuranceInfo?.expiryDate}
                  touched={formik.touched.insuranceInfo?.expiryDate}
                />
              </div>
            </fieldset>

            <div className="pt-4 flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleEditToggle}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={actionLoading}
                disabled={actionLoading || !formik.isValid}
              >
                Save Details
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};

export default ProfilePage;
