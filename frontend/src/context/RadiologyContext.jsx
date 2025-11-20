// src/context/RadiologyContext.jsx
import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
} from "react";
import PropTypes from "prop-types";
import AuthContext from "./AuthContext";
import radiologyService from "../services/radiologyService";
import { ROLES } from "../constants";

export const RadiologyContext = createContext(null);

export const useRadiology = () => {
  const context = useContext(RadiologyContext);
  if (context === undefined) {
    throw new Error("useRadiology must be used within a RadiologyProvider");
  }
  return context;
};

export const RadiologyProvider = ({ children }) => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [radiologyProfile, setRadiologyProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);

  const fetchRadiologyProfile = useCallback(async () => {
    if (isAuthenticated && user?.role === ROLES.RADIOLOGIST) {
      setLoadingProfile(true);
      setProfileError(null);
      try {
        const response = await radiologyService.getRadiologyProfile();
        if (response.success && response.profile) {
          setRadiologyProfile(response.profile);
        } else {
          throw new Error(
            response.message || "Failed to fetch radiologist profile"
          );
        }
      } catch (err) {
        console.error("Fetch radiology profile error:", err);
        setProfileError(err.message || "Could not load radiologist profile.");
        setRadiologyProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    } else {
      setRadiologyProfile(null);
      setLoadingProfile(false);
      setProfileError(null);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    fetchRadiologyProfile();
  }, [fetchRadiologyProfile]);

  const updateLocalRadiologyProfile = useCallback((updatedData) => {
    setRadiologyProfile((prev) => {
      const updatedUser = { ...prev.user, ...updatedData.user };
      const updatedProfile = { ...prev, ...updatedData, user: updatedUser };
      return updatedProfile;
    });
  }, []);

  const value = {
    radiologyProfile,
    loadingProfile,
    profileError,
    fetchRadiologyProfile,
    updateLocalRadiologyProfile,
    // Add other radiology-specific state/functions
  };

  return (
    <RadiologyContext.Provider
      value={user?.role === ROLES.RADIOLOGIST ? value : null}
    >
      {children}
    </RadiologyContext.Provider>
  );
};

RadiologyProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
