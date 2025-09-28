// src/components/sidebars/PatientSidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import {
  ChartBarIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  UserCircleIcon,
  DocumentTextIcon,
  BeakerIcon,
  ViewfinderCircleIcon,
} from "@heroicons/react/24/outline";

const navigation = [
  { name: "Dashboard", href: "/patient/dashboard", icon: ChartBarIcon },
  {
    name: "Book Appointment",
    href: "/patient/book-appointment",
    icon: CalendarIcon,
  },
  {
    name: "My Appointments",
    href: "/patient/appointments",
    icon: ClipboardDocumentListIcon,
  },
  {
    name: "Medical Records",
    href: "/patient/medical-records",
    icon: DocumentTextIcon,
  },
  { name: "Lab Results", href: "/patient/lab-results", icon: BeakerIcon },
  {
    name: "Radiology Results",
    href: "/patient/radiology-results",
    icon: ViewfinderCircleIcon,
  },
  {
    name: "Prescriptions",
    href: "/patient/prescriptions",
    icon: ClipboardDocumentListIcon,
  },
  { name: "Payments", href: "/patient/payments", icon: CurrencyDollarIcon },
  { name: "Profile", href: "/profile", icon: UserCircleIcon },
];

const PatientSidebar = ({ isSidebarOpen }) => {
  return (
    <div
      className={`h-full bg-gray-800 text-gray-300 flex flex-col transition-all duration-300 ${
        isSidebarOpen ? "w-64" : "w-20"
      }`}
    >
      <div className="flex items-center justify-center h-16 border-b border-gray-700">
        <span
          className={`text-white font-semibold text-lg ${
            !isSidebarOpen && "hidden"
          }`}
        >
          Patient Portal
        </span>
        <span
          className={`text-white font-bold text-xl ${
            isSidebarOpen && "hidden"
          }`}
        >
          PT
        </span>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                isActive
                  ? "bg-gray-900 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              } ${!isSidebarOpen ? "justify-center" : ""}`
            }
            title={!isSidebarOpen ? item.name : undefined}
          >
            <item.icon
              className={`h-6 w-6 shrink-0 ${isSidebarOpen ? "mr-3" : ""}`}
              aria-hidden="true"
            />
            <span
              className={`${
                !isSidebarOpen && "hidden"
              } transition-opacity duration-200`}
            >
              {item.name}
            </span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default PatientSidebar;
