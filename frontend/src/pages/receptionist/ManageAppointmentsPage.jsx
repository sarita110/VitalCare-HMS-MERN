// src/pages/receptionist/ManageAppointmentsPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import receptionistService from "../../services/receptionistService"; //
import LoadingSpinner from "../../components/common/LoadingSpinner"; //
import Table from "../../components/common/Table"; //
import Button from "../../components/common/Button"; //
import Modal from "../../components/common/Modal"; //
import Pagination from "../../components/common/Pagination"; //
import FormInput from "../../components/common/FormInput"; //
import { XMarkIcon, PencilIcon, EyeIcon } from "@heroicons/react/24/outline";
import {
  formatDateTime,
  getStatusBadgeClass,
  getDisplayStatus,
} from "../../utils/helpers"; // [cite: 3044-3058, 3059-3065]
import Select from "react-select";
import { useFormik } from "formik";
import * as Yup from "yup";

// Basic schema for editing notes/status
const appointmentUpdateSchema = Yup.object({
  notes: Yup.string().optional().nullable(),
  status: Yup.string()
    .oneOf(["scheduled", "confirmed", "no-show"], "Invalid status update")
    .required(), // Receptionist might confirm or mark no-show
  // Rescheduling might require more fields (dateTime)
});

const ManageAppointmentsPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [actionLoading, setActionLoading] = useState(false); // For modal actions

  const [doctors, setDoctors] = useState([]); // For filtering
  const [filters, setFilters] = useState({
    status: "",
    date: "",
    doctorId: "",
    search: "",
  });

  const APPOINTMENTS_PER_PAGE = 15;

  // Fetch doctors for filter
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        // Use receptionist service to get doctors in their hospital
        const response = await receptionistService.getDoctorsForReceptionist({
          limit: 500,
        }); //
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
        status: currentFilters.status || undefined,
        date: currentFilters.date || undefined,
        doctorId: currentFilters.doctorId || undefined,
        search: currentFilters.search.trim() || undefined,
      };
      const response = await receptionistService.getReceptionistAppointments(
        params
      ); //
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

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchAppointments(currentPage, filters);
    }, 500); // Debounce search/filter changes

    return () => clearTimeout(delayDebounceFn);
  }, [fetchAppointments, currentPage, filters]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1); // Reset to page 1 on filter change
  };

  const handleSelectFilterChange = (name, selectedOption) => {
    setFilters((prev) => ({
      ...prev,
      [name]: selectedOption ? selectedOption.value : "",
    }));
    setCurrentPage(1); // Reset page
  };

  // --- Cancel Logic ---
  const handleCancelClick = (appointment) => {
    setAppointmentToCancel(appointment);
    setCancelReason("");
    setShowCancelConfirm(true);
  };

  const confirmCancel = async () => {
    if (!appointmentToCancel) return;
    setActionLoading(true);
    try {
      const response = await receptionistService.cancelReceptionistAppointment(
        appointmentToCancel._id,
        { reason: cancelReason }
      ); //
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
      setActionLoading(false);
      setShowCancelConfirm(false);
      setAppointmentToCancel(null);
    }
  };

  // --- Edit Logic (Status/Notes) ---
  const formik = useFormik({
    initialValues: { status: "", notes: "" },
    validationSchema: appointmentUpdateSchema,
    onSubmit: async (values) => {
      if (!editingAppointment) return;
      setActionLoading(true);
      try {
        // Use updateAppointment endpoint
        const response =
          await receptionistService.updateReceptionistAppointment(
            editingAppointment._id,
            values
          ); //
        if (response.success) {
          toast.success("Appointment updated successfully!");
          fetchAppointments(currentPage, filters); // Refresh
          closeEditModal();
        } else {
          throw new Error(response.message || "Failed to update appointment");
        }
      } catch (err) {
        console.error("Update appointment error:", err);
        toast.error(err.message || "Could not update appointment.");
      } finally {
        setActionLoading(false);
      }
    },
    enableReinitialize: true,
  });

  const openEditModal = (appointment) => {
    setEditingAppointment(appointment);
    formik.setValues({
      status: appointment.status || "",
      notes: appointment.notes || "",
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setEditingAppointment(null);
    setShowEditModal(false);
    formik.resetForm();
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
      }, // Display payment status
      {
        Header: "Booked By",
        accessor: "createdBy.name",
        Cell: ({ value, row }) =>
          `${value || "N/A"} (${getDisplayStatus(
            row.original.createdBy?.role || ""
          )})`,
      },
      {
        Header: "Actions",
        accessor: "_id",
        Cell: ({ row }) => (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditModal(row.original)}
              title="Edit Status/Notes"
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
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
            {/* Link to process payment if cash & pending */}
            {row.original.payment?.status === "pending" &&
              row.original.payment?.method === "cash" && (
                <Link to="/receptionist/payments">
                  <Button
                    variant="success"
                    size="sm"
                    title="Process Cash Payment"
                  >
                    <CurrencyDollarIcon className="h-4 w-4" />
                  </Button>
                </Link>
              )}
          </div>
        ),
      },
    ],
    [openEditModal, handleCancelClick]
  ); // Dependencies for actions

  const statusOptions = [
    // Options for filtering and editing
    { value: "", label: "All Statuses" },
    { value: "scheduled", label: "Scheduled" },
    { value: "confirmed", label: "Confirmed" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "no-show", label: "No-show" },
  ];
  const editStatusOptions = statusOptions.filter((opt) =>
    ["scheduled", "confirmed", "no-show"].includes(opt.value)
  ); // Receptionist might only set these

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">
        Manage Appointments
      </h1>

      {/* Filters */}
      <div className="p-4 bg-white rounded shadow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <FormInput
          label="Filter by Date"
          type="date"
          name="date"
          value={filters.date}
          onChange={handleFilterChange}
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
            onChange={(opt) => handleSelectFilterChange("status", opt)}
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
            value={
              doctors.find((opt) => opt.value === filters.doctorId) || null
            }
            onChange={(opt) => handleSelectFilterChange("doctorId", opt)}
            placeholder="Filter by doctor..."
            isClearable
            isLoading={!doctors.length}
          />
        </div>
        <FormInput
          label="Search Patient/Reason"
          type="search"
          name="search"
          value={filters.search}
          onChange={handleFilterChange}
          placeholder="Patient name or reason..."
        />
      </div>

      {error && <p className="text-center text-danger-500 py-4">{error}</p>}

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

      {/* Edit Appointment Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={closeEditModal}
        title="Update Appointment"
      >
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <p className="text-sm">
            Patient:{" "}
            <strong>{editingAppointment?.patientId?.userId?.name}</strong>
          </p>
          <p className="text-sm">
            Doctor:{" "}
            <strong>Dr. {editingAppointment?.doctorId?.userId?.name}</strong>
          </p>
          <p className="text-sm">
            Time:{" "}
            <strong>{formatDateTime(editingAppointment?.dateTime)}</strong>
          </p>
          <div>
            <label htmlFor="status" className="form-label">
              Update Status <span className="text-danger-600">*</span>
            </label>
            <Select
              id="status"
              name="status"
              options={editStatusOptions} // Receptionist can confirm or mark no-show
              value={
                editStatusOptions.find(
                  (opt) => opt.value === formik.values.status
                ) || null
              }
              onChange={(option) =>
                formik.setFieldValue("status", option ? option.value : "")
              }
              onBlur={formik.handleBlur}
              classNamePrefix="react-select"
            />
            {formik.touched.status && formik.errors.status ? (
              <p className="form-error">{formik.errors.status}</p>
            ) : null}
          </div>
          <FormInput
            label="Notes (Optional)"
            id="notes"
            name="notes"
            type="textarea"
            rows={3}
            {...formik.getFieldProps("notes")}
            error={formik.errors.notes}
            touched={formik.touched.notes}
          />
          <div className="pt-4 flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={closeEditModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={actionLoading}
              disabled={actionLoading || !formik.isValid}
            >
              Update Appointment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        title="Confirm Cancellation"
      >
        <p>
          Are you sure you want to cancel the appointment for{" "}
          <strong>{appointmentToCancel?.patientId?.userId?.name}</strong> with
          Dr. {appointmentToCancel?.doctorId?.userId?.name}?
        </p>
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
            isLoading={actionLoading}
          >
            Confirm Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default ManageAppointmentsPage;
