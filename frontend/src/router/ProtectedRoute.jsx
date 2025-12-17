// src/router/ProtectedRoute.jsx
import React, { useContext } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import AuthContext from "../context/AuthContext";
import LoadingSpinner from "../components/common/LoadingSpinner"; //

/**
 * Protects routes based on authentication status and optionally user role.
 * @param {object} props
 * @param {string[]} [props.allowedRoles] - Array of roles allowed to access the route. If empty/omitted, only checks authentication.
 */
const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    // Show loading indicator while checking authentication
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size={50} />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    // Pass the intended destination via location state
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role if allowedRoles array is provided and has roles
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Redirect to an unauthorized page or dashboard if role doesn't match
    console.warn(
      `User role (${
        user?.role
      }) not allowed for route requiring: ${allowedRoles.join(", ")}`
    );
    // Redirect to their own dashboard or a generic unauthorized page
    const fallbackDashboard = user?.role ? `/${user.role}/dashboard` : "/";
    return <Navigate to={fallbackDashboard} replace />; // Or navigate to an '/unauthorized' page
  }

  // Render the nested route (Outlet) if authenticated and role is allowed (or not checked)
  return <Outlet />;
};

ProtectedRoute.propTypes = {
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
};

export default ProtectedRoute;
