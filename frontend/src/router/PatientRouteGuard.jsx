// src/router/PatientRouteGuard.jsx
import React, { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import PropTypes from "prop-types";
import AuthContext from "../context/AuthContext";
import LoadingSpinner from "../components/common/LoadingSpinner";

/**
 * A specialized route guard for patient routes that checks:
 * 1. If user is authenticated
 * 2. If user has patient role
 * 3. If patient has verified their email
 */
const PatientRouteGuard = ({ allowedRoles }) => {
  const { user, isAuthenticated, loading } = useContext(AuthContext);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size={40} />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user role is allowed
  const hasAllowedRole = allowedRoles ? allowedRoles.includes(user.role) : true;

  if (!hasAllowedRole) {
    // Redirect to role-specific dashboard or forbidden page
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  // Special check for patient verification
  if (user.role === "patient" && !user.isVerified) {
    // Redirect to OTP verification with email in state
    return <Navigate to="/verify-otp" state={{ email: user.email }} replace />;
  }

  // User passed all checks, render the protected route
  return <Outlet />;
};

PatientRouteGuard.propTypes = {
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
};

export default PatientRouteGuard;
