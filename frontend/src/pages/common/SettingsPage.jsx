// src/pages/common/SettingsPage.jsx
import React, { useState, useContext } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import AuthContext from "../../context/AuthContext";
import userService from "../../services/userService"; // Use the new userService

import Card from "../../components/common/Card"; //
import FormInput from "../../components/common/FormInput"; //
import Button from "../../components/common/Button"; //
import LoadingSpinner from "../../components/common/LoadingSpinner"; //

const passwordSchema = Yup.object({
  currentPassword: Yup.string().required("Current password is required"),
  newPassword: Yup.string()
    .required("New password is required")
    .min(8, "Password must be at least 8 characters")
    .matches(/[A-Z]/, "Password must contain an uppercase letter")
    .matches(/[a-z]/, "Password must contain a lowercase letter")
    .matches(/[0-9]/, "Password must contain a number")
    .matches(/[^A-Za-z0-9]/, "Password must contain a special character"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("newPassword"), null], "Passwords must match")
    .required("Confirm new password is required"),
});

const SettingsPage = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState(null);

  const formik = useFormik({
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validationSchema: passwordSchema,
    onSubmit: async (values, { resetForm }) => {
      setIsLoading(true);
      setChangePasswordError(null);
      setChangePasswordSuccess(null);
      try {
        const response = await userService.changePassword({
          //
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        });
        if (response.success) {
          toast.success("Password changed successfully!");
          setChangePasswordSuccess("Password updated.");
          resetForm();
        } else {
          throw new Error(response.message || "Failed to change password");
        }
      } catch (error) {
        console.error("Change password error:", error);
        const errMsg =
          error?.message ||
          "Could not change password. Please check your current password.";
        setChangePasswordError(errMsg);
        toast.error(errMsg);
      } finally {
        setIsLoading(false);
      }
    },
  });

  if (authLoading || !user) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Settings</h1>

      {/* Change Password Section */}
      <Card title="Change Password">
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          {changePasswordError && (
            <p className="text-sm text-center text-danger-600 bg-danger-100 p-2 rounded-md">
              {changePasswordError}
            </p>
          )}
          {changePasswordSuccess && (
            <p className="text-sm text-center text-success-600 bg-success-100 p-2 rounded-md">
              {changePasswordSuccess}
            </p>
          )}
          <FormInput
            label="Current Password"
            id="currentPassword"
            name="currentPassword"
            type="password"
            required
            {...formik.getFieldProps("currentPassword")}
            error={formik.errors.currentPassword}
            touched={formik.touched.currentPassword}
          />
          <FormInput
            label="New Password"
            id="newPassword"
            name="newPassword"
            type="password"
            required
            {...formik.getFieldProps("newPassword")}
            error={formik.errors.newPassword}
            touched={formik.touched.newPassword}
          />
          <FormInput
            label="Confirm New Password"
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            {...formik.getFieldProps("confirmPassword")}
            error={formik.errors.confirmPassword}
            touched={formik.touched.confirmPassword}
          />
          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={isLoading || !formik.isValid}
            >
              Change Password
            </Button>
          </div>
        </form>
      </Card>

      {/* Notification Settings Section (Placeholder) */}
      <Card title="Notification Settings">
        <p className="text-gray-600">
          Manage your notification preferences (Feature coming soon).
        </p>
        {/* Add controls for notification preferences later */}
      </Card>

      {/* Other settings sections can be added here */}
    </div>
  );
};

export default SettingsPage;
