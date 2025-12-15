// src/pages/superAdmin/UserManagementPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import superAdminService from "../../services/superAdminService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Pagination from "../../components/common/Pagination";
import AdminForm from "../../components/users/AdminForm";
import FormInput from "../../components/common/FormInput";
import Select from "react-select";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon, // <-- Import EyeIcon
} from "@heroicons/react/24/outline";
import Avatar from "../../components/common/Avatar";
import { getStatusBadgeClass, formatDate } from "../../utils/helpers"; // <-- Import formatDate

// --- NEW: Component to display Admin Details in Modal ---
const AdminDetailsView = ({ admin, isLoading }) => {
  if (isLoading) {
    return <LoadingSpinner />;
  }
  if (!admin) {
    return <p>No admin details loaded.</p>;
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center space-x-4 mb-4">
        <Avatar src={admin.image} alt={admin.name} size="lg" />
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{admin.name}</h3>
          <p className="text-gray-500">{admin.email}</p>
        </div>
      </div>
      <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
        <p>
          <strong>Role:</strong> {admin.role}
        </p>
        <p>
          <strong>Hospital:</strong> {admin.hospital?.name || "N/A"}
        </p>
        <p>
          <strong>Status:</strong>{" "}
          <span
            className={`badge ${getStatusBadgeClass(
              admin.isActive ? "active" : "inactive"
            )}`}
          >
            {admin.isActive ? "Active" : "Inactive"}
          </span>
        </p>
        <p>
          <strong>Verified:</strong>{" "}
          {admin.isVerified ? (
            <CheckCircleIcon className="h-5 w-5 inline text-success-500" />
          ) : (
            <XCircleIcon className="h-5 w-5 inline text-gray-400" />
          )}
        </p>
        <p className="col-span-full">
          <strong>Registered:</strong> {formatDate(admin.createdAt)}
        </p>
      </div>
    </div>
  );
};
// --- END NEW COMPONENT ---

