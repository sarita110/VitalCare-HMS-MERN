// src/pages/radiology/RadiologyResultsPage.jsx
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
import { EyeIcon } from "@heroicons/react/24/outline";
import {
  formatDate,
  formatDateTime, // Keep if detail modal shows appointment
  getStatusBadgeClass,
  getDisplayStatus,
} from "../../utils/helpers";
// Removed useFormik and Yup as status updates are not needed here

const RadiologyResultsPage = () => {
  const [results, setResults] = useState([]); // Renamed from requests
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    onlyMine: false, // Added filter specific to results
  });
  const [actionLoading, setActionLoading] = useState(false);

  // State for modals
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null); // Renamed from selectedRequest

  const navigate = useNavigate();
  const RESULTS_PER_PAGE = 15; // Renamed constant

  // Renamed function to fetchResults
  const fetchResults = useCallback(async (page = 1, currentFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: RESULTS_PER_PAGE,
        search: currentFilters.search.trim() || undefined,
        onlyMine: currentFilters.onlyMine || undefined, // Pass onlyMine filter
      };
      // Use the correct service function for completed results
      const response = await radiologyService.getRadiologyResults(params);
      if (response.success) {
        setResults(response.radiologyReports); // Use radiologyReports from response
        setPagination(response.pagination);
        setCurrentPage(response.pagination.page);
      } else {
        throw new Error(
          response.message || "Failed to fetch radiology results"
        );
      }
    } catch (err) {
      console.error("Fetch radiology results error:", err);
      setError(err.message || "Could not load radiology results.");
      toast.error(err.message || "Could not load radiology results.");
    } finally {
      setIsLoading(false);
    }
  }, []); // Removed dependency on RESULTS_PER_PAGE if it's constant

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchResults(currentPage, filters);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchResults, currentPage, filters]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setCurrentPage(1);
  };

  // Removed status update logic (statusFormik, openStatusModal, closeStatusModal)

  // --- View Details ---
  const openDetailModal = async (reportId) => {
    // Use reportId which comes from the completed report list
    if (!reportId) {
      toast.error("Invalid report ID");
      return;
    }
    setActionLoading(true);
    try {
      // Fetch details of the COMPLETED report
      const response = await radiologyService.getRadiologyReportDetails(
        reportId
      );
      if (response.success && response.report) {
        setSelectedReport(response.report); // Set the full completed report details
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
    setSelectedReport(null); // Clear selected report on close
  };

  // Removed handleUploadClick as uploads are not initiated from results list

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
        Header: "Reported By", // Changed from Assigned To
        accessor: "radiologist.name", // Radiologist who completed it
        Cell: ({ value }) => value || "-",
      },
      {
        Header: "Completed Date", // Changed from Requested Date
        accessor: "completedDate",
        Cell: ({ value }) => (value ? formatDate(value) : "N/A"), // Handle potentially missing date
      },
      {
        Header: "Status",
        accessor: "status",
        Cell: ({ value }) => (
          <span className={`badge ${getStatusBadgeClass(value)}`}>
            {getDisplayStatus(value)}
          </span>
        ), // Should always be 'Completed' here
      },
      {
        Header: "Actions",
        accessor: "_id", // Use the report ID for actions
        Cell: ({ row }) => (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDetailModal(row.original._id)} // Pass report ID
              title="View Details"
            >
              <EyeIcon className="h-4 w-4" />
            </Button>
            {/* Maybe add a link/button to view images if stored separately */}
            {/* Maybe add a PDF download button if applicable */}
          </div>
        ),
      },
    ],
    // Add openDetailModal to dependencies if it changes, otherwise keep empty
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Removed status and priority filter options

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">
        Completed Radiology Reports
      </h1>

      {/* Simplified Filters for Results */}
      <div className="p-4 bg-white rounded shadow grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="md:col-span-2">
          <FormInput
            label="Search Patient/Doctor/Procedure/Findings"
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
              className="form-checkbox h-5 w-5 text-primary-600"
            />
            <span className="text-sm text-gray-700">Show Only My Reports</span>
          </label>
        </div>
      </div>

      {error && <p className="text-center text-danger-500 py-4">{error}</p>}

      <Table
        columns={columns}
        data={results} // Use results state
        isLoading={isLoading}
        emptyMessage="No completed radiology reports found." // Updated message
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

      {/* Detail View Modal (Content adjusted for completed reports) */}
      <Modal
        isOpen={showDetailModal}
        onClose={closeDetailModal}
        title={`Report Details: ${selectedReport?.procedureType || ""} - ${
          selectedReport?.bodyPart || ""
        }`}
        size="2xl" // Make modal larger to accommodate findings/images potentially
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
                <strong>Procedure:</strong> {selectedReport.procedureType} (
                {selectedReport.bodyPart})
              </p>
              <p>
                <strong>Requested By:</strong> Dr.{" "}
                {selectedReport.doctorId?.userId?.name}
              </p>
              <p>
                <strong>Requested Date:</strong>{" "}
                {formatDate(selectedReport.requestDate)}
              </p>
              <p>
                <strong>Completed By:</strong>{" "}
                {selectedReport.radiologist?.name || "N/A"}
              </p>
              <p>
                <strong>Completed Date:</strong>{" "}
                {formatDate(selectedReport.completedDate)}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={`badge ${getStatusBadgeClass(
                    selectedReport.status
                  )}`}
                >
                  {getDisplayStatus(selectedReport.status)}
                </span>
              </p>
              {selectedReport.priority && (
                <p>
                  <strong>Priority:</strong>{" "}
                  {getDisplayStatus(selectedReport.priority)}
                </p>
              )}
            </div>

            {selectedReport.findings && (
              <div className="prose prose-sm max-w-none">
                <strong>Findings:</strong>
                <div
                  dangerouslySetInnerHTML={{
                    __html: selectedReport.findings.replace(/\n/g, "<br />"),
                  }}
                />
              </div>
            )}
            {selectedReport.impression && (
              <div className="prose prose-sm max-w-none mt-2">
                <strong>Impression/Conclusion:</strong>
                <div
                  dangerouslySetInnerHTML={{
                    __html: selectedReport.impression.replace(/\n/g, "<br />"),
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

            {selectedReport.images && selectedReport.images.length > 0 && (
              <div className="mt-4 pt-3 border-t">
                <h4 className="font-semibold mb-2">Images:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {selectedReport.images.map((image, index) => (
                    <a
                      key={index}
                      href={image.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`View Image: ${
                        image.description || "Radiology Image"
                      }`}
                    >
                      <img
                        src={image.url}
                        alt={
                          image.description || `Radiology Image ${index + 1}`
                        }
                        className="w-full h-auto object-cover rounded border hover:opacity-80 transition-opacity"
                      />
                      {/* <p className="text-xs truncate mt-1">{image.description || `Image ${index + 1}`}</p> */}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {selectedReport.notes && (
              <p className="mt-3 pt-3 border-t">
                <strong>Original Request Notes:</strong> {selectedReport.notes}
              </p>
            )}

            <div className="pt-5 mt-5 border-t flex justify-end">
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

export default RadiologyResultsPage;
