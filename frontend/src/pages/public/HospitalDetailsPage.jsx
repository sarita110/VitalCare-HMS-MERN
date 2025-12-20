// src/pages/public/HospitalDetailsPage.jsx
import React, { useState, useEffect, useContext } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import hospitalService from "../../services/hospitalService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import {
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  MapPinIcon,
  UserIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  ClockIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import useAuth from "../../hooks/useAuth"; // Import useAuth
import { ROLES } from "../../constants"; // Import ROLES

const HospitalDetailsPage = () => {
  const { id: hospitalIdParam } = useParams(); // Renamed to avoid conflict
  const { isAuthenticated, user } = useAuth(); // Get auth state
  const navigate = useNavigate(); // For navigation

  const [hospital, setHospital] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [loadingDoctorDetails, setLoadingDoctorDetails] = useState(false);
  const [doctorDetailsTab, setDoctorDetailsTab] = useState("overview");

  useEffect(() => {
    const fetchHospitalDetails = async () => {
      setIsLoading(true);
      try {
        const response = await hospitalService.getHospitalDetails(
          hospitalIdParam
        );
        if (response.success) {
          setHospital(response.hospital);
          // Assuming response.doctors is an array of { id, name, image, department, speciality }
          // We need to ensure the doctor objects here have the full profile ID if that's what getDoctorProfileById expects
          // For now, let's assume response.doctors contains objects with an 'id' that is the Doctor Profile ID
          setDoctors(response.doctors);
        } else {
          throw new Error(
            response.message || "Failed to load hospital details"
          );
        }
      } catch (err) {
        console.error("Error fetching hospital details:", err);
        setError(
          err.message || "An error occurred while loading hospital details"
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (hospitalIdParam) {
      fetchHospitalDetails();
    }
  }, [hospitalIdParam]);

  const handleBookAppointmentClick = () => {
    if (isAuthenticated && user?.role === ROLES.PATIENT) {
      navigate("/patient/book-appointment", {
        state: {
          preselectedHospital: {
            value: hospital._id,
            label: hospital.name,
          },
        },
      });
    } else {
      // If not authenticated or not a patient, redirect to login,
      // then ideally login should redirect to booking page with state.
      // For simplicity now, just redirect to login. A more complex flow would store intended action.
      navigate("/login", { state: { from: `/hospitals/${hospitalIdParam}` } });
    }
  };

  const handleDoctorSelect = async (doctor) => {
    // doctor object from the list
    if (selectedDoctor && selectedDoctor.id === doctor.id) {
      setSelectedDoctor(null);
      return;
    }
    setLoadingDoctorDetails(true);
    try {
      // Assuming doctor.id from the list is the Doctor Profile ID
      const response = await hospitalService.getDoctorProfileById(doctor.id);
      if (response.success) {
        setSelectedDoctor(response.profile); // response.profile contains the full doctor details
        setDoctorDetailsTab("overview");
      } else {
        throw new Error(response.message || "Failed to load doctor details");
      }
    } catch (err) {
      console.error("Error fetching doctor details:", err);
      alert("Could not load doctor details. Please try again.");
    } finally {
      setLoadingDoctorDetails(false);
    }
  };

  const handleBookAppointmentWithDoctorClick = () => {
    if (!selectedDoctor || !hospital) return;

    if (isAuthenticated && user?.role === ROLES.PATIENT) {
      navigate("/patient/book-appointment", {
        state: {
          preselectedHospital: {
            value: hospital._id, // Hospital ID from the main page context
            label: hospital.name,
          },
          preselectedDoctor: {
            value: selectedDoctor._id, // Doctor Profile ID
            label: `Dr. ${selectedDoctor.user?.name} (${
              selectedDoctor.speciality || "General"
            })`,
          },
        },
      });
    } else {
      navigate("/login", { state: { from: `/hospitals/${hospitalIdParam}` } });
    }
  };

  const closeDoctorDetails = () => {
    setSelectedDoctor(null);
  };

  // Function to format working hours
  const formatWorkingHours = (workingHours) => {
    if (!workingHours) return {};

    const formattedHours = {};
    Object.entries(workingHours).forEach(([day, hours]) => {
      if (hours.isActive) {
        formattedHours[day] = `${hours.start} - ${hours.end}`;
      }
    });

    return formattedHours;
  };

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Error</h2>
        <p className="text-red-500 mb-6">{error}</p>
        <Link to="/hospitals">
          <Button variant="primary">Back to Hospitals</Button>
        </Link>
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Hospital Not Found
        </h2>
        <p className="text-gray-600 mb-6">
          The hospital you're looking for doesn't exist or has been removed.
        </p>
        <Link to="/hospitals">
          <Button variant="primary">View All Hospitals</Button>
        </Link>
      </div>
    );
  }

  // Prepare working hours if doctor is selected
  let workingHours = {};
  let workingDays = [];

  if (selectedDoctor?.workingHours) {
    workingHours = formatWorkingHours(selectedDoctor.workingHours);
    workingDays = Object.keys(workingHours);
  }

  return (
    <div className="space-y-8">
      {/* Hospital Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row items-center md:items-start">
          <div className="mb-4 md:mb-0 md:mr-6">
            <img
              src={hospital.logo || "/default-hospital.png"}
              alt={`${hospital.name} Logo`}
              className="h-24 w-auto object-contain"
            />
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold text-gray-800">
              {hospital.name}
            </h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                <BuildingOfficeIcon className="h-3 w-3 mr-1" />
                {hospital.stats.departments} Departments
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
                <UserIcon className="h-3 w-3 mr-1" />
                {hospital.stats.doctors} Doctors
              </span>
              {hospital.specialties && hospital.specialties.length > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-info-100 text-info-800">
                  <AcademicCapIcon className="h-3 w-3 mr-1" />
                  {hospital.specialties.length} Specialties
                </span>
              )}
            </div>
          </div>
          <div className="ml-auto hidden md:block">
            {/* MODIFIED BUTTON */}
            <Button variant="primary" onClick={handleBookAppointmentClick}>
              Book Appointment
            </Button>
          </div>
        </div>
      </div>

      {/* Doctor Details Modal (conditionally rendered) */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 p-4 border-b flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-800">
                Doctor Profile
              </h2>
              <button
                onClick={closeDoctorDetails}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {loadingDoctorDetails ? (
              <div className="p-8 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="p-6">
                {/* Doctor Header */}
                <div className="flex flex-col md:flex-row items-center mb-6">
                  <div className="mb-4 md:mb-0 md:mr-6">
                    <img
                      src={selectedDoctor.user?.image || "/default-avatar.png"}
                      alt={`Dr. ${selectedDoctor.user?.name}`}
                      className="h-32 w-32 rounded-full object-cover object-center"
                    />
                  </div>
                  <div className="text-center md:text-left flex-grow">
                    <h1 className="text-2xl font-bold text-gray-800">
                      Dr. {selectedDoctor.user?.name}
                    </h1>
                    <p className="text-xl text-primary-600 font-medium mt-1">
                      {selectedDoctor.speciality}
                    </p>
                    <p className="text-gray-500">{selectedDoctor.degree}</p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        <AcademicCapIcon className="h-3 w-3 mr-1" />
                        {selectedDoctor.experience} Experience
                      </span>
                      {selectedDoctor.user?.department && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-info-100 text-info-800">
                          <BuildingOfficeIcon className="h-3 w-3 mr-1" />
                          {selectedDoctor.user.department.name}
                        </span>
                      )}
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
                        <BriefcaseIcon className="h-3 w-3 mr-1" />
                        NPR {selectedDoctor.fees} Fee
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0 md:ml-auto">
                    {/* MODIFIED BUTTON FOR DOCTOR MODAL */}
                    <Button
                      variant="primary"
                      onClick={handleBookAppointmentWithDoctorClick}
                    >
                      Book with Dr. {selectedDoctor.user?.name}
                    </Button>
                  </div>
                </div>

                {/* Doctor Tabs */}
                <div className="border-b border-gray-200 mb-6">
                  <nav className="flex space-x-8">
                    <button
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        doctorDetailsTab === "overview"
                          ? "border-primary-500 text-primary-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                      onClick={() => setDoctorDetailsTab("overview")}
                    >
                      Overview
                    </button>
                    <button
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        doctorDetailsTab === "schedule"
                          ? "border-primary-500 text-primary-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                      onClick={() => setDoctorDetailsTab("schedule")}
                    >
                      Schedule
                    </button>
                  </nav>
                </div>

                {/* Doctor Content */}
                {doctorDetailsTab === "overview" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-3">
                        About
                      </h3>
                      <p className="text-gray-600">
                        {selectedDoctor.about || "No information available."}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-3">
                        Education & Experience
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-start">
                          <AcademicCapIcon className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                          <div>
                            <p className="text-gray-800 font-medium">Degree</p>
                            <p className="text-gray-600">
                              {selectedDoctor.degree}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <BriefcaseIcon className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                          <div>
                            <p className="text-gray-800 font-medium">
                              Experience
                            </p>
                            <p className="text-gray-600">
                              {selectedDoctor.experience}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <BuildingOfficeIcon className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                          <div>
                            <p className="text-gray-800 font-medium">
                              Registration Number
                            </p>
                            <p className="text-gray-600">
                              {selectedDoctor.registrationNumber}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {doctorDetailsTab === "schedule" && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">
                      Working Hours
                    </h3>
                    {workingDays.length > 0 ? (
                      <div className="space-y-4">
                        <p className="text-gray-600">
                          Dr. {selectedDoctor.user?.name} is available for
                          appointments on the following days and times:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {workingDays.map((day) => (
                            <div key={day} className="border rounded-lg p-4">
                              <div className="flex items-center mb-2">
                                <CalendarDaysIcon className="h-5 w-5 text-primary-600 mr-2" />
                                <h3 className="text-lg font-medium text-gray-800 capitalize">
                                  {day}
                                </h3>
                              </div>
                              <div className="flex items-center text-gray-600">
                                <ClockIcon className="h-4 w-4 text-gray-500 mr-2" />
                                <span>{workingHours[day]}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 bg-primary-50 border border-primary-200 rounded-lg p-4">
                          <h3 className="font-medium text-primary-800 mb-2">
                            Consultation Information
                          </h3>
                          <p className="text-primary-700">
                            Consultation time:{" "}
                            {selectedDoctor.consultationTime || 30} minutes
                          </p>
                          <p className="text-primary-700">
                            Consultation fee: NPR {selectedDoctor.fees}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-6">
                        No schedule information available.
                      </p>
                    )}

                    <div className="mt-8 text-center">
                      <p className="text-gray-600 mb-4">
                        Ready to schedule your appointment with Dr.{" "}
                        {selectedDoctor.user?.name}?
                      </p>
                      <Link to="/login">
                        <Button variant="primary" size="lg">
                          Book an Appointment
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hospital Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "overview"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "doctors"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            onClick={() => setActiveTab("doctors")}
          >
            Doctors
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "departments"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            onClick={() => setActiveTab("departments")}
          >
            Departments
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                About {hospital.name}
              </h2>
              <p className="text-gray-600">
                {hospital.description ||
                  "No description available for this hospital."}
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Contact Information
              </h3>
              <div className="space-y-2">
                <div className="flex items-start">
                  <MapPinIcon className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-gray-800 font-medium">Address</p>
                    <p className="text-gray-600">
                      {hospital.address?.street}, {hospital.address?.city},{" "}
                      {hospital.address?.state}, {hospital.address?.zipCode},{" "}
                      {hospital.address?.country}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <PhoneIcon className="h-5 w-5 text-gray-500 mr-3" />
                  <div>
                    <p className="text-gray-800 font-medium">Phone</p>
                    <p className="text-gray-600">{hospital.contactNumber}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <EnvelopeIcon className="h-5 w-5 text-gray-500 mr-3" />
                  <div>
                    <p className="text-gray-800 font-medium">Email</p>
                    <p className="text-gray-600">{hospital.email}</p>
                  </div>
                </div>
                {hospital.website && (
                  <div className="flex items-center">
                    <GlobeAltIcon className="h-5 w-5 text-gray-500 mr-3" />
                    <div>
                      <p className="text-gray-800 font-medium">Website</p>

                      <a
                        href={
                          hospital.website.startsWith("http")
                            ? hospital.website
                            : `http://${hospital.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline"
                      >
                        {hospital.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="md:hidden text-center">
              {/* MODIFIED BUTTON */}
              <Button
                variant="primary"
                className="w-full"
                onClick={handleBookAppointmentClick}
              >
                Book Appointment
              </Button>
            </div>
          </div>
        )}

        {activeTab === "doctors" && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Our Doctors
            </h2>
            {doctors && doctors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {doctors.map((doctor) => (
                  <Card
                    key={doctor.id}
                    className="flex flex-col items-center p-4 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleDoctorSelect(doctor.id)}
                  >
                    <div className="w-24 h-24 rounded-full overflow-hidden mb-3 bg-primary-600">
                      <img
                        src={doctor.image || "/default-avatar.png"}
                        alt={`Dr. ${doctor.name}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="text-lg font-medium text-gray-800">
                      Dr. {doctor.name}
                    </h3>
                    {doctor.speciality && (
                      <p className="text-primary-600 font-medium text-sm mb-1">
                        {doctor.speciality}
                      </p>
                    )}
                    {doctor.department && (
                      <p className="text-gray-500 text-sm">
                        {doctor.department}
                      </p>
                    )}
                    <div className="mt-4">
                      {/* MODIFIED: onClick now calls handleDoctorSelect */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDoctorSelect(doctor)}
                      >
                        View Profile
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-6">
                No doctors available at this hospital.
              </p>
            )}
          </div>
        )}

        {activeTab === "departments" && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Departments
            </h2>
            {hospital.departments && hospital.departments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {hospital.departments.map((department, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 hover:shadow-md transition"
                  >
                    <h3 className="text-lg font-medium text-gray-800">
                      {department}
                    </h3>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-6">
                No departments available at this hospital.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Back Button */}
      <div className="text-center py-4">
        <Link to="/hospitals">
          <Button variant="outline">Back to Hospitals</Button>
        </Link>
      </div>
    </div>
  );
};

export default HospitalDetailsPage;
