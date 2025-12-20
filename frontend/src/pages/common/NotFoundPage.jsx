// src/pages/common/NotFoundPage.jsx
import React from "react";
import { Link } from "react-router-dom";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import Button from "../../components/common/Button"; //
import useAuth from "../../hooks/useAuth"; // To link back to appropriate dashboard

const NotFoundPage = () => {
  const { user } = useAuth();

  // Determine the dashboard path based on user role
  const dashboardPath = user?.role ? `/${user.role}/dashboard` : "/";

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center px-4">
      {/* Adjust min-height based on header/footer height */}
      <ExclamationTriangleIcon className="w-16 h-16 text-warning-500 mb-4" />
      <h1 className="text-4xl font-bold text-gray-800 mb-2">
        404 - Page Not Found
      </h1>
      <p className="text-lg text-gray-600 mb-6">
        Oops! The page you are looking for does not exist or may have been
        moved.
      </p>
      <Button
        onClick={() => window.history.back()}
        variant="outline"
        className="mr-4"
      >
        Go Back
      </Button>
      <Link to={dashboardPath}>
        <Button>Go to Dashboard</Button>
      </Link>
    </div>
  );
};

export default NotFoundPage;
