// src/pages/radiology/RadiologyRequestsPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { useNavigate, Link } from "react-router-dom";
import radiologyService from "../../services/radiologyService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Pagination from "../../components/common/Pagination";
import FormInput from "../../components/common/FormInput";
import Select from "react-select";
import {
  EyeIcon,
  PencilIcon,
  DocumentArrowUpIcon,
} from "@heroicons/react/24/outline";
import {
  formatDate,
  formatDateTime,
  getStatusBadgeClass,
  getDisplayStatus,
  formatCurrency,
} from "../../utils/helpers";
import { useFormik } from "formik";
import * as Yup from "yup";

const statusUpdateSchema = Yup.object({
  status: Yup.string()
    .required("Status is required")
    .oneOf(["scheduled", "in-progress", "cancelled"]), // Radiologist updates status
  scheduledDate: Yup.date()
    .nullable()
    .when("status", {
      is: "scheduled",
      then: (schema) =>
        schema.required("Scheduled date is required").min(new Date()),
      otherwise: (schema) => schema.optional(),
    }),
  notes: Yup.string().optional(),
});

const RadiologyRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: "pending",
    priority: "",
    search: "",
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const navigate = useNavigate();
  const REQUESTS_PER_PAGE = 15;

  const fetchRequests = useCallback(async (page = 1, currentFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: REQUESTS_PER_PAGE,
        status: currentFilters.status || undefined,
        priority: currentFilters.priority || undefined,
        search: currentFilters.search.trim() || undefined,
      };
      const response = await radiologyService.getRadiologyRequests(params);
      if (response.success) {
        setRequests(response.radiologyRequests);
        setPagination(response.pagination);
        setCurrentPage(response.pagination.page);
      } else {
        throw new Error(
          response.message || "Failed to fetch radiology requests"
        );
      }
    } catch (err) {
      console.error("Fetch radiology requests error:", err);
      setError(err.message || "Could not load radiology requests.");
      toast.error(err.message || "Could not load radiology requests.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchRequests(currentPage, filters);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchRequests, currentPage, filters]);

  const handlePageChange = (page) => setCurrentPage(page);
  const handleFilterChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setCurrentPage(1);
  };
  const handleSelectFilterChange = (name, selectedOption) => {
    setFilters((prev) => ({
      ...prev,
      [name]: selectedOption ? selectedOption.value : "",
    }));
    setCurrentPage(1);
  };

  // --- Status Update ---
  const statusFormik = useFormik({
    initialValues: { status: "", scheduledDate: "", notes: "" },
    validationSchema: statusUpdateSchema,
    onSubmit: async (values) => {
      if (!selectedRequest) return;
      // --- ADDED CHECK ---
      if (
        !["confirmed", "scheduled", "in-progress"].includes(
          selectedRequest.status
        )
      ) {
        toast.error(
          `Cannot update status from '${selectedRequest.status}'. Request might be pending payment or cancelled.`
        );
        return;
      }
      if (["requested", "confirmed"].includes(values.status)) {
        toast.error(`Cannot set status back to '${values.status}'.`);
        return;
      }
      // --- END CHECK ---
      setActionLoading(true);
      try {
        const payload = {
          status: values.status,
          notes: values.notes || undefined,
          scheduledDate:
            values.status === "scheduled" ? values.scheduledDate : undefined,
        };
        const response = await radiologyService.updateRadiologyRequestStatus(
          selectedRequest._id,
          payload
        );
        if (response.success) {
          toast.success("Request status updated successfully!");
          fetchRequests(currentPage, filters);
          closeStatusModal();
        } else {
          throw new Error(response.message || "Failed to update status");
        }
      } catch (err) {
        console.error("Update status error:", err);
        toast.error(err.message || "Could not update status.");
      } finally {
        setActionLoading(false);
      }
    },
  });

  const openStatusModal = (request) => {
    // --- ADDED CHECK ---
    if (!["confirmed", "scheduled", "in-progress"].includes(request.status)) {
      toast.error(
        `Cannot update status for request with status '${getDisplayStatus(
          request.status
        )}'. Payment might be pending.`
      );
      return;
    }
    // --- END CHECK ---
    setSelectedRequest(request);
    statusFormik.setValues({
      status: request.status,
      scheduledDate: request.scheduledDate
        ? formatDate(request.scheduledDate, "yyyy-MM-dd")
        : "",
      notes: request.notes || "",
    });
    setShowStatusModal(true);
  };
  const closeStatusModal = () => {
    setShowStatusModal(false);
    setSelectedRequest(null);
    statusFormik.resetForm();
  };

  // --- View Details ---
  const openDetailModal = async (requestId) => {
    setActionLoading(true);
    setSelectedRequest(null);
    try {
      const response = await radiologyService.getRadiologyRequestDetails(
        requestId
      );
      if (response.success && response.radiologyReport) {
        setSelectedRequest(response.radiologyReport);
        setShowDetailModal(true);
      } else {
        throw new Error(response.message || "Failed to load request details");
      }
    } catch (err) {
      toast.error(err.message || "Could not load details.");
      console.error("Fetch detail error:", err);
    } finally {
      setActionLoading(false);
    }
  };
  const closeDetailModal = () => setShowDetailModal(false);

  // --- Upload Report Navigation ---
  const handleUploadClick = (request) => {
    // --- ADDED CHECK ---
    const canUpload =
      ["confirmed", "scheduled", "in-progress"].includes(request.status) ||
      (request.status === "completed" &&
        !request.findings &&
        !request.impression); // Allow if completed but empty
    if (!canUpload) {
      toast.error(
        `Cannot upload report for request with status '${getDisplayStatus(
          request.status
        )}'. Payment might be pending.`
      );
      return;
    }
    // --- END CHECK ---
    navigate(`/radiology/upload-report/${request._id}`);
  };

  const columns = useMemo(
    () => [
      {
        Header: "Patient",
        accessor: "patientId.userId.name",
        Cell: ({ value }) => value || "N/A",
      },
      { Header: "Procedure", accessor: "procedureType" },
      { Header: "Body Part", accessor: "bodyPart" },
      {
        Header: "Requested By",
        accessor: "doctorId.userId.name",
        Cell: ({ value }) => `Dr. ${value || "N/A"}`,
      },
      {
        Header: "Requested Date",
        accessor: "requestDate",
        Cell: ({ value }) => formatDate(value),
      },
      {
        Header: "Priority",
        accessor: "priority",
        Cell: ({ value }) => getDisplayStatus(value),
      },
      {
        Header: "Payment",
        accessor: "payment.status",
        Cell: ({ row }) => (
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadgeClass(
              row.original.payment?.status || "pending"
            )} text-white`}
          >
            {getDisplayStatus(row.original.payment?.status || "pending")}
          </span>
        ),
      }, // Display payment status
      {
        Header: "Status",
        accessor: "status",
        Cell: ({ value }) => (
          <span className={`badge ${getStatusBadgeClass(value)}`}>
            {getDisplayStatus(value)}
          </span>
        ),
      },
      {
        Header: "Assigned To",
        accessor: "radiologist.name",
        Cell: ({ value }) => value || "-",
      },
      {
        Header: "Actions",
        accessor: "_id",
        Cell: ({ row }) => {
          const request = row.original;
          const canProcess = ["confirmed", "scheduled", "in-progress"].includes(
            request.status
          );
          const canUpload =
            canProcess ||
            (request.status === "completed" &&
              !request.findings &&
              !request.impression);
          const canUpdateStatus =
            canProcess && !["completed", "cancelled"].includes(request.status);

          return (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openDetailModal(request._id)}
                title="View Details"
              >
                <EyeIcon className="h-4 w-4" />
              </Button>
              {canUpdateStatus && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openStatusModal(request)}
                  title="Update Status"
                  disabled={actionLoading}
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
              )}
              {canUpload && (
                <Button
                  variant={
                    request.status === "completed" ? "secondary" : "primary"
                  }
                  size="sm"
                  onClick={() => handleUploadClick(request)}
                  title={
                    request.status === "completed"
                      ? "Add Report/Images (Completed)"
                      : "Upload Report/Images"
                  }
                  disabled={actionLoading}
                >
                  <DocumentArrowUpIcon className="h-4 w-4" />
                </Button>
              )}
              {request.status === "requested" &&
                request.payment?.status === "pending" && (
                  <span className="text-xs text-warning-600 italic self-center">
                    (Payment Pending)
                  </span>
                )}
            </div>
          );
        },
      },
    ],
    [actionLoading, openDetailModal, openStatusModal, handleUploadClick] // Add actionLoading dependency
  );

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "pending", label: "Pending Payment/Processing" },
    { value: "requested", label: "Requested (Payment Pending)" },
    { value: "confirmed", label: "Confirmed (Payment Done)" },
    { value: "scheduled", label: "Scheduled" },
    { value: "in-progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];
  const priorityOptions = [
    { value: "", label: "All Priorities" },
    { value: "routine", label: "Routine" },
    { value: "urgent", label: "Urgent" },
    { value: "emergency", label: "Emergency" },
  ];
  // Radiologist can only update to these statuses
  const editStatusOptions = statusOptions.filter((opt) =>
    ["scheduled", "in-progress", "cancelled"].includes(opt.value)
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">
        Radiology Requests
      </h1>

      {/* Filters */}
      <div className="p-4 bg-white rounded shadow grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label htmlFor="statusFilter" className="form-label">
            Status
          </label>
          <Select
            id="statusFilter"
            name="status"
            options={statusOptions}
            value={
              statusOptions.find((opt) => opt.value === filters.status) ||
              statusOptions[1]
            }
            onChange={(opt) => handleSelectFilterChange("status", opt)}
            isClearable
            placeholder="Filter by status..."
          />
        </div>
        <div>
          <label htmlFor="priorityFilter" className="form-label">
            Priority
          </label>
          <Select
            id="priorityFilter"
            name="priority"
            options={priorityOptions}
            value={
              priorityOptions.find((opt) => opt.value === filters.priority) ||
              null
            }
            onChange={(opt) => handleSelectFilterChange("priority", opt)}
            isClearable
            placeholder="Filter by priority..."
          />
        </div>
        <div className="md:col-span-2">
          <FormInput
            label="Search Patient/Doctor/Procedure"
            type="search"
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Enter search term..."
          />
        </div>
      </div>

      {error && <p className="text-center text-danger-500 py-4">{error}</p>}

      <Table
        columns={columns}
        data={requests}
        isLoading={isLoading}
        emptyMessage="No radiology requests found."
      />

      {pagination && pagination.totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={pagination.pages}
          onPageChange={handlePageChange}
          itemsPerPage={pagination.limit}
          totalItems={pagination.total}
        />
      )}

      {/* Status Update Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={closeStatusModal}
        title={`Update Status for Request #${selectedRequest?._id.slice(-6)}`}
      >
        <form onSubmit={statusFormik.handleSubmit} className="space-y-4">
          <p className="text-sm">
            Patient: <strong>{selectedRequest?.patientId?.userId?.name}</strong>
          </p>
          <p className="text-sm">
            Procedure:{" "}
            <strong>
              {selectedRequest?.procedureType} ({selectedRequest?.bodyPart})
            </strong>
          </p>
          <div>
            <label htmlFor="status" className="form-label">
              New Status <span className="text-danger-600">*</span>
            </label>
            <Select
              id="status"
              name="status"
              options={editStatusOptions}
              value={
                editStatusOptions.find(
                  (opt) => opt.value === statusFormik.values.status
                ) || null
              }
              onChange={(option) =>
                statusFormik.setFieldValue("status", option ? option.value : "")
              }
              onBlur={statusFormik.handleBlur}
              classNamePrefix="react-select"
            />
            {statusFormik.touched.status && statusFormik.errors.status ? (
              <p className="form-error">{statusFormik.errors.status}</p>
            ) : null}
          </div>
          {statusFormik.values.status === "scheduled" && (
            <FormInput
              label="Scheduled Date"
              type="date"
              id="scheduledDate"
              name="scheduledDate"
              required
              min={new Date().toISOString().split("T")[0]}
              {...statusFormik.getFieldProps("scheduledDate")}
              error={statusFormik.errors.scheduledDate}
              touched={statusFormik.touched.scheduledDate}
            />
          )}
          <FormInput
            label="Notes (Optional)"
            id="notes"
            name="notes"
            type="textarea"
            rows={3}
            {...statusFormik.getFieldProps("notes")}
          />
          <div className="pt-4 flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={closeStatusModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={actionLoading}
              disabled={actionLoading || !statusFormik.isValid}
            >
              Update Status
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail View Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={closeDetailModal}
        title={`Request Details: ${selectedRequest?.procedureType || ""} - ${
          selectedRequest?.bodyPart || ""
        }`}
        size="xl"
      >
        {actionLoading && <LoadingSpinner />}
        {selectedRequest && !actionLoading && (
          <div className="text-sm space-y-2">
            <p>
              <strong>Patient:</strong>{" "}
              {selectedRequest.patientId?.userId?.name}
            </p>
            <p>
              <strong>Procedure:</strong> {selectedRequest.procedureType}
            </p>
            <p>
              <strong>Body Part:</strong> {selectedRequest.bodyPart}
            </p>
            {/* Include Payment Status */}
            <p>
              <strong>Payment Status:</strong>{" "}
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadgeClass(
                  selectedRequest.payment?.status
                )} text-white`}
              >
                {getDisplayStatus(selectedRequest.payment?.status || "pending")}
              </span>
            </p>
            <p>
              <strong>Status:</strong>{" "}
              <span
                className={`badge ${getStatusBadgeClass(
                  selectedRequest.status
                )}`}
              >
                {getDisplayStatus(selectedRequest.status)}
              </span>
            </p>
            <p>
              <strong>Priority:</strong>{" "}
              {getDisplayStatus(selectedRequest.priority)}
            </p>
            <p>
              <strong>Requested By:</strong> Dr.{" "}
              {selectedRequest.doctorId?.userId?.name}
            </p>
            <p>
              <strong>Requested Date:</strong>{" "}
              {formatDate(selectedRequest.requestDate)}
            </p>
            {selectedRequest.scheduledDate && (
              <p>
                <strong>Scheduled Date:</strong>{" "}
                {formatDate(selectedRequest.scheduledDate)}
              </p>
            )}
            {selectedRequest.completedDate && (
              <p>
                <strong>Completed Date:</strong>{" "}
                {formatDate(selectedRequest.completedDate)}
              </p>
            )}
            {selectedRequest.appointmentId && (
              <p>
                <strong>Related Appointment:</strong>{" "}
                {formatDateTime(selectedRequest.appointmentId.dateTime)}
              </p>
            )}
            {selectedRequest.notes && (
              <p>
                <strong>Notes:</strong> {selectedRequest.notes}
              </p>
            )}
            {selectedRequest.radiologist && (
              <p>
                <strong>Assigned Radiologist:</strong>{" "}
                {selectedRequest.radiologist.name}
              </p>
            )}
            {/* Link to results if completed */}
            {selectedRequest.status === "completed" && (
              <p>
                <strong>Result:</strong>{" "}
                <Link
                  to={`/radiology/results/${selectedRequest._id}`}
                  className="text-primary-600 hover:underline"
                >
                  View Report
                </Link>
              </p>
            )}
            <div className="pt-4 mt-4 border-t flex justify-end">
              <Button variant="outline" onClick={closeDetailModal}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RadiologyRequestsPage;
