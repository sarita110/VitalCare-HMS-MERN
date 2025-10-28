// src/pages/doctor/AppointmentsPage.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
} from "react";
import toast from "react-hot-toast";
import { useSearchParams, Link } from "react-router-dom";
import doctorService from "../../services/doctorService"; //
import AuthContext from "../../context/AuthContext";
import LoadingSpinner from "../../components/common/LoadingSpinner"; //
import AppointmentList from "../../components/appointments/AppointmentList"; //
import Pagination from "../../components/common/Pagination"; //
import FormInput from "../../components/common/FormInput"; //
import Table from "../../components/common/Table";
import Button from "../../components/common/Button"; //
import {
  formatDate,
  formatCurrency,
  getStatusBadgeClass,
  getDisplayStatus,
  formatDateTime,
} from "../../utils/helpers"; //
import { EyeIcon } from "@heroicons/react/24/outline";
import Select from "react-select";

const AppointmentsPage = () => {
  const { user } = useContext(AuthContext);
  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Manage state from URL params
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const currentStatus = searchParams.get("status") || "";
  const currentDate = searchParams.get("date") || ""; // Expects YYYY-MM-DD
  const currentSortBy = searchParams.get("sortBy") || "dateTime";
  const currentSortOrder = searchParams.get("sortOrder") || "asc"; // 'asc' for upcoming, 'desc' for past?

  const APPOINTMENTS_PER_PAGE = 15;

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        limit: APPOINTMENTS_PER_PAGE,
        status: currentStatus || undefined,
        date: currentDate || undefined,
        sortBy: currentSortBy,
        sortOrder: currentSortOrder,
      };
      // Remove undefined keys before sending
      Object.keys(params).forEach(
        (key) => params[key] === undefined && delete params[key]
      );

      const response = await doctorService.getDoctorAppointments(params); //
      if (response.success) {
        setAppointments(response.appointments);
        setPagination(response.pagination);
      } else {
        throw new Error(response.message || "Failed to fetch appointments");
      }
    } catch (err) {
      console.error("Fetch appointments error:", err);
      setError(err.message || "Could not load appointments.");
      toast.error(err.message || "Could not load appointments.");
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    currentStatus,
    currentDate,
    currentSortBy,
    currentSortOrder,
  ]); // Dependencies for useCallback

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]); // Fetch when dependencies change

  // --- Define Columns using useMemo ---
  const columns = useMemo(
    () => [
      {
        Header: "Date & Time",
        accessor: "dateTime",
        Cell: ({ value }) => formatDateTime(value),
      },
      {
        Header: "Patient",
        accessor: "patientId.userId.name", // Access nested data
        Cell: ({ row }) => (
          <Link
            to={`/doctor/patients/${row.original.patientId?._id}`}
            className="text-primary-600 hover:underline"
          >
            {row.original.patientId?.userId?.name || "N/A"}
          </Link>
        ),
      },
      {
        Header: "Reason",
        accessor: "reason",
        Cell: ({ value }) => value || "-",
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
        Header: "Payment",
        accessor: "payment.status",
        Cell: ({ value }) => (
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadgeClass(
              value
            )} text-white`}
          >
            {getDisplayStatus(value || "N/A")}
          </span>
        ),
      },
      {
        Header: "Actions",
        accessor: "_id", // Use appointment ID
        Cell: ({ row }) => {
          const appointment = row.original;
          // Allow viewing details only if NOT scheduled (i.e., confirmed, completed, etc.)
          const canViewDetails = appointment.status !== "scheduled";

          return (
            <div className="flex space-x-2">
              <Link to={`/doctor/appointments/${appointment._id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canViewDetails} // Disable if status is 'scheduled'
                  title={
                    !canViewDetails
                      ? "Details available after confirmation"
                      : "View Details"
                  }
                >
                  <EyeIcon className="h-4 w-4" />
                </Button>
              </Link>
              {/* Add other actions like cancel/complete later if needed */}
            </div>
          );
        },
      },
    ],
    [] // Dependencies for useMemo (empty if no external state needed inside)
  );

  const handlePageChange = (page) => {
    setSearchParams(
      (prev) => {
        prev.set("page", page.toString());
        return prev;
      },
      { replace: true }
    );
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(
      (prev) => {
        if (value) {
          prev.set(name, value);
        } else {
          prev.delete(name);
        }
        prev.set("page", "1"); // Reset to page 1 on filter change
        return prev;
      },
      { replace: true }
    );
  };

  const handleStatusChange = (selectedOption) => {
    setSearchParams(
      (prev) => {
        if (selectedOption) {
          prev.set("status", selectedOption.value);
        } else {
          prev.delete("status");
        }
        prev.set("page", "1"); // Reset to page 1
        return prev;
      },
      { replace: true }
    );
  };

  // Example sort options - adjust as needed
  const sortOptions = [
    { value: "dateTime", label: "Date/Time" },
    // Add other sort options like patient name if backend supports it
  ];

  const orderOptions = [
    { value: "asc", label: "Ascending" },
    { value: "desc", label: "Descending" },
  ];

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "scheduled", label: "Scheduled" },
    { value: "confirmed", label: "Confirmed" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "no-show", label: "No-show" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">My Appointments</h1>

      {/* Filter and Sort Controls */}
      <div className="p-4 bg-white rounded shadow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <FormInput
          label="Filter by Date"
          type="date"
          name="date"
          value={currentDate}
          onChange={handleFilterChange}
        />
        <div>
          <label htmlFor="statusFilter" className="form-label">
            Filter by Status
          </label>
          <Select
            id="statusFilter"
            name="status"
            options={statusOptions}
            value={
              statusOptions.find((opt) => opt.value === currentStatus) || null
            }
            onChange={handleStatusChange}
            placeholder="Select status..."
            isClearable
          />
        </div>
        {/* Add Sort Controls if needed */}
      </div>

      {error && <p className="text-center text-danger-500 py-4">{error}</p>}

      {/* Use the Table component */}
      <Table
        columns={columns}
        data={appointments}
        isLoading={isLoading}
        emptyMessage="No appointments found matching criteria."
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

export default AppointmentsPage;
