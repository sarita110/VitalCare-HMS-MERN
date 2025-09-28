import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import {
  EyeIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  BanknotesIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon, // For hospital display
} from "@heroicons/react/24/outline";
import patientService from "../../services/patientService";
import paymentService from "../../services/paymentService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Pagination from "../../components/common/Pagination";
import Modal from "../../components/common/Modal";
import FormInput from "../../components/common/FormInput";
import HospitalFilter from "../../components/common/HospitalFilter";
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  getStatusBadgeClass,
  getDisplayStatus,
} from "../../utils/helpers";
import useDebounce from "../../hooks/useDebounce";
import { notifyInfo } from "../../components/common/Notification";

// Component for Payment Details Modal
const PaymentDetailModal = ({ payment, onClose }) => {
  if (!payment) return null;
  return (
    <div className="space-y-4 text-sm">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
        Payment Details
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        <p>
          <strong>Payment ID:</strong> {payment._id}
        </p>
        <p>
          <strong>Date Created:</strong> {formatDateTime(payment.createdAt)}
        </p>
        {payment.hospitalId?.name && (
          <p>
            <strong>Hospital:</strong> {payment.hospitalId.name}
          </p>
        )}
        <p>
          <strong>Amount:</strong> {formatCurrency(payment.amount)}{" "}
          {payment.currency}
        </p>
        <p>
          <strong>Method:</strong> {getDisplayStatus(payment.paymentMethod)}
        </p>
        <p>
          <strong>Status:</strong>{" "}
          <span className={`badge ${getStatusBadgeClass(payment.status)}`}>
            {getDisplayStatus(payment.status)}
          </span>
        </p>
        {payment.transactionId && (
          <p>
            <strong>Transaction ID:</strong> {payment.transactionId}
          </p>
        )}
        {payment.receiptNumber && (
          <p>
            <strong>Receipt No:</strong> {payment.receiptNumber}
          </p>
        )}
        {payment.paymentDate && (
          <p>
            <strong>Payment Date:</strong> {formatDateTime(payment.paymentDate)}
          </p>
        )}
        {payment.processedBy?.name && (
          <p>
            <strong>Processed By:</strong> {payment.processedBy.name}
          </p>
        )}
      </div>
      {payment.itemDetails && (
        <div className="mt-4 pt-3 border-t">
          <h4 className="font-medium text-gray-700 mb-2">Related To:</h4>
          <p>
            <strong>Type:</strong> {payment.itemDetails.type}
          </p>
          {payment.itemDetails.details?.doctor && (
            <p>
              <strong>Doctor:</strong> Dr. {payment.itemDetails.details.doctor}
            </p>
          )}
          {payment.itemDetails.details?.name && (
            <p>
              <strong>Item:</strong> {payment.itemDetails.details.name}
            </p>
          )}
          {payment.itemDetails.details?.date && (
            <p>
              <strong>Item Date:</strong>{" "}
              {formatDateTime(payment.itemDetails.details.date)}
            </p>
          )}
          {payment.itemDetails.details?.status && (
            <p>
              <strong>Item Status:</strong>{" "}
              {getDisplayStatus(payment.itemDetails.details.status)}
            </p>
          )}
        </div>
      )}
      {payment.notes && (
        <div className="mt-4 pt-3 border-t">
          <h4 className="font-medium text-gray-700 mb-1">Notes:</h4>
          <p className="text-gray-600 whitespace-pre-wrap">{payment.notes}</p>
        </div>
      )}
      {payment.paymentMethod === "khalti" && payment.paymentDetails && (
        <div className="mt-4 pt-3 border-t">
          <h4 className="font-medium text-gray-700 mb-1">
            Khalti Details (Debug):
          </h4>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(payment.paymentDetails, null, 2)}
          </pre>
        </div>
      )}
      <div className="pt-4 mt-4 border-t flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};

const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterType, setFilterType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterHospitalId, setFilterHospitalId] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [payingItemId, setPayingItemId] = useState(null);
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const PAYMENTS_PER_PAGE = 15;

  const fetchPayments = useCallback(
    async (
      page = 1,
      status = "",
      method = "",
      type = "",
      search = "",
      hospitalId = ""
    ) => {
      if (!isLoading) setIsLoading(true); // Show loading if not already
      setError(null);
      try {
        const params = {
          page,
          limit: PAYMENTS_PER_PAGE,
          status: status || undefined,
          paymentMethod: method || undefined,
          relatedTo: type || undefined,
          search: search || undefined,
          hospitalId: hospitalId || undefined,
        };
        const response = await patientService.getPatientPaymentHistory(params);
        if (response.success) {
          setPayments(response.payments);
          setPagination(response.pagination);
          setCurrentPage(response.pagination.page);
        } else {
          throw new Error(
            response.message || "Failed to fetch payment history"
          );
        }
      } catch (err) {
        console.error("Fetch payment history error:", err);
        setError(err.message || "Could not load payment history.");
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  ); // Added isLoading to dep array for the flicker prevention logic

  useEffect(() => {
    fetchPayments(
      1,
      filterStatus,
      filterMethod,
      filterType,
      debouncedSearchTerm,
      filterHospitalId
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filterStatus,
    filterMethod,
    filterType,
    debouncedSearchTerm,
    filterHospitalId,
  ]); // Auto-fetch on filter/search change (page resets to 1)

  useEffect(() => {
    // Handle page changes separately
    fetchPayments(
      currentPage,
      filterStatus,
      filterMethod,
      filterType,
      debouncedSearchTerm,
      filterHospitalId
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const handlePageChange = (page) => setCurrentPage(page);
  const handleStatusChange = (selectedOption) => {
    setFilterStatus(selectedOption ? selectedOption.value : "");
    setCurrentPage(1);
  };
  const handleMethodChange = (selectedOption) => {
    setFilterMethod(selectedOption ? selectedOption.value : "");
    setCurrentPage(1);
  };
  const handleTypeChange = (selectedOption) => {
    setFilterType(selectedOption ? selectedOption.value : "");
    setCurrentPage(1);
  };
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };
  const handleHospitalFilterChange = (selectedOption) => {
    setFilterHospitalId(selectedOption ? selectedOption.value : "");
    setCurrentPage(1);
  };

  const initiateItemPayment = async (paymentRecord) => {
    if (payingItemId) return;
    if (!paymentRecord?.relatedTo || !paymentRecord?.relatedId) {
      toast.error("Invalid payment record details.");
      return;
    }
    setPayingItemId(paymentRecord._id);
    try {
      const paymentMethod =
        paymentRecord.paymentMethod === "khalti" ? "khalti" : "khalti";
      const paymentResponse = await paymentService.initiatePayment({
        paymentFor: paymentRecord.relatedTo,
        itemId: paymentRecord.relatedId,
        paymentMethod: paymentMethod,
      });
      if (paymentResponse.success && paymentResponse.payment?.paymentUrl) {
        notifyInfo("Redirecting to payment gateway...");
        window.location.href = paymentResponse.payment.paymentUrl;
      } else {
        throw new Error(
          paymentResponse.message || "Failed to get payment URL."
        );
      }
    } catch (error) {
      toast.error(`Payment Initiation Failed: ${error.message}`);
      setPayingItemId(null);
    }
  };

  const handleViewDetails = (payment) => {
    setSelectedPaymentDetail(payment);
    setIsDetailModalOpen(true);
  };
  const closeModal = () => {
    setIsDetailModalOpen(false);
    setSelectedPaymentDetail(null);
  };

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "completed", label: "Completed" },
    { value: "failed", label: "Failed" },
    { value: "refunded", label: "Refunded" },
    { value: "processing", label: "Processing" },
  ];
  const methodOptions = [
    { value: "", label: "All Methods" },
    { value: "khalti", label: "Khalti" },
    { value: "cash", label: "Cash" },
    { value: "insurance", label: "Insurance" },
  ];
  const typeOptions = [
    { value: "", label: "All Types" },
    { value: "appointment", label: "Appointment" },
    { value: "labTest", label: "Lab Test" },
    { value: "radiologyReport", label: "Radiology Test" },
    { value: "pharmacy", label: "Pharmacy" },
    { value: "other", label: "Other" },
  ];

  const columns = useMemo(
    () => [
      {
        Header: "Date",
        accessor: "createdAt",
        Cell: ({ value }) => (
          <span className="text-xs whitespace-nowrap">{formatDate(value)}</span>
        ),
        width: 100,
      },
      {
        Header: "Hospital",
        accessor: "hospitalId.name",
        Cell: ({ value }) => value || "N/A",
        minWidth: 120,
      },
      {
        Header: "Item",
        accessor: "itemDetails",
        Cell: ({ value, row }) => {
          const payment = row.original;
          let itemText = value?.type || payment.relatedTo || "N/A";
          let linkTo = null;
          if (value?.details?.doctor)
            itemText = `Appt: Dr. ${value.details.doctor}`;
          if (value?.details?.name)
            itemText = `${value.type}: ${value.details.name}`;
          if (payment.relatedTo === "appointment")
            linkTo = `/patient/appointments/${payment.relatedId}`;
          if (payment.relatedTo === "labTest") linkTo = `/patient/lab-results`;
          if (payment.relatedTo === "radiologyReport")
            linkTo = `/patient/radiology-results`;
          return (
            <div className="text-xs">
              {linkTo ? (
                <Link
                  to={linkTo}
                  className="text-primary-600 hover:underline font-medium"
                  title={`View ${value?.type}`}
                >
                  {itemText}
                </Link>
              ) : (
                <span className="font-medium">{itemText}</span>
              )}
              {value?.details?.date && (
                <p className="text-gray-500 text-xs mt-0.5">
                  {formatDateTime(value.details.date)}
                </p>
              )}
            </div>
          );
        },
        minWidth: 150,
      },
      {
        Header: "Amount",
        accessor: "amount",
        Cell: ({ value }) => formatCurrency(value),
        width: 100,
        className: "text-right pr-4",
      },
      {
        Header: "Method",
        accessor: "paymentMethod",
        Cell: ({ value }) => (
          <div className="flex items-center gap-1.5 text-xs whitespace-nowrap">
            {value === "khalti" && (
              <CreditCardIcon className="w-4 h-4 text-purple-600" />
            )}
            {value === "cash" && (
              <BanknotesIcon className="w-4 h-4 text-green-600" />
            )}
            <span>{getDisplayStatus(value)}</span>
          </div>
        ),
        width: 100,
      },
      {
        Header: "Status",
        accessor: "status",
        Cell: ({ value }) => (
          <span
            className={`badge ${getStatusBadgeClass(value)} whitespace-nowrap`}
          >
            {getDisplayStatus(value)}
          </span>
        ),
        width: 100,
      },
      {
        Header: "Reference",
        accessor: "transactionId",
        Cell: ({ value, row }) => (
          <span
            className="text-xs text-gray-500 truncate"
            title={value || row.original.receiptNumber}
          >
            {value || row.original.receiptNumber || "-"}
          </span>
        ),
        minWidth: 120,
      },
      {
        Header: "Actions",
        accessor: "_id",
        Cell: ({ row }) => {
          const payment = row.original;
          const canPay =
            payment.status === "pending" && payment.paymentMethod === "khalti";
          const isPendingCash =
            payment.status === "pending" && payment.paymentMethod === "cash";
          return (
            <div className="flex items-center justify-end gap-1 whitespace-nowrap">
              <Button
                variant="icon"
                size="sm"
                onClick={() => handleViewDetails(payment)}
                title="View Payment Details"
              >
                <EyeIcon className="w-4 h-4" />
              </Button>
              {canPay && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => initiateItemPayment(payment)}
                  isLoading={payingItemId === payment._id}
                  disabled={!!payingItemId}
                  title={`Pay ${formatCurrency(payment.amount)} via Khalti`}
                >
                  <CurrencyDollarIcon className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Pay Now</span>
                </Button>
              )}
              {isPendingCash && (
                <span className="text-xs text-yellow-700 italic bg-yellow-100 px-2 py-1 rounded">
                  Pay at Reception
                </span>
              )}
            </div>
          );
        },
        width: 150,
      },
    ],
    [payingItemId]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-800">
          Payment History
        </h1>
      </div>
      <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
          <FormInput
            id="searchPayments"
            name="search"
            type="text"
            placeholder="Search item, ID..."
            value={searchTerm}
            onChange={handleSearchChange}
            icon={MagnifyingGlassIcon}
            label="Search"
          />
          <HospitalFilter
            selectedHospital={filterHospitalId}
            onHospitalChange={handleHospitalFilterChange}
            className="w-full"
          />
          <div>
            <label htmlFor="statusFilterPay" className="form-label">
              Status
            </label>
            <Select
              id="statusFilterPay"
              name="status"
              options={statusOptions}
              value={
                statusOptions.find((opt) => opt.value === filterStatus) || null
              }
              onChange={handleStatusChange}
              placeholder="Filter by Status..."
              isClearable
              classNamePrefix="react-select"
            />
          </div>
          <div>
            <label htmlFor="methodFilterPay" className="form-label">
              Method
            </label>
            <Select
              id="methodFilterPay"
              name="method"
              options={methodOptions}
              value={
                methodOptions.find((opt) => opt.value === filterMethod) || null
              }
              onChange={handleMethodChange}
              placeholder="Filter by Method..."
              isClearable
              classNamePrefix="react-select"
            />
          </div>
          <div>
            <label htmlFor="typeFilterPay" className="form-label">
              Item Type
            </label>
            <Select
              id="typeFilterPay"
              name="type"
              options={typeOptions}
              value={
                typeOptions.find((opt) => opt.value === filterType) || null
              }
              onChange={handleTypeChange}
              placeholder="Filter by Type..."
              isClearable
              classNamePrefix="react-select"
            />
          </div>
        </div>
      </div>
      {error && !isLoading && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <Table
          columns={columns}
          data={payments}
          isLoading={isLoading}
          emptyMessage="No payment history found matching your criteria."
        />
      </div>
      {pagination && pagination.totalPages > 1 && !isLoading && (
        <Pagination
          currentPage={currentPage}
          totalPages={pagination.pages}
          onPageChange={handlePageChange}
          itemsPerPage={pagination.limit}
          totalItems={pagination.total}
        />
      )}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={closeModal}
        title="Payment Record Details"
        size="2xl"
      >
        <PaymentDetailModal
          payment={selectedPaymentDetail}
          onClose={closeModal}
        />
      </Modal>
    </div>
  );
};

export default PaymentsPage;
