// src/components/appointments/RescheduleAppointmentModal.jsx

import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import LoadingSpinner from "../common/LoadingSpinner";
import {
  formatDateTime,
  formatDate,
  formatSlotDate,
  convertTo24HourFormat,
} from "../../utils/helpers";

import Select from "react-select";
import FormInput from "../common/FormInput";
import patientService from "../../services/patientService";

const RescheduleAppointmentModal = ({
  isOpen,
  onClose,
  appointment,
  onReschedule,
  isLoading,
}) => {
  const [doctorAvailability, setDoctorAvailability] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [doctorWorkingDays, setDoctorWorkingDays] = useState([]);

  // Fetch doctor details and availability when modal opens
  useEffect(() => {
    if (isOpen && appointment && appointment.doctorId) {
      fetchDoctorAvailability();
    }
  }, [isOpen, appointment]);

  const fetchDoctorAvailability = async () => {
    if (!appointment?.doctorId?._id) return;

    setLoadingSlots(true);
    setError(null);

    try {
      // Use the correct doctor ID - either the full object ID or just the string ID
      const doctorId = appointment.doctorId._id || appointment.doctorId;

      const response = await patientService.getDoctorDetailsForPatient(
        doctorId
      );

      if (response.success) {
        setDoctorAvailability(response.doctor);

        // Get the working days from doctor's schedule
        const workingDays = getWorkingDays(response.doctor.workingHours);
        setDoctorWorkingDays(workingDays);

        // Find the nearest available date to pre-select
        const nearestDate = findNearestAvailableDate(workingDays);
        if (nearestDate) {
          setSelectedDate(nearestDate);
        }
      } else {
        throw new Error(
          response.message || "Failed to fetch doctor availability"
        );
      }
    } catch (err) {
      console.error("Error fetching doctor availability:", err);
      setError("Could not load doctor's available slots. Please try again.");
    } finally {
      setLoadingSlots(false);
    }
  };

  // Helper to get working days from doctor's schedule
  const getWorkingDays = (workingHours) => {
    if (!workingHours) return [];

    const workingDays = [];
    const dayMap = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    // Loop through each day and check if it's active
    Object.entries(workingHours).forEach(([day, schedule]) => {
      if (schedule.isActive) {
        workingDays.push(dayMap[day]);
      }
    });

    return workingDays;
  };

  // Find the nearest available date based on working days
  const findNearestAvailableDate = (workingDays) => {
    if (!workingDays.length) return "";

    const today = new Date();
    today.setDate(today.getDate() + 1); // Start from tomorrow for better rescheduling options

    // Try the next 30 days to find a working day
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      if (workingDays.includes(date.getDay())) {
        return date.toISOString().split("T")[0]; // YYYY-MM-DD format
      }
    }

    return "";
  };

  // When selected date changes, fetch available slots
  useEffect(() => {
    if (selectedDate && doctorAvailability) {
      fetchAvailableSlotsForDate(selectedDate);
    }
  }, [selectedDate, doctorAvailability]);

  const fetchAvailableSlotsForDate = async (date) => {
    if (!doctorAvailability || !date) return;

    setLoadingSlots(true);
    setAvailableSlots([]);
    setSelectedSlot(null);
    setError(null);

    try {
      // Create a Date object from the selected date
      const dateObj = new Date(date);
      const dayIndex = dateObj.getDay();

      // Get day name for working hours check
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

      // Check if this day is active for the doctor
      const isDayActive = doctorAvailability.workingHours?.[dayName]?.isActive;

      if (!isDayActive) {
        setError(
          "Doctor is not available on this day. Please select another date."
        );
        setLoadingSlots(false);
        return;
      }

      // Format to match backend's slot date format (DD_MM_YYYY)
      const formattedDateKey = formatSlotDate(dateObj);

      // Get booked slots for this date
      const bookedSlots =
        doctorAvailability.slots_booked?.[formattedDateKey] || [];

      // Get working hours for this specific day
      const dayWorkingHours = doctorAvailability.workingHours?.[dayName];
      const startTime = dayWorkingHours?.start || "09:00";
      const endTime = dayWorkingHours?.end || "17:00";

      // Generate all possible time slots using the doctor's consultation time
      const slots = generateTimeSlots(
        startTime,
        endTime,
        doctorAvailability.consultationTime || 30
      );

      // Filter out already booked slots
      // If current appointment is on the same day, don't filter out its time
      const currentApptDate = new Date(appointment.dateTime);
      const currentApptDateKey = formatSlotDate(currentApptDate);
      const currentApptTime = currentApptDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const availableTimeSlots = slots.filter((slot) => {
        const slotTime = slot.time;

        // If this is the same slot as the current appointment, include it
        if (
          formattedDateKey === currentApptDateKey &&
          slotTime === currentApptTime
        ) {
          return true;
        }

        // Otherwise exclude booked slots
        return !bookedSlots.includes(slotTime);
      });

      // Filter out past slots if the selected date is today
      const now = new Date();
      const isToday = date === now.toISOString().split("T")[0];

      const futureSlots = availableTimeSlots.filter((slot) => {
        if (!isToday) return true;

        // Parse time and create a datetime with the selected date
        const [hours, minutes] = slot.time.split(":");
        const slotDateTime = new Date(dateObj);
        slotDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

        return slotDateTime > now;
      });

      // Add 24-hour buffer for rescheduling
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const validSlots = futureSlots.filter((slot) => {
        const [hours, minutes] = slot.time.split(":");
        const slotDateTime = new Date(dateObj);
        slotDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

        return slotDateTime > oneDayFromNow;
      });

      if (validSlots.length > 0) {
        // Format slots for UI selection
        setAvailableSlots(
          validSlots.map((slot) => ({
            value: new Date(`${date}T${slot.time}:00`).toISOString(),
            label: slot.displayTime,
            time: slot.time,
          }))
        );
      } else {
        setError(
          "No available slots for this date. Please select another date."
        );
      }
    } catch (error) {
      console.error("Error processing slots:", error);
      setError(
        "Error loading time slots. Please try again or select another date."
      );
    } finally {
      setLoadingSlots(false);
    }
  };

  // Helper function to generate time slots for a day
  const generateTimeSlots = (startTime, endTime, intervalMinutes) => {
    const slots = [];

    try {
      // Parse start and end times
      const [startHour, startMinute] = startTime.split(":").map(Number);
      const [endHour, endMinute] = endTime.split(":").map(Number);

      // Create date objects for comparison
      let currentDate = new Date();
      currentDate.setHours(startHour, startMinute, 0, 0);

      const endDate = new Date();
      endDate.setHours(endHour, endMinute, 0, 0);

      // Generate slots at intervals
      while (currentDate < endDate) {
        const hours = currentDate.getHours();
        const minutes = currentDate.getMinutes();

        // Format: "HH:MM" - 24-hour format for backend comparison
        const timeString = `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}`;

        // Format: "HH:MM AM/PM" - 12-hour format for display
        const displayTime = currentDate.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        slots.push({
          time: timeString,
          displayTime: displayTime,
        });

        // Add interval minutes
        currentDate.setMinutes(currentDate.getMinutes() + intervalMinutes);
      }

      return slots;
    } catch (error) {
      console.error("Error generating time slots:", error);
      return [];
    }
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
  };

  const handleReschedule = () => {
    if (!selectedSlot) {
      setError("Please select an available time slot");
      return;
    }

    // Call the parent component's onReschedule function with the new datetime
    onReschedule(selectedSlot.value);
  };

  // Function to check if a date should be disabled
  const isDateDisabled = (date) => {
    const dayOfWeek = new Date(date).getDay();
    return !doctorWorkingDays.includes(dayOfWeek);
  };

  // Function to render slot buttons in groups
  const renderSlotGroups = () => {
    if (!availableSlots.length) return null;

    // Group slots into rows of 4 for better UI
    const groups = [];
    for (let i = 0; i < availableSlots.length; i += 4) {
      groups.push(availableSlots.slice(i, i + 4));
    }

    return (
      <div className="space-y-2">
        {groups.map((group, groupIndex) => (
          <div
            key={`group-${groupIndex}`}
            className="grid grid-cols-2 md:grid-cols-4 gap-2"
          >
            {group.map((slot) => (
              <button
                key={slot.value}
                type="button"
                className={`py-2 px-3 text-sm border rounded-md
                  ${
                    selectedSlot?.value === slot.value
                      ? "bg-primary-100 border-primary-500 text-primary-700"
                      : "bg-white border-gray-300 hover:bg-primary-50 text-gray-700"
                  }`}
                onClick={() => handleSlotSelect(slot)}
              >
                {slot.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reschedule Appointment"
      size="lg"
    >
      {loadingSlots && !doctorAvailability ? (
        <div className="flex justify-center my-8">
          <LoadingSpinner size="medium" />
        </div>
      ) : (
        <>
          <div className="mb-4">
            <p className="text-gray-700">
              Select a new date and time for your appointment with{" "}
              <span className="font-medium">
                Dr. {appointment?.doctorId?.userId?.name}
              </span>
            </p>

            <div className="text-xs text-gray-500 mt-1">
              Note: Appointments must be rescheduled at least 24 hours in
              advance. Only available slots are shown.
            </div>
          </div>

          <div className="space-y-4">
            {/* Current Appointment Info */}
            <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
              <h4 className="font-medium text-gray-700">Current Appointment</h4>
              <p className="text-gray-600">
                {formatDateTime(appointment?.dateTime)}
              </p>
            </div>

            {/* Date Selection */}
            <div>
              <FormInput
                label="Select New Date"
                type="date"
                id="appointmentDate"
                name="appointmentDate"
                value={selectedDate}
                onChange={handleDateChange}
                required
                min={
                  new Date(new Date().getTime() + 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0]
                }
                disabled={loadingSlots}
              />

              {doctorWorkingDays.length > 0 && (
                <div className="mt-1 text-xs text-gray-500">
                  Doctor is available on:{" "}
                  {doctorWorkingDays
                    .map(
                      (day) =>
                        ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]
                    )
                    .join(", ")}
                </div>
              )}
            </div>

            {/* Time Slots */}
            {selectedDate && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Available Time Slots
                </label>
                {loadingSlots ? (
                  <div className="text-center py-4">
                    <LoadingSpinner size="small" />
                    <p className="text-gray-500 mt-2">
                      Loading available slots...
                    </p>
                  </div>
                ) : availableSlots.length > 0 ? (
                  renderSlotGroups()
                ) : (
                  <div className="bg-red-50 text-red-700 p-3 rounded-md border border-red-200">
                    {error ||
                      "No available slots for this date. Please select another date."}
                  </div>
                )}
              </div>
            )}

            {/* Selected Slot Summary */}
            {selectedSlot && (
              <div className="p-3 bg-primary-50 rounded-md border border-primary-100">
                <h4 className="font-medium text-primary-700">
                  Selected New Appointment
                </h4>
                <p className="text-primary-600">
                  {formatDate(selectedDate)} at{" "}
                  {availableSlots.find(
                    (slot) => slot.value === selectedSlot.value
                  )?.label || ""}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleReschedule}
              isLoading={isLoading}
              disabled={!selectedSlot || isLoading}
            >
              Confirm Reschedule
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
};

export default RescheduleAppointmentModal;
