// src/components/auth/LoginForm.jsx
import React from "react";
import { useFormik } from "formik";
import { loginSchema } from "../../utils/validators";
import FormInput from "../common/FormInput";
import Button from "../common/Button";
import { Link } from "react-router-dom";

const LoginForm = ({ onSubmit, isLoading, error }) => {
  // error here is the authError from context
  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: loginSchema,
    onSubmit: (values) => {
      onSubmit(values);
    },
  });

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-6">
      {/* Display the API/auth error here if passed */}
      {error && (
        <p className="text-sm text-center text-danger-600 bg-danger-100 p-2 rounded-md">
          {error}
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
        error={formik.touched.email && formik.errors.email} // Yup validation error
        touched={formik.touched.email}
        placeholder="you@example.com"
        required
      />

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <div className="text-sm">
            <Link
              to="/forgot-password"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Forgot your password?
            </Link>
          </div>
        </div>
        <FormInput
          id="password"
          name="password"
          type="password"
          value={formik.values.password}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.password && formik.errors.password} // Yup validation error
          touched={formik.touched.password}
          placeholder="Enter your password"
          required
        />
      </div>

      <div>
        <Button
          type="submit"
          className="w-full justify-center"
          isLoading={isLoading}
          disabled={isLoading || !formik.isValid}
        >
          Sign in
        </Button>
      </div>
    </form>
  );
};

export default LoginForm;
