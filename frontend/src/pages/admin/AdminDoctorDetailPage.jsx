// src/pages/admin/DoctorDetailPage.jsx
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
  formatCurrency,
  getStatusBadgeClass,
  getDisplayStatus,
} from "../../utils/helpers";
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarDaysIcon,
  ArrowLeftIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  CurrencyDollarIcon,
  ClockIcon,
  BuildingOfficeIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

const AdminDoctorDetailPage = () => {
  const { id: doctorId } = useParams(); // Doctor Profile ID
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null); // Will hold combined data
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDoctorDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Uses Doctor Profile ID
      const response = await adminService.getDoctorDetails(doctorId);
      if (response.success) {
        setDoctor(response.doctor); // Combined data is in response.doctor
      } else {
        throw new Error(response.message || "Failed to fetch doctor details");
      }
    } catch (err) {
      console.error("Fetch doctor details error:", err);
      setError(err.message || "Could not load doctor details.");
      toast.error(err.message || "Could not load doctor details.");
    } finally {
      setIsLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    fetchDoctorDetails();
  }, [fetchDoctorDetails]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <p className="text-center text-danger-500 py-4">{error}</p>;
  if (!doctor)
    return <p className="text-center text-gray-500 py-4">Doctor not found.</p>;

  // Destructure combined data
  const { user, stats, ...doctorProfileData } = doctor;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)} // Go back
          leftIcon={<ArrowLeftIcon className="w-4 h-4" />}
        >
          Back
        </Button>
        <h1 className="text-2xl font-semibold text-gray-800">Doctor Details</h1>
      </div>

      {/* Doctor Summary Card */}
      <Card>
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
          <Avatar src={user?.image} alt={user?.name} size="xl" />
          <div className="flex-grow text-center md:text-left">
            <h2 className="text-xl font-bold text-gray-900">
              Dr. {user?.name || "N/A"}
            </h2>
            <p className="text-md text-primary-700">
              {doctorProfileData.speciality || "N/A"}
            </p>
            <p className="text-sm text-gray-500">
              {user?.department?.name || "No Department"}
            </p>
            <span
              className={`mt-1 inline-block badge ${getStatusBadgeClass(
                user?.isActive ? "active" : "inactive"
              )}`}
            >
              {user?.isActive ? "Active" : "Inactive"}
            </span>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
              <p className="flex items-center">
                <EnvelopeIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                {user?.email || "N/A"}
              </p>
              <p className="flex items-center">
                <PhoneIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                {user?.phone || "N/A"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Professional Details */}
      <Card title="Professional Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <p className="flex items-center">
            <AcademicCapIcon className="w-4 h-4 mr-1.5 text-gray-400 shrink-0" />
            <strong>Degree:</strong>  {doctorProfileData.degree || "N/A"}
          </p>
          <p className="flex items-center">
            <BriefcaseIcon className="w-4 h-4 mr-1.5 text-gray-400 shrink-0" />
            <strong>Experience:</strong> {" "}
            {doctorProfileData.experience || "N/A"}
          </p>
          <p className="flex items-center">
            <CurrencyDollarIcon className="w-4 h-4 mr-1.5 text-gray-400 shrink-0" />
            <strong>Fee:</strong> {" "}
            {formatCurrency(doctorProfileData.fees) || "N/A"}
          </p>
          <p className="flex items-center">
            <ClockIcon className="w-4 h-4 mr-1.5 text-gray-400 shrink-0" />
            <strong>Consultation Time:</strong> {" "}
            {doctorProfileData.consultationTime || "N/A"} minutes
          </p>
          <p className="flex items-center col-span-full">
            <InformationCircleIcon className="w-4 h-4 mr-1.5 text-gray-400 shrink-0" />
            <strong>Registration No:</strong> {" "}
            {doctorProfileData.registrationNumber || "N/A"}
          </p>
          <p className="flex items-start col-span-full">
            <InformationCircleIcon className="w-4 h-4 mr-1.5 text-gray-400 mt-0.5 shrink-0" />
            <strong>About:</strong>  {doctorProfileData.about || "N/A"}
          </p>
        </div>
      </Card>

      {/* Availability & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Availability">
          <p className="flex items-center text-sm">
            {doctorProfileData.available ? (
              <>
                <CheckCircleIcon className="w-5 h-5 mr-2 text-success-500" />
                <span className="text-gray-700 font-medium">
                  Currently Available
                </span>
              </>
            ) : (
              <>
                <XCircleIcon className="w-5 h-5 mr-2 text-danger-500" />
                <span className="text-gray-700 font-medium">
                  Currently Unavailable
                </span>
              </>
            )}
          </p>
          {/* Add display of working hours if needed */}
        </Card>
        <Card title="Statistics">
          <div className="space-y-2 text-sm">
            <p>
              <strong>Total Appointments:</strong>{" "}
              {stats?.totalAppointments ?? 0}
            </p>
            <p>
              <strong>Completed Appointments:</strong>{" "}
              {stats?.completedAppointments ?? 0}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDoctorDetailPage;
