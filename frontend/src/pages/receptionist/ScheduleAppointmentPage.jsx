// src/pages/receptionist/ScheduleAppointmentPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import Select from "react-select/async"; // Use Async Select for patient search
import receptionistService from "../../services/receptionistService"; //
import AppointmentForm from "../../components/appointments/AppointmentForm"; //
import Card from "../../components/common/Card"; //
import LoadingSpinner from "../../components/common/LoadingSpinner"; //
import { useNavigate } from "react-router-dom";

const ScheduleAppointmentPage = () => {
  const navigate = useNavigate();
  const [selectedPatient, setSelectedPatient] = useState(null); // Stores { value: patientId, label: patientName }
  const [isLoading, setIsLoading] = useState(false);

  // Function to load patient options for AsyncSelect
  const loadPatientOptions = async (inputValue) => {
    if (!inputValue || inputValue.length < 2) {
      return []; // Don't search until 2 chars entered
    }
    try {
      // Fetch patients based on search term
      const response = await receptionistService.getReceptionistPatients({
        search: inputValue,
        limit: 20,
      }); //
      if (response.success) {
        return response.patients.map((p) => ({
          value: p._id, // Patient ID
          label: `${p.userId?.name} (${p.userId?.email})`, // Display name and email
        }));
      }
      return [];
    } catch (error) {
      console.error("Error searching patients:", error);
      return [];
    }
  };

  const handleAppointmentSubmit = async (appointmentData) => {
    if (!selectedPatient) {
      toast.error("Please select a patient first.");
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        ...appointmentData,
        patientId: selectedPatient.value, // Add selected patient ID
      };
      const response = await receptionistService.bookReceptionistAppointment(
        payload
      ); //
      if (response.success && response.appointment) {
        toast.success("Appointment scheduled successfully!");
        // Reset patient selection or navigate away
        setSelectedPatient(null);
        // Optionally navigate: navigate('/receptionist/appointments');
      } else {
        throw new Error(response.message || "Failed to schedule appointment");
      }
    } catch (error) {
      console.error("Schedule appointment error:", error);
      toast.error(error.message || "Could not schedule appointment.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">
        Schedule New Appointment
      </h1>

      <Card>
        <div className="mb-6 pb-4 border-b">
          <label htmlFor="patientSearch" className="form-label">
            Select Patient
          </label>
          <Select
            id="patientSearch"
            cacheOptions // Cache results for performance
            loadOptions={loadPatientOptions} // Function to fetch options dynamically
            defaultOptions // Load some default options maybe? Or leave empty until search
            value={selectedPatient}
            onChange={setSelectedPatient}
            placeholder="Search and select patient by name or email..."
            noOptionsMessage={({ inputValue }) =>
              inputValue.length < 2
                ? "Enter at least 2 characters"
                : "No patients found"
            }
            isClearable
            classNamePrefix="react-select"
          />
        </div>

        {selectedPatient ? (
          <>
            <h3 className="text-lg font-medium mb-3">
              Appointment Details for {selectedPatient.label}
            </h3>
            {/* Render AppointmentForm only when a patient is selected */}
            {/* Pass the patient's hospital ID if needed by AppointmentForm/backend */}
            <AppointmentForm
              onSubmit={handleAppointmentSubmit}
              isLoading={isLoading}
              // You might need to adapt AppointmentForm if it expects patientId internally
              // Or pass it down as needed
            />
          </>
        ) : (
          <p className="text-center text-gray-500 py-4">
            Please select a patient to schedule an appointment.
          </p>
        )}
      </Card>
    </div>
  );
};

export default ScheduleAppointmentPage;
