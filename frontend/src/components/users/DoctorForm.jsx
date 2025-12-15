import React, { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import Select from "react-select";
import toast from "react-hot-toast";
import FormInput from "../common/FormInput";
import Button from "../common/Button";
import adminService from "../../services/adminService";
import { ROLES } from "../../constants";

// Validation schema
const doctorValidationSchema = Yup.object({
  name: Yup.string().required("Name is required"),
  email: Yup.string()
    .email("Invalid email format")
    .required("Email is required"),
  departmentId: Yup.string().required("Department is required"),
  speciality: Yup.string().required("Speciality is required"),
  degree: Yup.string().required("Degree is required"),
  experience: Yup.string().required("Experience is required"),
  fees: Yup.number()
    .required("Fees are required")
    .min(0, "Fees cannot be negative"),
  registrationNumber: Yup.string().required("Registration number is required"),
  password: Yup.string().when("_id", {
    is: (val) => !val,
    then: () =>
      Yup.string()
        .required("Password is required for new doctors")
        .min(8, "Password must be at least 8 characters"),
    otherwise: () => Yup.string(),
  }),
});

const DoctorForm = ({
  onSubmit,
  initialValues = null,
  isLoading,
  hospitalId,
  onCancel,
}) => {
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [departmentError, setDepartmentError] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  useEffect(() => {
    if (hospitalId) {
      const fetchDepartments = async () => {
        setLoadingDepartments(true);
        setDepartmentError(null);
        try {
          const response = await adminService.getDepartments({ status: "all" });
          if (response.success && response.departments?.length > 0) {
            const deptOptions = response.departments.map((d) => ({
              value: d._id,
              label: d.name,
            }));
            setDepartments(deptOptions);

            if (initialValues?.departmentId) {
              const matchingDept = deptOptions.find(
                (d) => d.value === initialValues.departmentId
              );
              setSelectedDepartment(matchingDept || null);
              setDepartmentError(
                matchingDept
                  ? null
                  : "Selected department not found or inactive"
              );
            }
          } else {
            setDepartmentError("No departments available or inactive");
            setDepartments([]);
            setSelectedDepartment(null);
          }
        } catch (err) {
          console.error("Failed to fetch departments:", err);
          setDepartmentError("Could not load departments. Please try again.");
          setDepartments([]);
          setSelectedDepartment(null);
        } finally {
          setLoadingDepartments(false);
        }
      };
      fetchDepartments();
    } else {
      setDepartments([]);
      setDepartmentError("Hospital ID is required to load departments");
    }
  }, [hospitalId, initialValues?.departmentId]);

  const formik = useFormik({
    initialValues: {
      _id: initialValues?._id || "",
      name: initialValues?.name || "",
      email: initialValues?.email || "",
      password: "",
      hospitalId: hospitalId || "",
      departmentId: initialValues?.departmentId || "",
      role: ROLES.DOCTOR,
      speciality: initialValues?.speciality || "",
      degree: initialValues?.degree || "",
      experience: initialValues?.experience || "",
      fees: initialValues?.fees || "",
      about: initialValues?.about || "",
      registrationNumber: initialValues?.registrationNumber || "",
    },
    validationSchema: doctorValidationSchema,
    onSubmit: (values) => {
      if (departments.length === 0) {
        toast.error("Please create departments before adding doctors");
        return;
      }

      if (!departments.some((d) => d.value === values.departmentId)) {
        toast.error(
          "Selected department is invalid. Please select a valid department."
        );
        return;
      }

      const submissionData = { ...values };
      if (initialValues?._id && !submissionData.password) {
        delete submissionData.password;
      }

      onSubmit(submissionData);
    },
    enableReinitialize: true,
  });

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-4">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          label="Full Name"
          id="name"
          name="name"
          required
          {...formik.getFieldProps("name")}
          error={formik.touched.name && formik.errors.name}
          touched={formik.touched.name}
        />

        <FormInput
          label="Email"
          id="email"
          name="email"
          type="email"
          required
          {...formik.getFieldProps("email")}
          error={formik.touched.email && formik.errors.email}
          touched={formik.touched.email}
        />

        {!initialValues && (
          <FormInput
            label="Password"
            id="password"
            name="password"
            type="password"
            required
            helpText="Minimum 8 characters"
            {...formik.getFieldProps("password")}
            error={formik.touched.password && formik.errors.password}
            touched={formik.touched.password}
          />
        )}
      </div>

      {/* Professional Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="departmentId" className="form-label">
            Department <span className="text-danger-600">*</span>
          </label>
          <Select
            id="departmentId"
            name="departmentId"
            options={departments}
            isLoading={loadingDepartments}
            isDisabled={
              !hospitalId || loadingDepartments || departments.length === 0
            }
            value={selectedDepartment}
            onChange={(option) => {
              formik.setFieldValue("departmentId", option ? option.value : "");
              setSelectedDepartment(option);
            }}
            onBlur={() => formik.setFieldTouched("departmentId", true)}
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
              adding doctors.
            </p>
          )}
        </div>

        <FormInput
          label="Speciality"
          id="speciality"
          name="speciality"
          required
          {...formik.getFieldProps("speciality")}
          error={formik.touched.speciality && formik.errors.speciality}
          touched={formik.touched.speciality}
        />

        <FormInput
          label="Registration Number"
          id="registrationNumber"
          name="registrationNumber"
          required
          {...formik.getFieldProps("registrationNumber")}
          error={
            formik.touched.registrationNumber &&
            formik.errors.registrationNumber
          }
          touched={formik.touched.registrationNumber}
        />

        <FormInput
          label="Highest Degree"
          id="degree"
          name="degree"
          required
          {...formik.getFieldProps("degree")}
          error={formik.touched.degree && formik.errors.degree}
          touched={formik.touched.degree}
        />

        <FormInput
          label="Experience (years)"
          id="experience"
          name="experience"
          required
          {...formik.getFieldProps("experience")}
          error={formik.touched.experience && formik.errors.experience}
          touched={formik.touched.experience}
        />

        <FormInput
          label="Consultation Fees"
          id="fees"
          name="fees"
          type="number"
          min="0"
          required
          {...formik.getFieldProps("fees")}
          error={formik.touched.fees && formik.errors.fees}
          touched={formik.touched.fees}
        />
      </div>

      {/* About */}
      <FormInput
        label="About / Bio"
        id="about"
        name="about"
        type="textarea"
        rows={3}
        {...formik.getFieldProps("about")}
        error={formik.touched.about && formik.errors.about}
        touched={formik.touched.about}
      />

      <div className="flex justify-end space-x-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={isLoading || !formik.isValid || departments.length === 0}
        >
          {initialValues ? "Update Doctor" : "Create Doctor"}
        </Button>
      </div>
    </form>
  );
};

export default DoctorForm;
