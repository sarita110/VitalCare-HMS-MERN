// src/components/users/UserList.jsx
import React, { useMemo } from "react";
import Table from "../common/Table"; // Use the common Table component
import Avatar from "../common/Avatar";
import Button from "../common/Button";
import {
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { getDisplayStatus, getStatusBadgeClass } from "../../utils/helpers"; // Import helpers

const UserList = ({
  users,
  onEdit,
  onDelete,
  onStatusChange,
  isLoading,
  pagination,
  onPageChange,
}) => {
  const columns = useMemo(
    () => [
      {
        Header: "Name",
        accessor: "name", // Assuming user object has name directly or adjust accessor
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
        Header: "Hospital",
        accessor: "hospital.name",
        Cell: ({ value }) => value || "N/A",
      }, // Adjust accessor if hospital is just ID
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
        accessor: "_id", // Use user ID for actions
        Cell: ({ row }) => (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(row.original)}
              title="Edit User"
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
                onStatusChange(row.original._id, !row.original.isActive)
              }
              title={
                row.original.isActive ? "Deactivate User" : "Activate User"
              }
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
              onClick={() => onDelete(row.original._id)}
              title="Delete User"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [onEdit, onDelete, onStatusChange]
  );

  return (
    // Pagination component should ideally be outside the table, but included here for context
    // In a real app, wrap UserList and Pagination in a parent component
    <>
      <Table
        columns={columns}
        data={users}
        isLoading={isLoading}
        emptyMessage="No users found."
      />
      {/* {pagination && pagination.totalPages > 1 && (
                 <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.pages}
                    onPageChange={onPageChange}
                    itemsPerPage={pagination.limit}
                    totalItems={pagination.total}
                />
             )} */}
    </>
  );
};

export default UserList;
