import React, { useState, useEffect } from "react";
import Select from "react-select";
import { getAllHospitals } from "../../services/hospitalService"; // Public service to get all active hospitals
import toast from "react-hot-toast";

const HospitalFilter = ({
  selectedHospital,
  onHospitalChange,
  className = "",
}) => {
  const [hospitals, setHospitals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchHospitalsList = async () => {
      setIsLoading(true);
      try {
        const response = await getAllHospitals({
          limit: 500,
          status: "active",
        }); // Fetch all active hospitals
        if (response.success) {
          const options = response.hospitals.map((h) => ({
            value: h._id,
            label: h.name,
          }));
          setHospitals([{ value: "", label: "All Hospitals" }, ...options]); // Add "All Hospitals" option
        } else {
          toast.error(
            response.message || "Could not load hospitals for filter."
          );
        }
      } catch (error) {
        console.error("Failed to fetch hospitals for filter:", error);
        toast.error("Failed to load hospitals. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchHospitalsList();
  }, []);

  // Find the current selection object for react-select
  const currentSelection =
    hospitals.find((h) => h.value === selectedHospital) ||
    (selectedHospital === "" ? hospitals.find((h) => h.value === "") : null) || // Handle "All Hospitals"
    null;

  return (
    <div className={className}>
      <label
        htmlFor="hospitalFilterCommon"
        className="form-label block text-sm font-medium text-gray-700 mb-1"
      >
        Filter by Hospital
      </label>
      <Select
        id="hospitalFilterCommon"
        name="hospitalId"
        options={hospitals}
        isLoading={isLoading}
        value={currentSelection}
        onChange={onHospitalChange}
        placeholder="Select a hospital..."
        isClearable={false} // "All Hospitals" (value: '') is the clear state
        classNamePrefix="react-select"
      />
    </div>
  );
};

export default HospitalFilter;
