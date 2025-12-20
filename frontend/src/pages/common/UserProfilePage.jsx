// src/pages/common/UserProfilePage.jsx
import React, { useContext, useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import { Link } from "react-router-dom"; // For navigation

import AuthContext from "../../context/AuthContext";
import userService from "../../services/userService"; // Use the new userService

import Card from "../../components/common/Card"; //
import FormInput from "../../components/common/FormInput"; //
import Button from "../../components/common/Button"; //
import Avatar from "../../components/common/Avatar"; //
import ImageUpload from "../../components/common/ImageUpload"; //
import LoadingSpinner from "../../components/common/LoadingSpinner"; //

const profileSchema = Yup.object({
  name: Yup.string().required("Name is required").min(2, "Name is too short"),
  phone: Yup.string()
    .matches(/^(?:\+977|0)?(?:98|97)\d{8}$/, {
      message: "Invalid Nepali phone number",
      excludeEmptyString: true,
    })
    .nullable(), // Allow empty/null phone
});

const UserProfilePage = () => {
  const {
    user,
    loading: authLoading,
    updateUserState,
  } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState(null);

  const formik = useFormik({
    initialValues: {
      name: "",
      email: "", // Email is usually not updatable
      phone: "",
    },
    validationSchema: profileSchema,
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        const formData = new FormData();
        formData.append("name", values.name);
        formData.append("phone", values.phone || ""); // Send empty string if null/undefined
        if (profileImageFile) {
          formData.append("image", profileImageFile); // Use 'image' key matching backend Multer field
        }

        const response = await userService.updateUserProfile(formData); //

        if (response.success && response.user) {
          updateUserState(response.user); // Update context state
          toast.success("Profile updated successfully!");
          setProfileImageFile(null); // Reset file state after successful upload
        } else {
          throw new Error(response.message || "Failed to update profile");
        }
      } catch (error) {
        console.error("Profile update error:", error);
        toast.error(error.message || "Could not update profile.");
      } finally {
        setIsLoading(false);
      }
    },
    enableReinitialize: true, // Update form when user context changes
  });

  // Effect to set initial form values once user data is available
  useEffect(() => {
    if (user) {
      formik.setValues({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (authLoading || !user) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Your Profile</h1>
      <Card title="Profile Information">
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center md:flex-row md:items-start space-y-4 md:space-y-0 md:space-x-6">
            {/* Image Upload */}
            <ImageUpload
              label="Profile Picture"
              initialImageUrl={user.image}
              onChange={(file) => setProfileImageFile(file)} // Capture the file object
              alt={user.name}
            />
            {/* Profile Fields */}
            <div className="flex-grow w-full space-y-4">
              <FormInput
                label="Full Name"
                id="name"
                name="name"
                required
                {...formik.getFieldProps("name")}
                error={formik.errors.name}
                touched={formik.touched.name}
              />
              <FormInput
                label="Email Address"
                id="email"
                name="email"
                type="email"
                value={formik.values.email} // Display email
                disabled // Email is typically not editable
                readOnly
                className="bg-gray-100"
              />
              <FormInput
                label="Phone Number"
                id="phone"
                name="phone"
                {...formik.getFieldProps("phone")}
                error={formik.errors.phone}
                touched={formik.touched.phone}
                placeholder="e.g., 98XXXXXXXX"
              />
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={isLoading || !formik.isValid || !formik.dirty}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
      {/* Add other sections like 'Change Password' here or link to Settings */}
      <Card title="Account Security">
        <Link
          to="/settings"
          className="text-primary-600 hover:text-primary-800 hover:underline"
        >
          Change your password or manage account settings.
        </Link>
      </Card>
    </div>
  );
};

export default UserProfilePage;
