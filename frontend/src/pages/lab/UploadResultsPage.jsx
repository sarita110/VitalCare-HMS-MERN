// src/pages/lab/UploadResultsPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useParams, useNavigate, Link } from "react-router-dom";
import labService from "../../services/labService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import FormInput from "../../components/common/FormInput";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  DocumentArrowUpIcon,
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  formatDate,
  getDisplayStatus,
  getStatusBadgeClass,
} from "../../utils/helpers";

// Updated Schema for result upload
const resultSchema = Yup.object({
  summary: Yup.string().required("Result summary is required"),
  conclusion: Yup.string().optional().nullable(),
  recommendations: Yup.string().optional().nullable(),
  structuredResults: Yup.array()
    .of(
      Yup.object({
        parameter: Yup.string().required("Parameter name is required"),
        value: Yup.string().required("Value is required"),
        unit: Yup.string().optional().nullable(),
        normalRange: Yup.string().optional().nullable(),
        interpretation: Yup.string().optional().nullable(),
      })
    )
    .optional(),
  attachment: Yup.mixed()
    .nullable()
    .test(
      "fileSize",
      "File size too large (Max 10MB)",
      (value) => !value || (value && value.size <= 10 * 1024 * 1024)
    ),
});

const UploadResultsPage = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [testDetails, setTestDetails] = useState(null);
  const [canUpload, setCanUpload] = useState(false); // State to control form enable/disable

  const fetchTestDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setCanUpload(false); // Reset upload permission
    try {
      const response = await labService.getLabRequestDetails(testId);
      if (response.success && response.labTest) {
        const test = response.labTest;
        setTestDetails(test);

        // Check if results already uploaded
        if (test.resultId) {
          toast.error("Results have already been uploaded for this test.", {
            duration: 4000,
          });
          navigate(`/lab/results/${test.resultId._id}`); // Redirect to view results
          return;
        }

        // --- STATUS CHECK ---
        const isProcessable = [
          "confirmed",
          "sample-collected",
          "in-progress",
        ].includes(test.status);
        const isCompletedWithoutResult =
          test.status === "completed" && !test.resultId;

        if (isProcessable || isCompletedWithoutResult) {
          setCanUpload(true);
        } else {
          const errorMsg = `Cannot upload results for test with status: ${getDisplayStatus(
            test.status
          )}. Payment might be pending or test is cancelled.`;
          setError(errorMsg);
          toast.error(errorMsg, { duration: 5000 });
        }
        // --- END STATUS CHECK ---
      } else {
        throw new Error(response.message || "Failed to fetch test details");
      }
    } catch (err) {
      console.error("Fetch test details error:", err);
      const message = err.message || "Could not load test details.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    fetchTestDetails();
  }, [fetchTestDetails]);

  const formik = useFormik({
    initialValues: {
      summary: "",
      conclusion: "",
      recommendations: "",
      structuredResults: [],
      attachment: null,
    },
    validationSchema: resultSchema,
    onSubmit: async (values) => {
      // Double-check canUpload state before submitting
      if (!canUpload) {
        toast.error("Cannot submit results due to test status or prior error.");
        return;
      }

      setActionLoading(true);
      try {
        const formData = new FormData();
        formData.append("summary", values.summary);
        formData.append("conclusion", values.conclusion || "");
        formData.append("recommendations", values.recommendations || "");
        formData.append(
          "results",
          JSON.stringify(values.structuredResults || [])
        );
        if (values.attachment) {
          formData.append("attachment", values.attachment);
        }

        const response = await labService.uploadLabResults(testId, formData);

        if (response.success && response.labReport) {
          toast.success("Results uploaded successfully!");
          // --- MODIFICATION: Navigate to the list page ---
          navigate(`/lab/results`); // Navigate to the main results list page
          // --- END MODIFICATION ---
        } else {
          throw new Error(response.message || "Failed to upload results");
        }
      } catch (error) {
        console.error("Upload results error:", error);
        toast.error(error.message || "Could not upload results.");
      } finally {
        setActionLoading(false);
      }
    },
  });

  // --- Dynamic Result Entry Handlers ---
  const addResultEntry = () => {
    formik.setFieldValue("structuredResults", [
      ...formik.values.structuredResults,
      {
        parameter: "",
        value: "",
        unit: "",
        normalRange: "",
        interpretation: "",
      },
    ]);
  };
  const removeResultEntry = (index) => {
    const newResults = [...formik.values.structuredResults];
    newResults.splice(index, 1);
    formik.setFieldValue("structuredResults", newResults);
  };
  const updateResultEntry = (index, field, value) => {
    const newResults = [...formik.values.structuredResults];
    if (newResults[index]) {
      newResults[index][field] = value;
      formik.setFieldValue("structuredResults", newResults);
    }
  };
  const interpretationOptions = [
    { value: "", label: "Select Interpretation (Optional)" },
    { value: "normal", label: "Normal" },
    { value: "high", label: "High" },
    { value: "low", label: "Low" },
    { value: "critical", label: "Critical" },
    { value: "inconclusive", label: "Inconclusive" },
  ];

  if (isLoading) return <LoadingSpinner />;
  // Display error prominently if upload is not allowed due to status
  if (error && !canUpload && !testDetails) {
    return (
      <div className="space-y-6">
        <Link
          to="/lab/requests"
          className="inline-flex items-center text-sm text-primary-600 hover:underline mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" /> Back to Requests
        </Link>
        <h1 className="text-2xl font-semibold text-gray-800">
          Upload Lab Results
        </h1>
        <Card>
          <p className="text-center text-danger-600 py-6 font-medium">
            {error}
          </p>
        </Card>
      </div>
    );
  }
  if (!testDetails)
    return (
      <p className="text-center text-gray-500 py-4">Loading test details...</p>
    );

  return (
    <div className="space-y-6">
      <Link
        to="/lab/requests"
        className="inline-flex items-center text-sm text-primary-600 hover:underline mb-4"
      >
        <ArrowLeftIcon className="w-4 h-4 mr-1" /> Back to Requests
      </Link>
      <h1 className="text-2xl font-semibold text-gray-800">
        Upload Lab Results
      </h1>

      {/* Display error related to status if upload not allowed but details loaded */}
      {error && !canUpload && testDetails && (
        <Card>
          <p className="text-center text-danger-600 py-6 font-medium">
            {error}
          </p>
        </Card>
      )}

      {/* Test & Patient Info Card */}
      <Card title="Test & Patient Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <p>
            <strong>Patient:</strong>{" "}
            {testDetails.patientId?.userId?.name || "N/A"}
          </p>
          <p>
            <strong>Test Name:</strong> {testDetails.testName}
          </p>
          <p>
            <strong>Test Type:</strong> {testDetails.testType}
          </p>
          <p>
            <strong>Requested By:</strong> Dr.{" "}
            {testDetails.doctorId?.userId?.name || "N/A"}
          </p>
          <p>
            <strong>Requested Date:</strong>{" "}
            {formatDate(testDetails.requestDate)}
          </p>
          <p>
            <strong>Payment Status:</strong>{" "}
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadgeClass(
                testDetails.payment?.status || "pending"
              )} text-white`}
            >
              {getDisplayStatus(testDetails.payment?.status || "pending")}
            </span>
          </p>
          <p>
            <strong>Test Status:</strong>{" "}
            <span
              className={`badge ${getStatusBadgeClass(testDetails.status)}`}
            >
              {getDisplayStatus(testDetails.status)}
            </span>
          </p>
        </div>
      </Card>

      {/* Results Form Card */}
      <Card>
        {/* Display general error if needed (e.g., from submission) */}
        {error && canUpload && <p className="text-danger-600 mb-4">{error}</p>}

        <form
          onSubmit={formik.handleSubmit}
          className={`space-y-4 ${
            !canUpload ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          {/* Summary, Conclusion, Recommendations */}
          <FormInput
            label="Result Summary"
            id="summary"
            name="summary"
            type="textarea"
            rows={3}
            required
            {...formik.getFieldProps("summary")}
            error={formik.touched.summary && formik.errors.summary}
            touched={formik.touched.summary}
          />
          <FormInput
            label="Conclusion (Optional)"
            id="conclusion"
            name="conclusion"
            type="textarea"
            rows={2}
            {...formik.getFieldProps("conclusion")}
            error={formik.touched.conclusion && formik.errors.conclusion}
            touched={formik.touched.conclusion}
          />
          <FormInput
            label="Recommendations (Optional)"
            id="recommendations"
            name="recommendations"
            type="textarea"
            rows={2}
            {...formik.getFieldProps("recommendations")}
            error={
              formik.touched.recommendations && formik.errors.recommendations
            }
            touched={formik.touched.recommendations}
          />

          {/* Dynamic Structured Results Section */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <label className="form-label mb-0">
                Detailed Results (Optional)
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addResultEntry}
                leftIcon={<PlusIcon className="h-4 w-4" />}
              >
                Add Result Entry
              </Button>
            </div>
            {formik.values.structuredResults.map((resultEntry, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 rounded-lg space-y-3 relative"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeResultEntry(index)}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1"
                  title="Remove this entry"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <FormInput
                    label="Parameter *"
                    id={`structuredResults.${index}.parameter`}
                    name={`structuredResults.${index}.parameter`}
                    value={resultEntry.parameter}
                    onChange={(e) =>
                      updateResultEntry(index, "parameter", e.target.value)
                    }
                    onBlur={formik.handleBlur}
                    required
                  />
                  <FormInput
                    label="Value *"
                    id={`structuredResults.${index}.value`}
                    name={`structuredResults.${index}.value`}
                    value={resultEntry.value}
                    onChange={(e) =>
                      updateResultEntry(index, "value", e.target.value)
                    }
                    onBlur={formik.handleBlur}
                    required
                  />
                  <FormInput
                    label="Unit"
                    id={`structuredResults.${index}.unit`}
                    name={`structuredResults.${index}.unit`}
                    value={resultEntry.unit || ""}
                    onChange={(e) =>
                      updateResultEntry(index, "unit", e.target.value)
                    }
                    onBlur={formik.handleBlur}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormInput
                    label="Normal Range"
                    id={`structuredResults.${index}.normalRange`}
                    name={`structuredResults.${index}.normalRange`}
                    value={resultEntry.normalRange || ""}
                    onChange={(e) =>
                      updateResultEntry(index, "normalRange", e.target.value)
                    }
                    onBlur={formik.handleBlur}
                  />
                  <div>
                    <label
                      htmlFor={`structuredResults.${index}.interpretation`}
                      className="form-label"
                    >
                      Interpretation
                    </label>
                    <select
                      id={`structuredResults.${index}.interpretation`}
                      name={`structuredResults.${index}.interpretation`}
                      value={resultEntry.interpretation || ""}
                      onChange={(e) =>
                        updateResultEntry(
                          index,
                          "interpretation",
                          e.target.value
                        )
                      }
                      onBlur={formik.handleBlur}
                      className="form-input"
                    >
                      {interpretationOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Attachment Upload */}
          <div className="pt-4 border-t">
            <label htmlFor="attachment" className="form-label">
              Upload Report File (Optional - PDF/Image)
            </label>
            <input
              type="file"
              id="attachment"
              name="attachment"
              onChange={(event) => {
                formik.setFieldValue(
                  "attachment",
                  event.currentTarget.files[0]
                );
              }}
              onBlur={formik.handleBlur}
              className={`form-input-file ${
                formik.touched.attachment && formik.errors.attachment
                  ? "border-danger-500"
                  : ""
              }`}
              accept="application/pdf, image/jpeg, image/png, image/webp"
            />
            {formik.touched.attachment && formik.errors.attachment ? (
              <p className="form-error">{formik.errors.attachment}</p>
            ) : null}
          </div>

          {/* Submit Button */}
          <div className="pt-6 flex justify-end">
            <Button
              type="submit"
              isLoading={actionLoading}
              disabled={actionLoading || !formik.isValid || !canUpload}
              leftIcon={<DocumentArrowUpIcon className="h-5 w-5" />}
            >
              Upload Results & Complete Test
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default UploadResultsPage;
