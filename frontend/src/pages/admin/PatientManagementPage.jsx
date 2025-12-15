// src/pages/admin/PatientManagementPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { useNavigate, Link } from "react-router-dom"; // Import Link
import adminService from "../../services/adminService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Pagination from "../../components/common/Pagination";
import {
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import Avatar from "../../components/common/Avatar";
import {
  getStatusBadgeClass,
  formatDate,
  calculateAge, // Import calculateAge
  formatDateTime, // Import formatDateTime
} from "../../utils/helpers";

// --- NEW: Component to display Patient Details ---
const PatientDetailsView = ({ patient, history, isLoading }) => {
  if (isLoading) return <LoadingSpinner />;
  if (!patient) return <p>No patient details loaded.</p>;

  const { user: patientUser, ...patientProfile } = patient;

  return (
    <div className="space-y-4 text-sm">
      {/* Patient Basic Info */}
      <div className="flex items-center space-x-4 mb-4">
        <Avatar src={patientUser?.image} alt={patientUser?.name} size="lg" />
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {patientUser?.name}
          </h3>
          <p className="text-gray-500">{patientUser?.email}</p>
          <p className="text-gray-500">{patientUser?.phone || "No phone"}</p>
        </div>
      </div>

      {/* Demographics & Status */}
      <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
        <p>
          <strong>Gender:</strong> {patientProfile.gender || "N/A"}
        </p>
        <p>
          <strong>DOB:</strong> {formatDate(patientProfile.dob)} (
          {calculateAge(patientProfile.dob)} yrs)
        </p>
        <p>
          <strong>Blood Group:</strong> {patientProfile.bloodGroup || "N/A"}
        </p>
        <p>
          <strong>Status:</strong>{" "}
          <span
            className={`badge ${getStatusBadgeClass(
              patientUser?.isActive ? "active" : "inactive"
            )}`}
          >
            {patientUser?.isActive ? "Active" : "Inactive"}
          </span>
        </p>
        <p className="col-span-full">
          <strong>Address:</strong>{" "}
          {`${patientProfile.address?.street || ""}, ${
            patientProfile.address?.city || ""
          }, ${patientProfile.address?.state || ""}`}
        </p>
        <p className="col-span-full">
          <strong>Emergency Contact:</strong>{" "}
          {`${patientProfile.emergencyContact?.name || "N/A"} (${
            patientProfile.emergencyContact?.relationship || "N/A"
          }) - ${patientProfile.emergencyContact?.phone || "N/A"}`}
        </p>
        <p className="col-span-full">
          <strong>Registered:</strong>{" "}
          {formatDate(patientProfile.registrationDate)}
        </p>
      </div>

      {/* Medical Info */}
      <div className="border-t pt-4 space-y-1">
        <p>
          <strong>Allergies:</strong>{" "}
          {patientProfile.allergies?.join(", ") || "None reported"}
        </p>
        <p>
          <strong>Chronic Diseases:</strong>{" "}
          {patientProfile.chronicDiseases?.join(", ") || "None reported"}
        </p>
      </div>

      {/* Recent History Summary (Optional) */}
      <div className="border-t pt-4">
        <h4 className="font-medium text-gray-700 mb-2">Recent Activity</h4>
        {history?.appointments?.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-semibold text-gray-600">
              Last Appointment:
            </p>
            <p>
              {formatDateTime(history.appointments[0].dateTime)} with Dr.{" "}
              {history.appointments[0].doctorId?.userId?.name}
            </p>
          </div>
        )}
        {history?.payments?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-600">Last Payment:</p>
            <p>
              {formatDate(history.payments[0].createdAt)} -{" "}
              {history.payments[0].amount} ({history.payments[0].status})
            </p>
          </div>
        )}
        {history?.appointments?.length === 0 &&
          history?.payments?.length === 0 && (
            <p className="text-gray-500 italic">
              No recent appointments or payments found.
            </p>
          )}
      </div>
    </div>
  );
};
// --- End Patient Details View ---

