// src/pages/admin/AppointmentDetailPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
// import { notifyInfo } from "../../utils/notifications";
import { notifyInfo } from "../../components/common/Notification"; // Use notification utility
import adminService from "../../services/adminService"; // Use admin service
import appointmentService from "../../services/appointmentService"; // Use generic appointment service for fetching
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import {
  formatDateTime,
  formatCurrency,
  getStatusBadgeClass,
  getDisplayStatus,
} from "../../utils/helpers";
import {
  UserIcon,
  CalendarDaysIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  ArrowLeftIcon,
  UserCircleIcon,
  TagIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

const AdminAppointmentDetailPage = () => {
  const { id: appointmentId } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAppointmentDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use the generic appointment service, backend handles authorization
      const response =
        await appointmentService.getAppointmentDetails(appointmentId);
      if (response.success) {
        setAppointment(response.appointment);
      } else {
        throw new Error(
          response.message || "Failed to fetch appointment details",
        );
      }
    } catch (err) {
      console.error("Fetch appointment details error:", err);
      setError(err.message || "Could not load appointment details.");
      toast.error(err.message || "Could not load appointment details.");
    } finally {
      setIsLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    fetchAppointmentDetails();
  }, [fetchAppointmentDetails]);

  const handleCancel = async () => {
    // Add cancel logic if needed, reusing adminService.cancelAdminAppointment
    // ... (Implementation similar to AppointmentsManagementPage, maybe show modal)
    notifyInfo("Cancel functionality from detail page not implemented yet.");
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <p className="text-center text-danger-500 py-4">{error}</p>;
  if (!appointment)
    return (
      <p className="text-center text-gray-500 py-4">Appointment not found.</p>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">
          Appointment Details
        </h1>
        <Button
          variant="outline"
          onClick={() => navigate("/admin/appointments")}
          leftIcon={<ArrowLeftIcon className="w-4 h-4" />}
        >
          Back to List
        </Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Patient Information */}
          <div className="space-y-3 border-b md:border-b-0 md:border-r pb-4 md:pb-0 md:pr-6">
            <h3 className="text-lg font-medium text-gray-800 flex items-center">
              <UserIcon className="w-5 h-5 mr-2 text-gray-500" /> Patient
              Information
            </h3>
            <p>
              <strong>Name:</strong>{" "}
              {appointment.patientId?.userId?.name || "N/A"}
            </p>
            <p>
              <strong>Email:</strong>{" "}
              {appointment.patientId?.userId?.email || "N/A"}
            </p>
            <p>
              <strong>Phone:</strong>{" "}
              {appointment.patientId?.userId?.phone || "N/A"}
            </p>
            {/* Add link to patient details */}
            <Link
              to={`/admin/patients/${appointment.patientId?._id}`}
              className="text-sm text-primary-600 hover:underline mt-1 inline-block"
            >
              View Full Patient Details →
            </Link>
          </div>

          {/* Doctor Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-800 flex items-center">
              <UserCircleIcon className="w-5 h-5 mr-2 text-gray-500" /> Doctor
              Information
            </h3>
            <p>
              <strong>Name:</strong> Dr.{" "}
              {appointment.doctorId?.userId?.name || "N/A"}
            </p>
            <p>
              <strong>Speciality:</strong>{" "}
              {appointment.doctorId?.speciality || "N/A"}
            </p>
            {/* Add link to doctor details */}
            <Link
              to={`/admin/doctors/${appointment.doctorId?._id}`} // Assuming doctorId here is the Doctor Profile ID
              className="text-sm text-primary-600 hover:underline mt-1 inline-block"
            >
              View Full Doctor Details →
            </Link>
          </div>
        </div>

        {/* Appointment Information */}
        <div className="border-t mt-6 pt-6 space-y-3">
          <h3 className="text-lg font-medium text-gray-800 flex items-center">
            <CalendarDaysIcon className="w-5 h-5 mr-2 text-gray-500" />{" "}
            Appointment Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
            <p>
              <strong>Date & Time:</strong>{" "}
              {formatDateTime(appointment.dateTime)}
            </p>
            <p>
              <strong>Type:</strong> {getDisplayStatus(appointment.type)}
            </p>
            <p className="col-span-full">
              <strong>Reason:</strong> {appointment.reason}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              <span
                className={`ml-1 inline-block badge ${getStatusBadgeClass(
                  appointment.status,
                )}`}
              >
                {getDisplayStatus(appointment.status)}
              </span>
            </p>
            <p>
              <strong>Created By:</strong>{" "}
              {appointment.createdBy?.name || "N/A"} (
              {getDisplayStatus(appointment.createdBy?.role)})
            </p>
            {appointment.notes && (
              <p className="col-span-full">
                <strong>Notes:</strong> {appointment.notes}
              </p>
            )}
          </div>
        </div>

        {/* Payment Information */}
        {appointment.payment && (
          <div className="border-t mt-6 pt-6 space-y-3">
            <h3 className="text-lg font-medium text-gray-800 flex items-center">
              <CurrencyDollarIcon className="w-5 h-5 mr-2 text-gray-500" />{" "}
              Payment Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
              <p>
                <strong>Amount:</strong>{" "}
                {formatCurrency(appointment.payment.amount)}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={`ml-1 inline-block badge ${getStatusBadgeClass(
                    appointment.payment.status,
                  )}`}
                >
                  {getDisplayStatus(appointment.payment.status)}
                </span>
              </p>
              <p>
                <strong>Method:</strong>{" "}
                {getDisplayStatus(appointment.payment.method) || "N/A"}
              </p>
              <p>
                <strong>Transaction/Receipt:</strong>{" "}
                {appointment.payment.transactionId ||
                  appointment.payment.receiptNumber ||
                  "N/A"}
              </p>
            </div>
          </div>
        )}

        {/* Add Cancel button if needed */}
        {/* {['scheduled', 'confirmed'].includes(appointment.status) && (
                    <div className="border-t mt-6 pt-6 flex justify-end">
                        <Button variant="warning" onClick={handleCancel}>
                            Cancel Appointment
                        </Button>
                    </div>
                )} */}
      </Card>
    </div>
  );
};

export default AdminAppointmentDetailPage;
