// src/pages/receptionist/ProcessPaymentsPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import receptionistService from "../../services/receptionistService"; //
import paymentService from "../../services/paymentService"; //
import LoadingSpinner from "../../components/common/LoadingSpinner"; //
import Table from "../../components/common/Table"; //
import Button from "../../components/common/Button"; //
import Modal from "../../components/common/Modal"; //
import Pagination from "../../components/common/Pagination"; //
import FormInput from "../../components/common/FormInput"; //
import {
  CurrencyDollarIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import {
  formatDate,
  formatCurrency,
  getStatusBadgeClass,
  getDisplayStatus,
} from "../../utils/helpers"; // [cite: 3044-3058, 3059-3065]
import Select from "react-select";
import { useFormik } from "formik";
import * as Yup from "yup";

const cashPaymentSchema = Yup.object({
  receiptNumber: Yup.string().optional().nullable(),
  notes: Yup.string().optional().nullable(),
});

const ProcessPaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [paymentToProcess, setPaymentToProcess] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: "pending",
    paymentMethod: "cash",
    search: "",
  }); // Default to pending cash

  const PAYMENTS_PER_PAGE = 15;

  const fetchPayments = useCallback(async (page = 1, currentFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: PAYMENTS_PER_PAGE,
        status: currentFilters.status || undefined,
        paymentMethod: currentFilters.paymentMethod || undefined,
        search: currentFilters.search.trim() || undefined, // Search by patient name / receipt / txn ID
      };
      // Use receptionist service to get payments for the hospital
      const response = await receptionistService.getReceptionistPayments(
        params
      ); //
      if (response.success) {
        setPayments(response.payments);
        setPagination(response.pagination);
        setCurrentPage(response.pagination.page);
      } else {
        throw new Error(response.message || "Failed to fetch payments");
      }
    } catch (err) {
      console.error("Fetch payments error:", err);
      setError(err.message || "Could not load payments.");
      toast.error(err.message || "Could not load payments.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPayments(currentPage, filters);
    }, 500); // Debounce search/filter changes

    return () => clearTimeout(delayDebounceFn);
  }, [fetchPayments, currentPage, filters]);

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

  // --- Cash Payment Processing Logic ---
  const formik = useFormik({
    initialValues: { receiptNumber: "", notes: "" },
    validationSchema: cashPaymentSchema,
    onSubmit: async (values) => {
      if (!paymentToProcess) return;
      setActionLoading(true);
      try {
        const payload = {
          paymentId: paymentToProcess._id,
          receiptNumber: values.receiptNumber || undefined,
          notes: values.notes || undefined,
        };
        const response = await paymentService.processCashPayment(payload); // Use payment service
        if (response.success) {
          toast.success("Cash payment processed successfully!");
          fetchPayments(currentPage, filters); // Refresh
          closeConfirmModal();
        } else {
          throw new Error(response.message || "Failed to process payment");
        }
      } catch (err) {
        console.error("Process cash payment error:", err);
        toast.error(err.message || "Could not process payment.");
      } finally {
        setActionLoading(false);
      }
    },
  });

  const handleProcessClick = (payment) => {
    setPaymentToProcess(payment);
    formik.resetForm(); // Reset form values
    setShowConfirmModal(true);
  };

  const closeConfirmModal = () => {
    setShowConfirmModal(false);
    setPaymentToProcess(null);
  };

  const columns = useMemo(
    () => [
      {
        Header: "Date Created",
        accessor: "createdAt",
        Cell: ({ value }) => formatDate(value),
      },
      {
        Header: "Patient",
        accessor: "patientId.userId.name",
        Cell: ({ value }) => value || "N/A",
      },
      {
        Header: "Amount",
        accessor: "amount",
        Cell: ({ value }) => formatCurrency(value),
      },
      {
        Header: "Method",
        accessor: "paymentMethod",
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
        Header: "Related To",
        accessor: "relatedTo",
        Cell: ({ value }) => getDisplayStatus(value),
      },
      {
        Header: "Receipt/Txn ID",
        accessor: "transactionId",
        Cell: ({ value, row }) => value || row.original.receiptNumber || "-",
      },
      {
        Header: "Processed By",
        accessor: "processedBy.name",
        Cell: ({ value }) => value || "-",
      },
      {
        Header: "Actions",
        accessor: "_id",
        Cell: ({ row }) =>
          row.original.status === "pending" &&
          row.original.paymentMethod === "cash" ? (
            <Button
              size="sm"
              onClick={() => handleProcessClick(row.original)}
              leftIcon={<CheckCircleIcon className="w-4 h-4" />}
            >
              Process Cash
            </Button>
          ) : (
            <span className="text-xs text-gray-400">-</span>
          ),
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
    ],
    []
  ); // Dependencies omitted for brevity, add if needed

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "completed", label: "Completed" },
    { value: "failed", label: "Failed" },
  ];
  const methodOptions = [
    { value: "", label: "All Methods" },
    { value: "cash", label: "Cash" },
    { value: "khalti", label: "Khalti" },
    // Add other methods if used
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Process Payments</h1>

      {/* Filters */}
      <div className="p-4 bg-white rounded shadow grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
        <div>
          <label htmlFor="methodFilter" className="form-label">
            Method
          </label>
          <Select
            id="methodFilter"
            name="paymentMethod"
            options={methodOptions}
            value={
              methodOptions.find(
                (opt) => opt.value === filters.paymentMethod
              ) || methodOptions[0]
            }
            onChange={(opt) => handleSelectFilterChange("paymentMethod", opt)}
            placeholder="Filter by method..."
            isClearable
          />
        </div>
        <div className="md:col-span-2">
          <FormInput
            label="Search Patient / Receipt / Txn ID"
            type="search"
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Enter search term..."
          />
        </div>
      </div>

      {error && <p className="text-center text-danger-500 py-4">{error}</p>}

      <Table
        columns={columns}
        data={payments}
        isLoading={isLoading}
        emptyMessage="No payments found matching criteria."
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

      {/* Process Cash Payment Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={closeConfirmModal}
        title="Confirm Cash Payment Received"
      >
        {paymentToProcess && (
          <form onSubmit={formik.handleSubmit} className="space-y-4">
            <p>
              Patient:{" "}
              <strong>{paymentToProcess.patientId?.userId?.name}</strong>
            </p>
            <p>
              Amount: <strong>{formatCurrency(paymentToProcess.amount)}</strong>
            </p>
            <p>
              For:{" "}
              <strong>{getDisplayStatus(paymentToProcess.relatedTo)}</strong>
            </p>
            <FormInput
              label="Receipt Number (Optional)"
              id="receiptNumber"
              name="receiptNumber"
              {...formik.getFieldProps("receiptNumber")}
            />
            <FormInput
              label="Notes (Optional)"
              id="notes"
              name="notes"
              type="textarea"
              rows={2}
              {...formik.getFieldProps("notes")}
            />
            <div className="pt-4 flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeConfirmModal}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={actionLoading}
                disabled={actionLoading}
              >
                Confirm Payment
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default ProcessPaymentsPage;
