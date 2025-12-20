// src/components/common/Navbar.jsx
import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth"; // Your custom auth hook
import Avatar from "./Avatar";
import Dropdown, { DropdownItem } from "./Dropdown"; // Assuming Dropdown component
import { Bars3Icon, XMarkIcon, BellIcon } from "@heroicons/react/24/outline";
import useNotification from "../../hooks/useNotification"; // Notification hook
import logo from "../../assets/images/logo.png"; // Adjust path to your logo
import { formatDistanceToNow } from "date-fns"; // Import for relative time
import { ROLES } from "../../constants"; // Import roles for dashboard path

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout, isAuthenticated } = useAuth();
  // Get markAsRead function and unreadCount from the hook
  const { notifications, unreadCount, markAsRead } = useNotification();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const bookAppointmentPath =
    isAuthenticated && user?.role === ROLES.PATIENT
      ? "/patient/book-appointment"
      : "/login";
  const navigate = useNavigate(); // Initialize navigate

  // Filter notifications for dropdown display (e.g., last 5)
  const displayNotifications = notifications.slice(0, 5);

  const handleNotificationClick = (notif) => {
    // 1. Mark as read if it's not already read
    if (!notif.isRead) {
      markAsRead(notif._id); // Call the function from the hook
    }
    // 2. Navigate to the main notifications page
    navigate("/notifications");
    // 3. The Dropdown component should handle closing itself on item click
    //    (Assuming the Dropdown component closes its menu when an item inside is clicked)
  };

  // Close mobile menu and navigate
  const handleMobileNav = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  // Close mobile menu and logout
  const handleMobileLogout = () => {
    logout();
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Sidebar Toggle for Dashboard Layout */}
            {isAuthenticated && onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="mr-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
                aria-label="Open sidebar"
              >
                <Bars3Icon className="h-6 w-6" aria-hidden="true" />
              </button>
            )}
            {/* Logo */}
            <Link to="/" className="flex-shrink-0 flex items-center">
              <img className="h-8 w-auto" src={logo} alt="VitalCare Logo" />
              <span className="ml-2 text-xl font-semibold text-gray-800">
                VitalCare
              </span>
            </Link>
          </div>

          {/* Desktop Menu & User Section */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {/* Public Links */}
            {!isAuthenticated && (
              <div className="flex space-x-4">
                <NavLink
                  to="{bookAppointmentPath}"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium ${
                      isActive
                        ? "bg-primary-100 text-primary-700"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    }`
                  }
                >
                  Home
                </NavLink>
                <NavLink
                  to="/about"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium ${
                      isActive
                        ? "bg-primary-100 text-primary-700"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    }`
                  }
                >
                  About
                </NavLink>
                <NavLink
                  to="/hospitals"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium ${
                      isActive
                        ? "bg-primary-100 text-primary-700"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    }`
                  }
                >
                  Hospitals
                </NavLink>
                <NavLink
                  to="/contact"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium ${
                      isActive
                        ? "bg-primary-100 text-primary-700"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    }`
                  }
                >
                  Contact
                </NavLink>
              </div>
            )}

            {/* Authenticated User Section */}
            {isAuthenticated && user && (
              <>
                {/* Notification Bell with Count */}
                <Dropdown
                  buttonContent={
                    <div className="relative">
                      {" "}
                      {/* Make parent relative */}
                      <span className="sr-only">View notifications</span>
                      <BellIcon className="h-6 w-6" aria-hidden="true" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 transform translate-x-1/3 -translate-y-1/3 flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full bg-danger-500 text-white text-xs font-bold">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </div>
                  }
                  className="relative p-1 rounded-full text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  menuClassName="w-80 origin-top-right mt-2" // Added mt-2 for spacing
                  showChevron={false}
                  align="right" // Align dropdown to the right
                >
                  <div className="px-4 py-2 border-b flex justify-between items-center">
                    <p className="text-sm font-medium text-gray-900">
                      Notifications
                    </p>
                    {/* Optional: Add a quick "Mark all read" here if needed */}
                  </div>

                  {/* Notification Items */}
                  <div className="max-h-80 overflow-y-auto">
                    {" "}
                    {/* Scroll for long lists */}
                    {displayNotifications.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        No new notifications
                      </div>
                    ) : (
                      displayNotifications.map((notif) => (
                        <button
                          key={notif._id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`block w-full text-left px-4 py-3 text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100 ${
                            !notif.isRead ? "bg-blue-50" : "text-gray-700" // Highlight unread
                          }`}
                        >
                          <p
                            className={`font-medium ${
                              !notif.isRead ? "text-gray-900" : "text-gray-800"
                            }`}
                          >
                            {notif.title}
                          </p>
                          <p
                            className={`text-xs ${
                              !notif.isRead ? "text-gray-600" : "text-gray-500"
                            } truncate`}
                          >
                            {notif.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatDistanceToNow(new Date(notif.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                  {/* End Notification Items */}

                  <div className="px-4 py-2 border-t">
                    <Link
                      to="/notifications"
                      className="block text-center text-sm font-medium text-primary-600 hover:text-primary-800"
                      // Ensure dropdown closes when this link is clicked if needed by Dropdown component logic
                    >
                      View all notifications
                    </Link>
                  </div>
                </Dropdown>
                {/* End Notification Bell */}

                {/* User Dropdown */}
                <Dropdown
                  buttonContent={
                    <>
                      <span className="sr-only">Open user menu</span>
                      <Avatar src={user.image} alt={user.name} size="sm" />
                      <span className="hidden md:block ml-2 text-sm font-medium text-gray-700">
                        {user.name}
                      </span>
                    </>
                  }
                  className="ml-3 flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  align="right" // Align dropdown to the right
                >
                  <DropdownItem onClick={() => navigate("/profile")}>
                    Your Profile
                  </DropdownItem>
                  <DropdownItem onClick={() => navigate("/settings")}>
                    Settings
                  </DropdownItem>
                  <DropdownItem onClick={logout}>Sign out</DropdownItem>
                </Dropdown>
              </>
            )}

            {/* Login/Register for Public */}
            {!isAuthenticated && (
              <div className="ml-4 flex items-center space-x-2">
                <Link to="/login" className="btn btn-outline btn-sm">
                  {" "}
                  {/* Added btn-sm */}
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  {" "}
                  {/* Added btn-sm */}
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="-mr-2 flex items-center sm:hidden">
            {/* Mobile Notification Bell (Optional but recommended) */}
            {isAuthenticated && (
              <button className="relative p-1 mr-2 rounded-full text-gray-400 hover:text-gray-600 focus:outline-none">
                <span className="sr-only">View notifications</span>
                <BellIcon className="h-6 w-6" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 transform translate-x-1/3 -translate-y-1/3 flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full bg-danger-500 text-white text-[10px] font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}{" "}
                    {/* Smaller badge for mobile */}
                  </span>
                )}
              </button>
            )}
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              aria-controls="mobile-menu"
              aria-expanded={mobileMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-200" id="mobile-menu">
          <div className="pt-2 pb-3 space-y-1">
            {/* Add Mobile links here */}
            {!isAuthenticated && (
              <>
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                      isActive
                        ? "bg-primary-50 border-primary-500 text-primary-700"
                        : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                    }`
                  }
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </NavLink>
                <NavLink
                  to="/about"
                  className={({ isActive }) =>
                    `block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                      isActive
                        ? "bg-primary-50 border-primary-500 text-primary-700"
                        : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                    }`
                  }
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About
                </NavLink>
                <NavLink
                  to="/hospitals"
                  className={({ isActive }) =>
                    `block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                      isActive
                        ? "bg-primary-50 border-primary-500 text-primary-700"
                        : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                    }`
                  }
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Hospitals
                </NavLink>
                <NavLink
                  to="/contact"
                  className={({ isActive }) =>
                    `block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                      isActive
                        ? "bg-primary-50 border-primary-500 text-primary-700"
                        : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                    }`
                  }
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contact
                </NavLink>
              </>
            )}
            {/* Add dashboard/main links for logged-in users if needed */}
            {isAuthenticated && user && (
              <NavLink
                to="/dashboard" // Adjust based on default dashboard route
                className={({ isActive }) =>
                  `block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                    isActive
                      ? "bg-primary-50 border-primary-500 text-primary-700"
                      : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                  }`
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </NavLink>
            )}
          </div>
          {/* Mobile User Menu */}
          <div className="pt-4 pb-3 border-t border-gray-200">
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center px-4">
                  <div className="flex-shrink-0">
                    <Avatar src={user.image} alt={user.name} size="md" />
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">
                      {user.name}
                    </div>
                    <div className="text-sm font-medium text-gray-500">
                      {user.email}
                    </div>
                  </div>
                  {/* Mobile Notification Button is outside this div now */}
                </div>
                <div className="mt-3 space-y-1">
                  <button
                    onClick={() => handleMobileNav("/notifications")}
                    className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  >
                    Notifications{" "}
                    {unreadCount > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-800">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleMobileNav("/profile")}
                    className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  >
                    Your Profile
                  </button>
                  <button
                    onClick={() => handleMobileNav("/settings")}
                    className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  >
                    Settings
                  </button>
                  <button
                    onClick={handleMobileLogout}
                    className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-1 px-2">
                <Link
                  to="/login"
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
