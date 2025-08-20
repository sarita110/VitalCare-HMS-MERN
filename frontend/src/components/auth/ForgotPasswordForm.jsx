// src/components/auth/ForgotPasswordForm.jsx
import React from "react";
import { useFormik } from "formik";
import { forgotPasswordSchema } from "../../utils/validators";
import FormInput from "../common/FormInput";
import Button from "../common/Button";

const ForgotPasswordForm = ({ onSubmit, isLoading, error, successMessage }) => {
  const formik = useFormik({
    initialValues: {
      email: "",
    },
    validationSchema: forgotPasswordSchema,
    onSubmit: (values) => {
      onSubmit(values);
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
        label="Email Address"
        id="email"
        name="email"
        type="email"
        value={formik.values.email}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.errors.email}
        touched={formik.touched.email}
        placeholder="Enter your registered email"
        required
        disabled={!!successMessage} // Disable input after success
      />

      <div>
        <Button
          type="submit"
          className="w-full justify-center"
          isLoading={isLoading}
          disabled={isLoading || !formik.isValid || !!successMessage}
        >
          Send Reset Link
        </Button>
      </div>
    </form>
  );
};

export default ForgotPasswordForm;
