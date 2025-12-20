// src/layouts/DashboardLayout.jsx
import React, { useContext, useEffect } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast"; // Ensure toast is imported
import Navbar from "../components/common/Navbar";
// Footer import seems to be missing from previous snippets but was present in original files
// import Footer from "../components/common/Footer";
import AppContext from "../context/AppContext";
import AuthContext from "../context/AuthContext";
import { ROLES } from "../constants";

import AdminSidebar from "../components/sidebars/AdminSidebar";
import SuperAdminSidebar from "../components/sidebars/SuperAdminSidebar";
import PatientSidebar from "../components/sidebars/PatientSidebar";
import DoctorSidebar from "../components/sidebars/DoctorSidebar";
import LabSidebar from "../components/sidebars/LabSidebar";
import RadiologySidebar from "../components/sidebars/RadiologySidebar";
import ReceptionistSidebar from "../components/sidebars/ReceptionistSidebar";
import LoadingSpinner from "../components/common/LoadingSpinner";

const sidebarMap = {
  [ROLES.ADMIN]: AdminSidebar,
  [ROLES.SUPER_ADMIN]: SuperAdminSidebar,
  [ROLES.PATIENT]: PatientSidebar,
  [ROLES.DOCTOR]: DoctorSidebar,
  [ROLES.LAB_TECHNICIAN]: LabSidebar,
  [ROLES.RADIOLOGIST]: RadiologySidebar,
  [ROLES.RECEPTIONIST]: ReceptionistSidebar,
};

const GOOGLE_LOGIN_SUCCESS_KEY = "vitalcare_google_login_success";

const DashboardLayout = () => {
  const {
    user,
    isAuthenticated,
    loading: authLoading,
  } = useContext(AuthContext);
  const { isSidebarOpen, toggleSidebar } = useContext(AppContext);
  const location = useLocation(); // Still need location for protected route state

  const SidebarComponent = user?.role ? sidebarMap[user.role] : null;

  useEffect(() => {
    // Check for the session storage flag
    const googleLoginSuccess = sessionStorage.getItem(GOOGLE_LOGIN_SUCCESS_KEY);
    if (googleLoginSuccess === "true") {
      toast.success("Logged in successfully via Google!");
      sessionStorage.removeItem(GOOGLE_LOGIN_SUCCESS_KEY); // Clear the flag
    }
  }, []); // Run only once when DashboardLayout mounts

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size={50} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user || !SidebarComponent) {
    console.error(
      "DashboardLayout: User authenticated but role or sidebar is missing.",
      user
    );
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <React.Suspense fallback={<LoadingSpinner />}>
        {SidebarComponent && <SidebarComponent isSidebarOpen={isSidebarOpen} />}
      </React.Suspense>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
