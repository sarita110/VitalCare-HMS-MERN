// src/context/DoctorContext.jsx
import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
} from "react";
import PropTypes from "prop-types";
import AuthContext from "./AuthContext";
import doctorService from "../services/doctorService";
import { ROLES } from "../constants";

const DoctorContext = createContext(null);

export const DoctorProvider = ({ children }) => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);

  const fetchDoctorProfile = useCallback(async () => {
    if (isAuthenticated && user?.role === ROLES.DOCTOR) {
      setLoadingProfile(true);
      setProfileError(null);
      try {
        const response = await doctorService.getDoctorProfile(); // [cite: 3190]
        if (response.success && response.profile) {
          setDoctorProfile(response.profile);
        } else {
          throw new Error(response.message || "Failed to fetch doctor profile");
        }
      } catch (err) {
        console.error("Fetch doctor profile error:", err);
        setProfileError(err.message || "Could not load doctor profile.");
        setDoctorProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    } else {
      setDoctorProfile(null);
      setLoadingProfile(false);
      setProfileError(null);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    fetchDoctorProfile();
  }, [fetchDoctorProfile]);

  const updateLocalDoctorProfile = useCallback((updatedData) => {
    // Merge updated data with existing profile, ensuring user info is nested correctly
    setDoctorProfile((prev) => {
      const updatedUser = { ...prev.user, ...updatedData.user };
      const updatedProfile = { ...prev, ...updatedData, user: updatedUser };
      return updatedProfile;
    });
  }, []);

  const value = {
    doctorProfile,
    loadingProfile,
    profileError,
    fetchDoctorProfile,
    updateLocalDoctorProfile,
    // Add other doctor-specific context values (e.g., view filters)
  };

  return (
    <DoctorContext.Provider value={user?.role === ROLES.DOCTOR ? value : null}>
      {children}
    </DoctorContext.Provider>
  );
};

DoctorProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default DoctorContext;
