// src/pages/doctor/PatientsPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import doctorService from "../../services/doctorService"; //
import LoadingSpinner from "../../components/common/LoadingSpinner"; //
import Table from "../../components/common/Table"; //
import Button from "../../components/common/Button"; //
import Pagination from "../../components/common/Pagination"; //
import Avatar from "../../components/common/Avatar"; //
import { EyeIcon } from "@heroicons/react/24/outline";
import { formatDate } from "../../utils/helpers"; //

const PatientsPage = () => {
  const [patients, setPatients] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const PATIENTS_PER_PAGE = 15;

  const fetchPatients = useCallback(async (page = 1, search = "") => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: PATIENTS_PER_PAGE,
        search: search.trim() || undefined,
      };
      const response = await doctorService.getDoctorPatients(params); // Fetches patients treated by this doctor
      if (response.success) {
        setPatients(response.patients);
        setPagination(response.pagination);
        setCurrentPage(response.pagination.page);
      } else {
        throw new Error(response.message || "Failed to fetch patients");
      }
    } catch (err) {
      console.error("Fetch doctor's patients error:", err);
      setError(err.message || "Could not load patients.");
      toast.error(err.message || "Could not load patients.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch patients initially and when page or search term changes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPatients(currentPage, searchTerm);
    }, 500); // Debounce search requests

    return () => clearTimeout(delayDebounceFn);
  }, [fetchPatients, currentPage, searchTerm]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleViewDetails = (patientId) => {
    navigate(`/doctor/patients/${patientId}`); // Navigate to detail view
  };

  const columns = useMemo(
    () => [
      {
        Header: "Name",
        accessor: "userId.name",
        Cell: ({ row }) => (
          <div className="flex items-center">
            <Avatar
              src={row.original.userId?.image}
              alt={row.original.userId?.name}
              size="sm"
              className="mr-3"
            />
            <div className="text-sm font-medium text-gray-900">
              {row.original.userId?.name || "N/A"}
            </div>
          </div>
        ),
      },
      {
        Header: "Email",
        accessor: "userId.email",
        Cell: ({ value }) => value || "N/A",
      },
      {
        Header: "Phone",
        accessor: "userId.phone",
        Cell: ({ value }) => value || "N/A",
      },
      {
        Header: "Gender",
        accessor: "gender",
        Cell: ({ value }) => value || "N/A",
      },
      {
        Header: "# Appointments",
        accessor: "appointmentsCount",
        Cell: ({ value }) => value ?? 0,
      },
      {
        Header: "Last Visit",
        accessor: "lastAppointment",
        Cell: ({ value }) => formatDate(value) || "N/A",
      },
      {
        Header: "Actions",
        accessor: "_id", // Use Patient ID
        Cell: ({ row }) => (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewDetails(row.original._id)}
              title="View Details"
            >
              <EyeIcon className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [handleViewDetails]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-800">My Patients</h1>
        <div className="w-full md:w-1/3">
          <input
            type="text"
            placeholder="Search by Name or Email..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 w-full"
          />
        </div>
      </div>

      {error && <p className="text-center text-danger-500 py-4">{error}</p>}

      <Table
        columns={columns}
        data={patients}
        isLoading={isLoading}
        emptyMessage="No patients found."
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

export default PatientsPage;
