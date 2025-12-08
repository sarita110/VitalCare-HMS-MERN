// src/components/users/StaffForm.jsx
import React, { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import Select from "react-select";
import FormInput from "../common/FormInput";
import Button from "../common/Button";
import { getDepartments } from "../../services/adminService";
import { ROLES } from "../../constants";
import toast from "react-hot-toast";

// Define roles that require department assignment
const requiresDepartmentRoles = [ROLES.LAB_TECHNICIAN, ROLES.RADIOLOGIST];

const staffValidationSchema = Yup.object({
  // User fields
  name: Yup.string().required("Name is required").trim(),
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  role: Yup.string()
    .required("Role is required")
    .oneOf(
      [ROLES.RECEPTIONIST, ROLES.LAB_TECHNICIAN, ROLES.RADIOLOGIST],
      "Invalid staff role"
    ),
  hospitalId: Yup.string().required("Hospital association is required"),
  departmentId: Yup.string().when("role", {
    is: (role) => requiresDepartmentRoles.includes(role),
    then: (schema) =>
      schema
        .required("Department is required for this role")
        .test(
          "is-valid-department",
          "Please select a valid department from your hospital",
          function (value) {
            // This custom validation ensures the departmentId exists in available departments
            return (
              value &&
              this.parent.availableDepartments?.some((d) => d.value === value)
            );
          }
        ),
    otherwise: (schema) => schema.optional().nullable(),
  }),
  password: Yup.string().when("_id", {
    is: (val) => !val, // Only required for new staff
    then: (schema) =>
      schema
        .required("Password is required")
        .min(8, "Password must be at least 8 characters"),
    otherwise: (schema) => schema.optional().nullable(),
  }),
  // Staff specific fields
  employeeId: Yup.string().required("Employee ID is required"),
  qualifications: Yup.string().optional().nullable(),
  specialization: Yup.string().when("role", {
    is: (role) => requiresDepartmentRoles.includes(role),
    then: (schema) => schema.optional().nullable(),
    otherwise: (schema) => schema.optional().nullable(),
  }),
});

const StaffForm = ({
  onSubmit,
  initialValues = null,
  isLoading,
  hospitalId,
  availableRoles,
  onCancel,
}) => {
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [departmentError, setDepartmentError] = useState(null);

  const formik = useFormik({
    initialValues: {
      _id: initialValues?._id || "",
      name: initialValues?.name || "",
      email: initialValues?.email || "",
      password: "",
      role: initialValues?.role || availableRoles?.[0]?.value || "",
      hospitalId: hospitalId || initialValues?.hospitalId || "",
      departmentId: initialValues?.departmentId || "",
      availableDepartments: [], // Will be set from departments state for validation
      employeeId: initialValues?.employeeId || "",
      qualifications: Array.isArray(initialValues?.qualifications)
        ? initialValues.qualifications.join(", ")
        : initialValues?.qualifications || "",
      specialization: initialValues?.specialization || "",
    },
    validationSchema: staffValidationSchema,
    onSubmit: (values) => {
      // Validate that the hospital ID is available
      if (!values.hospitalId) {
        toast.error(
          "Hospital ID not found. Please ensure your account is properly configured."
        );
        return;
      }

      // Check if departments are available for roles that require them
      if (
        requiresDepartmentRoles.includes(values.role) &&
        departments.length === 0
      ) {
        toast.error(
          "Please create departments before adding staff that require department assignment"
        );
        return;
      }

      // For roles that require departments, validate department selection
      if (
        requiresDepartmentRoles.includes(values.role) &&
        !departments.some((d) => d.value === values.departmentId)
      ) {
        toast.error(
          "Selected department is invalid. Please select a valid department."
        );
        return;
      }

      const submissionData = { ...values };

      // Remove validation helper field
      delete submissionData.availableDepartments;

      // Skip password if not provided on edit
      if (initialValues?._id && !submissionData.password) {
        delete submissionData.password;
      }

      // Format qualifications as a JSON string of array if not empty
      if (submissionData.qualifications) {
        submissionData.qualifications = JSON.stringify(
          submissionData.qualifications
            .split(",")
            .map((q) => q.trim())
            .filter(Boolean)
        );
      } else {
        submissionData.qualifications = JSON.stringify([]);
      }

      // Ensure department is null if role doesn't require it
      if (!requiresDepartmentRoles.includes(submissionData.role)) {
        submissionData.departmentId = null;
      }

      onSubmit(submissionData);
    },
    enableReinitialize: true,
  });

  // Fetch departments when role changes to one that requires it
  useEffect(() => {
    const shouldFetchDepartments =
      hospitalId && requiresDepartmentRoles.includes(formik.values.role);

    if (shouldFetchDepartments) {
      const fetchDepartments = async () => {
        setLoadingDepartments(true);
        setDepartmentError(null);

        try {
          const response = await getDepartments({ status: "active" });

          if (response.success && response.departments?.length > 0) {
            const deptOptions = response.departments.map((d) => ({
              value: d._id,
              label: d.name,
            }));
            setDepartments(deptOptions);

            // Update formik validation field
            formik.setFieldValue("availableDepartments", deptOptions);

            // If editing and the selected department isn't in active departments, show warning
            if (
              initialValues?.departmentId &&
              !deptOptions.some((d) => d.value === initialValues.departmentId)
            ) {
              setDepartmentError(
                "The previously selected department is not active. Please select another department."
              );
              formik.setFieldValue("departmentId", "");
            }
          } else if (response.success && response.departments?.length === 0) {
            setDepartmentError(
              "No active departments found. Please create a department first."
            );
            setDepartments([]);
            formik.setFieldValue("availableDepartments", []);
          } else {
            throw new Error(response.message || "Failed to fetch departments");
          }
        } catch (err) {
          console.error("Failed to fetch departments:", err);
          setDepartmentError("Could not load departments. Please try again.");
          setDepartments([]);
          formik.setFieldValue("availableDepartments", []);
        } finally {
          setLoadingDepartments(false);
        }
      };

      fetchDepartments();
    } else {
      // Clear department selection if changing to a role that doesn't need it
      if (
        !requiresDepartmentRoles.includes(formik.values.role) &&
        formik.values.departmentId
      ) {
        formik.setFieldValue("departmentId", "");
      }

      // Clear departments if not needed
      if (!requiresDepartmentRoles.includes(formik.values.role)) {
        setDepartments([]);
        setDepartmentError(null);
      }
    }
  }, [hospitalId, formik.values.role, initialValues?.departmentId]);

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-4">
      {/* User Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          label="Full Name"
          name="name"
          required
          {...formik.getFieldProps("name")}
          error={formik.errors.name}
          touched={formik.touched.name}
        />
        <FormInput
          label="Email"
          name="email"
          type="email"
          required
          {...formik.getFieldProps("email")}
          error={formik.errors.email}
          touched={formik.touched.email}
        />
      </div>

      {!initialValues?._id && (
        <FormInput
          label="Password"
          name="password"
          type="password"
          required
          {...formik.getFieldProps("password")}
          error={formik.errors.password}
          touched={formik.touched.password}
          placeholder="Minimum 8 characters"
        />
      )}

      {/* Role Selection */}
      <div>
        <label htmlFor="roleStaff" className="form-label">
          Role <span className="text-danger-600">*</span>
        </label>
        <Select
          id="roleStaff"
          name="role"
          options={availableRoles}
          value={
            availableRoles.find((opt) => opt.value === formik.values.role) ||
            null
          }
          onChange={(option) => {
            formik.setFieldValue("role", option ? option.value : "");
          }}
          onBlur={formik.handleBlur}
          placeholder="Select role..."
          styles={{
            control: (base) =>
              formik.touched.role && formik.errors.role
                ? { ...base, borderColor: "#dc2626" }
                : base,
          }}
        />
        {formik.touched.role && formik.errors.role ? (
          <p className="form-error">{formik.errors.role}</p>
        ) : null}
      </div>

      {/* Department Selection (Conditional) */}
      {requiresDepartmentRoles.includes(formik.values.role) && (
        <div>
          <label htmlFor="departmentIdStaff" className="form-label">
            Department <span className="text-danger-600">*</span>
          </label>
          <Select
            id="departmentIdStaff"
            name="departmentId"
            options={departments}
            isLoading={loadingDepartments}
            isDisabled={
              !hospitalId || loadingDepartments || departments.length === 0
            }
            value={
              departments.find(
                (opt) => opt.value === formik.values.departmentId
              ) || null
            }
            onChange={(option) =>
              formik.setFieldValue("departmentId", option ? option.value : "")
            }
            onBlur={formik.handleBlur}
            placeholder={
              loadingDepartments
                ? "Loading departments..."
                : departments.length === 0
                ? "No departments available"
                : "Select department..."
            }
            styles={{
              control: (base) =>
                formik.touched.departmentId &&
                (formik.errors.departmentId || departmentError)
                  ? { ...base, borderColor: "#dc2626" }
                  : base,
            }}
          />
          {formik.touched.departmentId && formik.errors.departmentId ? (
            <p className="form-error">{formik.errors.departmentId}</p>
          ) : departmentError ? (
            <p className="form-error">{departmentError}</p>
          ) : null}

          {departments.length === 0 && !loadingDepartments && (
            <p className="text-sm text-warning-600 mt-1">
              No departments found. Please create a department first before
              adding this type of staff member.
            </p>
          )}
        </div>
      )}

      {/* Staff Specific Fields */}
      <h3 className="text-md font-medium pt-3 border-t mt-4">Staff Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          label="Employee ID"
          name="employeeId"
          required
          {...formik.getFieldProps("employeeId")}
          error={formik.errors.employeeId}
          touched={formik.touched.employeeId}
        />

        {requiresDepartmentRoles.includes(formik.values.role) && (
          <FormInput
            label="Specialization (Optional)"
            name="specialization"
            {...formik.getFieldProps("specialization")}
            error={formik.errors.specialization}
            touched={formik.touched.specialization}
          />
        )}
      </div>

      <FormInput
        label="Qualifications (comma-separated)"
        name="qualifications"
        {...formik.getFieldProps("qualifications")}
        error={formik.errors.qualifications}
        touched={formik.touched.qualifications}
        placeholder="e.g., BSc, MSc, Certified Technician"
      />

      {/* Submit/Cancel Buttons */}
      <div className="flex justify-end space-x-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={
            isLoading ||
            !formik.isValid ||
            (requiresDepartmentRoles.includes(formik.values.role) &&
              departments.length === 0)
          }
        >
          {initialValues?._id ? "Update Staff" : "Create Staff"}
        </Button>
      </div>
    </form>
  );
};

export default StaffForm;
