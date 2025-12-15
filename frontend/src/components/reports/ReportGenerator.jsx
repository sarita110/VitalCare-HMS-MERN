// src/components/reports/ReportGenerator.jsx
import React, { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import Button from "../common/Button";
import FormInput from "../common/FormInput";
import Select from "react-select";
import {
  ArrowDownTrayIcon,
  DocumentChartBarIcon,
} from "@heroicons/react/24/outline";
import reportService from "../../services/reportService";
import useAuth from "../../hooks/useAuth"; // <-- Import useAuth
import { ROLES } from "../../constants"; // <-- Import ROLES
import toast from "react-hot-toast";
import config from "../../config";
import api from "../../services/api";

// Validation Schema remains the same
const validationSchema = Yup.object({
  reportType: Yup.string().required("Report type is required"),
  format: Yup.string()
    .required("Format is required")
    .oneOf(["pdf", "excel"], "Invalid format"),
  startDate: Yup.date()
    .max(new Date(), "Start date cannot be in the future")
    .nullable(),
  endDate: Yup.date()
    .min(Yup.ref("startDate"), "End date must be after start date")
    .max(new Date(), "End date cannot be in the future")
    .nullable(),
});

// Add allowedReportTypes as a prop
const ReportGenerator = ({ allowedReportTypes = [] }) => {
  const { user } = useAuth(); // <-- Get user from auth context
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const formik = useFormik({
    initialValues: {
      reportType: allowedReportTypes[0]?.value || "",
      format: "pdf",
      startDate: "",
      endDate: "",
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      setIsLoading(true);
      setError(null);
      let generatedFileName = null;
      try {
        let response;
        const params = {
          reportType: values.reportType,
          format: values.format,
          startDate: values.startDate || undefined,
          endDate: values.endDate || undefined,
        };

        // --- Step 1: Call the correct generation service based on role ---
        if (user?.role === ROLES.SUPER_ADMIN) {
          // <-- Check role
          response = await reportService.generateSystemReport(params);
        } else if (user?.role === ROLES.ADMIN) {
          // <-- Check role
          response = await reportService.generateAdminHospitalReport(params);
        } else {
          throw new Error("User role not authorized to generate reports.");
        }
        // --- End Role Check ---

        if (response.success && response.report?.fileName) {
          toast.success("Report generated successfully. Starting download...");
          generatedFileName = response.report.fileName;

          // --- Step 2: Fetch the file using authenticated API call ---
          const downloadUrl = reportService.getReportDownloadUrl(
            generatedFileName,
            user.role // Pass role to get correct URL
          );

          if (!downloadUrl) {
            throw new Error("Could not construct download URL.");
          }

          // Make the GET request using Axios instance (which has interceptor)
          const fileResponse = await api.get(
            downloadUrl.replace(config.backendUrl + "/api", ""), // Get relative path
            { responseType: "blob" } // Ask for the response as a Blob
          );

          // --- Step 3: Trigger browser download from Blob ---
          const blob = new Blob([fileResponse.data], {
            type: fileResponse.headers["content-type"],
          });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", generatedFileName); // Set the filename
          document.body.appendChild(link);
          link.click();

          // --- Step 4: Clean up ---
          link.parentNode.removeChild(link);
          window.URL.revokeObjectURL(url);
        } else {
          throw new Error(response.message || "Failed to generate report.");
        }
      } catch (err) {
        console.error("Report generation or download failed:", err);
        setError(err.message || "Could not generate or download the report.");
        toast.error(
          err.message || "Could not generate or download the report."
        );
      } finally {
        setIsLoading(false);
      }
    },
    enableReinitialize: true,
  });

  const formatOptions = [
    { value: "pdf", label: "PDF" },
    { value: "excel", label: "Excel (XLSX)" },
  ];

  if (allowedReportTypes.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No report types available for your role.
      </p>
    );
  }

  return (
    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium mb-4 flex items-center text-gray-700">
        <DocumentChartBarIcon className="w-5 h-5 mr-2" /> Generate Downloadable
        Report
      </h3>
      {error && (
        <p className="text-sm mb-4 text-center text-danger-600 bg-danger-100 p-2 rounded-md">
          {error}
        </p>
      )}
      <form onSubmit={formik.handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Report Type */}
          <div>
            <label htmlFor="reportType" className="form-label">
              Report Type <span className="text-danger-600">*</span>
            </label>
            <Select
              id="reportType"
              name="reportType"
              options={allowedReportTypes} // Use the prop here
              value={
                allowedReportTypes.find(
                  (option) => option.value === formik.values.reportType
                ) || null
              }
              onChange={(option) =>
                formik.setFieldValue("reportType", option ? option.value : "")
              }
              onBlur={formik.handleBlur}
              placeholder="Select report type..."
              classNamePrefix="react-select"
              styles={{
                control: (base) =>
                  formik.touched.reportType && formik.errors.reportType
                    ? { ...base, borderColor: "#dc2626" }
                    : base,
              }}
            />
            {formik.touched.reportType && formik.errors.reportType ? (
              <p className="form-error">{formik.errors.reportType}</p>
            ) : null}
          </div>
          {/* Format */}
          <div>
            <label htmlFor="format" className="form-label">
              Format <span className="text-danger-600">*</span>
            </label>
            <Select
              id="format"
              name="format"
              options={formatOptions}
              value={
                formatOptions.find(
                  (option) => option.value === formik.values.format
                ) || null
              }
              onChange={(option) =>
                formik.setFieldValue("format", option ? option.value : "")
              }
              onBlur={formik.handleBlur}
              classNamePrefix="react-select"
              styles={{
                control: (base) =>
                  formik.touched.format && formik.errors.format
                    ? { ...base, borderColor: "#dc2626" }
                    : base,
              }}
            />
            {formik.touched.format && formik.errors.format ? (
              <p className="form-error">{formik.errors.format}</p>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start Date */}
          <FormInput
            label="Start Date (Optional)"
            type="date"
            id="startDate"
            name="startDate"
            value={formik.values.startDate}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.startDate}
            touched={formik.touched.startDate}
            max={new Date().toISOString().split("T")[0]}
          />
          {/* End Date */}
          <FormInput
            label="End Date (Optional)"
            type="date"
            id="endDate"
            name="endDate"
            value={formik.values.endDate}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.endDate}
            touched={formik.touched.endDate}
            min={formik.values.startDate || undefined}
            max={new Date().toISOString().split("T")[0]}
          />
        </div>

        {/* Add Role/Hospital filters for Super Admin USER_LIST report if needed */}
        {/* Example:
        {user?.role === ROLES.SUPER_ADMIN && formik.values.reportType === 'USER_LIST' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormInput label="Filter by Role" ... />
             <Select label="Filter by Hospital" ... />
          </div>
        )}
        */}

        <div className="pt-2 flex items-center space-x-4">
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={isLoading || !formik.isValid}
            leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
          >
            Generate & Download
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ReportGenerator;
