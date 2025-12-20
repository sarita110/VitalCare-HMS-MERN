// src/context/SuperAdminContext.jsx
import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
} from "react";
import PropTypes from "prop-types";
import AuthContext from "./AuthContext";
import superAdminService from "../services/superAdminService";
import { ROLES } from "../constants";

const SuperAdminContext = createContext(null);

export const SuperAdminProvider = ({ children }) => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [dashboardData, setDashboardData] = useState(null); // Example state
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    if (isAuthenticated && user?.role === ROLES.SUPER_ADMIN) {
      setLoadingDashboard(true);
      setDashboardError(null);
      try {
        const response = await superAdminService.getSuperAdminDashboard(); // [cite: 3330]
        if (response.success && response.dashboardData) {
          setDashboardData(response.dashboardData);
        } else {
          throw new Error(response.message || "Failed to fetch dashboard data");
        }
      } catch (err) {
        console.error("Fetch super admin dashboard error:", err);
        setDashboardError(err.message || "Could not load dashboard data.");
        setDashboardData(null);
      } finally {
        setLoadingDashboard(false);
      }
    } else {
      setDashboardData(null);
      setLoadingDashboard(false);
      setDashboardError(null);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const value = {
    dashboardData,
    loadingDashboard,
    dashboardError,
    fetchDashboardData, // Expose function to refresh dashboard data
    // Add other super-admin specific state/functions if needed
  };

  return (
    <SuperAdminContext.Provider
      value={user?.role === ROLES.SUPER_ADMIN ? value : null}
    >
      {children}
    </SuperAdminContext.Provider>
  );
};

SuperAdminProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default SuperAdminContext;
