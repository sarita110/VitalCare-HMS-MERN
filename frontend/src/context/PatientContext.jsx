// src/context/PatientContext.jsx
import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
} from "react";
import PropTypes from "prop-types";
import AuthContext from "./AuthContext";
import patientService from "../services/patientService";
import { ROLES } from "../constants";

const PatientContext = createContext(null);

export const PatientProvider = ({ children }) => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [patientProfile, setPatientProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);

  const fetchPatientProfile = useCallback(async () => {
    // Only fetch if authenticated and the user is a patient
    if (isAuthenticated && user?.role === ROLES.PATIENT) {
      setLoadingProfile(true);
      setProfileError(null);
      try {
        const response = await patientService.getPatientProfile();
        if (response.success && response.profile) {
          setPatientProfile(response.profile);
        } else {
          throw new Error(
            response.message || "Failed to fetch patient profile"
          );
        }
      } catch (err) {
        console.error("Fetch patient profile error:", err);
        setProfileError(err.message || "Could not load patient profile.");
        setPatientProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    } else {
      // Clear profile if user logs out or is not a patient
      setPatientProfile(null);
      setLoadingProfile(false);
      setProfileError(null);
    }
  }, [isAuthenticated, user?.role]); // Re-run when auth state or role changes

  // Fetch profile initially and whenever auth state changes
  useEffect(() => {
    fetchPatientProfile();
  }, [fetchPatientProfile]);

  const updateLocalPatientProfile = useCallback((updatedData) => {
    // Merge updated data with existing profile, ensuring user info is nested correctly
    setPatientProfile((prev) => {
      const updatedUser = { ...prev.user, ...updatedData.user };
      const updatedProfile = { ...prev, ...updatedData, user: updatedUser };
      // Also update AuthContext's user state if name/image changed
      // This might require exposing an update function from AuthContext
      return updatedProfile;
    });
  }, []);

  const value = {
    patientProfile,
    loadingProfile,
    profileError,
    fetchPatientProfile, // Expose fetch function for manual refresh
    updateLocalPatientProfile, // Function to update profile state after edit
  };

  // Provide context value only if the user is a patient
  return (
    <PatientContext.Provider
      value={user?.role === ROLES.PATIENT ? value : null}
    >
      {children}
    </PatientContext.Provider>
  );
};

PatientProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default PatientContext;
