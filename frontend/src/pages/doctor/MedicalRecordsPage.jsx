// pages/doctor/MedicalRecordsPage.jsx

import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import doctorService from "../../services/doctorService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Table from "../../components/common/Table";
import Pagination from "../../components/common/Pagination";
import FormInput from "../../components/common/FormInput";
import { formatDate } from "../../utils/helpers";
import { Link } from "react-router-dom";
import Select from "react-select";
import { EyeIcon, CalendarIcon } from "@heroicons/react/24/outline";
import Button from "../../components/common/Button";

const MedicalRecordsPage = () => {
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    type: "",
    patientId: "",
    search: "",
  });

  const RECORDS_PER_PAGE = 15;

  const fetchMedicalRecords = useCallback(async (page = 1, currentFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: RECORDS_PER_PAGE,
        type: currentFilters.type || undefined,
        patientId: currentFilters.patientId || undefined,
        search: currentFilters.search || undefined,
      };

      // Get medical records created by this doctor
      const response = await doctorService.getPatientMedicalRecords(params);

      if (response.success) {
        setMedicalRecords(response.medicalRecords);
        setPagination(response.pagination);
        setCurrentPage(response.pagination.page);
      } else {
        throw new Error(response.message || "Failed to fetch medical records");
      }
    } catch (err) {
      console.error("Fetch medical records error:", err);
      setError(err.message || "Could not load medical records.");
      toast.error(err.message || "Could not load medical records.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedicalRecords(currentPage, filters);
  }, [fetchMedicalRecords, currentPage, filters]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleTypeChange = (selectedOption) => {
    setFilters((prev) => ({
      ...prev,
      type: selectedOption ? selectedOption.value : "",
    }));
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setFilters((prev) => ({
      ...prev,
      search: value,
    }));
    setCurrentPage(1);
  };

  const typeOptions = [
    { value: "", label: "All Types" },
    { value: "diagnosis", label: "Diagnosis" },
    { value: "surgery", label: "Surgery" },
    { value: "follow-up", label: "Follow-up" },
    { value: "other", label: "Other" },
  ];

  const columns = useMemo(
    () => [
      {
        Header: "Patient",
        accessor: "patientId.userId.name",
        Cell: ({ value }) => value || "N/A",
      },
      {
        Header: "Type",
        accessor: "type",
        Cell: ({ value }) => (
          <span className="capitalize">{value || "N/A"}</span>
        ),
      },
      {
        Header: "Date",
        accessor: "date",
        Cell: ({ value }) => formatDate(value),
      },
      {
        Header: "Diagnosis",
        accessor: "diagnosis",
        Cell: ({ value }) => value || "N/A",
      },
      {
        Header: "Lab Tests",
        accessor: "labTests",
        Cell: ({ value }) => (value && value.length > 0 ? value.length : "0"),
      },
      {
        Header: "Radiology Tests",
        accessor: "radiologyTests",
        Cell: ({ value }) => (value && value.length > 0 ? value.length : "0"),
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
            {row.original.appointmentId && row.original.appointmentId._id && (
              <Link
                to={`/doctor/appointments/${row.original.appointmentId._id}`}
                title="View Appointment"
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
      <h1 className="text-2xl font-semibold text-gray-800">Medical Records</h1>

      {/* Filters */}
      <div className="p-4 bg-white rounded shadow grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="typeFilter" className="form-label">
            Filter by Type
          </label>
          <Select
            id="typeFilter"
            name="type"
            options={typeOptions}
            value={
              typeOptions.find((opt) => opt.value === filters.type) || null
            }
            onChange={handleTypeChange}
            placeholder="Select type..."
            isClearable
          />
        </div>
        <div>
          <label htmlFor="search" className="form-label">
            Search
          </label>
          <FormInput
            id="search"
            name="search"
            placeholder="Search patients or diagnosis..."
            value={filters.search}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {error && <p className="text-center text-danger-500 py-4">{error}</p>}

      <Table
        columns={columns}
        data={medicalRecords}
        isLoading={isLoading}
        emptyMessage="No medical records found."
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

export default MedicalRecordsPage;
