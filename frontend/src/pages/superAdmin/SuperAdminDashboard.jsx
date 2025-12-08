// src/pages/superAdmin/SuperAdminDashboard.jsx
import React, { useEffect, useContext } from "react";
import toast from "react-hot-toast";
import SuperAdminContext from "../../context/SuperAdminContext";
import LoadingSpinner from "../../components/common/LoadingSpinner"; //
import WelcomeBanner from "../../components/dashboard/WelcomeBanner"; //
import StatCard from "../../components/dashboard/StatCard"; //
import Card from "../../components/common/Card"; //
import { Link } from "react-router-dom";
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { formatDate } from "../../utils/helpers"; //

const SuperAdminDashboard = () => {
  // Use context to get dashboard data, which fetches on context load
  const {
    dashboardData,
    loadingDashboard,
    dashboardError,
    fetchDashboardData,
  } = useContext(SuperAdminContext);

  // Optional: Allow manual refresh
  const handleRefresh = () => {
    fetchDashboardData();
  };

  if (loadingDashboard && !dashboardData) {
    return <LoadingSpinner />;
  }

  if (dashboardError) {
    return (
      <div className="text-center text-danger-600 py-4">{dashboardError}</div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center text-gray-500 py-4">
        No dashboard data available.
      </div>
    );
  }

  const { hospitals, users } = dashboardData;

  return (
    <div className="space-y-6">
      <WelcomeBanner />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Hospitals"
          value={hospitals?.total ?? 0}
          icon={<BuildingOfficeIcon />}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          description={
            <Link
              to="/super-admin/hospitals"
              className="text-xs text-primary-600 hover:underline"
            >
              Manage Hospitals
            </Link>
          }
        />
        <StatCard
          title="Active Hospitals"
          value={hospitals?.active ?? 0}
          icon={<CheckCircleIcon />}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          description={`${hospitals?.inactive ?? 0} Inactive`}
        />
        <StatCard
          title="Total Users"
          value={users?.total ?? 0}
          icon={<UsersIcon />}
          iconBgColor="bg-indigo-100"
          iconColor="text-indigo-600"
          description={`${users?.active ?? 0} Active`}
        />
        <StatCard
          title="Hospital Admins"
          value={users?.byRole?.admin ?? 0}
          icon={<UserGroupIcon />}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
          description={
            <Link
              to="/super-admin/hospital-admins"
              className="text-xs text-primary-600 hover:underline"
            >
              Manage Admins
            </Link>
          }
        />
      </div>

      {/* Recent Hospitals */}
      <Card title="Recently Added Hospitals">
        {hospitals?.recent && hospitals.recent.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {hospitals.recent.map((hospital) => (
              <li
                key={hospital._id}
                className="py-3 flex justify-between items-center"
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={hospital.logo || "/default-hospital.png"}
                    alt={hospital.name}
                    className="h-8 w-8 rounded-md object-contain border"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {hospital.name}
                    </p>
                    <p className="text-xs text-gray-500">{hospital.email}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  Added: {formatDate(hospital.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">No recently added hospitals.</p>
        )}
        <div className="text-right mt-2">
          <Link
            to="/super-admin/hospitals"
            className="text-sm font-medium text-primary-600 hover:underline"
          >
            View All Hospitals &rarr;
          </Link>
        </div>
      </Card>

      {/* Users by Role (Example) */}
      <Card title="User Distribution by Role">
        {users?.byRole ? (
          <ul className="space-y-1 text-sm">
            {Object.entries(users.byRole).map(([role, count]) => (
              <li key={role} className="flex justify-between">
                <span className="capitalize text-gray-700">
                  {role.replace(/([A-Z])/g, " $1")}
                </span>
                <span className="font-medium text-gray-900">{count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">User role data unavailable.</p>
        )}
      </Card>
    </div>
  );
};

export default SuperAdminDashboard;
