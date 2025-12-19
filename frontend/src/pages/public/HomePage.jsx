// src/pages/public/HomePage.jsx
import React, { useState, useEffect, useContext } from "react"; // Added useContext
import { Link } from "react-router-dom";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import hospitalService from "../../services/hospitalService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  BuildingOffice2Icon,
  CalendarDaysIcon,
  UserPlusIcon,
  ArrowRightIcon,
  RectangleStackIcon, // For Open Dashboard
} from "@heroicons/react/24/outline";
import useAuth from "../../hooks/useAuth"; // Import useAuth hook
import { ROLES } from "../../constants"; // Import ROLES for dashboard path

// Helper to get dashboard path (can be a shared utility)
const getDashboardPath = (role) => {
  if (!role) return "/login"; // Fallback if role somehow undefined
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return "/super-admin/dashboard";
    case ROLES.ADMIN:
      return "/admin/dashboard";
    case ROLES.DOCTOR:
      return "/doctor/dashboard";
    case ROLES.PATIENT:
      return "/patient/dashboard";
    case ROLES.RECEPTIONIST:
      return "/receptionist/dashboard";
    case ROLES.LAB_TECHNICIAN:
      return "/lab/dashboard";
    case ROLES.RADIOLOGIST:
      return "/radiology/dashboard";
    default:
      return "/login"; // Default fallback
  }
};

const HomePage = () => {
  const [featuredHospitals, setFeaturedHospitals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, user } = useAuth(); // Get auth state and user

  useEffect(() => {
    const fetchHospitals = async () => {
      setIsLoading(true);
      try {
        const response = await hospitalService.getAllHospitals({ limit: 3 });
        if (response.success) {
          setFeaturedHospitals(response.hospitals);
        }
      } catch (error) {
        console.error("Failed to fetch featured hospitals:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHospitals();
  }, []);

  const userDashboardPath =
    isAuthenticated && user ? getDashboardPath(user.role) : "/login";
  const bookAppointmentPath =
    isAuthenticated && user?.role === ROLES.PATIENT
      ? "/patient/book-appointment"
      : "/login";

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center py-16 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg text-white shadow-lg">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Welcome to VitalCare
        </h1>
        <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-white">
          Your trusted platform for seamless hospital management and patient
          care. Find hospitals, book appointments, and manage your health
          records easily.
        </p>
        <div className="space-x-4">
          <Link to="/hospitals">
            <Button
              size="lg"
              variant="outline"
              className="bg-white text-primary-600 hover:bg-primary-100"
            >
              Find a Hospital
            </Button>
          </Link>
          {isAuthenticated ? (
            <Link to={userDashboardPath}>
              <Button
                size="lg"
                variant="outline"
                className="bg-white text-primary-600 hover:bg-primary-100"
              >
                Open Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/register">
              <Button
                size="lg"
                variant="outline"
                className="bg-white text-primary-600 hover:bg-primary-100 border-white"
              >
                Register Now
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12">
        <h2 className="text-3xl font-semibold text-center text-gray-800 mb-10">
          Our Services
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow">
            <BuildingOffice2Icon className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">Find Hospitals</h3>
            <p className="text-gray-600">
              Search and explore details of hospitals partnered with VitalCare.
            </p>
            <Link
              to="/hospitals"
              className="text-primary-600 hover:underline mt-4 inline-block"
            >
              Explore Hospitals →
            </Link>
          </div>
          <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow">
            <CalendarDaysIcon className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">Easy Appointments</h3>
            <p className="text-gray-600">
              Book, manage, and reschedule your doctor appointments online.
            </p>
            {/* MODIFIED "Book Now" Link */}
            <Link
              to={bookAppointmentPath}
              className="text-primary-600 hover:underline mt-4 inline-block"
            >
              Book Now →
            </Link>
          </div>
          <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow">
            <UserPlusIcon className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">Patient Portal</h3>
            <p className="text-gray-600">
              Access your medical records, prescriptions, and test results
              securely.
            </p>
            {/* MODIFIED "Sign Up" Link to show "Open Dashboard" if logged in */}
            {isAuthenticated ? (
              <Link
                to={userDashboardPath}
                className="text-primary-600 hover:underline mt-4 inline-block"
              >
                Open Dashboard →
              </Link>
            ) : (
              <Link
                to="/register"
                className="text-primary-600 hover:underline mt-4 inline-block"
              >
                Sign Up →
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Featured Hospitals Section */}
      <section className="py-12 bg-gray-50 rounded-lg">
        <h2 className="text-3xl font-semibold text-center text-gray-800 mb-10">
          Featured Hospitals
        </h2>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredHospitals.length > 0 ? (
              featuredHospitals.map((hospital) => (
                <Card key={hospital._id} className="text-center">
                  <img
                    src={hospital.logo || "/default-hospital.png"}
                    alt={`${hospital.name} Logo`}
                    className="h-16 w-auto mx-auto mb-4 object-contain"
                  />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    {hospital.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">
                    {hospital.address?.city}, {hospital.address?.state}
                  </p>
                  <p className="text-xs text-gray-600 mb-4 line-clamp-2">
                    {hospital.description ||
                      "Comprehensive healthcare services."}
                  </p>
                  <Link to={`/hospitals/${hospital._id}`}>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </Link>
                </Card>
              ))
            ) : (
              <p className="text-center text-gray-500 col-span-3">
                Could not load hospital information.
              </p>
            )}
          </div>
        )}
        <div className="text-center mt-8">
          <Link to="/hospitals">
            <Button variant="primary">View All Hospitals</Button>
          </Link>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Ready to Manage Your Health?
        </h2>
        <p className="text-gray-600 mb-6">
          Join VitalCare today for a better healthcare experience.
        </p>
        {/* MODIFIED "Get Started Now" Button */}
        {isAuthenticated ? (
          <Link to={userDashboardPath}>
            <Button size="lg" variant="success">
              Go to Your Dashboard
            </Button>
          </Link>
        ) : (
          <Link to="/register">
            <Button size="lg" variant="success">
              Get Started Now
            </Button>
          </Link>
        )}
      </section>
    </div>
  );
};

export default HomePage;
