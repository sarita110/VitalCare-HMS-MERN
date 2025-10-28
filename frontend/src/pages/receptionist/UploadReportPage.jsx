// src/pages/receptionist/UploadReportPage.jsx
import React, { useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select/async"; // For patient search
import receptionistService from "../../services/receptionistService"; //
import Card from "../../components/common/Card"; //
import Button from "../../components/common/Button"; //
import FormInput from "../../components/common/FormInput"; //
import { useFormik } from "formik";
import * as Yup from "yup";
import { DocumentArrowUpIcon } from "@heroicons/react/24/outline";

const reportUploadSchema = Yup.object({
  patientId: Yup.string().required("Patient is required"),
  recordType: Yup.string().required("Report type is required"), // e.g., 'Lab Report', 'Imaging Result', 'Discharge Summary'
  description: Yup.string().required("Description is required"),
  reportFile: Yup.mixed()
    .required("A file is required")
    .test(
      "fileSize",
      "File size too large (Max 10MB)",
      (value) => value && value.size <= 10 * 1024 * 1024
    ), // 10MB limit
  // Add more specific file type validation if needed:
  // .test('fileType', 'Unsupported file format', value => value && ['application/pdf', 'image/jpeg', 'image/png'].includes(value.type))
});

const UploadReportPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Function to load patient options for AsyncSelect
  const loadPatientOptions = async (inputValue) => {
    if (!inputValue || inputValue.length < 2) return [];
    try {
      const response = await receptionistService.getReceptionistPatients({
        search: inputValue,
        limit: 20,
      }); //
      if (response.success) {
        return response.patients.map((p) => ({
          value: p._id, // Patient ID
          label: `${p.userId?.name} (${p.userId?.email})`,
        }));
      }
      return [];
    } catch (error) {
      console.error("Error searching patients:", error);
      return [];
    }
  };

  const formik = useFormik({
    initialValues: {
      patientId: "",
      recordType: "other", // Default type
      description: "",
      reportFile: null,
      // Optional: doctorId, appointmentId if linking is needed
    },
    validationSchema: reportUploadSchema,
    onSubmit: async (values, { resetForm }) => {
      setActionLoading(true);
      try {
        const formData = new FormData();
        formData.append("patientId", values.patientId);
        formData.append("recordType", values.recordType);
        formData.append("description", values.description);
        formData.append("reportFile", values.reportFile); // Key matches multer field 'reportFile'
        // Append optional fields if they exist
        // formData.append('doctorId', values.doctorId);
        // formData.append('appointmentId', values.appointmentId);

        const response = await receptionistService.uploadReport(formData); //

        if (response.success) {
          toast.success("Report uploaded successfully!");
          resetForm();
          // Clear file input visually if needed (difficult with standard input)
          document.getElementById("reportFile").value = ""; // Attempt to clear file input
        } else {
          throw new Error(response.message || "Failed to upload report");
        }
      } catch (error) {
        console.error("Upload report error:", error);
        toast.error(error.message || "Could not upload report.");
      } finally {
        setActionLoading(false);
      }
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">
        Upload Patient Report/Document
      </h1>
      <Card>
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="patientId" className="form-label">
              Select Patient <span className="text-danger-600">*</span>
            </label>
            <Select
              id="patientId"
              name="patientId"
              cacheOptions
              loadOptions={loadPatientOptions}
              value={
                formik.values.patientId
                  ? {
                      value: formik.values.patientId,
                      label: "Selected Patient",
                    }
                  : null
              } // Display needs adjustment if label isn't stored
              onChange={(option) =>
                formik.setFieldValue("patientId", option ? option.value : "")
              }
              onBlur={formik.handleBlur}
              placeholder="Search patient..."
              noOptionsMessage={({ inputValue }) =>
                inputValue.length < 2
                  ? "Enter at least 2 characters"
                  : "No patients found"
              }
              isClearable
              styles={{
                control: (base) =>
                  formik.touched.patientId && formik.errors.patientId
                    ? { ...base, borderColor: "#dc2626" }
                    : base,
              }}
            />
            {formik.touched.patientId && formik.errors.patientId ? (
              <p className="form-error">{formik.errors.patientId}</p>
            ) : null}
          </div>

          <FormInput
            label="Report Type / Name"
            id="recordType"
            name="recordType"
            required
            {...formik.getFieldProps("recordType")}
            error={formik.errors.recordType}
            touched={formik.touched.recordType}
            placeholder="e.g., Lab Result, X-Ray Report, Discharge Summary"
          />
          <FormInput
            label="Description"
            id="description"
            name="description"
            type="textarea"
            rows={3}
            required
            {...formik.getFieldProps("description")}
            error={formik.errors.description}
            touched={formik.touched.description}
            placeholder="Brief description of the document"
          />

          {/* Optional: Doctor/Appointment Selection */}

          <div>
            <label htmlFor="reportFile" className="form-label">
              Select File <span className="text-danger-600">*</span>
            </label>
            <input
              type="file"
              id="reportFile"
              name="reportFile"
              onChange={(event) => {
                formik.setFieldValue(
                  "reportFile",
                  event.currentTarget.files[0]
                );
              }}
              onBlur={formik.handleBlur}
              className={`file:mr-4 file:py-2 file:px-4
                                        file:rounded-md file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-primary-50 file:text-primary-700
                                        hover:file:bg-primary-100
                                        block w-full text-sm text-gray-500 ${
                                          formik.touched.reportFile &&
                                          formik.errors.reportFile
                                            ? "border-danger-500"
                                            : "border-gray-300"
                                        }`}
            />
            {formik.touched.reportFile && formik.errors.reportFile ? (
              <p className="form-error">{formik.errors.reportFile}</p>
            ) : null}
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              type="submit"
              isLoading={actionLoading}
              disabled={actionLoading || !formik.isValid}
              leftIcon={<DocumentArrowUpIcon className="h-5 w-5" />}
            >
              Upload Report
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default UploadReportPage;
