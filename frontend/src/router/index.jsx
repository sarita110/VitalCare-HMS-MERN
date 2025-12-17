// src/router/index.jsx
import React, { Suspense, lazy } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { ROLES } from "../constants";

// --- Layouts ---
const PublicLayout = lazy(() => import("../layouts/PublicLayout"));
const AuthLayout = lazy(() => import("../layouts/AuthLayout"));
const DashboardLayout = lazy(() => import("../layouts/DashboardLayout"));

// --- Protected Route Wrapper ---
const ProtectedRoute = lazy(() => import("./ProtectedRoute"));
const PatientRouteGuard = lazy(() => import("./PatientRouteGuard"));

// --- Public Pages ---
const HomePage = lazy(() => import("../pages/public/HomePage"));
const AboutUsPage = lazy(() => import("../pages/public/AboutUs"));
const ContactUsPage = lazy(() => import("../pages/public/ContactUs"));
const HospitalListPage = lazy(() => import("../pages/public/HospitalList"));
const HospitalDetailsPage = lazy(() =>
  import("../pages/public/HospitalDetailsPage")
);

// --- Auth Pages ---
const LoginPage = lazy(() => import("../pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("../pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() =>
  import("../pages/auth/ForgotPasswordPage")
);
const ResetPasswordPage = lazy(() => import("../pages/auth/ResetPasswordPage"));
const VerifyOTPPage = lazy(() => import("../pages/auth/VerifyOTPPage"));
const GoogleCallbackPage = lazy(() =>
  import("../pages/auth/GoogleCallbackPage")
);

// --- Common Authed Pages ---
const CommonProfilePage = lazy(() => import("../pages/common/UserProfilePage"));
const CommonSettingsPage = lazy(() => import("../pages/common/SettingsPage"));
const NotificationsPage = lazy(() =>
  import("../pages/common/NotificationsPage")
);
const NotFoundPage = lazy(() => import("../pages/common/NotFoundPage"));
const PaymentVerifyPage = lazy(() =>
  import("../pages/patient/PaymentVerifyPage")
);

// --- Patient Pages ---
const PatientDashboard = lazy(() =>
  import("../pages/patient/PatientDashboard")
);
const BookAppointmentPage = lazy(() =>
  import("../pages/patient/BookAppointmentPage")
);
const MyAppointmentsPage = lazy(() =>
  import("../pages/patient/MyAppointmentsPage")
);
const PatientMedicalRecordsPage = lazy(() =>
  import("../pages/patient/MedicalRecordsPage")
);
const PatientPrescriptionsPage = lazy(() =>
  import("../pages/patient/PrescriptionsPage")
);
const PatientPaymentsPage = lazy(() => import("../pages/patient/PaymentsPage"));
const PatientLabResultsPage = lazy(() =>
  import("../pages/patient/LabResultsPage")
);
const PatientRadiologyResultsPage = lazy(() =>
  import("../pages/patient/RadiologyResultsPage")
);

// --- Doctor Pages ---
const DoctorDashboard = lazy(() => import("../pages/doctor/DoctorDashboard"));
const DoctorAppointmentsPage = lazy(() =>
  import("../pages/doctor/AppointmentsPage")
);
const AppointmentDetailPage = lazy(
  () => import("../pages/doctor/AppointmentDetailPage") // New component for appointment details
);

const DoctorPatientsPage = lazy(() => import("../pages/doctor/PatientsPage"));
const DoctorPatientDetailsPage = lazy(() =>
  import("../pages/doctor/PatientDetailsPage")
);
const DoctorLabRequestsPage = lazy(() =>
  import("../pages/doctor/LabRequestsPage")
);
const DoctorRadiologyRequestsPage = lazy(() =>
  import("../pages/doctor/RadiologyRequestsPage")
);
const DoctorMedicalRecordsPage = lazy(() =>
  import("../pages/doctor/MedicalRecordsPage")
);
const PatientMedicalHistoryPage = lazy(() =>
  import("../pages/doctor/PatientMedicalHistoryPage")
);
const DoctorReferralsPage = lazy(() => import("../pages/doctor/ReferralsPage"));

// --- Receptionist Pages ---
const ReceptionistDashboard = lazy(() =>
  import("../pages/receptionist/ReceptionistDashboard")
);
const RegisterPatientPage = lazy(() =>
  import("../pages/receptionist/RegisterPatientPage")
);
const ScheduleAppointmentPage = lazy(() =>
  import("../pages/receptionist/ScheduleAppointmentPage")
);
const ManageAppointmentsPage = lazy(() =>
  import("../pages/receptionist/ManageAppointmentsPage")
);
const ProcessPaymentsPage = lazy(() =>
  import("../pages/receptionist/ProcessPaymentsPage")
);
const UploadReportPage = lazy(() =>
  import("../pages/receptionist/UploadReportPage")
);
const ManageReferralsPage = lazy(() =>
  import("../pages/receptionist/ManageReferralsPage")
);

// --- Lab Pages ---
const LabDashboard = lazy(() => import("../pages/lab/LabDashboard"));
const TestRequestsPage = lazy(() => import("../pages/lab/TestRequestsPage"));
const UploadLabResultsPage = lazy(() =>
  import("../pages/lab/UploadResultsPage")
);
const LabResultsPage = lazy(() => import("../pages/lab/LabResultsPage"));

// --- Radiology Pages ---
const RadiologyDashboard = lazy(() =>
  import("../pages/radiology/RadiologyDashboard")
);
const RadiologyRequestsPage = lazy(() =>
  import("../pages/radiology/RadiologyRequestsPage")
);
const RadiologyResultsPage = lazy(() =>
  import("../pages/radiology/RadiologyResultsPage")
);
const UploadRadiologyReportPage = lazy(() =>
  import("../pages/radiology/UploadReportPage")
);

// --- Admin Pages ---
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const DepartmentManagementPage = lazy(() =>
  import("../pages/admin/DepartmentManagementPage")
);
const DoctorManagementPage = lazy(() =>
  import("../pages/admin/DoctorManagementPage")
);
// --- Import New Admin Detail Pages ---
const AdminDoctorDetailPage = lazy(() =>
  // <-- ADD THIS IMPORT
  import("../pages/admin/AdminDoctorDetailPage")
);
const AdminPatientDetailPage = lazy(() =>
  // <-- ADD THIS IMPORT
  import("../pages/admin/AdminPatientDetailPage")
);
// --- End Import ---
const StaffManagementPage = lazy(() =>
  import("../pages/admin/StaffManagementPage")
);
const AdminPatientManagementPage = lazy(() =>
  import("../pages/admin/PatientManagementPage")
);
const AdminAppointmentsManagementPage = lazy(() =>
  import("../pages/admin/AppointmentsManagementPage")
);
// --- Import the new detail page ---
const AdminAppointmentDetailPage = lazy(() =>
  // <-- ADD THIS IMPORT
  import("../pages/admin/AdminAppointmentDetailPage")
);
const HospitalProfilePage = lazy(() =>
  import("../pages/admin/HospitalProfilePage")
);
const AdminReportsPage = lazy(() => import("../pages/admin/ReportsPage"));

// --- Super Admin Pages ---
const SuperAdminDashboard = lazy(() =>
  import("../pages/superAdmin/SuperAdminDashboard")
);
const HospitalManagementPage = lazy(() =>
  import("../pages/superAdmin/HospitalManagementPage")
);
const AdminUserManagementPage = lazy(() =>
  import("../pages/superAdmin/UserManagementPage")
);
const SystemReportsPage = lazy(() =>
  import("../pages/superAdmin/SystemReportsPage")
);

const router = createBrowserRouter([
  // Public Routes
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/about", element: <AboutUsPage /> },
      { path: "/contact", element: <ContactUsPage /> },
      { path: "/hospitals", element: <HospitalListPage /> },
      { path: "/hospitals/:id", element: <HospitalDetailsPage /> },
    ],
  },
  // Auth Routes
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
      { path: "/verify-otp", element: <VerifyOTPPage /> },
      { path: "/auth/google-callback", element: <GoogleCallbackPage /> },
    ],
  },
  // Payment Verification Callback Route
  {
    path: "/payment/verify",
    element: <ProtectedRoute allowedRoles={[ROLES.PATIENT]} />,
    children: [{ index: true, element: <PaymentVerifyPage /> }],
  },
  // Protected Routes (Dashboard Layout)
  {
    element: <DashboardLayout />,
    children: [
      // Common Protected Routes
      {
        element: <ProtectedRoute />,
        children: [
          { path: "/profile", element: <CommonProfilePage /> },
          { path: "/settings", element: <CommonSettingsPage /> },
          {
            path: "/notifications",
            element: <NotificationsPage />,
          },
        ],
      },
      // Patient Routes - Now using PatientRouteGuard to check verification
      {
        element: <PatientRouteGuard allowedRoles={[ROLES.PATIENT]} />,
        children: [
          { path: "/patient/dashboard", element: <PatientDashboard /> },
          {
            path: "/patient/book-appointment",
            element: <BookAppointmentPage />,
          },
          { path: "/patient/appointments", element: <MyAppointmentsPage /> },
          {
            path: "/patient/appointments/:id",
            element: <MyAppointmentsPage />,
          },
          {
            path: "/patient/medical-records",
            element: <PatientMedicalRecordsPage />,
          },
          {
            path: "/patient/prescriptions",
            element: <PatientPrescriptionsPage />,
          },
          { path: "/patient/payments", element: <PatientPaymentsPage /> },
          { path: "/patient/lab-results", element: <PatientLabResultsPage /> },
          {
            path: "/patient/radiology-results",
            element: <PatientRadiologyResultsPage />,
          },
        ],
      },
      // Doctor Routes
      {
        element: <ProtectedRoute allowedRoles={[ROLES.DOCTOR]} />,
        children: [
          { path: "/doctor/dashboard", element: <DoctorDashboard /> },
          { path: "/doctor/appointments", element: <DoctorAppointmentsPage /> },
          {
            path: "/doctor/appointments/:id",
            element: <AppointmentDetailPage />,
          },
          { path: "/doctor/patients", element: <DoctorPatientsPage /> },
          {
            path: "/doctor/patients/:id",
            element: <DoctorPatientDetailsPage />,
          },
          { path: "/doctor/lab-results", element: <DoctorLabRequestsPage /> },
          {
            path: "/doctor/radiology-results",
            element: <DoctorRadiologyRequestsPage />,
          },

          {
            path: "/doctor/patients/:id/medical-history/",
            element: <PatientMedicalHistoryPage />,
          },

          {
            path: "/doctor/medical-records",
            element: <DoctorMedicalRecordsPage />,
          },

          { path: "/doctor/referrals", element: <DoctorReferralsPage /> },
        ],
      },
      // Receptionist Routes
      {
        element: <ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]} />,
        children: [
          {
            path: "/receptionist/dashboard",
            element: <ReceptionistDashboard />,
          },
          {
            path: "/receptionist/register-patient",
            element: <RegisterPatientPage />,
          },
          {
            path: "/receptionist/schedule-appointment",
            element: <ScheduleAppointmentPage />,
          },
          {
            path: "/receptionist/appointments",
            element: <ManageAppointmentsPage />,
          },
          { path: "/receptionist/payments", element: <ProcessPaymentsPage /> },
          {
            path: "/receptionist/upload-report",
            element: <UploadReportPage />,
          },
          { path: "/receptionist/referrals", element: <ManageReferralsPage /> },
        ],
      },
      // Lab Routes
      {
        element: <ProtectedRoute allowedRoles={[ROLES.LAB_TECHNICIAN]} />,
        children: [
          { path: "/lab/dashboard", element: <LabDashboard /> },
          { path: "/lab/requests", element: <TestRequestsPage /> },
          {
            path: "/lab/upload-results/:testId",
            element: <UploadLabResultsPage />,
          },
          { path: "/lab/results", element: <LabResultsPage /> },
        ],
      },
      // Radiology Routes
      {
        element: <ProtectedRoute allowedRoles={[ROLES.RADIOLOGIST]} />,
        children: [
          { path: "/radiology/dashboard", element: <RadiologyDashboard /> },
          { path: "/radiology/requests", element: <RadiologyRequestsPage /> },
          {
            path: "/radiology/upload-report/:reportId",
            element: <UploadRadiologyReportPage />,
          },
          { path: "/radiology/results", element: <RadiologyResultsPage /> },
        ],
      },
      // Admin Routes
      {
        element: <ProtectedRoute allowedRoles={[ROLES.ADMIN]} />,
        children: [
          { path: "/admin/dashboard", element: <AdminDashboard /> },
          { path: "/admin/departments", element: <DepartmentManagementPage /> },
          { path: "/admin/doctors", element: <DoctorManagementPage /> },
          {
            // <-- ADD THIS ROUTE
            path: "/admin/doctors/:id", // Doctor Profile ID
            element: <AdminDoctorDetailPage />,
          },
          { path: "/admin/staff", element: <StaffManagementPage /> },
          { path: "/admin/patients", element: <AdminPatientManagementPage /> },
          {
            path: "/admin/patients/:id",
            element: <AdminPatientDetailPage />,
          },
          {
            path: "/admin/appointments",
            element: <AdminAppointmentsManagementPage />,
          },
          // --- Add the route for Appointment Details ---
          {
            // <-- ADD THIS ROUTE OBJECT
            path: "/admin/appointments/:id",
            element: <AdminAppointmentDetailPage />,
          },
          { path: "/admin/hospital-profile", element: <HospitalProfilePage /> },
          { path: "/admin/reports", element: <AdminReportsPage /> },
        ],
      },
      // Super Admin Routes
      {
        element: <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]} />,
        children: [
          { path: "/super-admin/dashboard", element: <SuperAdminDashboard /> },
          {
            path: "/super-admin/hospitals",
            element: <HospitalManagementPage />,
          },
          {
            path: "/super-admin/hospital-admins",
            element: <AdminUserManagementPage />,
          },
          {
            path: "/super-admin/reports",
            element: <SystemReportsPage />,
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> }, // Catch-all inside dashboard
    ],
  },
  // Catch-all for 404 - public or unmatched
  { path: "*", element: <NotFoundPage /> },
]);

const AppRouter = () => {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner size={50} />
        </div>
      }
    >
      <RouterProvider router={router} />
    </Suspense>
  );
};

export default AppRouter;
