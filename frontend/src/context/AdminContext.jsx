// src/context/AdminContext.jsx
import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
} from "react";
import PropTypes from "prop-types";
import AuthContext from "./AuthContext";
import adminService from "../services/adminService";
import { ROLES } from "../constants";

const AdminContext = createContext(null);

export const AdminProvider = ({ children }) => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [hospitalProfile, setHospitalProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);

  const fetchHospitalProfile = useCallback(async () => {
    // Only fetch if authenticated and the user is an admin
    if (isAuthenticated && user?.role === ROLES.ADMIN) {
      setLoadingProfile(true);
      setProfileError(null);
      try {
        const response = await adminService.getAdminHospitalProfile(); // [cite: 3099]
        if (response.success && response.hospital) {
          setHospitalProfile(response.hospital);
        } else {
          throw new Error(
            response.message || "Failed to fetch hospital profile"
          );
        }
      } catch (err) {
        console.error("Fetch hospital profile error:", err);
        setProfileError(err.message || "Could not load hospital profile.");
        setHospitalProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    } else {
      setHospitalProfile(null);
      setLoadingProfile(false);
      setProfileError(null);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    fetchHospitalProfile();
  }, [fetchHospitalProfile]);

  const updateLocalHospitalProfile = useCallback((updatedData) => {
    setHospitalProfile((prev) => ({ ...prev, ...updatedData }));
  }, []);

  const value = {
    hospitalProfile,
    loadingProfile,
    profileError,
    fetchHospitalProfile,
    updateLocalHospitalProfile,
    // Add other admin-specific state/functions if needed (e.g., selected user for editing)
  };

  // Provide context value only if the user is an admin
  return (
    <AdminContext.Provider value={user?.role === ROLES.ADMIN ? value : null}>
      {children}
    </AdminContext.Provider>
  );
};

AdminProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AdminContext;
