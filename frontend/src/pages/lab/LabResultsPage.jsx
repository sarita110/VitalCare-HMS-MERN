// src/pages/lab/LabResultsPage.jsx
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
import Select from "react-select"; // Keep Select if other filters remain, otherwise remove
import { EyeIcon, DocumentTextIcon } from "@heroicons/react/24/outline"; // Changed icons
import {
  formatDate,
  formatDateTime, // If showing appointment details
  getStatusBadgeClass,
  getDisplayStatus,
} from "../../utils/helpers";
// Removed useFormik and Yup

const LabResultsPage = () => {
  const [labReports, setLabReports] = useState([]); // Renamed state
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    onlyMine: true, // Default to showing only the technician's reports
  });
  const [actionLoading, setActionLoading] = useState(false);

  // State for modals
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null); // Renamed state

  const navigate = useNavigate();
  const REPORTS_PER_PAGE = 15; // Renamed constant

  // Renamed function
  const fetchLabReports = useCallback(async (page = 1, currentFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: REPORTS_PER_PAGE,
        search: currentFilters.search.trim() || undefined,
        onlyMine: currentFilters.onlyMine ? "true" : undefined, // Send 'true' string if checked
      };
      // Use the correct service function for completed reports
      const response = await labService.getLabResults(params);
      if (response.success) {
        setLabReports(response.labReports);
        setPagination(response.pagination);
        setCurrentPage(response.pagination.page);
      } else {
        throw new Error(response.message || "Failed to fetch lab results");
      }
    } catch (err) {
      console.error("Fetch lab results error:", err);
      setError(err.message || "Could not load lab results.");
      toast.error(err.message || "Could not load lab results.");
    } finally {
      setIsLoading(false);
    }
  }, []); // Removed REPORTS_PER_PAGE dependency

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchLabReports(currentPage, filters);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchLabReports, currentPage, filters]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setCurrentPage(1); // Reset to first page on filter change
  };

  // Removed status update logic

  // --- View Details ---
  const openDetailModal = async (reportId) => {
    if (!reportId) {
      toast.error("Invalid report ID");
      return;
    }
    setActionLoading(true);
    setSelectedReport(null); // Clear previous selection
    try {
      // Fetch details of the COMPLETED lab report
      const response = await labService.getLabReportDetails(reportId);
      if (response.success && response.report) {
        setSelectedReport(response.report);
        setShowDetailModal(true);
      } else {
        throw new Error(response.message || "Failed to load report details");
      }
    } catch (err) {
      toast.error(err.message || "Could not load details.");
      console.error("Fetch detail error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedReport(null);
  };

  // Removed upload navigation logic

  const columns = useMemo(
    () => [
      {
        Header: "Patient",
        accessor: "patientId.userId.name",
        Cell: ({ value }) => value || "N/A",
      },
      {
        Header: "Test Name",
        accessor: "testId.testName", // Access test name via populated testId
        Cell: ({ value }) => value || "N/A",
      },
      {
        Header: "Requested By",
        accessor: "testId.doctorId.userId.name", // Access requesting doctor via populated testId
        Cell: ({ value }) => `Dr. ${value || "N/A"}`,
      },
      {
        Header: "Technician", // Show who completed the report
        accessor: "technician.name",
        Cell: ({ value }) => value || "-",
      },
      {
        Header: "Report Date", // Date report was created/completed
        accessor: "reportDate",
        Cell: ({ value }) => formatDate(value),
      },
      {
        Header: "Verified",
        accessor: "isVerified",
        Cell: ({ value }) =>
          value ? (
            <span className="badge badge-success-light">Yes</span>
          ) : (
            <span className="badge badge-warning-light">No</span>
          ), // Use lighter badges
      },
      {
        Header: "Actions",
        accessor: "_id", // Use report's ID
        Cell: ({ row }) => (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDetailModal(row.original._id)} // Pass report ID
              title="View Report Details"
            >
              <EyeIcon className="h-4 w-4" />
            </Button>
            {/* Link to download attachment if exists */}
            {row.original.attachment?.url && (
              <a
                href={row.original.attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm" // Use consistent button styling
                title={`Download ${
                  row.original.attachment.name || "Attachment"
                }`}
              >
                <DocumentTextIcon className="h-4 w-4" />
              </a>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // Dependencies might include openDetailModal if needed
  );

  // Removed status/priority filters and edit options

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">
        Completed Lab Reports
      </h1>
      {/* Filters */}
      <div className="p-4 bg-white rounded shadow grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="md:col-span-2">
          <FormInput
            label="Search Patient/Doctor/Test/Summary"
            type="search"
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Enter search term..."
          />
        </div>
        <div className="flex items-center h-full pt-6">
          {" "}
          {/* Adjust alignment */}
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              name="onlyMine"
              checked={filters.onlyMine}
              onChange={handleFilterChange}
              className="form-checkbox h-5 w-5 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Show Only My Reports</span>
          </label>
        </div>
      </div>
      {error && <p className="text-center text-danger-500 py-4">{error}</p>}
      <Table
        columns={columns}
        data={labReports} // Use labReports state
        isLoading={isLoading}
        emptyMessage={
          filters.onlyMine
            ? "You have not completed any reports yet."
            : "No completed lab reports found matching filters."
        } // Contextual empty message
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
      {/* Removed Status Update Modal */}
      {/* Detail View Modal (Content adjusted for LabReport) */}
      <Modal
        isOpen={showDetailModal}
        onClose={closeDetailModal}
        title={`Report Details: ${selectedReport?.testId?.testName || ""}`}
        size="2xl" // Can adjust size
      >
        {actionLoading && <LoadingSpinner />}
        {selectedReport && !actionLoading && (
          <div className="text-sm space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 mb-4 border-b pb-3">
              <p>
                <strong>Patient:</strong>{" "}
                {selectedReport.patientId?.userId?.name}
              </p>
              <p>
                <strong>Test:</strong> {selectedReport.testId?.testName} (
                {selectedReport.testId?.testType})
              </p>
              <p>
                <strong>Requested By:</strong> Dr.{" "}
                {selectedReport.testId?.doctorId?.userId?.name}
              </p>
              <p>
                <strong>Report Date:</strong>{" "}
                {formatDate(selectedReport.reportDate)}
              </p>
              <p>
                <strong>Reported By:</strong>{" "}
                {selectedReport.technician?.name || "N/A"}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span className={`badge ${getStatusBadgeClass("completed")}`}>
                  {getDisplayStatus("completed")}
                </span>
              </p>{" "}
              {/* Assuming always completed */}
              <p>
                <strong>Verified:</strong>{" "}
                {selectedReport.isVerified
                  ? `Yes by ${
                      selectedReport.verifiedBy?.name || "N/A"
                    } on ${formatDate(selectedReport.verifiedAt)}`
                  : "No"}
              </p>
            </div>

            {selectedReport.summary && (
              <div className="prose prose-sm max-w-none">
                <strong>Summary:</strong>
                <div
                  dangerouslySetInnerHTML={{
                    __html: selectedReport.summary.replace(/\n/g, "<br />"),
                  }}
                />
              </div>
            )}
            {selectedReport.conclusion && (
              <div className="prose prose-sm max-w-none mt-2">
                <strong>Conclusion:</strong>
                <div
                  dangerouslySetInnerHTML={{
                    __html: selectedReport.conclusion.replace(/\n/g, "<br />"),
                  }}
                />
              </div>
            )}
            {selectedReport.recommendations && (
              <div className="prose prose-sm max-w-none mt-2">
                <strong>Recommendations:</strong>
                <div
                  dangerouslySetInnerHTML={{
                    __html: selectedReport.recommendations.replace(
                      /\n/g,
                      "<br />"
                    ),
                  }}
                />
              </div>
            )}

            {/* Display structured results if they exist */}
            {selectedReport.results && selectedReport.results.length > 0 && (
              <div className="mt-4 pt-3 border-t">
                <h4 className="font-semibold mb-2">Detailed Results:</h4>
                <div className="overflow-x-auto">
                  <table className="table table-compact w-full text-xs">
                    {" "}
                    {/* Consider using a more robust table component if needed */}
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-2 py-1 text-left">Parameter</th>
                        <th className="px-2 py-1 text-left">Value</th>
                        <th className="px-2 py-1 text-left">Unit</th>
                        <th className="px-2 py-1 text-left">Normal Range</th>
                        <th className="px-2 py-1 text-left">Interpretation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReport.results.map((res, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="px-2 py-1">{res.parameter}</td>
                          <td className="px-2 py-1">{res.value}</td>
                          <td className="px-2 py-1">{res.unit || "-"}</td>
                          <td className="px-2 py-1">
                            {res.normalRange || "-"}
                          </td>
                          <td className="px-2 py-1">
                            {res.interpretation || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Link to attachment - Continuation */}
            {selectedReport.attachment?.url && (
              <div className="mt-4 pt-3 border-t">
                <h4 className="font-semibold mb-1">Attachment:</h4>
                <a
                  href={selectedReport.attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-800 hover:underline inline-flex items-center"
                >
                  <DocumentTextIcon className="h-4 w-4 mr-1" />
                  {selectedReport.attachment.name || "View/Download Attachment"}
                </a>
              </div>
            )}
            {/* End of Attachment Section */}

            {/* Footer with Close button */}
            <div className="pt-5 mt-5 border-t flex justify-end">
              <Button variant="outline" onClick={closeDetailModal}>
                Close
              </Button>
            </div>
          </div> // End of conditional rendering for selectedReport
        )}
      </Modal>{" "}
      {/* End of Detail View Modal */}
    </div> // End of main page div
  );
};

export default LabResultsPage;
