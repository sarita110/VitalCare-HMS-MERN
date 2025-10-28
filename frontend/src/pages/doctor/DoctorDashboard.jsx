// src/pages/doctor/DoctorDashboard.jsx
import React, { useEffect, useState, useContext } from "react";
import toast from "react-hot-toast";
import doctorService from "../../services/doctorService"; //
import AuthContext from "../../context/AuthContext";
import LoadingSpinner from "../../components/common/LoadingSpinner"; //
import WelcomeBanner from "../../components/dashboard/WelcomeBanner"; //
import StatCard from "../../components/dashboard/StatCard"; //
import AppointmentList from "../../components/appointments/AppointmentList"; //
import Card from "../../components/common/Card"; //
import { Link } from "react-router-dom";
import {
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  BeakerIcon,
  ViewfinderCircleIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

const DoctorDashboard = () => {
  const { user } = useContext(AuthContext);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await doctorService.getDoctorDashboard(); //
        if (response.success) {
          setDashboardData(response.dashboardData);
        } else {
          throw new Error(response.message || "Failed to fetch dashboard data");
        }
      } catch (err) {
        console.error("Doctor dashboard fetch error:", err);
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

  const { todayAppointments, upcomingAppointments, stats, recentRecords } =
    dashboardData;

  return (
    <div className="space-y-6">
      <WelcomeBanner />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Appointments"
          value={todayAppointments?.length ?? 0}
          icon={<ClockIcon />}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          description={
            <Link
              to="/doctor/appointments?date=today"
              className="text-xs text-primary-600 hover:underline"
            >
              View Today
            </Link>
          }
        />
        <StatCard
          title="Completed Appointments"
          value={stats?.completedAppointments ?? 0}
          icon={<CheckCircleIcon />}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          description={`Total: ${stats?.totalAppointments ?? 0} (${
            stats?.completionRate ?? 0
          }%)`}
        />
        <StatCard
          title="Pending Lab Tests"
          value={stats?.pendingLabTests ?? 0}
          icon={<BeakerIcon />}
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
          description={
            <Link
              to="/doctor/lab-results?status=pending"
              className="text-xs text-primary-600 hover:underline"
            >
              View Pending
            </Link>
          }
        />
        <StatCard
          title="Pending Radiology"
          value={stats?.pendingRadiologyTests ?? 0}
          icon={<ViewfinderCircleIcon />}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
          description={
            <Link
              to="/doctor/radiology-results?status=pending"
              className="text-xs text-primary-600 hover:underline"
            >
              View Pending
            </Link>
          }
        />
      </div>

      {/* Appointments Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Today's Schedule">
          {todayAppointments && todayAppointments.length > 0 ? (
            <AppointmentList
              appointments={todayAppointments}
              isLoading={false}
              userRole={user?.role}
            />
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">
              No appointments scheduled for today.
            </p>
          )}
        </Card>
        <Card title="Upcoming Appointments (Next 7 Days)">
          {upcomingAppointments && upcomingAppointments.length > 0 ? (
            <AppointmentList
              appointments={upcomingAppointments}
              isLoading={false}
              userRole={user?.role}
            />
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">
              No upcoming appointments in the next 7 days.
            </p>
          )}
          <div className="text-right mt-2">
            <Link
              to="/doctor/appointments"
              className="text-sm font-medium text-primary-600 hover:underline"
            >
              View All Appointments &rarr;
            </Link>
          </div>
        </Card>
      </div>

      {/* Recent Medical Records */}
      <Card title="Recent Medical Records Added">
        {recentRecords && recentRecords.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {recentRecords.map((record) => (
              <li
                key={record._id}
                className="py-3 flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {record.patientId?.userId?.name || "Unknown Patient"} -{" "}
                    <span className="capitalize">{record.type}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(record.date).toLocaleDateString()} -{" "}
                    {record.diagnosis ||
                      record.notes?.substring(0, 50) + "..." ||
                      "No details"}
                  </p>
                </div>
                <Link
                  to={`/doctor/patients/${record.patientId?._id}`}
                  className="text-xs text-primary-600 hover:underline"
                >
                  View Patient
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">
            No recent medical records added.
          </p>
        )}
      </Card>
    </div>
  );
};

export default DoctorDashboard;
