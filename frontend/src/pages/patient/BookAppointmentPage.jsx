// src/pages/patient/BookAppointmentPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom"; // Added useLocation
import patientService from "../../services/patientService";
import paymentService from "../../services/paymentService";
import AppointmentForm from "../../components/appointments/AppointmentForm";
import Card from "../../components/common/Card";
import { differenceInDays } from "date-fns";
import toast from "react-hot-toast"; // Import toast
// Removed LoadingSpinner as it's part of AppointmentForm now
import {
  notifyInfo,
  notifySuccess,
  notifyError,
} from "../../components/common/Notification";

const BookAppointmentPage = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Get location object
  const [isLoading, setIsLoading] = useState(false);

  // Extract preselected data from navigation state
  const preselectedHospital = location.state?.preselectedHospital || null;
  const preselectedDoctor = location.state?.preselectedDoctor || null;

  const handleBookAppointment = async (appointmentData) => {
    setIsLoading(true);
    try {
      const response = await patientService.bookAppointment(appointmentData);
      if (response.success && response.appointment) {
        notifySuccess("Appointment scheduled successfully!");

        // --- PAYMENT LOGIC ---
        const apptDate = new Date(response.appointment.dateTime);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Compare dates only
        const apptDayOnly = new Date(apptDate);
        apptDayOnly.setHours(0, 0, 0, 0);

        const dayDiff = differenceInDays(apptDayOnly, today);

        if (dayDiff < 2) {
          // Today or Tomorrow requires immediate payment attempt
          notifyInfo(
            "Payment required within 24 hours to confirm this appointment. Please pay from 'My Appointments'."
          );
          // Initiate payment immediately
          initiateAppointmentPaymentAndRedirect(response.appointment);
        } else {
          notifyInfo(
            // Use notifyInfo here
            "Please complete payment at least 24 hours before your appointment to confirm it."
          );
          setIsLoading(false); // Stop general loading
          navigate(`/patient/appointments`); // Go to appointment list
        }
        // --- END PAYMENT LOGIC ---
      } else {
        throw new Error(response.message || "Failed to book appointment");
      }
    } catch (error) {
      console.error("Book appointment error:", error);
      notifyError(
        error.message ||
          "Could not book appointment. Please check doctor availability and selected time."
      );
      setIsLoading(false); // Ensure loading stops on error
    }
    // Don't set loading false here if payment is initiated
  };

  const initiateAppointmentPaymentAndRedirect = async (appointment) => {
    try {
      const paymentResponse = await paymentService.initiatePayment({
        paymentFor: "appointment",
        itemId: appointment._id,
        paymentMethod: "khalti", // Assuming Khalti
      });

      if (paymentResponse.success && paymentResponse.payment?.paymentUrl) {
        // Redirect user to Khalti's payment page
        window.location.href = paymentResponse.payment.paymentUrl;
        // Loading state remains true until redirect happens
      } else {
        throw new Error(
          paymentResponse.message || "Failed to get Khalti payment URL."
        );
      }
    } catch (err) {
      toast.error(
        `Payment Initiation Failed: ${err.message}. Please try paying from the 'My Appointments' page.`
      );
      setIsLoading(false);
      navigate("/patient/appointments"); // Redirect to list even on payment init error
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">
        Book a New Appointment
      </h1>
      <Card>
        {/* Form is always visible, loading indicator handled by button */}
        <AppointmentForm
          onSubmit={handleBookAppointment}
          isLoading={isLoading}
          // Pass preselected values to AppointmentForm
          initialHospital={preselectedHospital}
          initialDoctor={preselectedDoctor}
        />
      </Card>
    </div>
  );
};

export default BookAppointmentPage;
