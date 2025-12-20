// src/components/dashboard/WelcomeBanner.jsx
import React from "react";
import useAuth from "../../hooks/useAuth";

const WelcomeBanner = ({ className = "" }) => {
  const { user } = useAuth();
  const currentTime = new Date();
  const currentHour = currentTime.getHours();

  let greeting;
  if (currentHour < 12) {
    greeting = "Good Morning";
  } else if (currentHour < 18) {
    greeting = "Good Afternoon";
  } else {
    greeting = "Good Evening";
  }

  return (
    <div
      className={`p-6 rounded-lg bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-md ${className}`}
    >
      <h1 className="text-2xl md:text-3xl font-semibold mb-1">
        {greeting}, {user?.name || "User"}!
      </h1>
      <p className="text-base text-primary-100">
        Welcome back to your VitalCare dashboard. Here's what's happening today.
      </p>
      {/* Optional: Add a relevant quote or tip */}
      {/* <p className="mt-3 text-sm text-primary-200 italic">
        "The greatest wealth is health." – Virgil
      </p> */}
    </div>
  );
};

export default WelcomeBanner;
