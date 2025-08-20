// src/components/auth/ResetPasswordForm.jsx
import React from "react";
import { useFormik } from "formik";
import { resetPasswordSchema } from "../../utils/validators";
import FormInput from "../common/FormInput";
import Button from "../common/Button";

const ResetPasswordForm = ({ onSubmit, isLoading, error, successMessage }) => {
  const formik = useFormik({
    initialValues: {
      password: "",
      confirmPassword: "",
    },
    validationSchema: resetPasswordSchema,
    onSubmit: (values) => {
      // Don't send confirmPassword to the backend
      onSubmit({ password: values.password });
    },
  });

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-6">
      {error && (
        <p className="text-sm text-center text-danger-600 bg-danger-100 p-2 rounded-md">
          {error}
        </p>
      )}
      {successMessage && (
        <p className="text-sm text-center text-success-600 bg-success-100 p-2 rounded-md">
          {successMessage}
        </p>
      )}

      <FormInput
        label="New Password"
        id="password"
        name="password"
        type="password"
        value={formik.values.password}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.errors.password}
        touched={formik.touched.password}
        placeholder="Enter new password"
        required
        disabled={!!successMessage}
      />

      <FormInput
        label="Confirm New Password"
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        value={formik.values.confirmPassword}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.errors.confirmPassword}
        touched={formik.touched.confirmPassword}
        placeholder="Confirm new password"
        required
        disabled={!!successMessage}
      />

      <div>
        <Button
          type="submit"
          className="w-full justify-center"
          isLoading={isLoading}
          disabled={isLoading || !formik.isValid || !!successMessage}
        >
          Reset Password
        </Button>
      </div>
    </form>
  );
};

export default ResetPasswordForm;
