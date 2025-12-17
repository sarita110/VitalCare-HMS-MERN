// src/components/common/Notification.jsx
import React from "react";
import { Toaster, toast } from "react-hot-toast"; // Using react-hot-toast
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

// Export functions to trigger toasts from anywhere in the app
export const notifySuccess = (message) => toast.success(message);
export const notifyError = (message) => toast.error(message);
export const notifyWarning = (message) =>
  toast.custom((t) => (
    <div
      className={`${
        t.visible ? "animate-enter" : "animate-leave"
      } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
    >
      <div className="flex-1 w-0 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <ExclamationTriangleIcon
              className="h-6 w-6 text-warning-500"
              aria-hidden="true"
            />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900">Warning</p>
            <p className="mt-1 text-sm text-gray-500">{message}</p>
          </div>
        </div>
      </div>
      <div className="flex border-l border-gray-200">
        <button
          onClick={() => toast.dismiss(t.id)}
          className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          Close
        </button>
      </div>
    </div>
  ));
export const notifyInfo = (message) =>
  toast.custom((t) => (
    <div
      className={`${
        t.visible ? "animate-enter" : "animate-leave"
      } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
    >
      <div className="flex-1 w-0 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <InformationCircleIcon
              className="h-6 w-6 text-blue-500"
              aria-hidden="true"
            />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900">Information</p>
            <p className="mt-1 text-sm text-gray-500">{message}</p>
          </div>
        </div>
      </div>
      <div className="flex border-l border-gray-200">
        <button
          onClick={() => toast.dismiss(t.id)}
          className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          Close
        </button>
      </div>
    </div>
  ));

// The main component that renders the Toaster container
const NotificationContainer = () => {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        className: "",
        duration: 5000, // General default
        style: {
          background: "#ffffff",
          color: "#374151",
        },
        success: {
          duration: 3000, // Ensure success toasts last 5s
          icon: <CheckCircleIcon className="h-6 w-6 text-success-500" />,
        },
        error: {
          duration: 5000, // Explicitly 5s for error toasts
          icon: <XCircleIcon className="h-6 w-6 text-danger-500" />,
        },
      }}
    />
  );
};

export default NotificationContainer;
