// src/context/ReceptionistContext.jsx
import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
} from "react";
import PropTypes from "prop-types";
import AuthContext from "./AuthContext";
import receptionistService from "../services/receptionistService";
import { ROLES } from "../constants";

const ReceptionistContext = createContext(null);

export const ReceptionistProvider = ({ children }) => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [receptionistProfile, setReceptionistProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState(null); // Example state

  const fetchReceptionistProfile = useCallback(async () => {
    if (isAuthenticated && user?.role === ROLES.RECEPTIONIST) {
      setLoadingProfile(true);
      setProfileError(null);
      try {
        const response = await receptionistService.getReceptionistProfile(); // [cite: 3300]
        if (response.success && response.profile) {
          setReceptionistProfile(response.profile);
        } else {
          throw new Error(
            response.message || "Failed to fetch receptionist profile"
          );
        }
      } catch (err) {
        console.error("Fetch receptionist profile error:", err);
        setProfileError(err.message || "Could not load receptionist profile.");
        setReceptionistProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    } else {
      setReceptionistProfile(null);
      setLoadingProfile(false);
      setProfileError(null);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    fetchReceptionistProfile();
  }, [fetchReceptionistProfile]);

  const updateLocalReceptionistProfile = useCallback((updatedData) => {
    // Merge updated data with existing profile, ensuring user info is nested correctly
    setReceptionistProfile((prev) => {
      const updatedUser = { ...prev.user, ...updatedData.user };
      const updatedProfile = { ...prev, ...updatedData, user: updatedUser };
      return updatedProfile;
    });
  }, []);

  const value = {
    receptionistProfile,
    loadingProfile,
    profileError,
    fetchReceptionistProfile,
    updateLocalReceptionistProfile,
    selectedPatientId, // For tracking patient context within receptionist panel
    setSelectedPatientId,
  };

  return (
    <ReceptionistContext.Provider
      value={user?.role === ROLES.RECEPTIONIST ? value : null}
    >
      {children}
    </ReceptionistContext.Provider>
  );
};

ReceptionistProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ReceptionistContext;
