import React, { useEffect, useState, useContext } from "react";
import toast from "react-hot-toast";
import patientService from "../../services/patientService";
import AuthContext from "../../context/AuthContext";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import WelcomeBanner from "../../components/dashboard/WelcomeBanner";
import StatCard from "../../components/dashboard/StatCard";
import AppointmentList from "../../components/appointments/AppointmentList";
import Card from "../../components/common/Card"; // Assuming Card handles basic styling
import Button from "../../components/common/Button"; // Assuming Button handles basic styling
import { Link } from "react-router-dom";
import {
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  BeakerIcon,
  ViewfinderCircleIcon,
  InboxIcon, // For empty states
  ArrowRightIcon, // For links
} from "@heroicons/react/24/outline";
import { formatDate } from "../../utils/helpers";

const PatientDashboard = () => {
  const { user } = useContext(AuthContext);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // ... (fetchData logic remains the same)
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await patientService.getPatientDashboard();
        if (response.success) {
          setDashboardData(response.dashboardData);
        } else {
          throw new Error(response.message || "Failed to fetch dashboard data");
        }
      } catch (err) {
        console.error("Patient dashboard fetch error:", err);
        setError(err.message || "Could not load dashboard data.");
        // toast.error(err.message || "Could not load dashboard data."); // Optional: remove if error shown inline
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    // Centered loading spinner
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-danger-600 bg-danger-50 border border-danger-200 p-4 rounded-md shadow-sm">
        {error}
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center text-gray-500 py-10">
        <InboxIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p>No dashboard data available at the moment.</p>
      </div>
    );
  }

  const { upcomingAppointments, recentRecords, stats } = dashboardData; // Removed recentAppointments if not used

  return (
    <div className="space-y-8"> {/* Increased spacing */}
      <WelcomeBanner />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* Ensure StatCard component itself has good internal padding/styling */}
        <StatCard
          title="Upcoming Appointments"
          value={stats?.pendingAppointments ?? 0}
          icon={<CalendarDaysIcon className="w-6 h-6" />} // Slightly larger icons maybe
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          description={
            <Link
              to="/patient/appointments?upcoming=true"
              className="text-xs font-medium text-primary-600 hover:text-primary-800 transition duration-150 ease-in-out"
            >
              View Upcoming
            </Link>
          }
        />
        <StatCard
          title="Pending Payments"
          value={stats?.pendingPayments ?? 0}
          icon={<CurrencyDollarIcon className="w-6 h-6" />}
          iconBgColor="bg-red-100"
          iconColor="text-red-600"
          description={
            <Link
              to="/patient/payments?status=pending"
              className="text-xs font-medium text-primary-600 hover:text-primary-800 transition duration-150 ease-in-out"
            >
              View Pending
            </Link>
          }
        />
        <StatCard
          title="Pending Lab Tests"
          value={stats?.pendingLabTests ?? 0}
          icon={<BeakerIcon className="w-6 h-6" />}
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
          description={
            <Link
              to="/patient/lab-results?status=pending"
              className="text-xs font-medium text-primary-600 hover:text-primary-800 transition duration-150 ease-in-out"
            >
              View Pending
            </Link>
          }
        />
        <StatCard
          title="Pending Radiology"
          value={stats?.pendingRadiologyTests ?? 0}
          icon={<ViewfinderCircleIcon className="w-6 h-6" />}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
          description={
            <Link
              to="/patient/radiology-results?status=pending"
              className="text-xs font-medium text-primary-600 hover:text-primary-800 transition duration-150 ease-in-out"
            >
              View Pending
            </Link>
          }
        />
        {/* Consider making this distinct as it's total vs pending */}
        <StatCard
          title="Total Appointments"
          value={stats?.totalAppointments ?? 0}
          icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
          iconBgColor="bg-gray-100"
          iconColor="text-gray-600"
          description={
            <Link
              to="/patient/appointments"
              className="text-xs font-medium text-primary-600 hover:text-primary-800 transition duration-150 ease-in-out"
            >
              View History
            </Link>
          }
        />
      </div>

      {/* Upcoming Appointments */}
      <Card title="Your Upcoming Appointments" titleSize="lg"> {/* Consistent Title Size */}
        {upcomingAppointments && upcomingAppointments.length > 0 ? (
          <div className="flow-root"> {/* Prevents margin collapse */}
            <AppointmentList
              appointments={upcomingAppointments}
              isLoading={false} // Loading handled by parent
              userRole={user?.role}
            />
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
             <CalendarDaysIcon className="w-10 h-10 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">You have no upcoming appointments.</p>
          </div>
        )}
        <div className="text-right mt-4 border-t pt-3"> {/* Separator and spacing */}
          <Link
            to="/patient/book-appointment"
            className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-800 transition duration-150 ease-in-out group"
          >
            Book New Appointment
            <ArrowRightIcon className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </Card>

      {/* Recent Medical Records */}
      <Card title="Recent Medical Records" titleSize="lg">
        {recentRecords && recentRecords.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {recentRecords.map((record) => (
              <li
                key={record._id}
                className="py-4 flex justify-between items-center hover:bg-gray-50 transition duration-150 ease-in-out px-2 -mx-2 rounded" // Added hover effect and padding adjustment
                id={record._id} // Add ID for linking from dashboard
              >
                <div className="flex-1 pr-4"> {/* Allow text to take space */}
                  <div className="flex items-center justify-between mb-1">
                     <p className="text-sm font-semibold text-gray-800 capitalize">
                        {record.type}
                     </p>
                      <span className="text-xs text-gray-500">{formatDate(record.date)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">
                    By Dr. {record.doctorId?.userId?.name || "N/A"}
                  </p>
                  {/* Improved truncation and visibility */}
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2" title={record.diagnosis || record.notes}>
                    {record.diagnosis || record.notes || <span className="italic text-gray-400">No details provided</span>}
                  </p>
                </div>
                {/* Use a more visually distinct link/button */}
                 <Link to={`/patient/medical-records#${record._id}`}>
                    <Button variant="outline" size="xs">Details</Button>
                 </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <ClipboardDocumentListIcon className="w-10 h-10 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No recent medical records found.</p>
          </div>
        )}
        <div className="text-right mt-4 border-t pt-3"> {/* Separator and spacing */}
          <Link
            to="/patient/medical-records"
             className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-800 transition duration-150 ease-in-out group"
          >
            View All Records
            <ArrowRightIcon className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default PatientDashboard;