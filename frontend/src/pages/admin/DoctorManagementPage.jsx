// src/pages/admin/DoctorManagementPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import adminService from "../../services/adminService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Pagination from "../../components/common/Pagination";
import DoctorForm from "../../components/users/DoctorForm";
import { ROLES } from "../../constants";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon, // <-- Import EyeIcon
  BuildingOfficeIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  CurrencyDollarIcon,
  ClockIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import Avatar from "../../components/common/Avatar";
import {
  getStatusBadgeClass,
  formatDate,
  formatCurrency,
} from "../../utils/helpers"; // <-- Import helpers
import useAuth from "../../hooks/useAuth";

// --- NEW: Component to display Doctor Details ---
const DoctorDetailsView = ({ doctor, isLoading }) => {
  if (isLoading) return <LoadingSpinner />;
  if (!doctor) return <p>No doctor details loaded.</p>;

  // Doctor object here contains both user and doctor profile info nested under 'user' and the root
  const { user: doctorUser, ...doctorProfile } = doctor; // Destructure for clarity

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center space-x-4 mb-4">
        <Avatar src={doctorUser?.image} alt={doctorUser?.name} size="lg" />
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {doctorUser?.name}
          </h3>
          <p className="text-primary-600">{doctorProfile.speciality}</p>
          <p className="text-gray-500">
            {doctorUser?.department?.name || "No Department"}
          </p>
        </div>
      </div>
      <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
        <p>
          <strong>Email:</strong> {doctorUser?.email}
        </p>
        <p>
          <strong>Phone:</strong> {doctorUser?.phone || "N/A"}
        </p>
        <p>
          <strong>Status:</strong>{" "}
          <span
            className={`badge ${getStatusBadgeClass(
              doctorUser?.isActive ? "active" : "inactive"
            )}`}
          >
            {doctorUser?.isActive ? "Active" : "Inactive"}
          </span>
        </p>
        <p>
          <strong>Available:</strong>{" "}
          <span
            className={`badge ${getStatusBadgeClass(
              doctorProfile.available ? "active" : "inactive"
            )}`}
          >
            {doctorProfile.available ? "Yes" : "No"}
          </span>
        </p>
        <p>
          <BuildingOfficeIcon className="inline w-4 h-4 mr-1 text-gray-400" />
          <strong>Reg No:</strong> {doctorProfile.registrationNumber}
        </p>
        <p>
          <AcademicCapIcon className="inline w-4 h-4 mr-1 text-gray-400" />
          <strong>Degree:</strong> {doctorProfile.degree}
        </p>
        <p>
          <BriefcaseIcon className="inline w-4 h-4 mr-1 text-gray-400" />
          <strong>Experience:</strong> {doctorProfile.experience}
        </p>
        <p>
          <CurrencyDollarIcon className="inline w-4 h-4 mr-1 text-gray-400" />
          <strong>Fees:</strong> {formatCurrency(doctorProfile.fees)}
        </p>
        <p>
          <ClockIcon className="inline w-4 h-4 mr-1 text-gray-400" />
          <strong>Consult Time:</strong> {doctorProfile.consultationTime} mins
        </p>
        <p className="col-span-full">
          <InformationCircleIcon className="inline w-4 h-4 mr-1 text-gray-400" />
          <strong>About:</strong> {doctorProfile.about || "N/A"}
        </p>
        <p className="col-span-full">
          <strong>Joined:</strong> {formatDate(doctorUser?.createdAt)}
        </p>
      </div>
      {/* Optionally display working hours here */}
    </div>
  );
};
// --- End Doctor Details View ---

