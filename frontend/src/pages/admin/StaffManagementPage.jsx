// src/pages/admin/StaffManagementPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import adminService from "../../services/adminService";
import useAuth from "../../hooks/useAuth";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Pagination from "../../components/common/Pagination";
import StaffForm from "../../components/users/StaffForm";
import { ROLES } from "../../constants"; // Ensure ROLES is imported
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import Avatar from "../../components/common/Avatar";
import {
  getDisplayStatus,
  getStatusBadgeClass,
  formatDate,
} from "../../utils/helpers";
import Select from "react-select";
import FormInput from "../../components/common/FormInput";
import LoadingSpinner from "../../components/common/LoadingSpinner";

// --- Define Constants OUTSIDE the component ---
const STAFF_ROLES_FILTER_OPTIONS = [
  { value: "", label: "All Staff Roles" },
  { value: ROLES.RECEPTIONIST, label: "Receptionist" },
  { value: ROLES.LAB_TECHNICIAN, label: "Lab Technician" },
  { value: ROLES.RADIOLOGIST, label: "Radiologist" },
];
// Roles available for CREATION by Admin
const STAFF_ROLES_CREATE_OPTIONS = STAFF_ROLES_FILTER_OPTIONS.filter(
  (opt) => opt.value
);
const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];
// --- End Constants ---

// --- Staff Details View Component (as provided before) ---
const StaffDetailsView = ({ staff, isLoading }) => {
  // ... (content of StaffDetailsView remains the same as previous response)
  if (isLoading) return <LoadingSpinner />;
  if (!staff) return <p>No staff details loaded.</p>;

  const { user: staffUser, ...staffProfile } = staff;

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center space-x-4 mb-4">
        <Avatar src={staffUser?.image} alt={staffUser?.name} size="lg" />
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {staffUser?.name}
          </h3>
          <p className="text-primary-600">
            {getDisplayStatus(staffUser?.role)}
          </p>
          {staffUser?.department && (
            <p className="text-gray-500">
              {staffUser?.department?.name || "No Department"}
            </p>
          )}
        </div>
      </div>
      <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
        <p>
          <strong>Email:</strong> {staffUser?.email}
        </p>
        <p>
          <strong>Phone:</strong> {staffUser?.phone || "N/A"}
        </p>
        <p>
          <strong>Status:</strong>{" "}
          <span
            className={`badge ${getStatusBadgeClass(
              staffUser?.isActive ? "active" : "inactive"
            )}`}
          >
            {staffUser?.isActive ? "Active" : "Inactive"}
          </span>
        </p>
        <p>
          <strong>Verified:</strong>{" "}
          {staffUser?.isVerified ? (
            <CheckCircleIcon className="h-5 w-5 inline text-success-500" />
          ) : (
            <XCircleIcon className="h-5 w-5 inline text-gray-400" />
          )}
        </p>
        <p>
          <strong>Employee ID:</strong> {staffProfile?.employeeId || "N/A"}
        </p>
        <p className="col-span-full">
          <strong>Joined:</strong> {formatDate(staffUser?.createdAt)}
        </p>
        {staffProfile?.qualifications &&
          staffProfile.qualifications.length > 0 && (
            <p className="col-span-full">
              <strong>Qualifications:</strong>{" "}
              {staffProfile.qualifications.join(", ")}
            </p>
          )}
        {staffProfile?.specialization && (
          <p>
            <strong>Specialization:</strong> {staffProfile.specialization}
          </p>
        )}
      </div>
    </div>
  );
};
// --- End Staff Details View ---

