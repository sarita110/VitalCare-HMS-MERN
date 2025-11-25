// src/pages/lab/LabDashboard.jsx
import React, { useEffect, useState, useContext } from "react";
import toast from "react-hot-toast";
import labService from "../../services/labService"; //
import AuthContext from "../../context/AuthContext";
import LoadingSpinner from "../../components/common/LoadingSpinner"; //
import WelcomeBanner from "../../components/dashboard/WelcomeBanner"; //
import StatCard from "../../components/dashboard/StatCard"; //
import Card from "../../components/common/Card"; //
import { Link } from "react-router-dom";
import { formatDate, getDisplayStatus } from "../../utils/helpers"; // [cite: 3044-3058, 3059-3065]
import {
  BeakerIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  CheckBadgeIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

const LabDashboard = () => {
  const { user } = useContext(AuthContext);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await labService.getLabDashboard(); //
        if (response.success) {
          setDashboardData(response.dashboardData);
        } else {
          throw new Error(response.message || "Failed to fetch dashboard data");
        }
      } catch (err) {
        console.error("Lab dashboard fetch error:", err);
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

  const { pendingTests, recentResults, stats } = dashboardData;

  return (
    <div className="space-y-6">
      <WelcomeBanner />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="New Requests"
          value={stats?.requestedCount ?? 0}
          icon={<BeakerIcon />}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          description={
            <Link
              to="/lab/requests?status=requested"
              className="text-xs text-primary-600 hover:underline"
            >
              View Requests
            </Link>
          }
        />
        <StatCard
          title="Tests In Progress"
          value={stats?.inProgressCount ?? 0} // Includes sample-collected & in-progress
          icon={<ClockIcon />}
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
          description={
            <Link
              to="/lab/requests?status=in-progress"
              className="text-xs text-primary-600 hover:underline"
            >
              View In Progress
            </Link>
          }
        />
        <StatCard
          title="Total Completed Today" // Note: Backend doesn't provide this specific stat, using overall count
          value={stats?.completedCount ?? 0} // This is total completed overall
          icon={<ClipboardDocumentListIcon />}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          description={
            <Link
              to="/lab/results"
              className="text-xs text-primary-600 hover:underline"
            >
              View Completed
            </Link>
          }
        />
        <StatCard
          title="My Completed Tests"
          value={stats?.myCompletedCount ?? 0}
          icon={<CheckBadgeIcon />}
          iconBgColor="bg-indigo-100"
          iconColor="text-indigo-600"
          description={
            <Link
              to="/lab/results?onlyMine=true"
              className="text-xs text-primary-600 hover:underline"
            >
              View My Reports
            </Link>
          }
        />
      </div>

      {/* Pending Tests */}
      <Card title="Pending Lab Tests">
        {pendingTests && pendingTests.length > 0 ? (
          <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {pendingTests.map((test) => (
              <li
                key={test._id}
                className="py-3 flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {test.testName} ({test.testType})
                  </p>
                  <p className="text-xs text-gray-500">
                    Patient: {test.patientId?.userId?.name || "N/A"} | Dr.{" "}
                    {test.doctorId?.userId?.name || "N/A"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Requested: {formatDate(test.requestDate)} | Status:{" "}
                    <span className="font-medium">
                      {getDisplayStatus(test.status)}
                    </span>
                  </p>
                </div>
                <Link
                  to={`/lab/requests/${test._id}`}
                  className="text-xs text-primary-600 hover:underline flex items-center"
                >
                  View Details <ArrowRightIcon className="w-3 h-3 ml-1" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">
            No pending lab tests found.
          </p>
        )}
        <div className="text-right mt-2">
          <Link
            to="/lab/requests"
            className="text-sm font-medium text-primary-600 hover:underline"
          >
            View All Requests &rarr;
          </Link>
        </div>
      </Card>

      {/* Recent Results */}
      <Card title="Recent Results Uploaded (By You)">
        {recentResults && recentResults.length > 0 ? (
          <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {recentResults.map((report) => (
              <li
                key={report._id}
                className="py-3 flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {report.testId?.testName || "N/A"} (
                    {report.testId?.testType || "N/A"})
                  </p>
                  <p className="text-xs text-gray-500">
                    Patient: {report.patientId?.userId?.name || "N/A"} |
                    Reported: {formatDate(report.reportDate)}
                  </p>
                </div>
                <Link
                  to={`/lab/results/${report._id}`}
                  className="text-xs text-primary-600 hover:underline flex items-center"
                >
                  View Report <ArrowRightIcon className="w-3 h-3 ml-1" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">
            You haven't uploaded any results recently.
          </p>
        )}
        <div className="text-right mt-2">
          <Link
            to="/lab/results"
            className="text-sm font-medium text-primary-600 hover:underline"
          >
            View All Results &rarr;
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default LabDashboard;