const UserManagementPage = () => {
  const [admins, setAdmins] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // --- State for Details Modal ---
  const [isAdminDetailModalOpen, setIsAdminDetailModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [loadingAdminDetails, setLoadingAdminDetails] = useState(false);
  // --- End State for Details Modal ---

  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    hospitalId: "",
  });

  const ADMINS_PER_PAGE = 10;

  useEffect(() => {
    const fetchHospitalsList = async () => {
      setLoadingHospitals(true);
      try {
        const response = await superAdminService.getHospitals({
          limit: 500,
          status: "active",
        });
        if (response.success) {
          setHospitals(
            response.hospitals.map((h) => ({ value: h._id, label: h.name }))
          );
        } else {
          throw new Error(response.message || "Failed to fetch hospitals");
        }
      } catch (err) {
        console.error("Failed to fetch hospitals for filter:", err);
        toast.error("Could not load hospital list.");
      } finally {
        setLoadingHospitals(false);
      }
    };
    fetchHospitalsList();
  }, []);

  const fetchAdmins = useCallback(async (page = 1, currentFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: ADMINS_PER_PAGE,
        search: currentFilters.search.trim() || undefined,
        status: currentFilters.status || undefined,
        hospitalId: currentFilters.hospitalId || undefined,
      };
      const response = await superAdminService.getHospitalAdmins(params);
      if (response.success) {
        setAdmins(response.admins);
        setPagination(response.pagination);
        setCurrentPage(response.pagination.page);
      } else {
        throw new Error(response.message || "Failed to fetch hospital admins");
      }
    } catch (err) {
      console.error("Fetch admins error:", err);
      setError(err.message || "Could not load hospital admins.");
      toast.error(err.message || "Could not load hospital admins.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchAdmins(currentPage, filters);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchAdmins, currentPage, filters]);

  const handlePageChange = (page) => setCurrentPage(page);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const handleSelectFilterChange = (name, selectedOption) => {
    setFilters((prev) => ({
      ...prev,
      [name]: selectedOption ? selectedOption.value : "",
    }));
    setCurrentPage(1);
  };

  const handleStatusToggle = async (adminUserId, currentStatus) => {
    const newStatus = !currentStatus;
    const originalAdmins = [...admins];
    setAdmins((prev) =>
      prev.map((admin) =>
        admin._id === adminUserId ? { ...admin, isActive: newStatus } : admin
      )
    );
    try {
      const response = await superAdminService.updateHospitalAdminStatus(
        adminUserId,
        { isActive: newStatus }
      );
      if (response.success) {
        toast.success(`Admin ${newStatus ? "activated" : "deactivated"}`);
      } else {
        setAdmins(originalAdmins);
        throw new Error(response.message || "Failed to update status");
      }
    } catch (err) {
      setAdmins(originalAdmins);
      console.error("Admin status update error:", err);
      toast.error(err.message || "Could not update admin status.");
    }
  };

  const handleDeleteClick = (admin) => {
    setAdminToDelete(admin);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!adminToDelete) return;
    setActionLoading(true);
    try {
      const response = await superAdminService.deleteHospitalAdmin(
        adminToDelete._id
      );
      if (response.success) {
        toast.success("Hospital Admin deleted successfully!");
        fetchAdmins(1, filters);
      } else {
        throw new Error(response.message || "Failed to delete admin");
      }
    } catch (err) {
      console.error("Delete admin error:", err);
      toast.error(err.message || "Could not delete admin.");
    } finally {
      setActionLoading(false);
      setShowDeleteConfirm(false);
      setAdminToDelete(null);
    }
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  // --- Functions for Details Modal ---
  const openAdminDetailModal = async (adminUserId) => {
    setLoadingAdminDetails(true);
    setIsAdminDetailModalOpen(true);
    setSelectedAdmin(null); // Clear previous
    try {
      const response = await superAdminService.getHospitalAdminDetails(
        adminUserId
      );
      if (response.success) {
        setSelectedAdmin(response.admin);
      } else {
        throw new Error(response.message || "Failed to fetch admin details");
      }
    } catch (err) {
      toast.error(err.message || "Could not load admin details.");
      setIsAdminDetailModalOpen(false); // Close modal on error
    } finally {
      setLoadingAdminDetails(false);
    }
  };

  const closeAdminDetailModal = () => {
    setIsAdminDetailModalOpen(false);
    setSelectedAdmin(null);
  };
  // --- End Functions for Details Modal ---

  const handleAdminFormSubmit = async (formData) => {
    if (!formData) {
      closeModal();
      return;
    }
    setActionLoading(true);
    try {
      const response = await superAdminService.createHospitalAdmin({
        name: formData.name,
        email: formData.email,
        hospitalId: formData.hospitalId,
      });
      if (response.success) {
        toast.success(
          "Hospital Admin created successfully! Credentials sent via email."
        );
        fetchAdmins(1, filters);
        closeModal();
      } else {
        throw new Error(response.message || "Failed to create admin");
      }
    } catch (err) {
      console.error("Save admin error:", err);
      toast.error(err.message || "Could not save admin.");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      // ... other columns (Name, Email, Hospital, Status, Verified) ...
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
        Header: "Hospital",
        accessor: "hospital.name",
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
        Header: "Verified",
        accessor: "isVerified",
        Cell: ({ value }) =>
          value ? (
            <CheckCircleIcon
              className="h-5 w-5 text-success-500"
              title="Verified"
            />
          ) : (
            <XCircleIcon
              className="h-5 w-5 text-gray-400"
              title="Not Verified"
            />
          ),
      },
      {
        Header: "Actions",
        accessor: "_id", // Admin's User ID
        Cell: ({ row }) => (
          <div className="flex space-x-2">
            {/* --- Add View Button --- */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => openAdminDetailModal(row.original._id)} // Use admin User ID
              title="View Details"
            >
              <EyeIcon className="h-4 w-4" />
            </Button>
            {/* --- End View Button --- */}
            <Button
              variant="outline"
              size="sm"
              className={
                row.original.isActive
                  ? "hover:bg-warning-50"
                  : "hover:bg-success-50"
              }
              onClick={() =>
                handleStatusToggle(row.original._id, row.original.isActive)
              }
              title={row.original.isActive ? "Deactivate" : "Activate"}
            >
              {row.original.isActive ? (
                <XCircleIcon className="h-4 w-4 text-warning-600" />
              ) : (
                <CheckCircleIcon className="h-4 w-4 text-success-600" />
              )}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDeleteClick(row.original)}
              title="Delete Admin"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // Removed dependencies causing re-renders, ensure handlers are stable if needed
  );

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  const noHospitals = hospitals.length === 0 && !loadingHospitals;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-800">
          Hospital Admin Management
        </h1>
        <Button
          onClick={() => openModal()}
          leftIcon={<PlusIcon className="h-5 w-5 mr-1" />}
          disabled={noHospitals}
          title={noHospitals ? "Please create a hospital first" : ""}
        >
          Add Hospital Admin
        </Button>
      </div>

      {noHospitals && (
        <div className="p-4 bg-warning-50 border border-warning-200 rounded-md text-warning-800">
          {/* ... no hospitals message ... */}
          <p className="font-medium">No hospitals available!</p>
          <p>
            You need to create at least one hospital before you can add hospital
            admins.
          </p>
          <div className="mt-2">
            <Button
              variant="warning"
              onClick={() => (window.location.href = "/super-admin/hospitals")}
              size="sm"
            >
              Go to Hospital Management
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="p-4 bg-white rounded shadow grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <FormInput
          label="Search Name/Email"
          type="search"
          name="search"
          value={filters.search}
          onChange={handleFilterChange}
          placeholder="Search..."
        />
        <div>
          <label htmlFor="hospitalFilter" className="form-label">
            Hospital
          </label>
          <Select
            id="hospitalFilter"
            name="hospitalId"
            options={hospitals}
            value={
              hospitals.find((opt) => opt.value === filters.hospitalId) || null
            }
            onChange={(opt) => handleSelectFilterChange("hospitalId", opt)}
            placeholder="Filter by hospital..."
            isClearable
            isLoading={loadingHospitals}
          />
        </div>
        <div>
          <label htmlFor="statusFilter" className="form-label">
            Status
          </label>
          <Select
            id="statusFilter"
            name="status"
            options={statusOptions}
            value={
              statusOptions.find((opt) => opt.value === filters.status) ||
              statusOptions[0]
            }
            onChange={(opt) => handleSelectFilterChange("status", opt)}
            placeholder="Filter by status..."
            isClearable
          />
        </div>
      </div>

      {error && <p className="text-center text-danger-500 py-4">{error}</p>}

      <Table
        columns={columns}
        data={admins}
        isLoading={isLoading}
        emptyMessage="No hospital admins found."
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

      {/* Add Admin Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Add New Hospital Admin"
      >
        <AdminForm onSubmit={handleAdminFormSubmit} isLoading={actionLoading} />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Confirm Deletion"
      >
        {/* ... delete confirmation content ... */}
        <p>
          Are you sure you want to delete the admin "{adminToDelete?.name}"?
        </p>
        <p className="text-sm text-warning-700 mt-1">
          This action will permanently delete the user account.
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

      {/* --- Admin Details Modal --- */}
      <Modal
        isOpen={isAdminDetailModalOpen}
        onClose={closeAdminDetailModal}
        title="Hospital Admin Details"
        size="lg" // Adjust size if needed
      >
        <AdminDetailsView
          admin={selectedAdmin}
          isLoading={loadingAdminDetails}
        />
        <div className="pt-4 mt-4 border-t flex justify-end">
          <Button variant="outline" onClick={closeAdminDetailModal}>
            Close
          </Button>
        </div>
      </Modal>
      {/* --- End Admin Details Modal --- */}
    </div>
  );
};

export default UserManagementPage;
