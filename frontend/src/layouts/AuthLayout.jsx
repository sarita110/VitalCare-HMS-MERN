// src/layouts/AuthLayout.jsx
import React from "react";
import { Outlet, Link } from "react-router-dom";
import logo from "../assets/images/logo.png"; // Adjust path if needed

/**
 * Layout for authentication pages (Login, Register, Forgot Password, etc.)
 * Provides a centered container for the auth forms.
 */
const AuthLayout = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4 py-12">
      <div className="mb-8">
        <Link to="/" className="inline-flex items-center">
          <img className="h-10 w-auto" src={logo} alt="VitalCare Logo" />
          <span className="ml-3 text-2xl font-semibold text-gray-800">
            VitalCare
          </span>
        </Link>
      </div>
      <main className="w-full max-w-md">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          {/* Outlet renders the specific auth page (e.g., LoginPage, RegisterPage) */}
          <Outlet />
        </div>
      </main>
      <footer className="mt-8 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} VitalCare HMS. All rights reserved.
      </footer>
    </div>
  );
};

export default AuthLayout;
