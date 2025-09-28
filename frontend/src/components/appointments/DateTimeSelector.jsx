// src/components/appointments/DateTimeSelector.jsx
import React from "react";
import FormInput from "../common/FormInput";
import { formatSlotDate, convertTo24HourFormat } from "../../utils/helpers";

const DateTimeSelector = ({
  selectedDate,
  onDateChange,
  availableSlots,
  selectedSlot, // This will be the ISO string like "2024-04-27T09:30:00.000Z"
  onSlotSelect, // This function receives the full slot object { value, label, time }
  isLoading,
  disablePastDates = true,
  dateLabel = "Appointment Date",
  timeLabel = "Available Time Slots",
  doctorDetails = null,
}) => {
  // Helper to check if a slot is actually available
  const isSlotAvailable = (slot) => {
    if (!slot) return false;

    const slotTime =
      slot.time ||
      (slot.value &&
        new Date(slot.value).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }));

    if (selectedDate === new Date().toISOString().split("T")[0]) {
      const now = new Date();
      const slotDate = new Date(selectedDate);
      const [hours, minutes] = slotTime.split(":");
      slotDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      if (slotDate <= now) {
        return false;
      }
    }
    return true;
  };

  // Helper to visually warn if a slot might be booked
  const checkIfSlotMightBeBooked = (slot) => {
    if (!doctorDetails || !selectedDate) return false;
    let slotTime = slot.time;
    if (!slotTime && slot.value) {
      const slotDateTime = new Date(slot.value);
      slotTime = slotDateTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
    if (doctorDetails.slots_booked) {
      const formattedDate = formatSlotDate(new Date(selectedDate));
      const bookedSlots = doctorDetails.slots_booked[formattedDate] || [];
      const slotTime24h = convertTo24HourFormat(slotTime);
      if (
        bookedSlots.some(
          (bookedSlot) => convertTo24HourFormat(bookedSlot) === slotTime24h
        )
      ) {
        console.warn(
          `WARNING: Slot ${slotTime} (${slotTime24h}) appears to be booked but is showing as available!`
        );
        return true;
      }
    }
    return false;
  };

  // Function to group slots in rows of 4
  const groupSlots = (slots, perRow = 4) => {
    const result = [];
    for (let i = 0; i < slots.length; i += perRow) {
      result.push(slots.slice(i, i + perRow));
    }
    return result;
  };

  // *** NEW *** Helper to format the selected ISO date string into readable time
  const formatSelectedTime = (isoString) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      // Format as hh:mm AM/PM
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      console.error("Error formatting time:", e);
      return "Invalid time";
    }
  };

  // Filter and group the available slots
  const filteredSlots = availableSlots.filter(isSlotAvailable);
  const groupedSlots = groupSlots(filteredSlots);

  return (
    <div className="space-y-4">
      {/* Date Selection */}
      <FormInput
        label={dateLabel}
        type="date"
        id="appointmentDate"
        name="appointmentDate"
        value={selectedDate}
        onChange={onDateChange}
        required
        min={
          disablePastDates ? new Date().toISOString().split("T")[0] : undefined
        }
        disabled={isLoading} // Ensure date input is disabled while slots are loading
      />

      {/* Time Slots */}
      {selectedDate && ( // Only show time slots section if a date is selected
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {timeLabel} <span className="text-danger-600">*</span>{" "}
            {/* Added required indicator */}
          </label>
          {isLoading ? (
            <div className="text-center py-4">
              <p className="text-gray-500">Loading available slots...</p>
            </div>
          ) : filteredSlots.length > 0 ? (
            <div className="space-y-2">
              {groupedSlots.map((row, rowIndex) => (
                <div key={`row-${rowIndex}`} className="grid grid-cols-4 gap-2">
                  {row.map((slot) => {
                    const mightBeBooked = checkIfSlotMightBeBooked(slot);
                    // *** MODIFIED *** Check if the current slot is the selected one
                    // We compare the `value` (ISO string) from the slot object
                    // with the `selectedSlot` prop (which should also be the ISO string)
                    const isSelected = selectedSlot === slot.value;
                    return (
                      <button
                        key={slot.value} // Use the unique ISO string as key
                        type="button"
                        className={`py-2 px-3 text-sm border rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-1
                          ${
                            mightBeBooked
                              ? "border-red-500 bg-red-50 hover:bg-red-100 text-red-700"
                              : "hover:bg-primary-50"
                          }
                          ${
                            isSelected
                              ? // *** MODIFIED *** Enhanced styling for the selected button
                                "bg-primary-600 border-primary-700 text-white font-semibold shadow-md ring-2 ring-primary-500 ring-offset-1"
                              : "bg-white border-gray-300 text-gray-700"
                          }`}
                        // Pass the full slot object to the handler
                        onClick={() => onSlotSelect(slot)}
                        title={
                          mightBeBooked
                            ? "This slot might be already booked. Please select another."
                            : ""
                        }
                        disabled={mightBeBooked} // Optionally disable potentially booked slots
                      >
                        {slot.label} {/* Display the 'hh:mm AM/PM' label */}
                        {mightBeBooked && (
                          <span className="text-xs text-red-500 ml-1">⚠️</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : // *** MODIFIED *** Show "No slots" only if date selected, not loading, and no slots found
          selectedDate && !isLoading ? (
            <p className="text-gray-500 text-center py-4">
              No available slots for this date. Please select another date.
            </p>
          ) : null}{" "}
          {/* Don't show anything if no date is selected yet */}
          {/* --- *** NEW *** Display Selected Time --- */}
          {selectedSlot &&
            !isLoading && ( // Show only when a slot is selected and not loading
              <p className="text-sm text-gray-600 mt-3 text-center md:text-left">
                Selected time:{" "}
                <span className="font-semibold text-primary-700">
                  {formatSelectedTime(selectedSlot)}
                </span>
              </p>
            )}
        </div>
      )}

      {/* Debug information in development */}
      {process.env.NODE_ENV === "development" &&
        doctorDetails &&
        selectedDate && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
            <details>
              <summary className="cursor-pointer font-medium text-gray-700">
                Debug Information
              </summary>
              {/* ... (debug info remains the same) ... */}
              <div className="mt-2 space-y-1">
                <p>
                  <strong>Date Key:</strong>{" "}
                  {formatSlotDate(new Date(selectedDate))}
                </p>
                <p>
                  <strong>Booked Slots:</strong>{" "}
                  {doctorDetails.slots_booked &&
                  doctorDetails.slots_booked[
                    formatSlotDate(new Date(selectedDate))
                  ]
                    ? doctorDetails.slots_booked[
                        formatSlotDate(new Date(selectedDate))
                      ].join(", ")
                    : "None"}
                </p>
                <p>
                  <strong>Filtered Slots Count:</strong> {filteredSlots.length}
                </p>
                <p>
                  <strong>Total Slots Available:</strong>{" "}
                  {availableSlots.length}
                </p>
                <p>
                  <strong>Selected Slot Value (ISO):</strong>{" "}
                  {selectedSlot || "None"}
                </p>
              </div>
            </details>
          </div>
        )}
    </div>
  );
};

export default DateTimeSelector;
