// src/pages/public/HospitalList.jsx
import React, { useState, useEffect, useCallback, useContext } from "react";
import { Link } from "react-router-dom";
import HospitalContext from "../../context/HospitalContext"; // Use the shared context
import LoadingSpinner from "../../components/common/LoadingSpinner"; //
import Card from "../../components/common/Card"; //
import Pagination from "../../components/common/Pagination"; //
import Button from "../../components/common/Button"; //
import {
  MapPinIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

const HospitalListPage = () => {
  // Use state and functions from HospitalContext
  const { hospitals, pagination, isLoading, error, fetchHospitals } =
    useContext(HospitalContext);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const HOSPITALS_PER_PAGE = 9; // Adjust as needed

  // Fetch hospitals when page or search term changes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchHospitals({
        page: currentPage,
        limit: HOSPITALS_PER_PAGE,
        search: searchTerm,
      });
    }, 300); // Debounce search

    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchTerm, fetchHospitals]); // Add fetchHospitals to dependencies

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  return (
    <div className="space-y-8">
      <div className="text-center pt-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Our Partner Hospitals
        </h1>
        <p className="mt-4 text-lg leading-8 text-gray-600">
          Find a VitalCare network hospital near you.
        </p>
        {/* Search Bar */}
        <div className="mt-6 max-w-md mx-auto">
          <input
            type="search"
            placeholder="Search by name or city..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="form-input"
          />
        </div>
      </div>

      {error && <p className="text-center text-danger-500 py-4">{error}</p>}

      {isLoading ? (
        <LoadingSpinner />
      ) : hospitals.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hospitals.map((hospital) => (
              <Card
                key={hospital._id}
                className="flex flex-col h-full hover:shadow-lg transition-shadow"
              >
                <div className="flex-shrink-0 h-40 bg-gray-100 flex items-center justify-center rounded-t-lg overflow-hidden">
                  <img
                    src={hospital.logo || "/default-hospital.png"}
                    alt={`${hospital.name} Logo`}
                    className="max-h-full max-w-full object-contain p-4"
                    onError={(e) => (e.target.src = "/default-hospital.png")} // Fallback image
                  />
                </div>
                <div className="flex-grow p-5 flex flex-col">
                  <h3
                    className="text-lg font-semibold text-gray-900 mb-1 truncate"
                    title={hospital.name}
                  >
                    {hospital.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3 flex items-center">
                    <MapPinIcon className="w-4 h-4 mr-1.5 shrink-0" />
                    {hospital.address?.city},{" "}
                    {hospital.address?.state || hospital.address?.country}
                  </p>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-grow">
                    {hospital.description ||
                      "Providing quality healthcare services."}
                  </p>
                  <div className="flex justify-between items-center text-xs text-gray-500 border-t pt-3 mt-auto">
                    <span className="flex items-center" title="Departments">
                      <BuildingOfficeIcon className="w-3 h-3 mr-1" />{" "}
                      {hospital.stats?.departments ?? 0} Depts
                    </span>
                    <span className="flex items-center" title="Doctors">
                      <UserGroupIcon className="w-3 h-3 mr-1" />{" "}
                      {hospital.stats?.doctors ?? 0} Doctors
                    </span>
                  </div>
                  <div className="mt-4 text-center">
                    <Link to={`/hospitals/${hospital._id}`}>
                      <Button variant="primary" size="sm" className="w-full">
                        View Details & Doctors
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {pagination && pagination.totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.pages}
              onPageChange={handlePageChange}
              itemsPerPage={pagination.limit}
              totalItems={pagination.total}
            />
          )}
        </>
      ) : (
        <p className="text-center text-gray-500 py-10">
          No hospitals found {searchTerm ? `matching "${searchTerm}"` : ""}.
        </p>
      )}
    </div>
  );
};

export default HospitalListPage;