const StaffManagementPage = () => {
  const { user: adminUser } = useAuth();
  const [staffMembers, setStaffMembers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState({ search: "", status: "", role: "" });

  // --- State for Details Modal ---
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedStaffDetails, setSelectedStaffDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  // --- End State for Details Modal ---

  const STAFF_PER_PAGE = 10;

  const fetchStaff = useCallback(async (page = 1, currentFilters) => {
    // ... (fetch logic remains the same) ...
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: STAFF_PER_PAGE,
        status: currentFilters.status || undefined,
        role: currentFilters.role || undefined,
        search: currentFilters.search.trim() || undefined,
      };
      const response = await adminService.getStaff(params);
      if (response.success) {
        setStaffMembers(response.staff);
        setPagination(response.pagination);
        setCurrentPage(response.pagination.page);
      } else {
        throw new Error(response.message || "Failed to fetch staff members");
      }
    } catch (err) {
      console.error("Fetch staff error:", err);
      setError(err.message || "Could not load staff members.");
      toast.error(err.message || "Could not load staff members.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // ... (useEffect logic remains the same) ...
    if (!adminUser?.hospital) {
      setError("Admin hospital not found. Please contact support.");
      setIsLoading(false);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      fetchStaff(currentPage, filters);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchStaff, currentPage, filters, adminUser?.hospital]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

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

  const handleStatusToggle = async (staffUserId, currentStatus) => {
    // ... (status toggle logic remains the same) ...
    const newStatus = !currentStatus;
    const originalStaff = [...staffMembers];
    setStaffMembers((prev) =>
      prev.map((staff) =>
        staff.id === staffUserId ? { ...staff, isActive: newStatus } : staff
      )
    );

    try {
      const response = await adminService.updateStaff(staffUserId, {
        isActive: newStatus,
      });
      if (response.success) {
        toast.success(
          `Staff member ${newStatus ? "activated" : "deactivated"}`
        );
      } else {
        setStaffMembers(originalStaff);
        throw new Error(response.message || "Failed to update status");
      }
    } catch (err) {
      setStaffMembers(originalStaff);
      console.error("Status update error:", err);
      toast.error(err.message || "Could not update staff status.");
    }
  };

  const handleDeleteClick = (staff) => {
    setStaffToDelete(staff);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    // ... (confirm delete logic remains the same) ...
    if (!staffToDelete) return;
    setActionLoading(true);
    try {
      const response = await adminService.deleteStaff(staffToDelete.id);
      if (response.success) {
        toast.success("Staff member deleted successfully!");
        fetchStaff(1, filters);
      } else {
        throw new Error(response.message || "Failed to delete staff member");
      }
    } catch (err) {
      console.error("Delete staff error:", err);
      toast.error(err.message || "Could not delete staff member.");
    } finally {
      setActionLoading(false);
      setShowDeleteConfirm(false);
      setStaffToDelete(null);
    }
  };

  const openModal = (staff = null) => {
    // ... (edit/add modal logic remains the same) ...
    if (!adminUser?.hospital) {
      toast.error(
        "Hospital ID not found. Please ensure your account is properly configured."
      );
      return;
    }

    const initialData = staff
      ? {
          _id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          hospitalId: adminUser.hospital,
          departmentId: staff.department?._id || "",
          employeeId: staff.employeeId || "",
          qualifications: Array.isArray(staff.qualifications)
            ? staff.qualifications.join(", ")
            : "",
          specialization: staff.specialization || "",
        }
      : null;
    setEditingStaff(initialData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingStaff(null);
    setIsModalOpen(false);
  };

  const openStaffDetailModal = async (staffUserId) => {
    // ... (detail modal open logic remains the same) ...
    setLoadingDetails(true);
    setIsDetailModalOpen(true);
    setSelectedStaffDetails(null);
    try {
      const response = await adminService.getStaffDetails(staffUserId);
      if (response.success) {
        setSelectedStaffDetails(response.staff);
      } else {
        throw new Error(response.message || "Failed to fetch staff details");
      }
    } catch (err) {
      toast.error(err.message || "Could not load staff details.");
      setIsDetailModalOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedStaffDetails(null);
  };

  const handleFormSubmit = async (values) => {
    // ... (form submit logic remains the same) ...
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append("hospitalId", adminUser.hospital);

      Object.keys(values).forEach((key) => {
        if (key === "hospitalId") return;
        if (key === "password" && !values[key] && editingStaff) return;
        if (key === "qualifications") {
          formData.append(key, values[key]);
        } else if (values[key] !== null && values[key] !== undefined) {
          formData.append(key, values[key]);
        }
      });

      let response;
      if (editingStaff?._id) {
        response = await adminService.updateStaff(editingStaff._id, formData);
        toast.success("Staff member updated successfully!");
      } else {
        response = await adminService.createStaff(formData);
        toast.success(
          "Staff member created successfully! Password sent via email."
        );
      }

      if (response.success) {
        fetchStaff(editingStaff?._id ? currentPage : 1, filters);
        closeModal();
      } else {
        throw new Error(response.message || "Failed to save staff member");
      }
    } catch (err) {
      console.error("Save staff error:", err);
      toast.error(err.message || "Could not save staff member.");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      // ... (column definitions remain the same) ...
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
        Header: "Role",
        accessor: "role",
        Cell: ({ value }) => getDisplayStatus(value),
      },
      {
        Header: "Department",
        accessor: "department.name",
        Cell: ({ value, row }) => {
          const requiresDept = [
            ROLES.LAB_TECHNICIAN,
            ROLES.RADIOLOGIST,
          ].includes(row.original.role);
          return requiresDept ? value || "N/A" : "—";
        },
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
        accessor: "id",
        Cell: ({ row }) => (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openStaffDetailModal(row.original.id)}
              title="View Details"
            >
              <EyeIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openModal(row.original)}
              title="Edit"
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={
                row.original.isActive
                  ? "hover:bg-warning-50"
                  : "hover:bg-success-50"
              }
              onClick={() =>
                handleStatusToggle(row.original.id, row.original.isActive)
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
              title="Delete"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [staffMembers] // Re-render table if staff data changes
  );

  // --- MOVED statusOptions definition outside component ---

  if (!adminUser?.hospital) {
    return (
      <div className="p-4 bg-warning-50 text-warning-700 rounded-md">
        <p>
          Hospital association not found. Please complete your hospital profile
          first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">
          Staff Management
        </h1>
        <Button
          onClick={() => openModal()}
          leftIcon={<PlusIcon className="h-5 w-5 mr-1" />}
        >
          Add Staff Member
        </Button>
      </div>

      {/* Filters */}
      <div className="p-4 bg-white rounded shadow grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <FormInput
          label="Search Name/Email"
          type="search"
          name="search"
          value={filters.search}
          onChange={handleFilterChange}
          placeholder="Search..."
        />
        <div>
          <label htmlFor="roleFilterStaffPage" className="form-label">
            Role
          </label>
          {/* --- Use the constant defined outside --- */}
          <Select
            id="roleFilterStaffPage"
            name="role"
            options={STAFF_ROLES_FILTER_OPTIONS}
            value={
              STAFF_ROLES_FILTER_OPTIONS.find(
                (opt) => opt.value === filters.role
              ) || STAFF_ROLES_FILTER_OPTIONS[0]
            }
            onChange={(opt) => handleSelectFilterChange("role", opt)}
            placeholder="Filter by role..."
            isClearable
          />
        </div>
        <div>
          <label htmlFor="statusFilterStaffPage" className="form-label">
            Status
          </label>
          {/* --- Use the constant defined outside --- */}
          <Select
            id="statusFilterStaffPage"
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

      {error && (
        <div className="p-4 bg-danger-50 text-danger-700 rounded-md">
          {error}
        </div>
      )}

      <Table
        columns={columns}
        data={staffMembers}
        isLoading={isLoading}
        emptyMessage="No staff members found."
      />

      {pagination && pagination.pages > 1 && (
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
        title={editingStaff ? "Edit Staff Member" : "Add New Staff Member"}
        size="3xl"
      >
        <StaffForm
          onSubmit={handleFormSubmit}
          initialValues={editingStaff}
          isLoading={actionLoading}
          availableRoles={STAFF_ROLES_CREATE_OPTIONS} // Pass create options here
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
        <p>
          Are you sure you want to delete the staff member "
          {staffToDelete?.name}"?
        </p>
        <p className="text-sm text-warning-700 mt-1">
          This will delete the staff member's user account.
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

      {/* --- Staff Details Modal --- */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        title="Staff Member Details"
        size="lg"
      >
        <StaffDetailsView
          staff={selectedStaffDetails}
          isLoading={loadingDetails}
        />
        <div className="pt-4 mt-4 border-t flex justify-end">
          <Button variant="outline" onClick={closeDetailModal}>
            Close
          </Button>
        </div>
      </Modal>
      {/* --- End Staff Details Modal --- */}
    </div>
  );
};

export default StaffManagementPage;
