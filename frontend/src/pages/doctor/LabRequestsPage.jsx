// pages/doctor/LabRequestsPage.jsx

import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import doctorService from "../../services/doctorService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Pagination from "../../components/common/Pagination";
import { EyeIcon, CalendarIcon } from "@heroicons/react/24/outline";
import {
  formatDate,
  getStatusBadgeClass,
  getDisplayStatus,
} from "../../utils/helpers";
import { Link } from "react-router-dom";
import Select from "react-select";

const LabRequestsPage = () => {
  const [labTests, setLabTests] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: "",
    patientId: "",
    search: "",
  });

  const TESTS_PER_PAGE = 15;

  const fetchLabTests = useCallback(async (page = 1, currentFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: TESTS_PER_PAGE,
        status: currentFilters.status || undefined,
        patientId: currentFilters.patientId || undefined,
        search: currentFilters.search || undefined,
      };

      const response = await doctorService.getDoctorLabResults(params);
      if (response.success) {
        setLabTests(response.labTests);
        setPagination(response.pagination);
        setCurrentPage(response.pagination.page);
      } else {
        throw new Error(response.message || "Failed to fetch lab tests");
      }
    } catch (err) {
      console.error("Fetch lab tests error:", err);
      setError(err.message || "Could not load lab tests.");
      toast.error(err.message || "Could not load lab tests.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLabTests(currentPage, filters);
  }, [fetchLabTests, currentPage, filters]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleStatusChange = (selectedOption) => {
    setFilters((prev) => ({
      ...prev,
      status: selectedOption ? selectedOption.value : "",
    }));
    setCurrentPage(1); // Reset page
  };

  const handleSearchChange = (e) => {
    setFilters((prev) => ({
      ...prev,
      search: e.target.value,
    }));
    // Debounce search to prevent too many requests
    if (e.target.value) {
      setTimeout(() => {
        setCurrentPage(1);
      }, 300);
    } else {
      setCurrentPage(1);
    }
  };

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "requested", label: "Requested" },
    { value: "scheduled", label: "Scheduled" },
    { value: "sample-collected", label: "Sample Collected" },
    { value: "in-progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const columns = useMemo(
    () => [
      { Header: "Test Name", accessor: "testName" },
      { Header: "Test Type", accessor: "testType" },
      {
        Header: "Patient",
        accessor: "patientId.userId.name",
        Cell: ({ value }) => value || "N/A",
      },
      {
        Header: "Requested Date",
        accessor: "requestDate",
        Cell: ({ value }) => formatDate(value),
      },
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
        Header: "Result",
        accessor: "resultId",
        Cell: ({ value, row }) =>
          value?._id ? (
            <Link
              to={`/doctor/lab-results/${value._id}`}
              className="text-primary-600 hover:underline"
            >
              View
            </Link>
          ) : row.original.status === "completed" ? (
            "Pending Upload"
          ) : (
            "N/A"
          ),
      },
      {
        Header: "Actions",
        accessor: "_id",
        Cell: ({ row }) => (
          <div className="flex space-x-2">
            <Link
              to={`/doctor/patients/${row.original.patientId?._id}`}
              title="View Patient Details"
            >
              <Button variant="outline" size="sm">
                <EyeIcon className="h-4 w-4" />
              </Button>
            </Link>
            {row.original.appointmentId && (
              <Link
                to={`/doctor/appointments/${row.original.appointmentId}`}
                title="View Appointment"
                className="text-primary-600 hover:underline text-sm"
              >
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">
        Lab Test Requests & Results
      </h1>

      {/* Filters */}
      <div className="p-4 bg-white rounded shadow grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="statusFilter" className="form-label">
            Filter by Status
          </label>
          <Select
            id="statusFilter"
            name="status"
            options={statusOptions}
            value={
              statusOptions.find((opt) => opt.value === filters.status) || null
            }
            onChange={handleStatusChange}
            placeholder="Select status..."
            isClearable
          />
        </div>
        <div>
          <label htmlFor="searchFilter" className="form-label">
            Search (Patient Name, Test)
          </label>
          <input
            id="searchFilter"
            type="text"
            value={filters.search}
            onChange={handleSearchChange}
            placeholder="Search..."
            className="form-input w-full"
          />
        </div>
      </div>

      {error && <p className="text-center text-danger-500 py-4">{error}</p>}

      <Table
        columns={columns}
        data={labTests}
        isLoading={isLoading}
        emptyMessage="No lab tests found."
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
    </div>
  );
};

export default LabRequestsPage;
