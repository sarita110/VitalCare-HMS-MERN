// src/pages/receptionist/ReceptionistDashboard.jsx
import React, { useEffect, useState, useContext } from "react";
import toast from "react-hot-toast";
import receptionistService from "../../services/receptionistService"; //
import AuthContext from "../../context/AuthContext";
import LoadingSpinner from "../../components/common/LoadingSpinner"; //
import WelcomeBanner from "../../components/dashboard/WelcomeBanner"; //
import StatCard from "../../components/dashboard/StatCard"; //
import Card from "../../components/common/Card"; //
import { Link } from "react-router-dom";
import {
  formatDate,
  formatDateTime,
  formatCurrency,
} from "../../utils/helpers"; //
import {
  CalendarDaysIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserPlusIcon,
  ShareIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

const ReceptionistDashboard = () => {
  const { user } = useContext(AuthContext);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await receptionistService.getReceptionistDashboard(); //
        if (response.success) {
          setDashboardData(response.dashboardData);
        } else {
          throw new Error(response.message || "Failed to fetch dashboard data");
        }
      } catch (err) {
        console.error("Receptionist dashboard fetch error:", err);
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

  const {
    todayAppointments,
    pendingPayments,
    recentPatients,
    pendingReferrals,
    stats,
  } = dashboardData;

  return (
    <div className="space-y-6">
      <WelcomeBanner />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Appointments"
          value={stats?.todayAppointmentsCount ?? 0}
          icon={<ClockIcon />}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          description={
            <Link
              to="/receptionist/appointments?date=today"
              className="text-xs text-primary-600 hover:underline"
            >
              View Schedule
            </Link>
          }
        />
        <StatCard
          title="Pending Cash Payments"
          value={stats?.pendingPaymentsCount ?? 0}
          icon={<CurrencyDollarIcon />}
          iconBgColor="bg-red-100"
          iconColor="text-red-600"
          description={
            <Link
              to="/receptionist/payments?status=pending"
              className="text-xs text-primary-600 hover:underline"
            >
              Process Payments
            </Link>
          }
        />
        <StatCard
          title="Patients Registered Today"
          value={stats?.registeredTodayCount ?? 0}
          icon={<UserPlusIcon />}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          description={
            <Link
              to="/receptionist/register-patient"
              className="text-xs text-primary-600 hover:underline"
            >
              Register New
            </Link>
          }
        />
        <StatCard
          title="Pending Incoming Referrals"
          value={stats?.pendingReferralsCount ?? 0}
          icon={<ShareIcon />}
          iconBgColor="bg-indigo-100"
          iconColor="text-indigo-600"
          description={
            <Link
              to="/receptionist/referrals?direction=incoming&status=pending"
              className="text-xs text-primary-600 hover:underline"
            >
              Manage Referrals
            </Link>
          }
        />
      </div>

      {/* Quick Actions */}
      <Card title="Quick Actions">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link
            to="/receptionist/register-patient"
            className="text-center p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <UserPlusIcon className="h-8 w-8 mx-auto text-primary-600 mb-1" />
            <span className="text-sm font-medium">Register Patient</span>
          </Link>
          <Link
            to="/receptionist/schedule-appointment"
            className="text-center p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <CalendarDaysIcon className="h-8 w-8 mx-auto text-primary-600 mb-1" />
            <span className="text-sm font-medium">Schedule Appointment</span>
          </Link>
          <Link
            to="/receptionist/payments"
            className="text-center p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <CurrencyDollarIcon className="h-8 w-8 mx-auto text-primary-600 mb-1" />
            <span className="text-sm font-medium">Process Payment</span>
          </Link>
        </div>
      </Card>

      {/* Today's Appointments */}
      <Card title="Today's Appointments">
        {todayAppointments && todayAppointments.length > 0 ? (
          <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {todayAppointments.map((appt) => (
              <li
                key={appt._id}
                className="py-3 flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {formatDateTime(appt.dateTime, "hh:mm a")} -{" "}
                    {appt.patientId?.userId?.name || "N/A"}
                  </p>
                  <p className="text-xs text-gray-500">
                    with Dr. {appt.doctorId?.userId?.name || "N/A"}
                  </p>
                </div>
                <Link
                  to={`/receptionist/appointments#${appt._id}`}
                  className="text-xs text-primary-600 hover:underline flex items-center"
                >
                  Details <ArrowRightIcon className="w-3 h-3 ml-1" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">
            No appointments scheduled for today.
          </p>
        )}
        <div className="text-right mt-2">
          <Link
            to="/receptionist/appointments"
            className="text-sm font-medium text-primary-600 hover:underline"
          >
            Manage All Appointments &rarr;
          </Link>
        </div>
      </Card>

      {/* Pending Payments List */}
      <Card title="Pending Cash Payments">
        {pendingPayments && pendingPayments.length > 0 ? (
          <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {pendingPayments.map((payment) => (
              <li
                key={payment._id}
                className="py-3 flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {payment.patientId?.userId?.name || "N/A"} -{" "}
                    {formatCurrency(payment.amount)}
                  </p>
                  <p className="text-xs text-gray-500">
                    For: {payment.relatedTo} ({formatDate(payment.createdAt)})
                  </p>
                </div>
                <Link
                  to={`/receptionist/payments#${payment._id}`}
                  className="text-xs text-primary-600 hover:underline flex items-center"
                >
                  Process <ArrowRightIcon className="w-3 h-3 ml-1" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">No pending cash payments.</p>
        )}
        <div className="text-right mt-2">
          <Link
            to="/receptionist/payments"
            className="text-sm font-medium text-primary-600 hover:underline"
          >
            View All Payments &rarr;
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default ReceptionistDashboard;
