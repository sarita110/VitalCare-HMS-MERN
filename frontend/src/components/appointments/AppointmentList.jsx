// src/components/appointments/AppointmentList.jsx
import React from "react";
import AppointmentCard from "./AppointmentCard";
import LoadingSpinner from "../common/LoadingSpinner";

const AppointmentList = ({ appointments, isLoading, error, userRole }) => {
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-center text-danger-600 py-4">{error}</div>;
  }

  if (!appointments || appointments.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        No appointments found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => (
        <AppointmentCard
          key={appointment._id}
          appointment={appointment}
          userRole={userRole}
        />
      ))}
    </div>
  );
};

export default AppointmentList;
