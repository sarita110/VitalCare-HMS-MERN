// src/components/appointments/AppointmentCard.jsx
import React from "react";
import {
  formatDateTime,
  getStatusBadgeClass,
  getDisplayStatus,
} from "../../utils/helpers";
import Avatar from "../common/Avatar";
import {
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom"; // For linking to details

const AppointmentCard = ({ appointment, userRole }) => {
  if (!appointment) return null;

  const { doctorId, patientId, dateTime, reason, status, type, _id } =
    appointment;
  const doctorName = doctorId?.userId?.name || "N/A";
  const doctorImage = doctorId?.userId?.image;
  const patientName = patientId?.userId?.name || "N/A";
  const patientImage = patientId?.userId?.image;

  // Determine the detail link based on role
  const detailLink = `/${userRole}/appointments/${_id}`; // Adjust if needed

  // *** ADDED LOGIC: Check if details can be viewed ***
  // Details are only viewable by the doctor if the status is NOT 'scheduled'
  const canViewDetails = status !== "scheduled";

  return (
    <div className=" bg-white p-4 mb-4 transition hover:shadow-md">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b pb-3 mb-3 border-gray-200">
        <div className="flex items-center mb-2 sm:mb-0">
          {/* Show Doctor or Patient avatar based on userRole */}
          {userRole === "patient" ? (
            <Avatar
              src={doctorImage}
              alt={doctorName}
              size="md"
              className="mr-3"
            />
          ) : (
            <Avatar
              src={patientImage}
              alt={patientName}
              size="md"
              className="mr-3"
            />
          )}

          <div>
            {userRole === "patient" ? (
              <p className="text-sm font-semibold text-gray-800">
                Dr. {doctorName}
              </p>
            ) : (
              // Add speciality if available: <p className="text-xs text-gray-500">{doctorId?.speciality}</p>
              <p className="text-sm font-semibold text-gray-800">
                {patientName}
              </p>
              // Add patient identifier if needed: <p className="text-xs text-gray-500">ID: {patientId?._id}</p>
            )}
          </div>
        </div>
        <span className={`badge ${getStatusBadgeClass(status)}`}>
          {getDisplayStatus(status)}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center">
          <CalendarDaysIcon className="h-4 w-4 mr-2 text-gray-400" />
          <span>{formatDateTime(dateTime)}</span>
        </div>
        {reason && (
          <div className="flex items-start">
            <InformationCircleIcon className="h-4 w-4 mr-2 text-gray-400 mt-0.5 shrink-0" />
            <p>
              <span className="font-medium text-gray-700">Reason:</span>{" "}
              {reason}
            </p>
          </div>
        )}
        {type && type !== "regular" && (
          <div className="flex items-center">
            {/* You can add specific icons for types */}
            <span className="font-medium text-gray-700 mr-1">Type:</span>{" "}
            {getDisplayStatus(type)}
          </div>
        )}
      </div>

      {/* Action Button - Conditionally render link or text */}
      <div className="mt-4 text-right">
        {canViewDetails ? (
          <Link
            to={detailLink}
            className="text-sm font-medium text-primary-600 hover:text-primary-800 hover:underline"
          >
            View Details →
          </Link>
        ) : (
          <span className="text-sm text-gray-400 italic">
            {/* Provide explanation based on role */}
            {userRole === "doctor"
              ? "Details available after confirmation"
              : "Details"}
          </span>
        )}
      </div>
    </div>
  );
};

export default AppointmentCard;
