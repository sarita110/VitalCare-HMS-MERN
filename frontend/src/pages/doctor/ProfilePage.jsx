// src/pages/doctor/ProfilePage.jsx
import React, { useContext, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Link } from "react-router-dom";
import DoctorContext from "../../context/DoctorContext";
import AuthContext from "../../context/AuthContext";
import doctorService from "../../services/doctorService"; //
import Card from "../../components/common/Card"; //
import Button from "../../components/common/Button"; //
import FormInput from "../../components/common/FormInput"; //
import ImageUpload from "../../components/common/ImageUpload"; //
import LoadingSpinner from "../../components/common/LoadingSpinner"; //
import Modal from "../../components/common/Modal"; //
import Avatar from "../../components/common/Avatar"; //
import {
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  CurrencyDollarIcon,
  InformationCircleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

// Yup schema for profile editing
const doctorProfileSchema = Yup.object({
  about: Yup.string()
    .required("About section is required")
    .min(20, "Please provide more details."),
  fees: Yup.number()
    .required("Consultation fee is required")
    .min(0, "Fee cannot be negative"),
  consultationTime: Yup.number()
    .required("Consultation time (minutes) is required")
    .min(5, "Consultation time too short")
    .max(120),
  // Add validation for workingHours if needed (complex)
});

// Helper to manage working hours form state
const initialWorkingHours = {
  monday: { start: "", end: "", isActive: false },
  tuesday: { start: "", end: "", isActive: false },
  wednesday: { start: "", end: "", isActive: false },
  thursday: { start: "", end: "", isActive: false },
  friday: { start: "", end: "", isActive: false },
  saturday: { start: "", end: "", isActive: false },
  sunday: { start: "", end: "", isActive: false },
};

const ProfilePage = () => {
  // Use doctor context which fetches profile on load
  const {
    doctorProfile,
    loadingProfile,
    profileError,
    updateLocalDoctorProfile,
    fetchDoctorProfile,
  } = useContext(DoctorContext);
  const { updateUserState } = useContext(AuthContext); // To update name/image in general user state

  const [isLoading, setIsLoading] = useState(false); // For actions like update/toggle
  const [isEditing, setIsEditing] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [workingHours, setWorkingHours] = useState(initialWorkingHours);

  // Populate working hours state when profile loads
  useEffect(() => {
    if (doctorProfile?.workingHours) {
      // Deep copy to avoid modifying context state directly
      setWorkingHours(JSON.parse(JSON.stringify(doctorProfile.workingHours)));
    } else {
      setWorkingHours(initialWorkingHours);
    }
  }, [doctorProfile]);

  const formik = useFormik({
    initialValues: {
      about: "",
      fees: 0,
      consultationTime: 30,
      // workingHours handled separately by `workingHours` state
    },
    validationSchema: doctorProfileSchema,
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        const formData = new FormData();
        formData.append("about", values.about);
        formData.append("fees", values.fees);
        formData.append("consultationTime", values.consultationTime);
        // Stringify the workingHours state before sending
        formData.append("workingHours", JSON.stringify(workingHours));

        if (profileImageFile) {
          // This endpoint currently accepts image in a separate request or needs backend update
          // For now, let's assume we update text fields first
          // TODO: Coordinate image upload with backend - might need separate endpoint or merge
          toast.error(
            "Image upload during profile update not implemented yet in this service function."
          );
          // If backend handles image in the same PUT /doctor/profile:
          // formData.append('image', profileImageFile);
        }

        // This service function updates Doctor model fields (about, fees, etc.)
        // It might need adjustment if backend expects user fields (name, phone) too
        const response = await doctorService.updateDoctorProfile(formData); //

        if (response.success && response.profile) {
          updateLocalDoctorProfile(response.profile); // Update doctor context
          // If name/image were updated (requires backend coordination), update auth context
          // updateUserState(response.profile.user);
          toast.success("Profile updated successfully!");
          setProfileImageFile(null);
          setIsEditing(false);
        } else {
          throw new Error(response.message || "Failed to update profile");
        }
      } catch (error) {
        console.error("Doctor profile update error:", error);
        toast.error(error.message || "Could not update profile.");
      } finally {
        setIsLoading(false);
      }
    },
    enableReinitialize: true, // Update form when context data changes
  });

  // Populate form when doctorProfile loads or changes
  useEffect(() => {
    if (doctorProfile) {
      formik.setValues({
        about: doctorProfile.about || "",
        fees: doctorProfile.fees || 0,
        consultationTime: doctorProfile.consultationTime || 30,
      });
      // Working hours are handled by the separate state and effect
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorProfile]);

  const handleEditToggle = () => {
    if (isEditing) {
      formik.resetForm(); // Reset basic fields
      // Reset working hours state from context profile
      setWorkingHours(
        doctorProfile?.workingHours
          ? JSON.parse(JSON.stringify(doctorProfile.workingHours))
          : initialWorkingHours
      );
      setProfileImageFile(null);
    }
    setIsEditing(!isEditing);
  };

  const handleAvailabilityToggle = async () => {
    setIsLoading(true);
    try {
      const response = await doctorService.toggleDoctorAvailability(); //
      if (response.success) {
        // Refresh profile data to reflect the change
        fetchDoctorProfile(); // Refetch data via context action
        toast.success(
          `Availability set to ${
            response.available ? "Available" : "Unavailable"
          }`
        );
      } else {
        throw new Error(response.message || "Failed to toggle availability");
      }
    } catch (error) {
      console.error("Toggle availability error:", error);
      toast.error(error.message || "Could not update availability.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for working hours changes
  const handleWorkingHoursChange = (day, field, value) => {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
    formik.setFieldTouched(`workingHours.${day}.${field}`, true); // Mark as touched for potential validation
  };

  if (loadingProfile && !doctorProfile) {
    return <LoadingSpinner />;
  }

  if (profileError) {
    return (
      <div className="text-center text-danger-500 py-4">{profileError}</div>
    );
  }

  if (!doctorProfile) {
    return (
      <div className="text-center text-gray-500 py-4">
        Doctor profile data not found.
      </div>
    );
  }

  const { user, hospital, ...doctorDetails } = doctorProfile;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-800">My Profile</h1>
        <div className="flex gap-2">
          <Button
            onClick={handleAvailabilityToggle}
            isLoading={isLoading}
            variant={doctorDetails.available ? "success" : "warning"}
            leftIcon={
              doctorDetails.available ? (
                <CheckCircleIcon className="h-5 w-5" />
              ) : (
                <XCircleIcon className="h-5 w-5" />
              )
            }
          >
            {doctorDetails.available ? "Available" : "Unavailable"} (Toggle)
          </Button>
          <Button
            onClick={handleEditToggle}
            variant={isEditing ? "outline" : "primary"}
          >
            {isEditing ? "Cancel Edit" : "Edit Profile"}
          </Button>
        </div>
      </div>

      <Card>
        {!isEditing ? (
          // View Mode
          <div className="space-y-5">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
              <Avatar src={user?.image} alt={user?.name} size="xl" />
              <div className="flex-grow text-center md:text-left">
                <h2 className="text-xl font-bold text-gray-900">
                  {user?.name || "N/A"}
                </h2>
                <p className="text-md text-primary-700">
                  {doctorDetails.speciality}
                </p>
                <p className="text-sm text-gray-500">
                  {user?.department?.name || "No Department"}
                </p>
                <p className="text-sm text-gray-500">
                  {hospital?.name || "No Hospital"}
                </p>
                <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1 text-sm text-gray-600">
                  <span className="flex items-center">
                    <EnvelopeIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                    {user?.email || "N/A"}
                  </span>
                  <span className="flex items-center">
                    <PhoneIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                    {user?.phone || "N/A"}
                  </span>
                </div>
              </div>
            </div>
            <div className="border-t pt-4 space-y-2">
              <h3 className="font-semibold text-gray-800">Details</h3>
              <p className="text-sm flex items-start">
                <AcademicCapIcon className="w-4 h-4 mr-1.5 text-gray-400 mt-0.5 shrink-0" />
                Degree: {doctorDetails.degree}
              </p>
              <p className="text-sm flex items-start">
                <BriefcaseIcon className="w-4 h-4 mr-1.5 text-gray-400 mt-0.5 shrink-0" />
                Experience: {doctorDetails.experience}
              </p>
              <p className="text-sm flex items-start">
                <CurrencyDollarIcon className="w-4 h-4 mr-1.5 text-gray-400 mt-0.5 shrink-0" />
                Fee: {formatCurrency(doctorDetails.fees)}
              </p>
              <p className="text-sm flex items-start">
                <ClockIcon className="w-4 h-4 mr-1.5 text-gray-400 mt-0.5 shrink-0" />
                Consultation Time: {doctorDetails.consultationTime} minutes
              </p>
              <p className="text-sm flex items-start">
                <InformationCircleIcon className="w-4 h-4 mr-1.5 text-gray-400 mt-0.5 shrink-0" />
                Registration No: {doctorDetails.registrationNumber}
              </p>
              <div className="text-sm flex items-start">
                <InformationCircleIcon className="w-4 h-4 mr-1.5 text-gray-400 mt-0.5 shrink-0" />
                <p>
                  <span className="font-medium">About:</span>{" "}
                  {doctorDetails.about || "N/A"}
                </p>
              </div>
            </div>
            {/* Display Working Hours */}
            <div className="border-t pt-4 space-y-2">
              <h3 className="font-semibold text-gray-800">Working Hours</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {Object.entries(workingHours).map(([day, hours]) => (
                  <div
                    key={day}
                    className={`p-2 rounded ${
                      hours.isActive ? "bg-green-50" : "bg-gray-100"
                    }`}
                  >
                    <span className="font-medium capitalize">{day}: </span>
                    {hours.isActive ? (
                      `${hours.start || "--:--"} - ${hours.end || "--:--"}`
                    ) : (
                      <span className="text-gray-500">Inactive</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Link to common settings */}
            <div className="border-t pt-4">
              <Link
                to="/settings"
                className="text-sm flex items-center text-primary-600 hover:underline"
              >
                <Cog6ToothIcon className="w-4 h-4 mr-1.5" /> Manage Account
                Settings (Password)
              </Link>
            </div>
          </div>
        ) : (
          // Edit Mode
          <form onSubmit={formik.handleSubmit} className="space-y-5">
            <p className="text-sm text-gray-600">
              Basic user details (Name, Phone, Image) must be updated via the
              main{" "}
              <Link to="/profile" className="text-primary-600 hover:underline">
                User Profile
              </Link>{" "}
              page.
            </p>

            <FormInput
              label="About Me"
              id="about"
              name="about"
              type="textarea"
              rows={4}
              required
              {...formik.getFieldProps("about")}
              error={formik.errors.about}
              touched={formik.touched.about}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Consultation Fee (NPR)"
                id="fees"
                name="fees"
                type="number"
                required
                {...formik.getFieldProps("fees")}
                error={formik.errors.fees}
                touched={formik.touched.fees}
              />
              <FormInput
                label="Consultation Time (Minutes)"
                id="consultationTime"
                name="consultationTime"
                type="number"
                required
                {...formik.getFieldProps("consultationTime")}
                error={formik.errors.consultationTime}
                touched={formik.touched.consultationTime}
              />
            </div>

            {/* Working Hours Edit */}
            <div className="border-t pt-4 space-y-3">
              <h3 className="font-semibold text-gray-800">
                Edit Working Hours
              </h3>
              {Object.keys(workingHours).map((day) => (
                <div key={day} className="grid grid-cols-4 gap-2 items-center">
                  <label
                    htmlFor={`${day}-active`}
                    className="capitalize text-sm font-medium text-gray-700 col-span-1"
                  >
                    {day}
                  </label>
                  <input
                    id={`${day}-active`}
                    type="checkbox"
                    checked={workingHours[day].isActive}
                    onChange={(e) =>
                      handleWorkingHoursChange(
                        day,
                        "isActive",
                        e.target.checked
                      )
                    }
                    className="form-checkbox h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 col-span-1"
                  />
                  <FormInput
                    type="time"
                    id={`${day}-start`}
                    name={`${day}-start`}
                    value={workingHours[day].start}
                    onChange={(e) =>
                      handleWorkingHoursChange(day, "start", e.target.value)
                    }
                    disabled={!workingHours[day].isActive}
                    className={`col-span-1 ${
                      !workingHours[day].isActive
                        ? "bg-gray-100 opacity-50"
                        : ""
                    }`}
                  />
                  <FormInput
                    type="time"
                    id={`${day}-end`}
                    name={`${day}-end`}
                    value={workingHours[day].end}
                    onChange={(e) =>
                      handleWorkingHoursChange(day, "end", e.target.value)
                    }
                    disabled={!workingHours[day].isActive}
                    className={`col-span-1 ${
                      !workingHours[day].isActive
                        ? "bg-gray-100 opacity-50"
                        : ""
                    }`}
                  />
                </div>
              ))}
            </div>

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
                isLoading={isLoading}
                disabled={isLoading || !formik.isValid}
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};

export default ProfilePage;
