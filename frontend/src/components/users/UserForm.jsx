// src/components/users/UserForm.jsx
import React, { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import Select from "react-select";
import FormInput from "../common/FormInput";
import Button from "../common/Button";
import { getHospitals } from "../../services/superAdminService"; // Assuming super admin creates admins
import { getDepartments } from "../../services/adminService"; // Assuming admin creates doctors/staff
import { ROLES } from "../../constants"; // Import roles constant

// Define roles that require hospital and potentially department
const staffRoles = [
  ROLES.ADMIN,
  ROLES.DOCTOR,
  ROLES.RECEPTIONIST,
  ROLES.LAB_TECHNICIAN,
  ROLES.RADIOLOGIST,
];
const requiresDepartmentRoles = [
  ROLES.DOCTOR,
  ROLES.LAB_TECHNICIAN,
  ROLES.RADIOLOGIST,
];

const UserForm = ({
  onSubmit,
  initialValues = null,
  isLoading = false,
  availableRoles = [],
  userRole,
}) => {
  const [hospitals, setHospitals] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  // Define validation schema dynamically based on whether it's an update or create
  const validationSchema = Yup.object({
    name: Yup.string().required("Name is required"),
    email: Yup.string().email("Invalid email").required("Email is required"),
    role: Yup.string()
      .required("Role is required")
      .oneOf(
        availableRoles.map((r) => r.value),
        "Invalid role selected"
      ),
    hospitalId: Yup.string().when("role", {
      is: (role) => staffRoles.includes(role),
      then: (schema) => schema.required("Hospital is required for this role"),
      otherwise: (schema) => schema.optional().nullable(), // Not required for SuperAdmin, maybe Patient
    }),
    departmentId: Yup.string().when("role", {
      is: (role) => requiresDepartmentRoles.includes(role),
      then: (schema) => schema.required("Department is required for this role"),
      otherwise: (schema) => schema.optional().nullable(),
    }),
    // Password only required when creating, not updating (unless explicitly changing)
    password: Yup.string().when("_id", {
      // Use _id presence to detect update mode
      is: (val) => !val, // Only required if _id does NOT exist (create mode)
      then: (schema) =>
        schema
          .required("Password is required")
          .min(8, "Password must be at least 8 characters"),
      otherwise: (schema) => schema.optional(),
    }),
  });

  const formik = useFormik({
    initialValues: {
      _id: initialValues?._id || "", // For detecting update mode
      name: initialValues?.name || "",
      email: initialValues?.email || "",
      role: initialValues?.role || "",
      hospitalId: initialValues?.hospital || initialValues?.hospitalId || "", // Adjust based on data structure
      departmentId:
        initialValues?.department || initialValues?.departmentId || "", // Adjust based on data structure
      password: "", // Always empty initially, only set if creating/changing
    },
    validationSchema,
    onSubmit: (values) => {
      // Remove empty password field if not set (for updates)
      const submissionData = { ...values };
      if (!submissionData.password) {
        delete submissionData.password;
      }
      if (
        submissionData.role === ROLES.SUPER_ADMIN ||
        submissionData.role === ROLES.PATIENT
      ) {
        delete submissionData.hospitalId; // SuperAdmin/Patient not tied to one hospital in this way
        delete submissionData.departmentId;
      } else if (!requiresDepartmentRoles.includes(submissionData.role)) {
        delete submissionData.departmentId; // Roles like Admin, Receptionist don't need department
      }
      onSubmit(submissionData);
    },
    enableReinitialize: true,
  });

  // Fetch hospitals (needed by SuperAdmin, or Admin if they can assign roles to other hospitals?)
  // Let's assume only SuperAdmin needs the list here.
  useEffect(() => {
    if (userRole === ROLES.SUPER_ADMIN) {
      const fetchHospitals = async () => {
        setLoadingHospitals(true);
        try {
          const response = await getHospitals({ limit: 500, status: "active" }); // Fetch active hospitals
          if (response.success) {
            setHospitals(
              response.hospitals.map((h) => ({ value: h._id, label: h.name }))
            );
          }
        } catch (err) {
          console.error("Failed to fetch hospitals:", err);
        } finally {
          setLoadingHospitals(false);
        }
      };
      fetchHospitals();
    }
  }, [userRole]);

  // Fetch departments when a hospital is selected and the role requires it
  useEffect(() => {
    if (
      requiresDepartmentRoles.includes(formik.values.role) &&
      formik.values.hospitalId
    ) {
      const fetchDepartments = async () => {
        setLoadingDepartments(true);
        try {
          // Admin can fetch departments for their own hospital
          // SuperAdmin might need a different way to fetch based on selected hospital
          // Assuming Admin context for now:
          if (userRole === ROLES.ADMIN || userRole === ROLES.SUPER_ADMIN) {
            // Adjust logic if SuperAdmin fetches differently
            const response = await getDepartments({ status: "active" }); // Admin fetches their hospital's dept
            if (response.success) {
              setDepartments(
                response.departments.map((d) => ({
                  value: d._id,
                  label: d.name,
                }))
              );
            }
          }
        } catch (err) {
          console.error("Failed to fetch departments:", err);
        } finally {
          setLoadingDepartments(false);
        }
      };
      fetchDepartments();
    } else {
      setDepartments([]); // Clear departments if hospital/role changes
    }
  }, [formik.values.hospitalId, formik.values.role, userRole]); // Add userRole dependency

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-4">
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
        label="Email"
        id="email"
        name="email"
        type="email"
        required
        {...formik.getFieldProps("email")}
        error={formik.errors.email}
        touched={formik.touched.email}
      />
      {/* Password field only visible when creating */}
      {!formik.values._id && (
        <FormInput
          label="Password"
          id="password"
          name="password"
          type="password"
          required
          {...formik.getFieldProps("password")}
          error={formik.errors.password}
          touched={formik.touched.password}
        />
      )}

      {/* Role Selection */}
      <div>
        <label htmlFor="role" className="form-label">
          Role <span className="text-danger-600">*</span>
        </label>
        <Select
          id="role"
          name="role"
          options={availableRoles}
          value={
            availableRoles.find(
              (option) => option.value === formik.values.role
            ) || null
          }
          onChange={(option) =>
            formik.setFieldValue("role", option ? option.value : "")
          }
          onBlur={formik.handleBlur}
          placeholder="Select role..."
          classNamePrefix="react-select"
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

      {/* Hospital Selection (Conditional) */}
      {staffRoles.includes(formik.values.role) && (
        <div>
          <label htmlFor="hospitalId" className="form-label">
            Hospital <span className="text-danger-600">*</span>
          </label>
          <Select
            id="hospitalId"
            name="hospitalId"
            options={hospitals} // Assume hospitals are fetched if userRole is SuperAdmin
            isLoading={loadingHospitals}
            isDisabled={userRole !== ROLES.SUPER_ADMIN} // Admin might only manage their own hospital
            value={
              hospitals.find(
                (option) => option.value === formik.values.hospitalId
              ) || null
            }
            onChange={(option) => {
              formik.setFieldValue("hospitalId", option ? option.value : "");
              formik.setFieldValue("departmentId", ""); // Reset department on hospital change
            }}
            onBlur={formik.handleBlur}
            placeholder="Select hospital..."
            classNamePrefix="react-select"
            styles={{
              control: (base) =>
                formik.touched.hospitalId && formik.errors.hospitalId
                  ? { ...base, borderColor: "#dc2626" }
                  : base,
            }}
          />
          {formik.touched.hospitalId && formik.errors.hospitalId ? (
            <p className="form-error">{formik.errors.hospitalId}</p>
          ) : null}
        </div>
      )}

      {/* Department Selection (Conditional) */}
      {requiresDepartmentRoles.includes(formik.values.role) && (
        <div>
          <label htmlFor="departmentId" className="form-label">
            Department <span className="text-danger-600">*</span>
          </label>
          <Select
            id="departmentId"
            name="departmentId"
            options={departments}
            isLoading={loadingDepartments}
            isDisabled={!formik.values.hospitalId || loadingDepartments}
            value={
              departments.find(
                (option) => option.value === formik.values.departmentId
              ) || null
            }
            onChange={(option) =>
              formik.setFieldValue("departmentId", option ? option.value : "")
            }
            onBlur={formik.handleBlur}
            placeholder="Select department..."
            classNamePrefix="react-select"
            styles={{
              control: (base) =>
                formik.touched.departmentId && formik.errors.departmentId
                  ? { ...base, borderColor: "#dc2626" }
                  : base,
            }}
          />
          {formik.touched.departmentId && formik.errors.departmentId ? (
            <p className="form-error">{formik.errors.departmentId}</p>
          ) : null}
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => formik.resetForm()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={isLoading || !formik.isValid}
        >
          {initialValues?._id ? "Update User" : "Create User"}
        </Button>
      </div>
    </form>
  );
};

export default UserForm;
