// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import api from "../services/api";
import authService from "../services/authService";
import storage from "../utils/storage";
import { ROLES } from "../constants";

const roleToUrlPath = (role) => {
  if (!role) return "/"; // Fallback
  if (role === ROLES.SUPER_ADMIN) return "super-admin";
  if (role === ROLES.LAB_TECHNICIAN) return "lab";
  if (role === ROLES.RADIOLOGIST) return "radiology";
  return role.toLowerCase();
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(storage.getUser());
  const [isAuthenticated, setIsAuthenticated] = useState(!!storage.getToken());
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const checkAuth = useCallback(async () => {
    setLoading(true);
    setAuthError(null);
    const token = storage.getToken();
    if (token) {
      try {
        // Ensure Axios headers are set if token exists (e.g. on page refresh)
        if (!api.defaults.headers.common["Authorization"]) {
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        }
        const response = await authService.checkAuthStatus();
        if (response.success && response.user) {
          setUser(response.user);
          setIsAuthenticated(true);
          storage.setUser(response.user);
        } else {
          storage.clearAuthData();
          setUser(null);
          setIsAuthenticated(false);
          delete api.defaults.headers.common["Authorization"];
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        storage.clearAuthData();
        setUser(null);
        setIsAuthenticated(false);
        delete api.defaults.headers.common["Authorization"];
      }
    } else {
      setUser(null);
      setIsAuthenticated(false);
      delete api.defaults.headers.common["Authorization"]; // Ensure header is clear if no token
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
    const handleStorageChange = (event) => {
      if (
        event.key === "vitalcare_auth_token" ||
        event.key === "vitalcare_user_info"
      ) {
        console.log("Auth storage changed in another tab, re-checking auth...");
        checkAuth();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [checkAuth]);

  const login = async (credentials) => {
    setLoading(true);
    setAuthError(null); // Clear previous auth errors before new attempt
    try {
      const response = await authService.login(credentials);
      if (response.success && response.token && response.user) {
        if (response.user.role === ROLES.PATIENT && !response.user.isVerified) {
          storage.setToken(response.token);
          storage.setUser(response.user);
          setUser(response.user);
          api.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${response.token}`;
          return response; // Let LoginPage handle navigation to OTP
        } else {
          storage.setToken(response.token);
          storage.setUser(response.user);
          setUser(response.user);
          setIsAuthenticated(true);
          api.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${response.token}`;
          const urlRole = roleToUrlPath(response.user.role);
          return {
            success: true,
            user: response.user,
            rolePath: `/${urlRole}/dashboard`,
          };
        }
      } else {
        // This path might not be hit if API interceptor throws for 401
        const errMsg = response.message || "Login failed";
        setAuthError(errMsg); // Set authError here
        throw new Error(errMsg);
      }
    } catch (err) {
      console.error("Login error in AuthContext:", err);
      const errMsg =
        err?.message || "Login failed. Please check your credentials.";
      setAuthError(errMsg); // Ensure authError is set on any catch
      // storage.clearAuthData(); // Don't clear data immediately, let user see the error
      // setUser(null);
      // setIsAuthenticated(false);
      throw err; // Re-throw for LoginPage to handle setIsLoading(false)
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    setAuthError(null);
    try {
      const response = await authService.register(userData);
      if (response.success) {
        if (userData.role === ROLES.PATIENT) {
          if (response.token && response.user) {
            storage.setToken(response.token);
            storage.setUser(response.user);
            setUser(response.user);
            api.defaults.headers.common[
              "Authorization"
            ] = `Bearer ${response.token}`;
          }
        } else {
          if (response.token && response.user) {
            storage.setToken(response.token);
            storage.setUser(response.user);
            setUser(response.user);
            setIsAuthenticated(true);
            api.defaults.headers.common[
              "Authorization"
            ] = `Bearer ${response.token}`;
            const urlRole = roleToUrlPath(response.user.role);
            // MODIFIED: Return success and path for component to navigate if needed,
            // or keep window.location.href if direct redirect is preferred for non-patient staff
            // For consistency, returning path might be better.
            // window.location.href = `/${urlRole}/dashboard`; // Original
            return {
              success: true,
              user: response.user,
              rolePath: `/${urlRole}/dashboard`,
              isStaff: true,
            };
          }
        }
        return response;
      } else {
        throw new Error(response.message || "Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
      const errMsg = err?.message || "Registration failed. Please try again.";
      setAuthError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpAndLogin = async (email, otp) => {
    setLoading(true);
    setAuthError(null);
    try {
      const response = await authService.verifyOtp(email, otp);
      if (response.success && response.token && response.user) {
        storage.setToken(response.token);
        storage.setUser(response.user);
        setUser(response.user);
        setIsAuthenticated(true);
        api.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${response.token}`;
        const urlRole = roleToUrlPath(response.user.role);
        // MODIFIED: Return path
        return {
          success: true,
          user: response.user,
          rolePath: `/${urlRole}/dashboard`,
        };
      } else {
        throw new Error(response.message || "OTP Verification failed");
      }
    } catch (err) {
      console.error("OTP Verification error:", err);
      const errMsg = err?.message || "OTP Verification failed.";
      setAuthError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      // await authService.logout();
    } catch (err) {
      console.error("Backend logout failed:", err);
    } finally {
      storage.clearAuthData();
      setUser(null);
      setIsAuthenticated(false);
      delete api.defaults.headers.common["Authorization"];
      setLoading(false);
      window.location.href = "/login";
    }
  };

  const updateUserState = (updatedUserInfo) => {
    setUser((prevUser) => {
      const newUser = { ...prevUser, ...updatedUserInfo };
      storage.setUser(newUser);
      return newUser;
    });
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    authError,
    login,
    register,
    logout,
    checkAuth,
    verifyOtpAndLogin,
    updateUserState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthContext;
