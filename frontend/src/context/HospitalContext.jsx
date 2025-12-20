// src/context/HospitalContext.jsx
// (Keeping this context focused on public/general hospital data as before)
import React, { createContext, useState, useCallback } from "react";
import PropTypes from "prop-types";
import hospitalService from "../services/hospitalService";

const HospitalContext = createContext(null);

export const HospitalProvider = ({ children }) => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [currentHospitalDetail, setCurrentHospitalDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchHospitals = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await hospitalService.getAllHospitals(params); // [cite: 3210]
      if (response.success) {
        setHospitals(response.hospitals);
        setPagination(response.pagination);
      } else {
        throw new Error(response.message || "Failed to fetch hospitals");
      }
    } catch (err) {
      console.error("Fetch hospitals error:", err);
      setError(err.message || "Could not load hospitals.");
      setHospitals([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHospitalDetails = useCallback(async (hospitalId) => {
    if (!hospitalId) return;
    setLoadingDetail(true);
    setError(null);
    setCurrentHospitalDetail(null);
    try {
      const response = await hospitalService.getHospitalDetails(hospitalId); // [cite: 3214]
      if (response.success) {
        setCurrentHospitalDetail(response); // Store the whole response { hospital, doctors }
      } else {
        throw new Error(response.message || "Failed to fetch hospital details");
      }
    } catch (err) {
      console.error("Fetch hospital details error:", err);
      setError(err.message || "Could not load hospital details.");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const value = {
    hospitals,
    loading,
    error,
    pagination,
    fetchHospitals,
    currentHospitalDetail,
    loadingDetail,
    fetchHospitalDetails,
  };

  return (
    <HospitalContext.Provider value={value}>
      {children}
    </HospitalContext.Provider>
  );
};

HospitalProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default HospitalContext;
