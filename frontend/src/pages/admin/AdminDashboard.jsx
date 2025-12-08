// src/pages/admin/AdminDashboard.jsx
import React, { useEffect, useState, useContext } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import adminService from "../../services/adminService"; //
import AuthContext from "../../context/AuthContext";
import LoadingSpinner from "../../components/common/LoadingSpinner"; //
import WelcomeBanner from "../../components/dashboard/WelcomeBanner"; //
import StatCard from "../../components/dashboard/StatCard"; //
import AppointmentList from "../../components/appointments/AppointmentList"; //
import Card from "../../components/common/Card"; //

import {
  UserGroupIcon,
  UserIcon,
  CalendarDaysIcon,
  BuildingLibraryIcon, // Icon for Departments
  CurrencyDollarIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await adminService.getAdminDashboard(); //
        if (response.success) {
          setDashboardData(response.dashboardData);
        } else {
          throw new Error(response.message || "Failed to fetch dashboard data");
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError(err.message || "Could not load dashboard data.");
        toast.error(err.message || "Could not load dashboard data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-center text-danger-600 py-4">{error}</div>;
  }

  if (!dashboardData) {
    return (
      <div className="text-center text-gray-500 py-4">
        No dashboard data available.
      </div>
    );
  }

  const { counts, revenue, recentAppointments, recentPatients } = dashboardData;

  return (
    <div className="space-y-6">
      <WelcomeBanner />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Doctors"
          value={counts?.doctors ?? 0}
          icon={<UserGroupIcon />}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Registered Patients"
          value={counts?.patients ?? 0}
          icon={<UserIcon />}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
        />
        <StatCard
          title="Today's Appointments"
          value={counts?.todayAppointments ?? 0}
          icon={<ClockIcon />}
          iconBgColor="bg-indigo-100"
          iconColor="text-indigo-600"
        />
        <StatCard
          title="Total Departments"
          value={counts?.departments ?? 0}
          icon={<BuildingLibraryIcon />}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
        />
        {/* Consider adding a Total Revenue StatCard if needed, requires calculation or backend endpoint update
                 <StatCard
                    title="Total Revenue"
                    value={revenue?.total ? formatCurrency(revenue.total) : formatCurrency(0)}
                    icon={<CurrencyDollarIcon />}
                    iconBgColor="bg-emerald-100"
                    iconColor="text-emerald-600"
                 />
                 */}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Appointments">
          {recentAppointments && recentAppointments.length > 0 ? (
            <AppointmentList
              appointments={recentAppointments}
              isLoading={false}
              userRole={user?.role} // Pass admin role
            />
          ) : (
            <p className="text-gray-500 text-sm">No recent appointments.</p>
          )}
        </Card>

        <Card title="Recently Registered Patients">
          {recentPatients && recentPatients.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {recentPatients.map((patient) => (
                <li
                  key={patient._id}
                  className="py-3 flex items-center space-x-3"
                >
                  <img
                    src={patient.userId?.image || "/default-avatar.png"}
                    alt={patient.userId?.name}
                    className="h-8 w-8 rounded-full"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {patient.userId?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {patient.userId?.email}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">
              No recently registered patients.
            </p>
          )}
        </Card>
      </div>

      {/* Add Links to Management Pages */}
      <Card title="Quick Management Links">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link
            to="/admin/doctors"
            className="text-primary-600 hover:underline"
          >
            Manage Doctors
          </Link>
          <Link to="/admin/staff" className="text-primary-600 hover:underline">
            Manage Staff
          </Link>
          <Link
            to="/admin/patients"
            className="text-primary-600 hover:underline"
          >
            Manage Patients
          </Link>
          <Link
            to="/admin/appointments"
            className="text-primary-600 hover:underline"
          >
            Manage Appointments
          </Link>
          <Link
            to="/admin/departments"
            className="text-primary-600 hover:underline"
          >
            Manage Departments
          </Link>
          <Link
            to="/admin/reports"
            className="text-primary-600 hover:underline"
          >
            View Reports
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;
