// src/components/common/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div>
          <div className=" mt-8 md:mt-0 md:order-1">
            <p className="text-center text-base text-gray-400">
              &copy; {currentYear} VitalCare HMS. All rights reserved.
            </p>
          </div>
        </div>
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Powered by Softwarica Internationals</p>
          {/* Optional: Add links to privacy policy, terms, etc. */}
          <div className="mt-2 space-x-4">
            <Link to="/privacy-policy" className="hover:text-gray-700">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="hover:text-gray-700">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
