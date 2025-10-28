// src/components/sidebars/ReceptionistSidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import {
  ChartBarIcon,
  UserPlusIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  DocumentArrowUpIcon,
  ShareIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

const navigation = [
  {
    name: "Dashboard",
    href: "/receptionist/dashboard",
    icon: ChartBarIcon,
  },
  {
    name: "Register Patient",
    href: "/receptionist/register-patient",
    icon: UserPlusIcon,
  },
  {
    name: "Schedule Appointment",
    href: "/receptionist/schedule-appointment",
    icon: CalendarIcon,
  },
  {
    name: "Manage Appointments",
    href: "/receptionist/appointments",
    icon: ClipboardDocumentListIcon,
  },
  {
    name: "Process Payments",
    href: "/receptionist/payments",
    icon: CurrencyDollarIcon,
  },
  {
    name: "Upload Report",
    href: "/receptionist/upload-report",
    icon: DocumentArrowUpIcon,
  },
  {
    name: "Manage Referrals",
    href: "/receptionist/referrals",
    icon: ShareIcon,
  },
  { name: "Profile", href: "/profile", icon: UserCircleIcon },
];

const ReceptionistSidebar = ({ isSidebarOpen }) => {
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
          Reception Desk
        </span>
        <span
          className={`text-white font-bold text-xl ${
            isSidebarOpen && "hidden"
          }`}
        >
          RC
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

export default ReceptionistSidebar;
