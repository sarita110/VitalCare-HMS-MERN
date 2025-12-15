// src/pages/superAdmin/HospitalManagementPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import superAdminService from "../../services/superAdminService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Pagination from "../../components/common/Pagination";
import HospitalForm from "../../components/hospitals/HospitalForm";
import FormInput from "../../components/common/FormInput";
import Select from "react-select";
import {
  PlusIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon, // <-- Import EyeIcon
  BuildingOffice2Icon, // <-- Icons for details view
  UserGroupIcon, // <-- Icons for details view
  UsersIcon, // <-- Icons for details view
  PhoneIcon, // <-- Icons for details view
  EnvelopeIcon, // <-- Icons for details view
  GlobeAltIcon, // <-- Icons for details view
  MapPinIcon, // <-- Icons for details view
} from "@heroicons/react/24/outline";
import { getStatusBadgeClass, formatDate } from "../../utils/helpers"; // <-- Import formatDate

// --- NEW: Component to display Hospital Details in Modal ---
const HospitalDetailsView = ({ hospital, isLoading }) => {
  if (isLoading) {
    return <LoadingSpinner />;
  }
  if (!hospital) {
    return <p>No hospital details loaded.</p>;
  }

  const fullAddress = hospital.address
    ? `${hospital.address.street}, ${hospital.address.city}, ${hospital.address.state} ${hospital.address.zipCode}, ${hospital.address.country}`
    : "N/A";

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center space-x-4 mb-4">
        <img
          src={hospital.logo || "/default-hospital.png"}
          alt={`${hospital.name} Logo`}
          className="h-16 w-16 rounded-md object-contain border"
        />
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {hospital.name}
          </h3>
          <span
            className={`mt-1 inline-block badge ${getStatusBadgeClass(
              hospital.isActive ? "active" : "inactive"
            )}`}
          >
            {hospital.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
        <p className="flex items-center">
          <EnvelopeIcon className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
          <strong>Email:</strong> {hospital.email}
        </p>
        <p className="flex items-center">
          <PhoneIcon className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
          <strong>Contact:</strong> {hospital.contactNumber}
        </p>
        <p className="flex items-center col-span-full">
          <MapPinIcon className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
          <strong>Address:</strong> {fullAddress}
        </p>
        {hospital.website && (
          <p className="flex items-center">
            <GlobeAltIcon className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
            <strong>Website:</strong> 
            <a
              href={
                hospital.website.startsWith("http")
                  ? hospital.website
                  : `http://${hospital.website}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline truncate ml-1"
            >
              {hospital.website}
            </a>
          </p>
        )}
        <p className="flex items-center col-span-full">
          <strong>Registered:</strong> {formatDate(hospital.createdAt)}
        </p>
      </div>

      {hospital.description && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-700 mb-1">Description</h4>
          <p className="text-gray-600">{hospital.description}</p>
        </div>
      )}

      <div className="border-t pt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="text-center p-2 bg-gray-50 rounded">
          <BuildingOffice2Icon className="h-6 w-6 mx-auto text-gray-500 mb-1" />
          <p className="text-xs text-gray-500">Departments</p>
          <p className="font-semibold">{hospital.departmentsCount ?? 0}</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <UserGroupIcon className="h-6 w-6 mx-auto text-gray-500 mb-1" />
          <p className="text-xs text-gray-500">Admins</p>
          <p className="font-semibold">{hospital.adminsCount ?? 0}</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <UsersIcon className="h-6 w-6 mx-auto text-gray-500 mb-1" />
          <p className="text-xs text-gray-500">Total Users</p>
          <p className="font-semibold">{hospital.usersCount ?? 0}</p>
        </div>
      </div>
    </div>
  );
};
// --- END NEW COMPONENT ---

const HospitalManagementPage = () => {
  const [hospitals, setHospitals] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState({ search: "", status: "" });

  // --- State for Details Modal ---
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  // --- End State for Details Modal ---

  const HOSPITALS_PER_PAGE = 10;

  const fetchHospitals = useCallback(async (page = 1, currentFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: HOSPITALS_PER_PAGE,
        search: currentFilters.search.trim() || undefined,
        status: currentFilters.status || undefined,
      };
      const response = await superAdminService.getHospitals(params);
      if (response.success && Array.isArray(response.hospitals)) {
        setHospitals(response.hospitals);
        setPagination(response.pagination);
        setCurrentPage(response.pagination.page);
      } else {
        throw new Error(response.message || "Failed to fetch hospitals");
      }
    } catch (err) {
      console.error("Fetch hospitals error:", err);
      setError(err.message || "Could not load hospitals.");
      toast.error(err.message || "Could not load hospitals.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchHospitals(currentPage, filters);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchHospitals, currentPage, filters]);

  const handlePageChange = (page) => setCurrentPage(page);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const handleStatusToggle = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    const originalHospitals = [...hospitals];
    setHospitals((prev) =>
      prev.map((h) => (h._id === id ? { ...h, isActive: newStatus } : h))
    );
    try {
      const response = await superAdminService.updateHospitalStatus(id, {
        isActive: newStatus,
      });
      if (response.success) {
        toast.success(`Hospital ${newStatus ? "activated" : "deactivated"}`);
      } else {
        setHospitals(originalHospitals);
        throw new Error(response.message || "Failed to update status");
      }
    } catch (err) {
      setHospitals(originalHospitals);
      console.error("Status update error:", err);
      toast.error(err.message || "Could not update hospital status.");
    }
  };

  const openModal = (hospital = null) => {
    setEditingHospital(hospital);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingHospital(null);
    setIsModalOpen(false);
  };

  // --- Functions for Details Modal ---
  const openDetailModal = async (hospitalId) => {
    setLoadingDetails(true);
    setIsDetailModalOpen(true);
    setSelectedHospital(null); // Clear previous
    try {
      const response = await superAdminService.getHospitalDetails(hospitalId);
      if (response.success) {
        setSelectedHospital(response.hospital);
      } else {
        throw new Error(response.message || "Failed to fetch details");
      }
    } catch (err) {
      toast.error(err.message || "Could not load hospital details.");
      setIsDetailModalOpen(false); // Close modal on error
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedHospital(null);
  };
  // --- End Functions for Details Modal ---

  const handleFormSubmit = async (formData) => {
    setActionLoading(true);
    try {
      let response;
      if (editingHospital) {
        response = await superAdminService.updateHospital(
          editingHospital._id,
          formData
        );
        toast.success("Hospital updated successfully!");
      } else {
        response = await superAdminService.createHospital(formData);
        toast.success("Hospital created successfully!");
      }
      if (response.success) {
        fetchHospitals(editingHospital ? currentPage : 1, filters);
        closeModal();
      } else {
        throw new Error(response.message || "Failed to save hospital");
      }
    } catch (err) {
      console.error("Save hospital error:", err);
      toast.error(err.message || "Could not save hospital.");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      // ... other columns (Logo, Name, Email, City, Contact) ...
      {
        Header: "Logo",
        accessor: "logo",
        Cell: ({ value, row }) => (
          <img
            src={value || "/default-hospital.png"}
            alt={`${row.original?.name || "Hospital"} logo`}
            className="h-10 w-10 object-contain rounded border"
          />
        ),
      },
      { Header: "Name", accessor: "name" },
      { Header: "Email", accessor: "email" },
      {
        Header: "City",
        accessor: "address.city",
        Cell: ({ value }) => value || "-",
      },
      { Header: "Contact", accessor: "contactNumber" },
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
        accessor: "_id",
        Cell: ({ row }) => (
          <div className="flex space-x-2">
            {/* --- Add View Button --- */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDetailModal(row.original._id)} // Use hospital ID
              title="View Details"
            >
              <EyeIcon className="h-4 w-4" />
            </Button>
            {/* --- End View Button --- */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => openModal(row.original)}
              title="Edit Hospital"
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={
                row.original?.isActive
                  ? "hover:bg-warning-50"
                  : "hover:bg-success-50"
              }
              onClick={() =>
                handleStatusToggle(row.original?._id, row.original?.isActive)
              }
              title={row.original?.isActive ? "Deactivate" : "Activate"}
            >
              {row.original?.isActive ? (
                <XCircleIcon className="h-4 w-4 text-warning-600" />
              ) : (
                <CheckCircleIcon className="h-4 w-4 text-success-600" />
              )}
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-800">
          Hospital Management
        </h1>
        <Button
          onClick={() => openModal()}
          leftIcon={<PlusIcon className="h-5 w-5 mr-1" />}
        >
          Add New Hospital
        </Button>
      </div>

      {/* Filters */}
      <div className="p-4 bg-white rounded shadow grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <FormInput
          label="Search Name/City"
          type="search"
          name="search"
          value={filters.search}
          onChange={handleFilterChange}
          placeholder="Search..."
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
              statusOptions.find((opt) => opt.value === filters.status) ||
              statusOptions[0]
            }
            onChange={(opt) =>
              handleFilterChange({
                target: { name: "status", value: opt ? opt.value : "" },
              })
            }
            placeholder="Filter by status..."
            isClearable
          />
        </div>
      </div>

      {error && <p className="text-center text-danger-500 py-4">{error}</p>}

      <Table
        columns={columns}
        data={hospitals}
        isLoading={isLoading}
        emptyMessage="No hospitals found."
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

      {/* Add/Edit Hospital Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingHospital ? "Edit Hospital" : "Add New Hospital"}
        size="3xl"
      >
        <HospitalForm
          onSubmit={handleFormSubmit}
          initialValues={editingHospital}
          isLoading={actionLoading}
        />
      </Modal>

      {/* --- Hospital Details Modal --- */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        title="Hospital Details"
        size="2xl" // Adjust size as needed
      >
        <HospitalDetailsView
          hospital={selectedHospital}
          isLoading={loadingDetails}
        />
        <div className="pt-4 mt-4 border-t flex justify-end">
          <Button variant="outline" onClick={closeDetailModal}>
            Close
          </Button>
        </div>
      </Modal>
      {/* --- End Hospital Details Modal --- */}
    </div>
  );
};

export default HospitalManagementPage;
