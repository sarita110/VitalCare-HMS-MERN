// src/layouts/PublicLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/common/Navbar"; //
import Footer from "../components/common/Footer"; //

/**
 * Layout for public-facing pages (Home, About, Contact, Hospital List).
 * Includes the main Navbar and Footer.
 */
const PublicLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar component handles showing public links when not authenticated */}
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Outlet renders the specific public page content */}
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default PublicLayout;
