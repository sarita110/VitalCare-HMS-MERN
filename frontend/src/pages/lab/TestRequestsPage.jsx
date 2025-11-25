// src/pages/lab/TestRequestsPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { useNavigate, Link } from "react-router-dom";
import labService from "../../services/labService";
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
  formatCurrency, // Import currency formatter
} from "../../utils/helpers";
import { useFormik } from "formik";
import * as Yup from "yup";

const statusUpdateSchema = Yup.object({
  status: Yup.string()
    .required("Status is required")
    .oneOf(
      ["scheduled", "sample-collected", "in-progress", "cancelled"],
      "Invalid status update"
    ), // Tech updates these statuses
  scheduledDate: Yup.date()
    .nullable()
    .when("status", {
      is: "scheduled",
      then: (schema) =>
        schema
          .required("Scheduled date is required for scheduled status")
          .min(new Date(), "Scheduled date cannot be in the past"),
      otherwise: (schema) => schema.optional(),
    }),
  notes: Yup.string().optional(),
});

const TestRequestsPage = () => {
  const [labTests, setLabTests] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: "pending", // Default to pending statuses
    priority: "",
    search: "",
  });
  const [actionLoading, setActionLoading] = useState(false);

  // State for modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);

  const navigate = useNavigate();
  const TESTS_PER_PAGE = 15;

  const fetchLabTests = useCallback(async (page = 1, currentFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: TESTS_PER_PAGE,
        status: currentFilters.status || undefined,
        priority: currentFilters.priority || undefined,
        search: currentFilters.search.trim() || undefined,
      };
      const response = await labService.getLabRequests(params);
      if (response.success) {
        setLabTests(response.labTests);
        setPagination(response.pagination);
        setCurrentPage(response.pagination.page);
      } else {
        throw new Error(response.message || "Failed to fetch lab requests");
      }
    } catch (err) {
      console.error("Fetch lab requests error:", err);
      setError(err.message || "Could not load lab requests.");
      toast.error(err.message || "Could not load lab requests.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchLabTests(currentPage, filters);
    }, 500); // Debounce search/filter changes

    return () => clearTimeout(delayDebounceFn);
  }, [fetchLabTests, currentPage, filters]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
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
      if (!selectedTest) return;
      // --- ADDED CHECK ---
      if (
        !["confirmed", "scheduled", "sample-collected", "in-progress"].includes(
          selectedTest.status
        )
      ) {
        toast.error(
          `Cannot update status from '${selectedTest.status}'. Test might be pending payment or cancelled.`
        );
        return;
      }
      // Prevent setting status back to requested or confirmed
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
        const response = await labService.updateLabTestStatus(
          selectedTest._id,
          payload
        );
        if (response.success) {
          toast.success("Test status updated successfully!");
          fetchLabTests(currentPage, filters);
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

  const openStatusModal = (test) => {
    // --- ADDED CHECK ---
    if (
      !["confirmed", "scheduled", "sample-collected", "in-progress"].includes(
        test.status
      )
    ) {
      toast.error(
        `Cannot update status for test with status '${getDisplayStatus(
          test.status
        )}'. Payment might be pending.`
      );
      return;
    }
    // --- END CHECK ---
    setSelectedTest(test);
    statusFormik.setValues({
      status: test.status, // Start with current status
      scheduledDate: test.scheduledDate
        ? formatDate(test.scheduledDate, "yyyy-MM-dd")
        : "",
      notes: test.notes || "",
    });
    setShowStatusModal(true);
  };
  const closeStatusModal = () => {
    setShowStatusModal(false);
    setSelectedTest(null);
    statusFormik.resetForm();
  };

  // --- View Details ---
  const openDetailModal = async (testId) => {
    setActionLoading(true);
    setSelectedTest(null);
    try {
      const response = await labService.getLabRequestDetails(testId);
      if (response.success && response.labTest) {
        setSelectedTest(response.labTest);
        setShowDetailModal(true);
      } else {
        throw new Error(response.message || "Failed to load test details");
      }
    } catch (err) {
      toast.error(err.message || "Could not load details.");
      console.error("Fetch detail error:", err);
    } finally {
      setActionLoading(false);
    }
  };
  const closeDetailModal = () => setShowDetailModal(false);

  // --- Upload Results Navigation ---
  const handleUploadClick = (test) => {
    // --- ADDED CHECK ---
    const canUpload =
      ["confirmed", "sample-collected", "in-progress"].includes(test.status) ||
      (test.status === "completed" && !test.resultId);
    if (!canUpload) {
      toast.error(
        `Cannot upload results for test with status '${getDisplayStatus(
          test.status
        )}'. Payment might be pending.`
      );
      return;
    }
    // --- END CHECK ---
    navigate(`/lab/upload-results/${test._id}`);
  };

  const columns = useMemo(
    () => [
      {
        Header: "Patient",
        accessor: "patientId.userId.name",
        Cell: ({ value }) => value || "N/A",
      },
      { Header: "Test Name", accessor: "testName" },
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
        accessor: "assignedTo.name",
        Cell: ({ value }) => value || "-",
      },
      {
        Header: "Actions",
        accessor: "_id",
        Cell: ({ row }) => {
          const test = row.original;
          // Enable processing actions only if confirmed or later stages (but not completed/cancelled)
          const canProcess = [
            "confirmed",
            "scheduled",
            "sample-collected",
            "in-progress",
          ].includes(test.status);
          // Enable upload if processable OR if completed but lacks results
          const canUpload =
            canProcess || (test.status === "completed" && !test.resultId);
          // Allow status update if processable and not completed/cancelled
          const canUpdateStatus =
            canProcess && !["completed", "cancelled"].includes(test.status);

          return (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openDetailModal(test._id)}
                title="View Details"
              >
                <EyeIcon className="h-4 w-4" />
              </Button>
              {canUpdateStatus && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openStatusModal(test)}
                  title="Update Status"
                  disabled={actionLoading}
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
              )}
              {canUpload && (
                <Button
                  variant={
                    test.status === "completed" ? "secondary" : "primary"
                  }
                  size="sm"
                  onClick={() => handleUploadClick(test)}
                  title={
                    test.status === "completed"
                      ? "Upload Results (Completed)"
                      : "Upload Results"
                  }
                  disabled={actionLoading}
                >
                  <DocumentArrowUpIcon className="h-4 w-4" />
                </Button>
              )}
              {/* Indicate if payment is pending */}
              {test.status === "requested" &&
                test.payment?.status === "pending" && (
                  <span className="text-xs text-warning-600 italic self-center">
                    (Payment Pending)
                  </span>
                )}
            </div>
          );
        },
      },
    ],
    [actionLoading, openDetailModal, openStatusModal, handleUploadClick] // Add actionLoading to dependencies
  );

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "pending", label: "Pending Payment/Processing" }, // Grouped pending
    { value: "requested", label: "Requested (Payment Pending)" },
    { value: "confirmed", label: "Confirmed (Payment Done)" },
    { value: "scheduled", label: "Scheduled" },
    { value: "sample-collected", label: "Sample Collected" },
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
  const editStatusOptions = statusOptions.filter((opt) =>
    ["scheduled", "sample-collected", "in-progress", "cancelled"].includes(
      opt.value
    )
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">
        Lab Test Requests
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
            label="Search Patient/Doctor/Test"
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
        data={labTests}
        isLoading={isLoading}
        emptyMessage="No lab test requests found."
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
        title={`Update Status for ${selectedTest?.testName || ""}`}
      >
        <form onSubmit={statusFormik.handleSubmit} className="space-y-4">
          <p className="text-sm">
            Patient: <strong>{selectedTest?.patientId?.userId?.name}</strong>
          </p>
          {/* Ensure current status display reflects payment if needed */}
          <p className="text-sm">
            Current Status:{" "}
            <strong>
              {getDisplayStatus(selectedTest?.status)}{" "}
              {selectedTest?.status === "requested" && "(Payment Pending)"}
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
        title={`Test Details: ${selectedTest?.testName || ""}`}
        size="xl"
      >
        {actionLoading && <LoadingSpinner />}
        {selectedTest && !actionLoading && (
          <div className="text-sm space-y-2">
            <p>
              <strong>Patient:</strong> {selectedTest.patientId?.userId?.name}
            </p>
            <p>
              <strong>Test:</strong> {selectedTest.testName} (
              {selectedTest.testType})
            </p>
            <p>
              <strong>Payment Status:</strong>{" "}
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadgeClass(
                  selectedTest.payment?.status
                )} text-white`}
              >
                {getDisplayStatus(selectedTest.payment?.status || "pending")}
              </span>
            </p>
            <p>
              <strong>Status:</strong>{" "}
              <span
                className={`badge ${getStatusBadgeClass(selectedTest.status)}`}
              >
                {getDisplayStatus(selectedTest.status)}
              </span>
            </p>
            <p>
              <strong>Payment:</strong>{" "}
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadgeClass(
                  selectedTest.payment?.status
                )} text-white`}
              >
                {getDisplayStatus(selectedTest.payment?.status || "N/A")}
              </span>
            </p>
            <p>
              <strong>Priority:</strong>{" "}
              {getDisplayStatus(selectedTest.priority)}
            </p>
            <p>
              <strong>Requested By:</strong> Dr.{" "}
              {selectedTest.doctorId?.userId?.name}
            </p>
            <p>
              <strong>Requested Date:</strong>{" "}
              {formatDate(selectedTest.requestDate)}
            </p>
            {selectedTest.scheduledDate && (
              <p>
                <strong>Scheduled Date:</strong>{" "}
                {formatDate(selectedTest.scheduledDate)}
              </p>
            )}
            {selectedTest.appointmentId && (
              <p>
                <strong>Related Appointment:</strong>{" "}
                {formatDateTime(selectedTest.appointmentId.dateTime)}
              </p>
            )}
            {selectedTest.description && (
              <p>
                <strong>Description:</strong> {selectedTest.description}
              </p>
            )}
            {selectedTest.instructions && (
              <p>
                <strong>Instructions:</strong> {selectedTest.instructions}
              </p>
            )}
            {selectedTest.notes && (
              <p>
                <strong>Notes:</strong> {selectedTest.notes}
              </p>
            )}
            {selectedTest.assignedTo && (
              <p>
                <strong>Assigned To:</strong> {selectedTest.assignedTo.name}
              </p>
            )}
            {selectedTest.resultId && (
              <p>
                <strong>Result:</strong>{" "}
                <Link
                  to={`/lab/results/${selectedTest.resultId._id}`}
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

export default TestRequestsPage;
