// src/pages/receptionist/ProfilePage.jsx
import React, { useContext } from "react";
import { Link } from "react-router-dom";
import ReceptionistContext from "../../context/ReceptionistContext";
import AuthContext from "../../context/AuthContext";
import Card from "../../components/common/Card"; //
import Avatar from "../../components/common/Avatar"; //
import LoadingSpinner from "../../components/common/LoadingSpinner"; //
import Button from "../../components/common/Button"; //
import {
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  IdentificationIcon,
  ClockIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

const ProfilePage = () => {
  const { user } = useContext(AuthContext); // Basic user info
  // ReceptionistContext fetches detailed profile including specific receptionist details if available
  const { receptionistProfile, loadingProfile, profileError } =
    useContext(ReceptionistContext);

  if (loadingProfile && !receptionistProfile) {
    return <LoadingSpinner />;
  }

  if (profileError) {
    return (
      <div className="text-center text-danger-600 py-4">{profileError}</div>
    );
  }

  // Use auth user as fallback if context is loading or fails, but prefer context data
  const displayUser = receptionistProfile?.user || user;
  const displayProfile = receptionistProfile?.receptionistDetails || {};
  const displayHospital = receptionistProfile?.hospital || {};

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">My Profile</h1>

      <Card>
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
          <Avatar src={displayUser?.image} alt={displayUser?.name} size="xl" />
          <div className="flex-grow text-center md:text-left">
            <h2 className="text-xl font-bold text-gray-900">
              {displayUser?.name || "N/A"}
            </h2>
            <p className="text-md text-primary-700">Receptionist</p>
            <p className="text-sm text-gray-500">
              {displayHospital?.name || "No Hospital Info"}
            </p>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
              <span className="flex items-center">
                <EnvelopeIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                {displayUser?.email || "N/A"}
              </span>
              <span className="flex items-center">
                <PhoneIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                {displayUser?.phone || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Receptionist Specific Details (If available in model/context) */}
        <div className="border-t pt-4 mt-4 space-y-2 text-sm">
          <h3 className="font-semibold text-gray-800">Staff Details</h3>
          <p className="flex items-center">
            <IdentificationIcon className="w-4 h-4 mr-1.5 text-gray-400" />{" "}
            Employee ID: {displayProfile?.employeeId || "N/A"}
          </p>
          {/* Display Shift Hours/Working Days if available */}
          {displayProfile?.shiftHours && (
            <p className="flex items-center">
              <ClockIcon className="w-4 h-4 mr-1.5 text-gray-400" /> Shift:{" "}
              {displayProfile.shiftHours.start} -{" "}
              {displayProfile.shiftHours.end}
            </p>
          )}
          {displayProfile?.workingDays &&
            displayProfile.workingDays.length > 0 && (
              <p className="flex items-center">
                <CalendarDaysIcon className="w-4 h-4 mr-1.5 text-gray-400" />{" "}
                Working Days: {displayProfile.workingDays.join(", ")}
              </p>
            )}
        </div>

        <div className="border-t pt-4 mt-4 flex justify-end gap-2">
          <Link to="/profile">
            <Button size="sm" variant="outline">
              Edit Basic Info
            </Button>
          </Link>
          <Link to="/settings">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Cog6ToothIcon className="w-4 h-4" />}
            >
              Account Settings
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default ProfilePage;
