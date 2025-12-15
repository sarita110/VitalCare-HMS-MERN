// src/pages/admin/AppointmentsManagementPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import adminService from "../../services/adminService"; //
import LoadingSpinner from "../../components/common/LoadingSpinner"; //
import Table from "../../components/common/Table"; //
import Button from "../../components/common/Button"; //
import Modal from "../../components/common/Modal"; //
import Pagination from "../../components/common/Pagination"; //
import { XMarkIcon, EyeIcon } from "@heroicons/react/24/outline";
import {
  formatDateTime,
  getStatusBadgeClass,
  getDisplayStatus,
} from "../../utils/helpers"; // [cite: 3044-3058, 3059-3065]
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import FormInput from "../../components/common/FormInput"; //

const AppointmentsManagementPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [doctors, setDoctors] = useState([]); // For filtering
  const [filters, setFilters] = useState({
    status: "",
    dateFrom: "",
    dateTo: "",
    doctorId: "",
  });

  const APPOINTMENTS_PER_PAGE = 10;
  const navigate = useNavigate();

  // Fetch doctors for filter dropdown
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const response = await adminService.getDoctors({
          limit: 500,
          status: "active",
        }); // Fetch active doctors [cite: 3108]
        if (response.success) {
          setDoctors(
            response.doctors.map((doc) => ({ value: doc.id, label: doc.name }))
          );
        }
      } catch (err) {
        console.error("Failed to fetch doctors for filter:", err);
      }
    };
    fetchDocs();
  }, []);

  const fetchAppointments = useCallback(async (page = 1, currentFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: APPOINTMENTS_PER_PAGE,
        ...currentFilters, // Spread the current filter values
      };
      // Remove empty filters
      Object.keys(params).forEach((key) => !params[key] && delete params[key]);

      const response = await adminService.getAdminAppointments(params); // [cite: 3117]
      if (response.success) {
        setAppointments(response.appointments);
        setPagination(response.pagination);
        setCurrentPage(response.pagination.page);
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
  }, []);

  // Fetch appointments initially and when page or filters change
  useEffect(() => {
    fetchAppointments(currentPage, filters);
  }, [fetchAppointments, currentPage, filters]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleDoctorFilterChange = (selectedOption) => {
    setFilters((prev) => ({
      ...prev,
      doctorId: selectedOption ? selectedOption.value : "",
    }));
  };

  const handleCancelClick = (appointment) => {
    setAppointmentToCancel(appointment);
    setCancelReason(""); // Reset reason
    setShowCancelConfirm(true);
  };

  const confirmCancel = async () => {
    if (!appointmentToCancel) return;
    setIsLoading(true); // Consider separate loading state
    try {
      const response = await adminService.cancelAdminAppointment(
        appointmentToCancel._id,
        { reason: cancelReason }
      ); // [cite: 3118]
      if (response.success) {
        toast.success("Appointment cancelled successfully!");
        fetchAppointments(currentPage, filters); // Refresh list
      } else {
        throw new Error(response.message || "Failed to cancel appointment");
      }
    } catch (err) {
      console.error("Cancel appointment error:", err);
      toast.error(err.message || "Could not cancel appointment.");
    } finally {
      setIsLoading(false);
      setShowCancelConfirm(false);
      setAppointmentToCancel(null);
    }
  };

  const handleViewDetails = (appointmentId) => {
    // Admin might have a different detail view, adjust path if needed
    navigate(`/admin/appointments/${appointmentId}`);
    // Or use a generic appointment detail route if applicable
    // navigate(`/appointments/${appointmentId}`);
  };

  const columns = useMemo(
    () => [
      {
        Header: "Patient",
        accessor: "patientId.userId.name",
        Cell: ({ value }) => value || "N/A",
      },
      {
        Header: "Doctor",
        accessor: "doctorId.userId.name",
        Cell: ({ value }) => value || "N/A",
      },
      {
        Header: "Date & Time",
        accessor: "dateTime",
        Cell: ({ value }) => formatDateTime(value),
      },
      {
        Header: "Reason",
        accessor: "reason",
        Cell: ({ value }) => (
          <span className="truncate block w-32" title={value}>
            {value}
          </span>
        ),
      },
      {
        Header: "Type",
        accessor: "type",
        Cell: ({ value }) => getDisplayStatus(value),
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
          <span className={`badge ${getStatusBadgeClass(value)}`}>
            {getDisplayStatus(value)}
          </span>
        ),
      },
      {
        Header: "Actions",
        accessor: "_id",
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
            {/* Allow cancellation only for certain statuses */}
            {["scheduled", "confirmed"].includes(row.original.status) && (
              <Button
                variant="warning"
                size="sm"
                onClick={() => handleCancelClick(row.original)}
                title="Cancel Appointment"
              >
                <XMarkIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [handleCancelClick, handleViewDetails]
  ); // Add handleViewDetails

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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">
          Appointment Management
        </h1>
        {/* Add Appointment button might belong to Receptionist panel */}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-white rounded shadow">
        <FormInput
          label="Date From"
          type="date"
          name="dateFrom"
          value={filters.dateFrom}
          onChange={handleFilterChange}
        />
        <FormInput
          label="Date To"
          type="date"
          name="dateTo"
          value={filters.dateTo}
          onChange={handleFilterChange}
          min={filters.dateFrom || undefined}
        />
        <div>
          <label htmlFor="statusFilter" className="form-label">
            Status
          </label>
          <Select
            id="statusFilter"
            name="status"
            options={statusOptions}
            value={
              statusOptions.find((opt) => opt.value === filters.status) || null
            }
            onChange={(option) =>
              setFilters((prev) => ({
                ...prev,
                status: option ? option.value : "",
              }))
            }
            placeholder="Filter by status..."
            isClearable
          />
        </div>
        <div>
          <label htmlFor="doctorFilter" className="form-label">
            Doctor
          </label>
          <Select
            id="doctorFilter"
            name="doctorId"
            options={doctors}
            isLoading={!doctors.length} // Crude loading indicator
            value={
              doctors.find((opt) => opt.value === filters.doctorId) || null
            }
            onChange={handleDoctorFilterChange}
            placeholder="Filter by doctor..."
            isClearable
          />
        </div>
      </div>

      {error && <p className="text-center text-danger-500">{error}</p>}

      <Table columns={columns} data={appointments} isLoading={isLoading} />

      {pagination && pagination.totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={pagination.pages}
          onPageChange={handlePageChange}
          itemsPerPage={pagination.limit}
          totalItems={pagination.total}
        />
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        title="Confirm Cancellation"
      >
        <p>Are you sure you want to cancel this appointment?</p>
        <FormInput
          label="Reason for Cancellation (Optional)"
          id="cancelReason"
          name="cancelReason"
          type="textarea"
          rows={2}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          className="mt-2"
        />
        <div className="pt-4 flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>
            Back
          </Button>
          <Button
            variant="warning"
            onClick={confirmCancel}
            isLoading={isLoading}
          >
            Confirm Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AppointmentsManagementPage;
