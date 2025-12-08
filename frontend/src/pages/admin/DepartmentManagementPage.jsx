// src/pages/admin/DepartmentManagementPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import adminService from "../../services/adminService"; //
import LoadingSpinner from "../../components/common/LoadingSpinner"; //
import Table from "../../components/common/Table"; //
import Button from "../../components/common/Button"; //
import Modal from "../../components/common/Modal"; //
import FormInput from "../../components/common/FormInput"; //
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

const departmentSchema = Yup.object({
  name: Yup.string().required("Department name is required"),
  description: Yup.string().optional(),
  isActive: Yup.boolean(),
  // Add headId validation if implementing head selection
});

const DepartmentManagementPage = () => {
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);

  const fetchDepartments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminService.getDepartments({ status: "all" }); // Fetch all statuses [cite: 3103]
      if (response.success) {
        setDepartments(response.departments);
      } else {
        throw new Error(response.message || "Failed to fetch departments");
      }
    } catch (err) {
      console.error("Fetch departments error:", err);
      setError(err.message || "Could not load departments.");
      toast.error(err.message || "Could not load departments.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const formik = useFormik({
    initialValues: {
      name: "",
      description: "",
      isActive: true,
      // headId: '', // Add if implementing head selection
    },
    validationSchema: departmentSchema,
    onSubmit: async (values, { resetForm }) => {
      setIsLoading(true); // Use main loading state or a separate form loading state
      try {
        let response;
        const payload = { ...values };
        if (editingDepartment) {
          response = await adminService.updateDepartment(
            editingDepartment._id,
            payload
          ); // [cite: 3102]
          toast.success("Department updated successfully!");
        } else {
          response = await adminService.createDepartment(payload); // [cite: 3101]
          toast.success("Department created successfully!");
        }

        if (response.success) {
          fetchDepartments(); // Refresh list
          closeModal();
          resetForm();
        } else {
          throw new Error(response.message || "Failed to save department");
        }
      } catch (err) {
        console.error("Save department error:", err);
        toast.error(err.message || "Could not save department.");
      } finally {
        setIsLoading(false);
      }
    },
    enableReinitialize: true,
  });

  useEffect(() => {
    if (editingDepartment) {
      formik.setValues({
        name: editingDepartment.name || "",
        description: editingDepartment.description || "",
        isActive:
          editingDepartment.isActive !== undefined
            ? editingDepartment.isActive
            : true,
        // headId: editingDepartment.head?._id || '',
      });
    } else {
      formik.resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingDepartment]);

  const openModal = (department = null) => {
    setEditingDepartment(department);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingDepartment(null);
    setIsModalOpen(false);
    formik.resetForm(); // Reset form on close
  };

  const handleDeleteClick = (department) => {
    setDepartmentToDelete(department);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!departmentToDelete) return;
    setIsLoading(true);
    try {
      const response = await adminService.deleteDepartment(
        departmentToDelete._id
      ); // [cite: 3105]
      if (response.success) {
        toast.success("Department deleted successfully!");
        fetchDepartments(); // Refresh list
      } else {
        // Specific error message from backend (e.g., doctors assigned)
        throw new Error(response.message || "Failed to delete department");
      }
    } catch (err) {
      console.error("Delete department error:", err);
      toast.error(err.message || "Could not delete department.");
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
      setDepartmentToDelete(null);
    }
  };

  const columns = useMemo(
    () => [
      { Header: "Name", accessor: "name" },
      {
        Header: "Description",
        accessor: "description",
        Cell: ({ value }) => value || "-",
      },
      // { Header: 'Head of Department', accessor: 'head.name', Cell: ({value}) => value || 'N/A'}, // Uncomment if head is implemented
      {
        Header: "Doctors",
        accessor: "doctorsCount",
        Cell: ({ value }) => value ?? 0,
      },
      {
        Header: "Status",
        accessor: "isActive",
        Cell: ({ value }) => (
          <span className={`badge ${value ? "badge-success" : "badge-danger"}`}>
            {value ? "Active" : "Inactive"}
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
              onClick={() => openModal(row.original)}
              title="Edit"
            >
              <PencilIcon className="h-4 w-4" />
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
    [fetchDepartments]
  ); // Add fetchDepartments dependency if actions refresh the list

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">
          Department Management
        </h1>
        <Button
          onClick={() => openModal()}
          leftIcon={<PlusIcon className="h-5 w-5 mr-1" />}
        >
          Add Department
        </Button>
      </div>

      {error && <p className="text-center text-danger-500">{error}</p>}

      <Table columns={columns} data={departments} isLoading={isLoading} />

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingDepartment ? "Edit Department" : "Add New Department"}
      >
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <FormInput
            label="Department Name"
            id="name"
            name="name"
            required
            {...formik.getFieldProps("name")}
            error={formik.errors.name}
            touched={formik.touched.name}
          />
          <FormInput
            label="Description"
            id="description"
            name="description"
            type="textarea"
            rows={3}
            {...formik.getFieldProps("description")}
            error={formik.errors.description}
            touched={formik.touched.description}
          />
          {/* Add Head of Department Selection Here if needed */}
          <div className="flex items-center">
            <input
              id="isActive"
              name="isActive"
              type="checkbox"
              checked={formik.values.isActive}
              onChange={formik.handleChange}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label
              htmlFor="isActive"
              className="ml-2 block text-sm text-gray-900"
            >
              Active
            </label>
          </div>

          <div className="pt-4 flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={isLoading || !formik.isValid}
            >
              {editingDepartment ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Confirm Deletion"
      >
        <p>
          Are you sure you want to delete the department "
          {departmentToDelete?.name}"?
        </p>
        <p className="text-sm text-warning-700 mt-1">
          This action cannot be undone. Ensure no doctors are assigned.
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
    </div>
  );
};

export default DepartmentManagementPage;
