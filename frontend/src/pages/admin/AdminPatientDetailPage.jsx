// src/pages/admin/PatientDetailPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import adminService from "../../services/adminService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Avatar from "../../components/common/Avatar";
import {
  formatDate,
  formatDateTime,
  calculateAge,
  getStatusBadgeClass,
  getDisplayStatus,
} from "../../utils/helpers";
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarDaysIcon,
  ArrowLeftIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  HeartIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";

const AdminPatientDetailPage = () => {
  const { id: patientId } = useParams(); // Patient Profile ID
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState({ appointments: [], payments: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPatientDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminService.getAdminPatientDetails(patientId);
      if (response.success) {
        setPatient(response.patient);
        setHistory(response.history || { appointments: [], payments: [] });
      } else {
        throw new Error(response.message || "Failed to fetch patient details");
      }
    } catch (err) {
      console.error("Fetch patient details error:", err);
      setError(err.message || "Could not load patient details.");
      toast.error(err.message || "Could not load patient details.");
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchPatientDetails();
  }, [fetchPatientDetails]);

  // Add handlers for status toggle/delete if needed from admin detail view
  // const handleStatusToggle = async () => { ... }
  // const handleDelete = async () => { ... }

  if (isLoading) return <LoadingSpinner />;
  if (error) return <p className="text-center text-danger-500 py-4">{error}</p>;
  if (!patient)
    return <p className="text-center text-gray-500 py-4">Patient not found.</p>;

  const { user: patientUser, ...patientProfileData } = patient;
  const fullAddress = patientProfileData.address
    ? `${patientProfileData.address.street || ""}, ${
        patientProfileData.address.city || ""
      }, ${patientProfileData.address.state || ""}`
    : "N/A";

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)} // Go back to previous page
          leftIcon={<ArrowLeftIcon className="w-4 h-4" />}
        >
          Back
        </Button>
        <h1 className="text-2xl font-semibold text-gray-800">
          Patient Details
        </h1>
      </div>

      {/* Patient Summary Card */}
      <Card>
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
          <Avatar src={patientUser?.image} alt={patientUser?.name} size="xl" />
          <div className="flex-grow text-center md:text-left">
            <h2 className="text-xl font-bold text-gray-900">
              {patientUser?.name || "N/A"}
            </h2>
            <span
              className={`mt-1 inline-block badge ${getStatusBadgeClass(
                patientUser?.isActive ? "active" : "inactive"
              )}`}
            >
              {patientUser?.isActive ? "Active" : "Inactive"}
            </span>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
              <p className="flex items-center">
                <EnvelopeIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                {patientUser?.email || "N/A"}
              </p>
              <p className="flex items-center">
                <PhoneIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                {patientUser?.phone || "N/A"}
              </p>
              <p>Gender: {patientProfileData.gender || "N/A"}</p>
              <p>
                DOB: {formatDate(patientProfileData.dob) || "N/A"} (
                {calculateAge(patientProfileData.dob) ?? "N/A"} years)
              </p>
              <p>Blood Group: {patientProfileData.bloodGroup || "N/A"}</p>
              <p className="flex items-center col-span-full">
                <MapPinIcon className="w-4 h-4 mr-1.5 text-gray-400 shrink-0" />
                Address: {fullAddress}
              </p>
              <p className="col-span-full">
                Registered: {formatDate(patientProfileData.registrationDate)}
              </p>
            </div>
            {/* Admin Actions (Optional) */}
            {/* <div className="mt-4 flex gap-2 justify-center md:justify-start">
                            <Button size="sm" variant="outline" onClick={handleStatusToggle}>Toggle Status</Button>
                            <Button size="sm" variant="danger" onClick={handleDelete}>Delete Patient</Button>
                        </div> */}
          </div>
        </div>
      </Card>

      {/* History Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Appointment History">
          {history.appointments?.length > 0 ? (
            <ul className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
              {history.appointments.map((appt) => (
                <li key={appt._id} className="py-3">
                  <p className="text-sm font-medium">
                    {formatDateTime(appt.dateTime)} - Dr.{" "}
                    {appt.doctorId?.userId?.name || "N/A"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Status:{" "}
                    <span
                      className={`badge ${getStatusBadgeClass(appt.status)}`}
                    >
                      {getDisplayStatus(appt.status)}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No appointment history.</p>
          )}
        </Card>

        <Card title="Payment History">
          {history.payments?.length > 0 ? (
            <ul className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
              {history.payments.map((payment) => (
                <li key={payment._id} className="py-3">
                  <p className="text-sm font-medium">
                    {formatDate(payment.paymentDate || payment.createdAt)} -{" "}
                    {formatCurrency(payment.amount)} ({payment.paymentMethod})
                  </p>
                  <p className="text-xs text-gray-500">
                    Status:{" "}
                    <span
                      className={`badge ${getStatusBadgeClass(payment.status)}`}
                    >
                      {getDisplayStatus(payment.status)}
                    </span>{" "}
                    | For: {getDisplayStatus(payment.relatedTo)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No payment history.</p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminPatientDetailPage;