const DoctorManagementPage = () => {
  const [doctors, setDoctors] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { user: adminUser } = useAuth();

  // --- State for Details Modal ---
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDoctorDetails, setSelectedDoctorDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  // --- End State for Details Modal ---

  const DOCTORS_PER_PAGE = 10;

  const fetchDoctors = useCallback(async (page = 1) => {
    // ... (fetch logic remains the same) ...
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminService.getDoctors({
        page,
        limit: DOCTORS_PER_PAGE,
        status: "all",
      });
      if (response.success) {
        setDoctors(response.doctors);
        setPagination(response.pagination);
        setCurrentPage(response.pagination.page);
      } else {
        throw new Error(response.message || "Failed to fetch doctors");
      }
    } catch (err) {
      console.error("Fetch doctors error:", err);
      setError(err.message || "Could not load doctors.");
      toast.error(err.message || "Could not load doctors.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors(currentPage);
  }, [fetchDoctors, currentPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleStatusToggle = async (doctorProfileId, userId, currentStatus) => {
    // ... (status toggle logic remains the same) ...
    const newStatus = !currentStatus;
    const originalDoctors = [...doctors];
    setDoctors((prev) =>
      prev.map((doc) =>
        doc.userId === userId ? { ...doc, isActive: newStatus } : doc
      )
    );
    try {
      const response = await adminService.updateDoctor(doctorProfileId, {
        isActive: newStatus,
      });
      if (response.success) {
        toast.success(`Doctor ${newStatus ? "activated" : "deactivated"}`);
      } else {
        setDoctors(originalDoctors);
        throw new Error(response.message || "Failed to update status");
      }
    } catch (err) {
      setDoctors(originalDoctors);
      console.error("Status update error:", err);
      toast.error(err.message || "Could not update doctor status.");
    }
  };

  const handleDeleteClick = (doctor) => {
    // ... (delete click logic remains the same) ...
    setDoctorToDelete(doctor);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    // ... (confirm delete logic remains the same) ...
    if (!doctorToDelete) return;
    setActionLoading(true);
    try {
      const response = await adminService.deleteDoctor(doctorToDelete.id);
      if (response.success) {
        toast.success("Doctor deleted successfully!");
        fetchDoctors(1);
      } else {
        throw new Error(response.message || "Failed to delete doctor");
      }
    } catch (err) {
      console.error("Delete doctor error:", err);
      toast.error(err.message || "Could not delete doctor.");
    } finally {
      setActionLoading(false);
      setShowDeleteConfirm(false);
      setDoctorToDelete(null);
    }
  };

  const openModal = (doctor = null) => {
    // ... (edit/add modal logic remains the same) ...
    const initialData = doctor
      ? {
          _id: doctor.userId,
          name: doctor.name,
          email: doctor.email,
          hospitalId: adminUser?.hospital,
          departmentId: doctor.department?._id || "",
          speciality: doctor.speciality || "",
          degree: doctor.degree || "",
          experience: doctor.experience || "",
          fees: doctor.fees || "",
          about: doctor.about || "",
          registrationNumber: doctor.registrationNumber || "",
        }
      : null;

    setEditingDoctor(initialData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    // ... (edit/add modal close logic remains the same) ...
    setEditingDoctor(null);
    setIsModalOpen(false);
  };

  // --- Functions for Details Modal ---
  const openDoctorDetailModal = async (doctorProfileId) => {
    if (!doctorProfileId) {
      toast.error("Doctor Profile ID is missing.");
      return;
    }
    setLoadingDetails(true);
    setIsDetailModalOpen(true);
    setSelectedDoctorDetails(null); // Clear previous
    try {
      const response = await adminService.getDoctorDetails(doctorProfileId); // Use admin service
      if (response.success) {
        setSelectedDoctorDetails(response.doctor); // The response structure nests details under 'doctor'
      } else {
        throw new Error(response.message || "Failed to fetch doctor details");
      }
    } catch (err) {
      toast.error(err.message || "Could not load doctor details.");
      setIsDetailModalOpen(false); // Close modal on error
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedDoctorDetails(null);
  };
  // --- End Functions for Details Modal ---

  const handleFormSubmit = async (values) => {
    // ... (form submit logic remains the same) ...
    setActionLoading(true);
    try {
      const formData = new FormData();
      Object.keys(values).forEach((key) => {
        if (key === "password" && !values[key] && editingDoctor) return;
        if (values[key] !== null && values[key] !== undefined) {
          formData.append(key, values[key]);
        }
      });

      let response;
      if (editingDoctor?._id) {
        const doctorProfile = doctors.find(
          (d) => d.userId === editingDoctor._id
        );
        if (!doctorProfile?.id)
          throw new Error("Doctor profile ID not found for update.");
        response = await adminService.updateDoctor(doctorProfile.id, formData);
        toast.success("Doctor updated successfully!");
      } else {
        response = await adminService.createDoctor(formData);
        toast.success("Doctor created successfully! Password sent via email.");
      }

      if (response.success) {
        fetchDoctors(editingDoctor?._id ? currentPage : 1);
        closeModal();
      } else {
        throw new Error(response.message || "Failed to save doctor");
      }
    } catch (err) {
      console.error("Save doctor error:", err);
      const errorMsg =
        typeof err === "string"
          ? err
          : err?.error || err?.message || "Could not save doctor.";
      toast.error(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      // ... (other columns remain the same) ...
      {
        Header: "Name",
        accessor: "name",
        Cell: ({ row }) => (
          <div className="flex items-center">
            <Avatar
              src={row.original.image}
              alt={row.original.name}
              size="sm"
              className="mr-3"
            />
            <div className="text-sm font-medium text-gray-900">
              {row.original.name}
            </div>
          </div>
        ),
      },
      { Header: "Email", accessor: "email" },
      {
        Header: "Speciality",
        accessor: "speciality",
        Cell: ({ value }) => value || "-",
      },
      {
        Header: "Department",
        accessor: "department.name",
        Cell: ({ value }) => value || "N/A",
      },
      {
        Header: "Status",
        accessor: "isActive",
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
        accessor: "id", // Doctor Profile ID from the list object
        Cell: ({ row }) => (
          <div className="flex space-x-2">
            {/* View Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDoctorDetailModal(row.original.id)} // <-- Pass Doctor Profile ID
              title="View Details"
            >
              <EyeIcon className="h-4 w-4" />
            </Button>
            {/* Edit Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => openModal(row.original)}
              title="Edit"
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
            {/* Status Toggle Button */}
            <Button
              variant="outline"
              size="sm"
              className={
                row.original.isActive
                  ? "hover:bg-warning-50"
                  : "hover:bg-success-50"
              }
              onClick={() =>
                handleStatusToggle(
                  row.original.id,
                  row.original.userId,
                  row.original.isActive
                )
              }
              title={row.original.isActive ? "Deactivate" : "Activate"}
            >
              {row.original.isActive ? (
                <XCircleIcon className="h-4 w-4 text-warning-600" />
              ) : (
                <CheckCircleIcon className="h-4 w-4 text-success-600" />
              )}
            </Button>
            {/* Delete Button */}
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
    [doctors] // Re-render table if doctors data changes
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">
          Doctor Management
        </h1>
        <Button
          onClick={() => openModal()}
          leftIcon={<PlusIcon className="h-5 w-5 mr-1" />}
        >
          Add Doctor
        </Button>
      </div>
      {error && <p className="text-center text-danger-500">{error}</p>}

      <Table
        columns={columns}
        data={doctors}
        isLoading={isLoading}
        emptyMessage="No doctors found."
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

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingDoctor ? "Edit Doctor" : "Add New Doctor"}
        size="3xl"
      >
        <DoctorForm
          onSubmit={handleFormSubmit}
          initialValues={editingDoctor}
          isLoading={actionLoading}
          hospitalId={adminUser?.hospital}
          onCancel={closeModal}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Confirm Deletion"
      >
        {/* ... delete confirmation content ... */}
        <p>Are you sure you want to delete Dr. {doctorToDelete?.name}?</p>
        <p className="text-sm text-warning-700 mt-1">
          This will delete the doctor's profile and user account. Ensure active
          appointments are handled.
        </p>
        <div className="pt-4 flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={confirmDelete}
            isLoading={actionLoading}
          >
            Delete
          </Button>
        </div>
      </Modal>

      {/* --- Doctor Details Modal --- */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        title="Doctor Details"
        size="xl" // Adjust size
      >
        <DoctorDetailsView
          doctor={selectedDoctorDetails}
          isLoading={loadingDetails}
        />
        <div className="pt-4 mt-4 border-t flex justify-end">
          <Button variant="outline" onClick={closeDetailModal}>
            Close
          </Button>
        </div>
      </Modal>
      {/* --- End Doctor Details Modal --- */}
    </div>
  );
};

export default DoctorManagementPage;
