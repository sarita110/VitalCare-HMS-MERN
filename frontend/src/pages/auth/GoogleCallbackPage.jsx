// src/pages/auth/GoogleCallbackPage.jsx
import React, { useEffect, useContext, useState, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import AuthContext from "../../context/AuthContext";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import storage from "../../utils/storage"; // Your local storage utility
import api from "../../services/api";
import { ROLES } from "../../constants";

const roleToUrlPath = (role) => {
  if (!role) return "/";
  if (role === ROLES.SUPER_ADMIN) return "super-admin";
  if (role === ROLES.LAB_TECHNICIAN) return "lab";
  if (role === ROLES.RADIOLOGIST) return "radiology";
  return role.toLowerCase();
};

const GOOGLE_LOGIN_SUCCESS_KEY = "vitalcare_google_login_success"; // Session storage key

const GoogleCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkAuth, user, isAuthenticated } = useContext(AuthContext);
  const [message, setMessage] = useState("Processing Google login...");
  const [error, setError] = useState(null);
  const [isProcessingToken, setIsProcessingToken] = useState(false);

  useEffect(() => {
    const processToken = async () => {
      if (isProcessingToken || isAuthenticated) return;
      setIsProcessingToken(true);

      const token = searchParams.get("token");

      if (token) {
        try {
          storage.setToken(token);
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          await checkAuth();
          setMessage("Authentication successful. Redirecting...");
          // SET FLAG IN SESSION STORAGE INSTEAD OF NAV STATE
          sessionStorage.setItem(GOOGLE_LOGIN_SUCCESS_KEY, "true");
        } catch (err) {
          console.error("Google callback - error during checkAuth:", err);
          setError("Failed to finalize Google login. Please try again.");
          storage.clearAuthData();
          delete api.defaults.headers.common["Authorization"];
        }
      } else {
        setError("Invalid Google login attempt. No token received.");
      }
    };
    processToken();
  }, [searchParams, checkAuth, navigate, isAuthenticated, isProcessingToken]);

  useEffect(() => {
    if (isAuthenticated && user && isProcessingToken && !error) {
      const urlRole = roleToUrlPath(user.role);
      const dashboardPath = `/${urlRole}/dashboard`;
      navigate(dashboardPath, { replace: true }); // No state needed here anymore
    }
  }, [isAuthenticated, user, navigate, isProcessingToken, error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px]">
      <LoadingSpinner />
      <p className="mt-4 text-gray-600">{message}</p>
      {error && (
        <>
          <p className="mt-2 text-danger-600">{error}</p>
          <Link to="/login" className="mt-4 text-primary-600 hover:underline">
            Return to Login
          </Link>
        </>
      )}
    </div>
  );
};

export default GoogleCallbackPage;
