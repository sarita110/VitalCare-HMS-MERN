// src/components/sidebars/AdminSidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import {
  ChartBarIcon,
  BuildingOffice2Icon,
  BriefcaseIcon,
  UserGroupIcon,
  UsersIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  Cog6ToothIcon,
  DocumentChartBarIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline"; // Example icons

const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: ChartBarIcon },
  {
    name: "Hospital Profile",
    href: "/admin/hospital-profile",
    icon: BuildingOffice2Icon,
  },
  { name: "Departments", href: "/admin/departments", icon: BriefcaseIcon },
  { name: "Doctors", href: "/admin/doctors", icon: UserGroupIcon },
  { name: "Staff", href: "/admin/staff", icon: UsersIcon },
  { name: "Patients", href: "/admin/patients", icon: UsersIcon },
  { name: "Appointments", href: "/admin/appointments", icon: CalendarDaysIcon },
  { name: "Reports", href: "/admin/reports", icon: DocumentChartBarIcon },
  { name: "Settings", href: "/settings", icon: Cog6ToothIcon },
  { name: "Profile", href: "/profile", icon: UserCircleIcon },
];

const AdminSidebar = ({ isSidebarOpen }) => {
  // Accept prop to control visibility/styling
  return (
    <div
      className={`h-full bg-gray-800 text-gray-300 flex flex-col transition-all duration-300 ${
        isSidebarOpen ? "w-64" : "w-20"
      }`}
    >
      <div className="flex items-center justify-center h-16 border-b border-gray-700">
        {/* Optional: Small logo when collapsed */}
        <span
          className={`text-white font-semibold text-lg ${
            !isSidebarOpen && "hidden"
          }`}
        >
          Admin Panel
        </span>
        <span
          className={`text-white font-bold text-xl ${
            isSidebarOpen && "hidden"
          }`}
        >
          VC
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
            title={!isSidebarOpen ? item.name : undefined} // Tooltip when collapsed
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
      {/* Optional: Footer or additional links */}
    </div>
  );
};

export default AdminSidebar;