const PatientManagementPage = () => {
  const [patients, setPatients] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const navigate = useNavigate();

  // --- State for Details Modal ---
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPatientDetails, setSelectedPatientDetails] = useState(null);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  // --- End State for Details Modal ---

  const PATIENTS_PER_PAGE = 10;

  const fetchPatients = useCallback(async (page = 1, search = "") => {
    // ... (fetch logic remains the same) ...
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: PATIENTS_PER_PAGE,
        search: search.trim() || undefined,
      };
      const response = await adminService.getAdminPatients(params);
      if (response.success) {
        setPatients(response.patients);
        setPagination(response.pagination);
        setCurrentPage(response.pagination.page);
      } else {
        throw new Error(response.message || "Failed to fetch patients");
      }
    } catch (err) {
      console.error("Fetch patients error:", err);
      setError(err.message || "Could not load patients.");
      toast.error(err.message || "Could not load patients.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // ... (useEffect logic remains the same) ...
    const delayDebounceFn = setTimeout(() => {
      fetchPatients(currentPage, searchTerm);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchPatients, currentPage, searchTerm]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (event) => {
    // ... (search logic remains the same) ...
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleStatusToggle = async (patientId, userId, currentStatus) => {
    // ... (status toggle logic remains the same) ...
    const newStatus = !currentStatus;
    const originalPatients = [...patients];
    setPatients((prev) =>
      prev.map((p) =>
        p._id === patientId
          ? { ...p, userId: { ...(p.userId || {}), isActive: newStatus } }
          : p
      )
    );

    try {
      const response = await adminService.updatePatientStatus(patientId, {
        isActive: newStatus,
      });
      if (response.success) {
        toast.success(`Patient ${newStatus ? "activated" : "deactivated"}`);
      } else {
        setPatients(originalPatients);
        throw new Error(response.message || "Failed to update status");
      }
    } catch (err) {
      setPatients(originalPatients);
      console.error("Patient status update error:", err);
      toast.error(err.message || "Could not update patient status.");
    }
  };

  const handleDeleteClick = (patient) => {
    // ... (delete click logic remains the same) ...
    setPatientToDelete(patient);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    // ... (confirm delete logic remains the same) ...
    if (!patientToDelete) return;
    setIsLoading(true);
    try {
      const response = await adminService.deletePatient(patientToDelete._id);
      if (response.success) {
        toast.success("Patient deleted successfully!");
        fetchPatients(1, searchTerm);
      } else {
        throw new Error(response.message || "Failed to delete patient");
      }
    } catch (err) {
      console.error("Delete patient error:", err);
      toast.error(err.message || "Could not delete patient.");
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
      setPatientToDelete(null);
    }
  };

  // --- Functions for Details Modal ---
  const openPatientDetailModal = async (patientId) => {
    setLoadingDetails(true);
    setIsDetailModalOpen(true);
    setSelectedPatientDetails(null); // Clear previous
    setSelectedPatientHistory(null);
    try {
      const response = await adminService.getAdminPatientDetails(patientId); // Use admin service
      if (response.success) {
        setSelectedPatientDetails(response.patient);
        setSelectedPatientHistory(response.history);
      } else {
        throw new Error(response.message || "Failed to fetch patient details");
      }
    } catch (err) {
      toast.error(err.message || "Could not load patient details.");
      setIsDetailModalOpen(false); // Close modal on error
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedPatientDetails(null);
    setSelectedPatientHistory(null);
  };
  // --- End Functions for Details Modal ---

  const handleViewDetails = (patientId) => {
    // Replace the navigate call with opening the modal
    openPatientDetailModal(patientId);
    // navigate(`/admin/patients/${patientId}`); // Remove or comment out this line
  };

  const columns = useMemo(
    () => [
      // ... (other columns: Name, Email, Phone, Gender, DOB, Status) ...
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
        Header: "DOB",
        accessor: "dob",
        Cell: ({ value }) => formatDate(value) || "N/A",
      },
      {
        Header: "Status",
        accessor: "userId.isActive",
        Cell: ({ value }) => (
          <span
            className={`badge ${getStatusBadgeClass(
              value ? "active" : "inactive"
            )}`}
          >
            {value ? "Active" : "Inactive"}
          </span>
        ),
      },
      {
        Header: "Actions",
        accessor: "_id", // Patient Profile ID
        Cell: ({ row }) => (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewDetails(row.original._id)} // Corrected: Use handler
              title="View Details"
            >
              <EyeIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={
                row.original.userId?.isActive
                  ? "hover:bg-warning-50"
                  : "hover:bg-success-50"
              }
              onClick={() =>
                handleStatusToggle(
                  row.original._id, // Patient Profile ID
                  row.original.userId?._id, // User ID
                  row.original.userId?.isActive
                )
              }
              title={row.original.userId?.isActive ? "Deactivate" : "Activate"}
              disabled={!row.original.userId} // Disable if user data is missing
            >
              {row.original.userId?.isActive ? (
                <XCircleIcon className="h-4 w-4 text-warning-600" />
              ) : (
                <CheckCircleIcon className="h-4 w-4 text-success-600" />
              )}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDeleteClick(row.original)}
              title="Delete"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patients] // Re-render table if patients data changes
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-800">
          Patient Management
        </h1>
        <div className="w-full md:w-1/3">
          <input
            type="text"
            placeholder="Search by Name, Email, Phone..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="form-input w-full" // Use form-input for consistency
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Confirm Deletion"
      >
        {/* ... delete confirmation content ... */}
        <p>
          Are you sure you want to delete the patient "
          {patientToDelete?.userId?.name}"?
        </p>
        <p className="text-sm text-warning-700 mt-1">
          This action will permanently delete the patient profile and their user
          account. This cannot be undone.
        </p>
        <div className="pt-4 flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={confirmDelete}
            isLoading={isLoading}
          >
            Delete
          </Button>
        </div>
      </Modal>

      {/* --- Patient Details Modal --- */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        title="Patient Details"
        size="2xl" // Adjust size
      >
        <PatientDetailsView
          patient={selectedPatientDetails}
          history={selectedPatientHistory}
          isLoading={loadingDetails}
        />
        <div className="pt-4 mt-4 border-t flex justify-end">
          <Button variant="outline" onClick={closeDetailModal}>
            Close
          </Button>
        </div>
      </Modal>
      {/* --- End Patient Details Modal --- */}
    </div>
  );
};

export default PatientManagementPage;
