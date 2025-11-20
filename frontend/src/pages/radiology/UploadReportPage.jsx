// src/pages/radiology/UploadReportPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useParams, useNavigate, Link } from "react-router-dom";
import radiologyService from "../../services/radiologyService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import FormInput from "../../components/common/FormInput";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  DocumentArrowUpIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import {
  formatDate,
  getDisplayStatus,
  getStatusBadgeClass,
} from "../../utils/helpers";

// Schema for report upload
const reportSchema = Yup.object({
  findings: Yup.string().required("Findings are required"),
  impression: Yup.string().required("Impression/Conclusion is required"),
  recommendations: Yup.string().optional().nullable(),
  images: Yup.mixed().nullable(), // File list handled separately by imageFiles state
});

const UploadReportPage = () => {
  const { reportId } = useParams(); // This is the RadiologyReport ID
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [requestDetails, setRequestDetails] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [canUpload, setCanUpload] = useState(false); // State to control form enable/disable

  const fetchRequestDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setCanUpload(false); // Reset upload permission
    try {
      const response = await radiologyService.getRadiologyRequestDetails(
        reportId
      );
      if (response.success && response.radiologyReport) {
        const report = response.radiologyReport;
        setRequestDetails(report);

        // Check if report already completed with findings
        if (report.status === "completed" && report.findings) {
          toast.error("Report has already been completed and uploaded.", {
            duration: 4000,
          });
          navigate(`/radiology/results/${reportId}`);
          return;
        }

        // --- STATUS CHECK ---
        const isProcessable = [
          "confirmed",
          "scheduled",
          "in-progress",
        ].includes(report.status);
        // Allow upload if completed but no results yet
        const isCompletedWithoutResult =
          report.status === "completed" &&
          !report.findings &&
          !report.impression;

        if (isProcessable || isCompletedWithoutResult) {
          setCanUpload(true);
        } else {
          const errorMsg = `Cannot upload report for request with status: ${getDisplayStatus(
            report.status
          )}. Payment might be pending or request is cancelled.`;
          setError(errorMsg);
          toast.error(errorMsg, { duration: 5000 });
        }
        // --- END STATUS CHECK ---
      } else {
        throw new Error(response.message || "Failed to fetch request details");
      }
    } catch (err) {
      console.error("Fetch request details error:", err);
      const message =
        err.response?.data?.message ||
        err.message ||
        "Could not load request details.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    if (!reportId) {
      toast.error("Report ID is missing.");
      navigate("/radiology/requests");
      return;
    }
    fetchRequestDetails();
  }, [reportId, navigate, fetchRequestDetails]);

  const formik = useFormik({
    initialValues: {
      findings: requestDetails?.findings || "",
      impression: requestDetails?.impression || "",
      recommendations: requestDetails?.recommendations || "",
      images: null, // Not directly used for files
    },
    enableReinitialize: true,
    validationSchema: reportSchema,
    onSubmit: async (values) => {
      if (!canUpload) {
        toast.error(
          "Cannot submit report due to request status or prior error."
        );
        return;
      }

      setActionLoading(true);
      try {
        const formData = new FormData();
        formData.append("findings", values.findings);
        formData.append("impression", values.impression);
        formData.append("recommendations", values.recommendations || "");

        if (imageFiles.length > 0) {
          imageFiles.forEach((file) => {
            formData.append("images", file);
          });
        } else if (!requestDetails?.images?.length > 0) {
          toast.error("Please upload at least one image.");
          setActionLoading(false);
          return;
        }

        const response = await radiologyService.uploadRadiologyResults(
          reportId,
          formData
        );

        if (response.success && response.radiologyReport) {
          toast.success("Report uploaded successfully!");
          navigate(`/radiology/results/${response.radiologyReport._id}`);
        } else {
          throw new Error(response.message || "Failed to upload report");
        }
      } catch (error) {
        console.error("Upload report error:", error);
        const message =
          error.response?.data?.message ||
          error.message ||
          "Could not upload report.";
        toast.error(message);
      } finally {
        setActionLoading(false);
      }
    },
  });

  const handleFileChange = (event) => {
    if (event.currentTarget.files) {
      setImageFiles(Array.from(event.currentTarget.files));
      formik.setFieldTouched("images", true);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  // Display error prominently if upload is not allowed
  if (error && !canUpload && !requestDetails) {
    return (
      <div className="space-y-6">
        <Link
          to="/radiology/requests"
          className="inline-flex items-center text-sm text-primary-600 hover:underline mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" /> Back to Requests
        </Link>
        <h1 className="text-2xl font-semibold text-gray-800">
          Upload Radiology Report & Images
        </h1>
        <Card>
          <p className="text-center text-danger-600 py-6 font-medium">
            {error}
          </p>
        </Card>
      </div>
    );
  }
  if (!requestDetails)
    return (
      <p className="text-center text-gray-500 py-4">
        Request details not found or could not be loaded.
      </p>
    );

  return (
    <div className="space-y-6">
      <Link
        to="/radiology/requests"
        className="inline-flex items-center text-sm text-primary-600 hover:underline mb-4"
      >
        <ArrowLeftIcon className="w-4 h-4 mr-1" /> Back to Requests
      </Link>
      <h1 className="text-2xl font-semibold text-gray-800">
        Upload Radiology Report & Images
      </h1>
      {/* Display status error if needed */}
      {error && !canUpload && requestDetails && (
        <Card>
          <p className="text-center text-danger-600 py-6 font-medium">
            {error}
          </p>
        </Card>
      )}

      {/* Request Information Card */}
      <Card title="Request Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <p>
            <strong>Patient:</strong>{" "}
            {requestDetails.patientId?.userId?.name || "N/A"}
          </p>
          <p>
            <strong>Procedure:</strong> {requestDetails.procedureType}
          </p>
          <p>
            <strong>Body Part:</strong> {requestDetails.bodyPart}
          </p>
          <p>
            <strong>Requested By:</strong> Dr.{" "}
            {requestDetails.doctorId?.userId?.name || "N/A"}
          </p>
          <p>
            <strong>Requested Date:</strong>{" "}
            {formatDate(requestDetails.requestDate)}
          </p>
          <p>
            <strong>Payment Status:</strong>{" "}
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadgeClass(
                requestDetails.payment?.status || "pending"
              )} text-white`}
            >
              {getDisplayStatus(requestDetails.payment?.status || "pending")}
            </span>
          </p>
          <p>
            <strong>Request Status:</strong>{" "}
            <span
              className={`badge ${getStatusBadgeClass(requestDetails.status)}`}
            >
              {getDisplayStatus(requestDetails.status)}
            </span>
          </p>
          {requestDetails.notes && (
            <p className="col-span-full">
              <strong>Notes:</strong> {requestDetails.notes}
            </p>
          )}
        </div>
      </Card>

      <Card>
        <form
          onSubmit={formik.handleSubmit}
          className={`space-y-4 ${
            !canUpload ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <FormInput
            label="Findings"
            id="findings"
            name="findings"
            type="textarea"
            rows={5}
            required
            {...formik.getFieldProps("findings")}
            error={formik.touched.findings && formik.errors.findings}
            touched={formik.touched.findings}
          />
          <FormInput
            label="Impression / Conclusion"
            id="impression"
            name="impression"
            type="textarea"
            rows={3}
            required
            {...formik.getFieldProps("impression")}
            error={formik.touched.impression && formik.errors.impression}
            touched={formik.touched.impression}
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

          {/* Image Upload */}
          <div>
            <label htmlFor="images" className="form-label">
              Upload Images (Multiple Allowed){" "}
              {!requestDetails?.images?.length > 0 && (
                <span className="text-danger-600">
                  * Required if no images exist
                </span>
              )}
            </label>
            <input
              type="file"
              id="images"
              name="images"
              multiple
              onChange={handleFileChange}
              onBlur={formik.handleBlur}
              className={`form-input-file ${
                formik.touched.images && formik.errors.images
                  ? "border-danger-500"
                  : ""
              }`}
              accept="image/jpeg, image/png, image/webp, image/dicom, application/dicom"
            />
            {imageFiles.length > 0 && (
              <div className="mt-2 text-xs text-gray-500 space-y-1">
                <p>Selected files:</p>
                <ul className="list-disc list-inside">
                  {imageFiles.map((file) => (
                    <li key={file.name}>
                      {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {formik.touched.images && formik.errors.images ? (
              <p className="form-error">{formik.errors.images}</p>
            ) : null}
            {formik.submitCount > 0 &&
              !imageFiles.length &&
              !requestDetails?.images?.length > 0 && (
                <p className="form-error">At least one image is required.</p>
              )}
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              type="submit"
              isLoading={actionLoading}
              disabled={actionLoading || !formik.isValid || !canUpload}
              leftIcon={<DocumentArrowUpIcon className="h-5 w-5" />}
            >
              Upload Report & Complete
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default UploadReportPage;
