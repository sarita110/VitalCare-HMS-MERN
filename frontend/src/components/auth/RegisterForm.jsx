// src/components/auth/RegisterForm.jsx
import React, { useState, useEffect } from "react";
import { useFormik } from "formik";
// Removed Select from 'react-select' as hospital field is removed for patient
import * as Yup from "yup";
import FormInput from "../common/FormInput";
import Button from "../common/Button";
// Removed getAllHospitals import

const getRegisterSchema = (role) => {
  // role is always 'patient' here
  return Yup.object({
    name: Yup.string().required("Name is required").min(2, "Name is too short"),
    email: Yup.string()
      .email("Invalid email address")
      .required("Email is required"),
    password: Yup.string()
      .required("Password is required")
      .min(8, "Password must be at least 8 characters")
      .matches(/[A-Z]/, "Password must contain an uppercase letter")
      .matches(/[a-z]/, "Password must contain a lowercase letter")
      .matches(/[0-9]/, "Password must contain a number")
      .matches(
        /[!@#$%^&*(),.?":{}|<>]/,
        "Password must contain a special character"
      ),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref("password"), null], "Passwords must match")
      .required("Confirm Password is required"),
    role: Yup.string()
      .oneOf(["patient"], "Registration only available for patients currently")
      .required("Role is required"),
    // hospitalId: Yup.string().optional().nullable(), // <<--- MODIFIED: No longer required for patient
    dob: Yup.date()
      .required("Date of Birth is required")
      .max(new Date(), "Date of Birth cannot be in the future"),
    gender: Yup.string()
      .required("Gender is required")
      .oneOf(["Male", "Female", "Other"], "Invalid gender"),
  });
};

const RegisterForm = ({ onSubmit, isLoading, error }) => {
  // Removed hospitals state and related useEffect

  const role = "patient"; // Hardcoding for this form
  const validationSchema = getRegisterSchema(role);

  const formik = useFormik({
    initialValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: role,
      // hospitalId: "", // <<--- REMOVED
      dob: "",
      gender: "",
    },
    validationSchema: validationSchema,
    onSubmit: (values) => {
      const { confirmPassword, ...submissionData } = values;
      // if (!submissionData.hospitalId) delete submissionData.hospitalId; // No longer needed
      onSubmit(submissionData);
    },
  });

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-4 md:space-y-6">
      {error && (
        <p className="text-sm text-center text-danger-600 bg-danger-100 p-2 rounded-md">
          {error}
        </p>
      )}

      <FormInput
        label="Full Name"
        id="name"
        name="name"
        value={formik.values.name}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.errors.name}
        touched={formik.touched.name}
        placeholder="John Doe"
        required
      />

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
        placeholder="you@example.com"
        required
      />

      <FormInput
        label="Password"
        id="password"
        name="password"
        type="password"
        value={formik.values.password}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.errors.password}
        touched={formik.touched.password}
        placeholder="••••••••"
        required
      />

      <FormInput
        label="Confirm Password"
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        value={formik.values.confirmPassword}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.errors.confirmPassword}
        touched={formik.touched.confirmPassword}
        placeholder="••••••••"
        required
      />

      {/* Patient Specific Fields (DOB, Gender) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          label="Date of Birth"
          id="dob"
          name="dob"
          type="date"
          value={formik.values.dob}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.errors.dob}
          touched={formik.touched.dob}
          required
          max={new Date().toISOString().split("T")[0]}
        />

        <div>
          <label htmlFor="gender" className="form-label">
            Gender <span className="text-danger-600">*</span>
          </label>
          <select
            id="gender"
            name="gender"
            value={formik.values.gender}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={`form-input ${
              formik.touched.gender && formik.errors.gender
                ? "border-danger-500 focus:border-danger-500 focus:ring-danger-500"
                : "border-gray-300 focus:border-primary-500 focus:ring-primary-500"
            }`}
            required
          >
            <option value="" disabled>
              Select Gender
            </option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          {formik.touched.gender && formik.errors.gender ? (
            <p className="form-error">{formik.errors.gender}</p>
          ) : null}
        </div>
      </div>
      {/* Hospital selection removed for patients */}

      <div className="pt-2">
        <Button
          type="submit"
          className="w-full justify-center"
          isLoading={isLoading}
          disabled={isLoading || !formik.isValid}
        >
          Create Account
        </Button>
      </div>
    </form>
  );
};

export default RegisterForm;
