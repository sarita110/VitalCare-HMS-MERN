import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
} from "react";
import toast from "react-hot-toast";
import {
  useSearchParams,
  Link,
  useParams,
  useNavigate,
} from "react-router-dom";
import patientService from "../../services/patientService";
import paymentService from "../../services/paymentService";
import AuthContext from "../../context/AuthContext";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Table from "../../components/common/Table";
import Pagination from "../../components/common/Pagination";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import FormInput from "../../components/common/FormInput";
import Card from "../../components/common/Card";
import { notifyInfo } from "../../components/common/Notification";
import RescheduleAppointmentModal from "../../components/appointments/RescheduleAppointmentModal";
import HospitalFilter from "../../components/common/HospitalFilter"; // <<< NEW IMPORT
import {
  getStatusBadgeClass,
  getDisplayStatus,
  formatDateTime,
  formatCurrency,
} from "../../utils/helpers";
import { differenceInHours } from "date-fns";
import Select from "react-select";

const MyAppointmentsPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { id: appointmentIdParam } = useParams();
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentProcessingId, setPaymentProcessingId] = useState(null);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState(null);

  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const currentStatus = searchParams.get("status") || "";
  const filterUpcoming = searchParams.get("upcoming") === "true";
  const currentHospitalId = searchParams.get("hospitalId") || "";

  const APPOINTMENTS_PER_PAGE = 10;

  const fetchAppointments = useCallback(async () => {
    if (appointmentIdParam) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        limit: APPOINTMENTS_PER_PAGE,
        status: currentStatus || undefined,
        upcoming: filterUpcoming || undefined,
        hospitalId: currentHospitalId || undefined,
      };
      const response = await patientService.getPatientAppointments(params);
      if (response.success) {
        setAppointments(response.appointments);
        setPagination(response.pagination);
      } else {
        throw new Error(response.message || "Failed to fetch appointments");
      }
    } catch (err) {
      console.error("Fetch patient appointments error:", err);
      setError(err.message || "Could not load appointments.");
      toast.error(err.message || "Could not load appointments.");
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    currentStatus,
    filterUpcoming,
    currentHospitalId,
    appointmentIdParam,
  ]);

  const fetchAppointmentDetails = useCallback(async () => {
    if (!appointmentIdParam) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await patientService.getPatientAppointmentDetails(
        appointmentIdParam
      );
      if (response.success) {
        setSelectedAppointment(response.appointment);
      } else {
        throw new Error(
          response.message || "Failed to fetch appointment details"
        );
      }
    } catch (err) {
      console.error("Fetch appointment details error:", err);
      setError(err.message || "Could not load appointment details.");
      toast.error(err.message || "Could not load appointment details.");
    } finally {
      setIsLoading(false);
    }
  }, [appointmentIdParam]);

  useEffect(() => {
    if (appointmentIdParam) {
      fetchAppointmentDetails();
    } else {
      fetchAppointments();
    }
  }, [fetchAppointments, fetchAppointmentDetails, appointmentIdParam]);

  const handlePageChange = (page) =>
    setSearchParams(
      (prev) => {
        prev.set("page", page.toString());
        return prev;
      },
      { replace: true }
    );

  const handleStatusFilterChange = (selectedOption) =>
    setSearchParams(
      (prev) => {
        if (selectedOption && selectedOption.value)
          prev.set("status", selectedOption.value);
        else prev.delete("status");
        prev.set("page", "1");
        return prev;
      },
      { replace: true }
    );

  const handleHospitalFilterChange = (selectedOption) => {
    setSearchParams(
      (prev) => {
        if (selectedOption && selectedOption.value)
          prev.set("hospitalId", selectedOption.value);
        else prev.delete("hospitalId");
        prev.set("page", "1");
        return prev;
      },
      { replace: true }
    );
  };

  const handleUpcomingToggle = () =>
    setSearchParams(
      (prev) => {
        if (filterUpcoming) prev.delete("upcoming");
        else {
          prev.set("upcoming", "true");
          prev.delete("status"); // Clear status filter when showing upcoming
        }
        prev.set("page", "1");
        return prev;
      },
      { replace: true }
    );

  const handleCancelClick = (appointment) => {
    const now = new Date();
    const apptTime = new Date(appointment.dateTime);
    if (differenceInHours(apptTime, now) < 24) {
      toast.error("Cannot cancel appointments within 24 hours.");
      return;
    }
    setAppointmentToCancel(appointment);
    setCancelReason("");
    setShowCancelConfirm(true);
  };

  const confirmCancel = async () => {
    if (!appointmentToCancel) return;
    setActionLoading(true);
    try {
      const response = await patientService.cancelPatientAppointment(
        appointmentToCancel._id,
        { reason: cancelReason }
      );
      if (response.success) {
        toast.success("Appointment cancelled successfully!");
        if (appointmentIdParam) fetchAppointmentDetails();
        else fetchAppointments();
      } else {
        throw new Error(response.message || "Failed to cancel appointment");
      }
    } catch (err) {
      console.error("Cancel appointment error:", err);
      toast.error(err.message || "Could not cancel appointment.");
    } finally {
      setActionLoading(false);
      setShowCancelConfirm(false);
      setAppointmentToCancel(null);
    }
  };

  const handleRescheduleClick = (appointment) => {
    const now = new Date();
    const apptTime = new Date(appointment.dateTime);
    if (differenceInHours(apptTime, now) < 24) {
      toast.error("Cannot reschedule appointments within 24 hours.");
      return;
    }
    setAppointmentToReschedule(appointment);
    setShowRescheduleModal(true);
  };

  const handleReschedule = async (newDateTime) => {
    if (!appointmentToReschedule || !newDateTime) {
      toast.error("Please select a new date and time.");
      return;
    }
    setActionLoading(true);
    try {
      const response = await patientService.reschedulePatientAppointment(
        appointmentToReschedule._id,
        { dateTime: newDateTime }
      );
      if (response.success) {
        toast.success("Appointment rescheduled successfully!");
        if (appointmentIdParam) fetchAppointmentDetails();
        else fetchAppointments();
      } else {
        throw new Error(response.message || "Failed to reschedule appointment");
      }
    } catch (err) {
      console.error("Reschedule appointment error:", err);
      toast.error(err.message || "Could not reschedule appointment.");
    } finally {
      setActionLoading(false);
      setShowRescheduleModal(false);
      setAppointmentToReschedule(null);
    }
  };

  const initiateAppointmentPayment = async (appointment) => {
    setPaymentProcessingId(appointment._id);
    setActionLoading(true);
    try {
      const paymentResponse = await paymentService.initiatePayment({
        paymentFor: "appointment",
        itemId: appointment._id,
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
      setActionLoading(false);
      setPaymentProcessingId(null);
    }
  };

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "scheduled", label: "Scheduled" },
    { value: "confirmed", label: "Confirmed" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "no-show", label: "No-show" },
  ];

  const columns = useMemo(
    () => [
      {
        Header: "Date & Time",
        accessor: "dateTime",
        Cell: ({ value }) => formatDateTime(value),
      },
      {
        Header: "Doctor",
        accessor: "doctorId.userId.name",
        Cell: ({ value }) => `Dr. ${value || "N/A"}`,
      },
      {
        Header: "Hospital",
        accessor: "hospitalId.name",
        Cell: ({ value }) => value || "N/A",
      },
      {
        Header: "Reason",
        accessor: "reason",
        Cell: ({ value }) => (
          <span className="truncate block w-32" title={value}>
            {value}
          </span>
        ),
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
        Cell: ({ value }) => (
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadgeClass(
              value
            )} text-white`}
          >
            {getDisplayStatus(value || "N/A")}
          </span>
        ),
      },
      {
        Header: "Actions",
        accessor: "_id",
        Cell: ({ row }) => {
          const appointment = row.original;
          const now = new Date();
          const apptTime = new Date(appointment.dateTime);
          const hoursDifference = differenceInHours(apptTime, now);
          const isPaymentPending = appointment.payment?.status === "pending";
          const isScheduledOrConfirmed = ["scheduled", "confirmed"].includes(
            appointment.status
          );
          const canCancelOrReschedule =
            isScheduledOrConfirmed && hoursDifference >= 24;
          const showPayNow =
            isScheduledOrConfirmed && isPaymentPending && hoursDifference > 0;
          const needsPaymentSoon = showPayNow && hoursDifference < 48;
          return (
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 justify-end min-w-[200px]">
              {showPayNow && (
                <Button
                  size="xs"
                  variant={needsPaymentSoon ? "danger" : "primary"}
                  onClick={() => initiateAppointmentPayment(appointment)}
                  isLoading={paymentProcessingId === appointment._id}
                  disabled={!!paymentProcessingId}
                  title={
                    needsPaymentSoon
                      ? "Payment required soon!"
                      : "Pay to confirm"
                  }
                >
                  Pay {formatCurrency(appointment.payment?.amount || 0)}
                </Button>
              )}
              {canCancelOrReschedule && (
                <>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => handleRescheduleClick(appointment)}
                    disabled={actionLoading}
                  >
                    Reschedule
                  </Button>
                  <Button
                    size="xs"
                    variant="warning"
                    onClick={() => handleCancelClick(appointment)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>
                </>
              )}
              <Link to={`/patient/appointments/${appointment._id}`}>
                <Button size="xs" variant="secondary">
                  Details
                </Button>
              </Link>
            </div>
          );
        },
      },
    ],
    [actionLoading, paymentProcessingId] // Removed other handlers from deps as they don't directly change columns
  );

  const renderAppointmentDetails = () => {
    if (!selectedAppointment) return null;
    const appointment = selectedAppointment;
    const now = new Date();
    const apptTime = new Date(appointment.dateTime);
    const hoursDifference = differenceInHours(apptTime, now);
    const isPaymentPending = appointment.payment?.status === "pending";
    const isScheduledOrConfirmed = ["scheduled", "confirmed"].includes(
      appointment.status
    );
    const canCancelOrReschedule =
      isScheduledOrConfirmed && hoursDifference >= 24;
    const showPayNow =
      isScheduledOrConfirmed && isPaymentPending && hoursDifference > 0;
    const needsPaymentSoon = showPayNow && hoursDifference < 48;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Appointment Details</h2>
          <Button
            variant="outline"
            onClick={() => navigate("/patient/appointments")}
          >
            Back to List
          </Button>
        </div>
        <Card>
          <div className="space-y-4">
            {appointment.hospitalId && (
              <div className="border-b pb-4">
                <h3 className="text-lg font-medium">Hospital Information</h3>
                <p>
                  <strong>Name:</strong> {appointment.hospitalId.name}
                </p>
                {/* You can add more hospital details here if populated, e.g., address */}
                {/* <p><strong>Address:</strong> {appointment.hospitalId.address?.city}</p> */}
              </div>
            )}
            {appointment.doctorId && (
              <div className="border-b pb-4">
                <h3 className="text-lg font-medium">Doctor Information</h3>
                <p>
                  <strong>Name:</strong> Dr.{" "}
                  {appointment.doctorId.userId?.name || "N/A"}
                </p>
                <p>
                  <strong>Speciality:</strong>{" "}
                  {appointment.doctorId.speciality || "N/A"}
                </p>
              </div>
            )}
            <div className="border-b pb-4">
              <h3 className="text-lg font-medium">Appointment Information</h3>
              <p>
                <strong>Date & Time:</strong>{" "}
                {formatDateTime(appointment.dateTime)}
              </p>
              <p>
                <strong>Type:</strong> {getDisplayStatus(appointment.type)}
              </p>
              <p>
                <strong>Reason:</strong> {appointment.reason}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={`ml-2 inline-block badge ${getStatusBadgeClass(
                    appointment.status
                  )}`}
                >
                  {getDisplayStatus(appointment.status)}
                </span>
              </p>
              {appointment.notes && (
                <p>
                  <strong>Notes:</strong> {appointment.notes}
                </p>
              )}
            </div>
            {appointment.payment && (
              <div className="border-b pb-4 space-y-2">
                <h3 className="text-lg font-medium">Payment Information</h3>
                <p>
                  <strong>Amount:</strong>{" "}
                  {formatCurrency(appointment.payment.amount)}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span
                    className={`ml-2 inline-block badge ${getStatusBadgeClass(
                      appointment.payment.status
                    )}`}
                  >
                    {getDisplayStatus(appointment.payment.status)}
                  </span>
                </p>
                {appointment.payment.method && (
                  <p>
                    <strong>Method:</strong>{" "}
                    {getDisplayStatus(appointment.payment.method)}
                  </p>
                )}
                {showPayNow && (
                  <div className="pt-2">
                    <Button
                      variant={needsPaymentSoon ? "danger" : "primary"}
                      onClick={() => initiateAppointmentPayment(appointment)}
                      isLoading={paymentProcessingId === appointment._id}
                      disabled={!!paymentProcessingId}
                    >
                      {needsPaymentSoon
                        ? "Pay Now (Urgent)"
                        : "Pay Now to Confirm"}
                    </Button>
                  </div>
                )}
              </div>
            )}
            {canCancelOrReschedule && (
              <div className="pt-2 flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => handleRescheduleClick(appointment)}
                  disabled={actionLoading}
                >
                  Reschedule
                </Button>
                <Button
                  variant="warning"
                  onClick={() => handleCancelClick(appointment)}
                  disabled={actionLoading}
                >
                  Cancel Appointment
                </Button>
              </div>
            )}
          </div>
        </Card>
        {/* Related Medical Records, Lab Tests, Radiology Tests can be added here if needed */}
      </div>
    );
  };

  if (appointmentIdParam) {
    return (
      <div>
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <p className="text-center text-danger-500 py-4">{error}</p>
        ) : (
          renderAppointmentDetails()
        )}
        <Modal
          isOpen={showCancelConfirm}
          onClose={() => setShowCancelConfirm(false)}
          title="Confirm Cancellation"
        >
          <p>Are you sure you want to cancel this appointment?</p>
          <p className="text-xs text-gray-500">
            Note: Must be cancelled at least 24 hours in advance.
          </p>
          <FormInput
            label="Reason (Optional)"
            id="cancelReason"
            name="cancelReason"
            type="textarea"
            rows={2}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="mt-2"
          />
          <div className="pt-4 flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowCancelConfirm(false)}
            >
              Back
            </Button>
            <Button
              variant="warning"
              onClick={confirmCancel}
              isLoading={actionLoading}
            >
              Confirm Cancel
            </Button>
          </div>
        </Modal>
        <RescheduleAppointmentModal
          isOpen={showRescheduleModal}
          onClose={() => setShowRescheduleModal(false)}
          appointment={appointmentToReschedule}
          onReschedule={handleReschedule}
          isLoading={actionLoading}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-800">
          My Appointments
        </h1>
        <Link to="/patient/book-appointment">
          <Button>Book New Appointment</Button>
        </Link>
      </div>
      <div className="p-4 bg-white rounded shadow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
        <HospitalFilter
          selectedHospital={currentHospitalId}
          onHospitalChange={handleHospitalFilterChange}
          className="md:col-span-1"
        />
        <div>
          <label htmlFor="statusFilterAppt" className="form-label">
            Filter by Status
          </label>
          <Select
            id="statusFilterAppt"
            name="status"
            options={statusOptions}
            value={
              statusOptions.find((opt) => opt.value === currentStatus) || null
            }
            onChange={handleStatusFilterChange}
            placeholder="Select status..."
            isClearable
            isDisabled={filterUpcoming}
          />
        </div>
        <div className="flex items-center mt-2 md:mt-0 md:pt-6">
          <input
            id="upcomingToggle"
            name="upcoming"
            type="checkbox"
            checked={filterUpcoming}
            onChange={handleUpcomingToggle}
            className="form-checkbox h-5 w-5 text-primary-600 rounded focus:ring-primary-500"
          />
          <label
            htmlFor="upcomingToggle"
            className="ml-2 block text-sm text-gray-900"
          >
            Show Only Upcoming
          </label>
        </div>
      </div>
      {error && <p className="text-center text-danger-500 py-4">{error}</p>}
      <Table
        columns={columns}
        data={appointments}
        isLoading={isLoading}
        emptyMessage="No appointments found."
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
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        title="Confirm Cancellation"
      >
        <p>Are you sure you want to cancel this appointment?</p>
        <p className="text-xs text-gray-500">
          Note: Must be cancelled at least 24 hours in advance.
        </p>
        <FormInput
          label="Reason (Optional)"
          id="cancelReasonList"
          name="cancelReason"
          type="textarea"
          rows={2}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          className="mt-2"
        />
        <div className="pt-4 flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>
            Back
          </Button>
          <Button
            variant="warning"
            onClick={confirmCancel}
            isLoading={actionLoading}
          >
            Confirm Cancel
          </Button>
        </div>
      </Modal>
      <RescheduleAppointmentModal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        appointment={appointmentToReschedule}
        onReschedule={handleReschedule}
        isLoading={actionLoading}
      />
    </div>
  );
};

export default MyAppointmentsPage;
