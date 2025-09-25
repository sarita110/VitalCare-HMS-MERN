import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import patientService from "../../services/patientService";
import paymentService from "../../services/paymentService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Table from "../../components/common/Table";
import Pagination from "../../components/common/Pagination";
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";
import HospitalFilter from "../../components/common/HospitalFilter";
import { EyeIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";
import {
  formatDate,
  formatDateTime,
  getStatusBadgeClass,
  getDisplayStatus,
  formatCurrency,
} from "../../utils/helpers";
import Select from "react-select";
import { notifyInfo } from "../../components/common/Notification";

// Component to display detailed radiology report in modal
const RadiologyReportDetail = ({ report }) => {
  if (!report) return <p>No report details available.</p>;
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 mb-4 border-b pb-3">
        <p>
          <strong>Procedure:</strong> {report.procedureType}
        </p>
        <p>
          <strong>Body Part:</strong> {report.bodyPart}
        </p>
        <p>
          <strong>Requested Date:</strong> {formatDate(report.requestDate)}
        </p>
        <p>
          <strong>Requested By:</strong> Dr.{" "}
          {report.doctorId?.userId?.name || "N/A"}
        </p>
        <p>
          <strong>Hospital:</strong> {report.hospitalId?.name || "N/A"}
        </p>{" "}
        {/* Display hospital */}
        <p>
          <strong>Status:</strong>{" "}
          <span className={`badge ${getStatusBadgeClass(report.status)}`}>
            {getDisplayStatus(report.status)}
          </span>
        </p>
        <p>
          <strong>Payment Status:</strong>{" "}
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadgeClass(
              report.payment?.status || "pending"
            )} text-white`}
          >
            {getDisplayStatus(report.payment?.status || "pending")}
          </span>
          {report.payment?.status === "pending" && report.payment?.amount && (
            <span className="ml-2">
              ({formatCurrency(report.payment.amount)})
            </span>
          )}
        </p>
        {report.scheduledDate && (
          <p>
            <strong>Scheduled Date:</strong> {formatDate(report.scheduledDate)}
          </p>
        )}
        {report.completedDate && (
          <p>
            <strong>Completed Date:</strong>{" "}
            {formatDateTime(report.completedDate)}
          </p>
        )}
        {report.radiologist?.name && (
          <p>
            <strong>Radiologist:</strong> {report.radiologist.name}
          </p>
        )}
      </div>
      {report.status === "completed" && (
        <>
          {report.findings && (
            <p>
              <strong>Findings:</strong> {report.findings}
            </p>
          )}
          {report.impression && (
            <p>
              <strong>Impression:</strong> {report.impression}
            </p>
          )}
          {report.recommendations && (
            <p>
              <strong>Recommendations:</strong> {report.recommendations}
            </p>
          )}
        </>
      )}
      {report.status === "completed" && report.images?.length > 0 && (
        <div className="mt-4 pt-3 border-t">
          <h4 className="font-semibold mb-2">Images:</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {report.images.map((img, idx) => (
              <a
                key={idx}
                href={img.url}
                target="_blank"
                rel="noopener noreferrer"
                title={img.description || "View Image"}
              >
                <img
                  src={img.url}
                  alt={img.description || `Radiology Image ${idx + 1}`}
                  className="rounded border object-contain aspect-square hover:opacity-80 transition-opacity"
                />
              </a>
            ))}
          </div>
        </div>
      )}
      {report.notes && (
        <p>
          <strong>Notes:</strong> {report.notes}
        </p>
      )}
    </div>
  );
};

const RadiologyResultsPage = () => {
  const [radiologyTests, setRadiologyTests] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterHospitalId, setFilterHospitalId] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const TESTS_PER_PAGE = 15;

  const fetchRadiologyTests = useCallback(
    async (page = 1, status = "", hospitalId = "") => {
      setIsLoading(true);
      setError(null);
      try {
        const params = {
          page,
          limit: TESTS_PER_PAGE,
          status: status || undefined,
          hospitalId: hospitalId || undefined,
        };
        const response = await patientService.getPatientRadiologyResults(
          params
        );
        if (response.success) {
          setRadiologyTests(response.radiologyTests);
          setPagination(response.pagination);
          setCurrentPage(response.pagination.page);
        } else {
          throw new Error(
            response.message || "Failed to fetch radiology results"
          );
        }
      } catch (err) {
        console.error("Fetch radiology results error:", err);
        setError(err.message || "Could not load radiology results.");
        toast.error(err.message || "Could not load radiology results.");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchRadiologyTests(currentPage, filterStatus, filterHospitalId);
  }, [fetchRadiologyTests, currentPage, filterStatus, filterHospitalId]);

  const handlePageChange = (page) => setCurrentPage(page);

  const handleStatusChange = (selectedOption) => {
    setFilterStatus(selectedOption ? selectedOption.value : "");
    setCurrentPage(1);
  };

  const handleHospitalFilterChange = (selectedOption) => {
    setFilterHospitalId(selectedOption ? selectedOption.value : "");
    setCurrentPage(1);
  };

  const handleViewDetails = (report) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const initiateRadiologyTestPayment = async (test) => {
    setActionLoadingId(test._id);
    try {
      const paymentResponse = await paymentService.initiatePayment({
        paymentFor: "radiologyTest",
        itemId: test._id,
        paymentMethod: "khalti",
      });
      if (paymentResponse.success && paymentResponse.payment?.paymentUrl) {
        notifyInfo("Redirecting to Khalti for payment...");
        window.location.href = paymentResponse.payment.paymentUrl;
      } else {
        throw new Error(
          paymentResponse.message || "Failed to get Khalti payment URL."
        );
      }
    } catch (err) {
      toast.error(`Payment Initiation Failed: ${err.message}`);
      setActionLoadingId(null);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedReport(null);
  };

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "requested", label: "Requested" },
    { value: "confirmed", label: "Confirmed" },
    { value: "scheduled", label: "Scheduled" },
    { value: "in-progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const columns = useMemo(
    () => [
      { Header: "Procedure", accessor: "procedureType" },
      {
        Header: "Hospital",
        accessor: "hospitalId.name",
        Cell: ({ value }) => value || "N/A",
      },
      { Header: "Body Part", accessor: "bodyPart" },
      {
        Header: "Requested Date",
        accessor: "requestDate",
        Cell: ({ value }) => formatDate(value),
      },
      {
        Header: "Requested By",
        accessor: "doctorId.userId.name",
        Cell: ({ value }) => `Dr. ${value || "N/A"}`,
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
        Cell: ({ row }) => (
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadgeClass(
              row.original.payment?.status || "pending"
            )} text-white`}
          >
            {getDisplayStatus(row.original.payment?.status || "pending")}
          </span>
        ),
      },
      {
        Header: "Actions",
        accessor: "_id",
        Cell: ({ row }) => {
          const test = row.original;
          const showPayNow =
            test.status === "requested" && test.payment?.status === "pending";
          const showReport = test.status === "completed";
          return (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewDetails(test)}
                title="View Test Details"
                className="flex-shrink-0"
              >
                <EyeIcon className="w-4 h-4" />
              </Button>
              {showPayNow && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => initiateRadiologyTestPayment(test)}
                  isLoading={actionLoadingId === test._id}
                  disabled={!!actionLoadingId}
                  title={`Pay ${formatCurrency(test.payment?.amount || 0)}`}
                  className="flex-shrink-0"
                >
                  <CurrencyDollarIcon className="w-4 h-4 mr-1" /> Pay Now
                </Button>
              )}
              {showReport && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleViewDetails(test)}
                  title="View Report"
                  className="flex-shrink-0"
                >
                  <EyeIcon className="w-4 h-4 mr-1" /> Report
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [actionLoadingId]
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">
        My Radiology Results
      </h1>
      <div className="p-4 bg-white rounded shadow grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <HospitalFilter
          selectedHospital={filterHospitalId}
          onHospitalChange={handleHospitalFilterChange}
        />
        <div>
          <label htmlFor="statusFilterRadio" className="form-label">
            Filter by Status
          </label>
          <Select
            id="statusFilterRadio"
            name="status"
            options={statusOptions}
            value={
              statusOptions.find((opt) => opt.value === filterStatus) || null
            }
            onChange={handleStatusChange}
            placeholder="Select status..."
            isClearable
          />
        </div>
      </div>
      {error && <p className="text-center text-danger-500 py-4">{error}</p>}
      <Table
        columns={columns}
        data={radiologyTests}
        isLoading={isLoading}
        emptyMessage="No radiology tests found."
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
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={`Radiology Request Details: ${
          selectedReport?.procedureType || ""
        } - ${selectedReport?.bodyPart || ""}`}
        size="4xl"
      >
        {selectedReport ? (
          <RadiologyReportDetail report={selectedReport} />
        ) : (
          <p>Loading details...</p>
        )}
        <div className="pt-4 mt-4 border-t flex justify-end">
          {" "}
          <Button variant="outline" onClick={closeModal}>
            {" "}
            Close{" "}
          </Button>{" "}
        </div>
      </Modal>
    </div>
  );
};

export default RadiologyResultsPage;
