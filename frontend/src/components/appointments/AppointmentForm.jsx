// src/components/appointments/AppointmentForm.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import Select from "react-select";
import Button from "../common/Button";
import FormInput from "../common/FormInput";
import DateTimeSelector from "./DateTimeSelector";
import {
  getDoctorsForPatient,
  getDoctorDetailsForPatient,
} from "../../services/patientService";
import { getAllHospitals } from "../../services/hospitalService";
import { formatSlotDate, convertTo24HourFormat } from "../../utils/helpers";
import { differenceInDays } from "date-fns";
import toast from "react-hot-toast"; // For error messages if needed

const appointmentSchema = Yup.object({
  hospitalId: Yup.string().required("Please select a hospital"),
  doctorId: Yup.string().required("Please select a doctor"),
  dateTime: Yup.string().required("Please select a date and time"),
  reason: Yup.string()
    .required("Reason for appointment is required")
    .min(5, "Reason is too short"),
  type: Yup.string().optional(),
});

const AppointmentForm = ({
  onSubmit,
  initialValues = null, // For editing existing appointments
  isLoading = false, // Prop for main form submission loading state
  initialHospital = null,
  initialDoctor = null,
}) => {
  const [hospitalsForFilter, setHospitalsForFilter] = useState([]);
  const [loadingHospitalsForFilter, setLoadingHospitalsForFilter] =
    useState(false);

  // State for dropdown selections
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // State for fetched data
  const [doctors, setDoctors] = useState([]);
  const [doctorDetails, setDoctorDetails] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");

  // State for component-specific loading and errors
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [showPaymentMessage, setShowPaymentMessage] = useState(false);

  const formik = useFormik({
    initialValues: {
      hospitalId: initialValues?.hospitalId || initialHospital?.value || "",
      doctorId: initialValues?.doctorId || initialDoctor?.value || "",
      dateTime: initialValues?.dateTime || "",
      reason: initialValues?.reason || "",
      type: initialValues?.type || "regular",
    },
    validationSchema: appointmentSchema,
    onSubmit: (values) => {
      const submissionValues = {
        ...values,
        dateTime:
          typeof values.dateTime === "object"
            ? values.dateTime.toISOString()
            : values.dateTime,
      };
      // For patient booking, backend derives hospital from doctor.
      // If this form is reused by others (e.g., receptionist), hospitalId might be needed.
      // Assuming patient context here, where hospitalId is not directly sent for booking.
      const { hospitalId, ...patientSubmissionData } = submissionValues;
      onSubmit(patientSubmissionData);
    },
    enableReinitialize: true, // Important for initialValues changes to reflect
  });

  // Set initial selections from props
  useEffect(() => {
    if (initialHospital) {
      setSelectedHospital(initialHospital);
      formik.setFieldValue("hospitalId", initialHospital.value);
    }
  }, [initialHospital]); // Removed formik.setFieldValue to avoid infinite loop, handled by enableReinitialize

  useEffect(() => {
    if (initialDoctor && initialHospital) {
      // Only set doctor if hospital is also preselected
      setSelectedDoctor(initialDoctor);
      formik.setFieldValue("doctorId", initialDoctor.value);
    }
  }, [initialDoctor, initialHospital]); // Removed formik.setFieldValue

  // Fetch all hospitals for the hospital dropdown
  useEffect(() => {
    const fetchAllHospitals = async () => {
      setLoadingHospitalsForFilter(true);
      setFetchError(null);
      try {
        const response = await getAllHospitals({
          limit: 500,
          status: "active",
        });
        if (response.success) {
          setHospitalsForFilter(
            response.hospitals.map((h) => ({ value: h._id, label: h.name }))
          );
        } else {
          throw new Error(response.message || "Could not load hospitals list");
        }
      } catch (error) {
        console.error("Failed to fetch hospitals for filter:", error);
        setFetchError("Could not load hospitals. Please try refreshing.");
        toast.error("Could not load hospitals list.");
      } finally {
        setLoadingHospitalsForFilter(false);
      }
    };
    fetchAllHospitals();
  }, []);

  // Fetch doctors when a hospital is selected (or pre-selected)
  useEffect(() => {
    if (!selectedHospital?.value) {
      setDoctors([]);
      setSelectedDoctor(null);
      formik.setFieldValue("doctorId", "");
      setDoctorDetails(null);
      setAvailableSlots([]);
      formik.setFieldValue("dateTime", "");
      return;
    }

    const fetchFilteredDoctors = async () => {
      setLoadingDoctors(true);
      setFetchError(null);
      // Clear previous doctor state unless it's the initial pre-selection
      if (
        !initialDoctor ||
        initialDoctor.hospitalId !== selectedHospital.value
      ) {
        setSelectedDoctor(null);
        formik.setFieldValue("doctorId", "");
      }
      setDoctorDetails(null);
      setAvailableSlots([]);
      formik.setFieldValue("dateTime", "");

      try {
        const response = await getDoctorsForPatient({
          available: true,
          hospitalId: selectedHospital.value,
        });
        if (response.success) {
          const doctorOptions = response.doctors.map((doc) => ({
            value: doc.id, // Doctor Profile ID
            label: `${doc.name} (${doc.speciality || "General"})`,
            hospitalId: doc.hospitalId, // Store hospitalId with doctor option if needed
          }));
          setDoctors(doctorOptions);

          // If an initialDoctor was provided and it's for the current selectedHospital, re-select it.
          if (
            initialDoctor &&
            initialDoctor.value &&
            doctorOptions.some((d) => d.value === initialDoctor.value)
          ) {
            // Check if the initialDoctor belongs to the currently selected hospital.
            // This assumes initialDoctor prop carries enough info or you make an additional check.
            // For simplicity, we assume if initialDoctor.value is in doctorOptions, it's valid for this hospital.
            setSelectedDoctor(
              doctorOptions.find((d) => d.value === initialDoctor.value)
            );
            formik.setFieldValue("doctorId", initialDoctor.value);
          }
        } else {
          throw new Error(response.message || "Failed to fetch doctors");
        }
      } catch (error) {
        console.error("Failed to fetch doctors:", error);
        setFetchError("Could not load doctors for this hospital.");
        setDoctors([]);
        toast.error("Could not load doctors list.");
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchFilteredDoctors();
  }, [selectedHospital, initialDoctor, formik.setFieldValue]); // formik.setFieldValue added for safety

  // Fetch doctor details and their availability when a doctor is selected
  useEffect(() => {
    setDoctorDetails(null);
    setAvailableSlots([]);
    setSelectedDate(""); // Reset date when doctor changes
    formik.setFieldValue("dateTime", "");
    setShowPaymentMessage(false);
    setFetchError(null);

    if (selectedDoctor?.value) {
      const fetchDoctorDetailsAndUpdate = async () => {
        setLoadingSlots(true); // Indicate loading for slots part
        try {
          const response = await getDoctorDetailsForPatient(
            selectedDoctor.value
          );
          if (response.success) {
            setDoctorDetails(response.doctor);
          } else {
            throw new Error(
              response.message || "Failed to fetch doctor details"
            );
          }
        } catch (error) {
          console.error("Failed to fetch doctor details:", error);
          setFetchError(
            "Could not load doctor details. Please select another doctor."
          );
          toast.error("Could not load doctor's schedule.");
        } finally {
          setLoadingSlots(false);
        }
      };
      fetchDoctorDetailsAndUpdate();
    }
  }, [selectedDoctor, formik.setFieldValue]); // formik.setFieldValue added

  const generateTimeSlots = useCallback(
    (startTime, endTime, intervalMinutes) => {
      // ... (generateTimeSlots logic remains the same)
      const slots = [];
      try {
        const [startHour, startMinute] = startTime.split(":").map(Number);
        const [endHour, endMinute] = endTime.split(":").map(Number);
        let currentDate = new Date();
        currentDate.setHours(startHour, startMinute, 0, 0);
        const endDateLimit = new Date();
        endDateLimit.setHours(endHour, endMinute, 0, 0);
        if (endDateLimit <= currentDate)
          endDateLimit.setDate(endDateLimit.getDate() + 1);

        while (currentDate < endDateLimit) {
          const hours = currentDate.getHours();
          const minutes = currentDate.getMinutes();
          const timeString = `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}`;
          const displayTime = currentDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
          slots.push({ time: timeString, displayTime: displayTime });
          currentDate.setMinutes(currentDate.getMinutes() + intervalMinutes);
        }
        return slots;
      } catch (error) {
        console.error("Error generating time slots:", error);
        return [];
      }
    },
    []
  );

  // Fetch Available Slots when date or doctorDetails change
  useEffect(() => {
    if (!selectedDoctor?.value || !selectedDate || !doctorDetails) {
      setAvailableSlots([]);
      return;
    }
    setLoadingSlots(true);
    setAvailableSlots([]);
    formik.setFieldValue("dateTime", "");
    setFetchError(null);

    try {
      const dateObj = new Date(selectedDate);
      const dayIndex = dateObj.getDay();
      const daysOfWeek = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const dayName = daysOfWeek[dayIndex];
      const isDayActive = doctorDetails.workingHours?.[dayName]?.isActive;

      if (!isDayActive) {
        setFetchError(
          "Doctor is not available on this day. Please select another date."
        );
        setLoadingSlots(false);
        return;
      }

      const formattedDateKey = formatSlotDate(dateObj);
      const bookedSlots = doctorDetails.slots_booked?.[formattedDateKey] || [];
      const dayWorkingHours = doctorDetails.workingHours?.[dayName];
      const startTime = dayWorkingHours?.start || "09:00";
      const endTime = dayWorkingHours?.end || "17:00";
      const allSlots = generateTimeSlots(
        startTime,
        endTime,
        doctorDetails.consultationTime || 30
      );
      const availableTimeSlots = allSlots.filter(
        (slot) =>
          !bookedSlots.some(
            (bookedTime) => convertTo24HourFormat(bookedTime) === slot.time
          )
      );

      const today = new Date();
      const isTodaySelected =
        selectedDate === today.toISOString().split("T")[0];
      const now = new Date();

      const futureSlots = availableTimeSlots.filter((slot) => {
        if (!isTodaySelected) return true;
        const [hours, minutes] = slot.time.split(":");
        const slotDateTime = new Date(dateObj);
        slotDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        return slotDateTime > now;
      });

      if (futureSlots.length > 0) {
        setAvailableSlots(
          futureSlots.map((slot) => ({
            value: new Date(`${selectedDate}T${slot.time}:00`).toISOString(),
            label: slot.displayTime,
            time: slot.time,
          }))
        );
      } else {
        setFetchError(
          "No available slots for this date. Please select another date."
        );
      }
    } catch (error) {
      console.error("Error processing slots:", error);
      setFetchError("Error loading time slots. Please try again.");
    } finally {
      setLoadingSlots(false);
    }
  }, [
    selectedDate,
    doctorDetails,
    selectedDoctor,
    formik.setFieldValue,
    generateTimeSlots,
  ]);

  const handleHospitalChange = (selectedOption) => {
    setSelectedHospital(selectedOption);
    formik.setFieldValue(
      "hospitalId",
      selectedOption ? selectedOption.value : ""
    );
    // Reset doctor and subsequent fields because hospital changed
    setSelectedDoctor(null);
    formik.setFieldValue("doctorId", "");
    setDoctors([]);
    setDoctorDetails(null);
    setSelectedDate("");
    setAvailableSlots([]);
    formik.setFieldValue("dateTime", "");
    setShowPaymentMessage(false);
    setFetchError(null);
  };

  const handleDoctorChange = (selectedOption) => {
    setSelectedDoctor(selectedOption);
    formik.setFieldValue(
      "doctorId",
      selectedOption ? selectedOption.value : ""
    );
    // Reset date and time fields because doctor changed
    setSelectedDate("");
    setAvailableSlots([]);
    formik.setFieldValue("dateTime", "");
    setShowPaymentMessage(false);
    setFetchError(null);
  };

  const handleDateChange = (event) => {
    const newSelectedDate = event.target.value;
    setSelectedDate(newSelectedDate);
    formik.setFieldValue("dateTime", ""); // Reset time slot when date changes
    setAvailableSlots([]);
    setFetchError(null);
    setShowPaymentMessage(false);

    if (newSelectedDate) {
      const selectedDateObj = new Date(newSelectedDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dayDiff = differenceInDays(selectedDateObj, today);
      setShowPaymentMessage(dayDiff < 2);
    }
  };

  const handleSlotChange = (selectedSlot) => {
    formik.setFieldValue("dateTime", selectedSlot ? selectedSlot.value : "");
  };

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-4">
      {fetchError && !loadingSlots && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md border border-red-200">
          {fetchError}
        </div>
      )}

      {/* Hospital Selection */}
      <div>
        <label htmlFor="hospitalIdApptForm" className="form-label">
          Hospital <span className="text-danger-600">*</span>
        </label>
        <Select
          id="hospitalIdApptForm"
          name="hospitalId"
          options={hospitalsForFilter}
          isLoading={loadingHospitalsForFilter}
          onChange={handleHospitalChange}
          onBlur={() => formik.setFieldTouched("hospitalId", true)}
          value={selectedHospital}
          placeholder={
            loadingHospitalsForFilter
              ? "Loading hospitals..."
              : "Select a hospital..."
          }
          classNamePrefix="react-select"
          styles={{
            control: (base) =>
              formik.touched.hospitalId && formik.errors.hospitalId
                ? { ...base, borderColor: "#dc2626" }
                : base,
          }}
        />
        {formik.touched.hospitalId && formik.errors.hospitalId ? (
          <p className="form-error">{formik.errors.hospitalId}</p>
        ) : null}
      </div>

      {/* Doctor Selection */}
      {selectedHospital?.value && (
        <div>
          <label htmlFor="doctorIdApptForm" className="form-label">
            Doctor <span className="text-danger-600">*</span>
          </label>
          <Select
            id="doctorIdApptForm"
            name="doctorId"
            options={doctors}
            isLoading={loadingDoctors}
            onChange={handleDoctorChange}
            onBlur={() => formik.setFieldTouched("doctorId", true)}
            value={selectedDoctor}
            placeholder={
              loadingDoctors ? "Loading doctors..." : "Select a doctor..."
            }
            isDisabled={!selectedHospital?.value || loadingDoctors}
            classNamePrefix="react-select"
            styles={{
              control: (base) =>
                formik.touched.doctorId && formik.errors.doctorId
                  ? { ...base, borderColor: "#dc2626" }
                  : base,
            }}
          />
          {formik.touched.doctorId && formik.errors.doctorId ? (
            <p className="form-error">{formik.errors.doctorId}</p>
          ) : null}
        </div>
      )}

      {/* Date and Time Selection */}
      {selectedDoctor?.value && (
        <DateTimeSelector
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          availableSlots={availableSlots}
          selectedSlot={formik.values.dateTime}
          onSlotSelect={handleSlotChange}
          isLoading={loadingSlots}
          doctorDetails={doctorDetails}
        />
      )}
      {formik.touched.dateTime && formik.errors.dateTime ? (
        <p className="form-error">{formik.errors.dateTime}</p>
      ) : null}

      {showPaymentMessage &&
        !loadingSlots &&
        formik.values.doctorId &&
        selectedDate && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md mt-2">
            <p className="text-sm text-yellow-700">
              <strong>Note:</strong> Payment may be required immediately after
              booking to confirm appointments scheduled for today or tomorrow.
            </p>
          </div>
        )}

      <FormInput
        label="Reason for Appointment"
        type="textarea"
        id="reason"
        name="reason"
        {...formik.getFieldProps("reason")}
        error={formik.touched.reason && formik.errors.reason}
        touched={formik.touched.reason}
        placeholder="Briefly describe the reason for your visit"
        required
        rows={3}
      />

      <div>
        <label className="form-label">Appointment Type</label>
        <div className="flex space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="type"
              value="regular"
              checked={formik.values.type === "regular"}
              onChange={formik.handleChange}
              className="form-radio text-primary-600"
            />
            <span className="ml-2 text-sm text-gray-700">Regular Check-up</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="type"
              value="follow-up"
              checked={formik.values.type === "follow-up"}
              onChange={formik.handleChange}
              className="form-radio text-primary-600"
            />
            <span className="ml-2 text-sm text-gray-700">Follow-up</span>
          </label>
        </div>
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          isLoading={isLoading} // Main form submission loading
          disabled={
            isLoading ||
            !formik.isValid ||
            !selectedHospital?.value ||
            !selectedDoctor?.value ||
            !formik.values.dateTime
          }
        >
          {initialValues ? "Update Appointment" : "Book Appointment"}
        </Button>
      </div>
    </form>
  );
};

export default AppointmentForm;
