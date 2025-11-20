// src/context/LabContext.jsx
import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
} from "react";
import PropTypes from "prop-types";
import AuthContext from "./AuthContext";
import labService from "../services/labService";
import { ROLES } from "../constants";

const LabContext = createContext(null);

export const LabProvider = ({ children }) => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [labProfile, setLabProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);

  const fetchLabProfile = useCallback(async () => {
    if (isAuthenticated && user?.role === ROLES.LAB_TECHNICIAN) {
      setLoadingProfile(true);
      setProfileError(null);
      try {
        const response = await labService.getLabProfile(); // [cite: 3231]
        if (response.success && response.profile) {
          setLabProfile(response.profile);
        } else {
          throw new Error(
            response.message || "Failed to fetch lab technician profile"
          );
        }
      } catch (err) {
        console.error("Fetch lab profile error:", err);
        setProfileError(
          err.message || "Could not load lab technician profile."
        );
        setLabProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    } else {
      setLabProfile(null);
      setLoadingProfile(false);
      setProfileError(null);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    fetchLabProfile();
  }, [fetchLabProfile]);

  const updateLocalLabProfile = useCallback((updatedData) => {
    setLabProfile((prev) => {
      const updatedUser = { ...prev.user, ...updatedData.user };
      const updatedProfile = { ...prev, ...updatedData, user: updatedUser };
      return updatedProfile;
    });
  }, []);

  const value = {
    labProfile,
    loadingProfile,
    profileError,
    fetchLabProfile,
    updateLocalLabProfile,
    // Add other lab-specific state/functions
  };

  return (
    <LabContext.Provider
      value={user?.role === ROLES.LAB_TECHNICIAN ? value : null}
    >
      {children}
    </LabContext.Provider>
  );
};

LabProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default LabContext;
