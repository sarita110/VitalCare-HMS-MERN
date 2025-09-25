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

// Component to display detailed lab REPORT in modal
const LabReportDetail = ({ report }) => {
  if (!report) return <p>No report details available.</p>;
  return (
    <div className="space-y-3 text-sm">
      <p>
        <strong>Report Date:</strong> {formatDateTime(report.reportDate)}
      </p>
      {report.technician?.name && (
        <p>
          <strong>Technician:</strong> {report.technician.name}
        </p>
      )}
      <p>
        <strong>Summary:</strong> {report.summary || "N/A"}
      </p>
      {report.conclusion && (
        <p>
          <strong>Conclusion:</strong> {report.conclusion}
        </p>
      )}
      {report.recommendations && (
        <p>
          <strong>Recommendations:</strong> {report.recommendations}
        </p>
      )}
      {report.attachment?.url && (
        <p>
          <strong>Attachment:</strong>{" "}
          <a
            href={report.attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline"
          >
            {report.attachment.name || "View Attachment"}
          </a>
        </p>
      )}
      {report.results?.length > 0 && (
        <div className="mt-4 pt-3 border-t">
          <h4 className="font-semibold mb-2">Results:</h4>
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-1">Parameter</th>
                <th className="px-2 py-1">Value</th>
                <th className="px-2 py-1">Unit</th>
                <th className="px-2 py-1">Normal Range</th>
                <th className="px-2 py-1">Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {report.results.map((res, idx) => (
                <tr key={idx} className="border-b last:border-b-0">
                  <td className="px-2 py-1 font-medium">{res.parameter}</td>
                  <td className="px-2 py-1">{res.value}</td>
                  <td className="px-2 py-1">{res.unit || "-"}</td>
                  <td className="px-2 py-1">{res.normalRange || "-"}</td>
                  <td className="px-2 py-1">{res.interpretation || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Component to display detailed lab TEST REQUEST info in modal
const LabTestRequestDetail = ({ test }) => {
  if (!test) return <p>No test details available.</p>;
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 mb-4 border-b pb-3">
        <p>
          <strong>Test Name:</strong> {test.testName}
        </p>
        <p>
          <strong>Test Type:</strong> {test.testType}
        </p>
        <p>
          <strong>Requested By:</strong> Dr.{" "}
          {test.doctorId?.userId?.name || "N/A"}
        </p>
        <p>
          <strong>Requested Date:</strong> {formatDate(test.requestDate)}
        </p>
        <p>
          <strong>Hospital:</strong> {test.hospitalId?.name || "N/A"}
        </p>{" "}
        {/* Display hospital */}
        <p>
          <strong>Status:</strong>{" "}
          <span className={`badge ${getStatusBadgeClass(test.status)}`}>
            {getDisplayStatus(test.status)}
          </span>
        </p>
        <p>
          <strong>Payment Status:</strong>{" "}
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadgeClass(
              test.payment?.status || "pending"
            )} text-white`}
          >
            {getDisplayStatus(test.payment?.status || "pending")}
          </span>
          {test.payment?.status === "pending" && test.payment?.amount && (
            <span className="ml-2">
              ({formatCurrency(test.payment.amount)})
            </span>
          )}
        </p>
        {test.scheduledDate && (
          <p>
            <strong>Scheduled Date:</strong> {formatDate(test.scheduledDate)}
          </p>
        )}
        {test.assignedTo?.name && (
          <p>
            <strong>Assigned To:</strong> {test.assignedTo.name}
          </p>
        )}
      </div>
      {test.description && (
        <p>
          <strong>Description:</strong> {test.description}
        </p>
      )}
      {test.instructions && (
        <p>
          <strong>Instructions:</strong> {test.instructions}
        </p>
      )}
      {test.notes && (
        <p>
          <strong>Notes:</strong> {test.notes}
        </p>
      )}
    </div>
  );
};

const LabResultsPage = () => {
  const [labTests, setLabTests] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterHospitalId, setFilterHospitalId] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const TESTS_PER_PAGE = 15;

  const fetchLabTests = useCallback(
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
        const response = await patientService.getPatientLabResults(params);
        if (response.success) {
          setLabTests(response.labTests);
          setPagination(response.pagination);
          setCurrentPage(response.pagination.page);
        } else {
          throw new Error(response.message || "Failed to fetch lab results");
        }
      } catch (err) {
        console.error("Fetch lab results error:", err);
        setError(err.message || "Could not load lab results.");
        toast.error(err.message || "Could not load lab results.");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchLabTests(currentPage, filterStatus, filterHospitalId);
  }, [fetchLabTests, currentPage, filterStatus, filterHospitalId]);

  const handlePageChange = (page) => setCurrentPage(page);

  const handleStatusChange = (selectedOption) => {
    setFilterStatus(selectedOption ? selectedOption.value : "");
    setCurrentPage(1);
  };

  const handleHospitalFilterChange = (selectedOption) => {
    setFilterHospitalId(selectedOption ? selectedOption.value : "");
    setCurrentPage(1);
  };

  const handleViewReport = (report) => {
    if (report) {
      setSelectedReport(report);
      setIsReportModalOpen(true);
    }
  };

  const handleViewDetails = (test) => {
    setSelectedTest(test);
    setIsDetailModalOpen(true);
  };

  const initiateLabTestPayment = async (test) => {
    setActionLoadingId(test._id);
    try {
      const paymentResponse = await paymentService.initiatePayment({
        paymentFor: "labTest",
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
    setIsDetailModalOpen(false);
    setIsReportModalOpen(false);
    setSelectedTest(null);
    setSelectedReport(null);
  };

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "requested", label: "Requested" },
    { value: "confirmed", label: "Confirmed" },
    { value: "scheduled", label: "Scheduled" },
    { value: "sample-collected", label: "Sample Collected" },
    { value: "in-progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const columns = useMemo(
    () => [
      { Header: "Test Name", accessor: "testName" },
      {
        Header: "Hospital",
        accessor: "hospitalId.name",
        Cell: ({ value }) => value || "N/A",
      },
      { Header: "Test Type", accessor: "testType" },
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
          const hasResult = test.resultId?._id;
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
                  onClick={() => initiateLabTestPayment(test)}
                  isLoading={actionLoadingId === test._id}
                  disabled={!!actionLoadingId}
                  title={`Pay ${formatCurrency(test.payment?.amount || 0)}`}
                  className="flex-shrink-0"
                >
                  <CurrencyDollarIcon className="w-4 h-4 mr-1" /> Pay Now
                </Button>
              )}
              {hasResult && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleViewReport(test.resultId)}
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
      <h1 className="text-2xl font-semibold text-gray-800">My Lab Results</h1>
      <div className="p-4 bg-white rounded shadow grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <HospitalFilter
          selectedHospital={filterHospitalId}
          onHospitalChange={handleHospitalFilterChange}
        />
        <div>
          <label htmlFor="statusFilterLab" className="form-label">
            Filter by Status
          </label>
          <Select
            id="statusFilterLab"
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
        data={labTests}
        isLoading={isLoading}
        emptyMessage="No lab tests found."
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
        isOpen={isReportModalOpen}
        onClose={closeModal}
        title={`Lab Report: ${selectedReport?.testId?.testName || ""}`}
        size="3xl"
      >
        {selectedReport ? (
          <LabReportDetail report={selectedReport} />
        ) : (
          <p>Loading report...</p>
        )}
        <div className="pt-4 mt-4 border-t flex justify-end">
          {" "}
          <Button variant="outline" onClick={closeModal}>
            {" "}
            Close{" "}
          </Button>{" "}
        </div>
      </Modal>
      <Modal
        isOpen={isDetailModalOpen}
        onClose={closeModal}
        title={`Lab Test Request Details: ${selectedTest?.testName || ""}`}
        size="xl"
      >
        {selectedTest ? (
          <LabTestRequestDetail test={selectedTest} />
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

export default LabResultsPage;
