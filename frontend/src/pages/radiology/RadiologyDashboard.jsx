// src/pages/radiology/RadiologyDashboard.jsx
import React, { useEffect, useState, useContext } from "react";
import toast from "react-hot-toast";
import radiologyService from "../../services/radiologyService"; //
import AuthContext from "../../context/AuthContext";
import LoadingSpinner from "../../components/common/LoadingSpinner"; //
import WelcomeBanner from "../../components/dashboard/WelcomeBanner"; //
import StatCard from "../../components/dashboard/StatCard"; //
import Card from "../../components/common/Card"; //
import { Link } from "react-router-dom";
import {
  formatDate,
  getDisplayStatus,
  formatDateTime,
  getStatusBadgeClass,
} from "../../utils/helpers"; //
import {
  ViewfinderCircleIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  CheckBadgeIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

const RadiologyDashboard = () => {
  const { user } = useContext(AuthContext);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await radiologyService.getRadiologyDashboard(); //
        if (response.success) {
          setDashboardData(response.dashboardData);
        } else {
          throw new Error(response.message || "Failed to fetch dashboard data");
        }
      } catch (err) {
        console.error("Radiology dashboard fetch error:", err);
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

  const { pendingRequests, recentReports, stats } = dashboardData;

  return (
    <div className="space-y-6">
      <WelcomeBanner />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="New Requests"
          value={stats?.requestedCount ?? 0}
          icon={<ViewfinderCircleIcon />}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          description={
            <Link
              to="/radiology/requests?status=requested"
              className="text-xs text-primary-600 hover:underline"
            >
              View Requests
            </Link>
          }
        />
        <StatCard
          title="Studies In Progress"
          value={stats?.inProgressCount ?? 0}
          icon={<ClockIcon />}
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
          description={
            <Link
              to="/radiology/requests?status=in-progress"
              className="text-xs text-primary-600 hover:underline"
            >
              View In Progress
            </Link>
          }
        />
        <StatCard
          title="Total Reports Completed" // Maybe rename based on backend data (total completed vs today)
          value={stats?.completedCount ?? 0}
          icon={<ClipboardDocumentListIcon />}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          description={
            <Link
              to="/radiology/results"
              className="text-xs text-primary-600 hover:underline"
            >
              View Completed
            </Link>
          }
        />
        <StatCard
          title="My Completed Reports"
          value={stats?.myCompletedCount ?? 0}
          icon={<CheckBadgeIcon />}
          iconBgColor="bg-indigo-100"
          iconColor="text-indigo-600"
          description={
            <Link
              to="/radiology/results?onlyMine=true"
              className="text-xs text-primary-600 hover:underline"
            >
              View My Reports
            </Link>
          }
        />
      </div>

      {/* Pending Requests */}
      <Card title="Pending Imaging Requests">
        {pendingRequests && pendingRequests.length > 0 ? (
          <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {pendingRequests.map((req) => (
              <li
                key={req._id}
                className="py-3 flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {req.procedureType} - {req.bodyPart}
                  </p>
                  <p className="text-xs text-gray-500">
                    Patient: {req.patientId?.userId?.name || "N/A"} | Dr.{" "}
                    {req.doctorId?.userId?.name || "N/A"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Requested: {formatDate(req.requestDate)} | Status:{" "}
                    <span className="font-medium">
                      {getDisplayStatus(req.status)}
                    </span>
                  </p>
                </div>
                <Link
                  to={`/radiology/requests?view=${req._id}`}
                  className="text-xs text-primary-600 hover:underline flex items-center"
                >
                  View Details <ArrowRightIcon className="w-3 h-3 ml-1" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">
            No pending imaging requests found.
          </p>
        )}
        <div className="text-right mt-2">
          <Link
            to="/radiology/requests"
            className="text-sm font-medium text-primary-600 hover:underline"
          >
            View All Requests &rarr;
          </Link>
        </div>
      </Card>

      {/* Recent Reports */}
      <Card title="Recent Reports Completed (By You)">
        {recentReports && recentReports.length > 0 ? (
          <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {recentReports.map((report) => (
              <li
                key={report._id}
                className="py-3 flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {report.procedureType} - {report.bodyPart}
                  </p>
                  <p className="text-xs text-gray-500">
                    Patient: {report.patientId?.userId?.name || "N/A"} |
                    Reported: {formatDate(report.completedDate)}
                  </p>
                </div>
                <Link
                  to={`/radiology/results/${report._id}`}
                  className="text-xs text-primary-600 hover:underline flex items-center"
                >
                  View Report <ArrowRightIcon className="w-3 h-3 ml-1" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">
            You haven't completed any reports recently.
          </p>
        )}
        <div className="text-right mt-2">
          <Link
            to="/radiology/results"
            className="text-sm font-medium text-primary-600 hover:underline"
          >
            View All Reports &rarr;
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default RadiologyDashboard;
