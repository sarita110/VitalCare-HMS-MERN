import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import patientService from "../../services/patientService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Card from "../../components/common/Card";
import Pagination from "../../components/common/Pagination";
import HospitalFilter from "../../components/common/HospitalFilter";
import { formatDate } from "../../utils/helpers";
import {
  ClipboardDocumentListIcon,
  UserIcon,
  CalendarDaysIcon,
  BuildingOfficeIcon, // For hospital display
} from "@heroicons/react/24/outline";

const PrescriptionsPage = () => {
  const [prescriptions, setPrescriptions] = useState([]); // These are medical records of type 'prescription'
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterHospitalId, setFilterHospitalId] = useState("");

  const PRESCRIPTIONS_PER_PAGE = 10;

  const fetchPrescriptions = useCallback(async (page = 1, hospitalId = "") => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: PRESCRIPTIONS_PER_PAGE,
        hospitalId: hospitalId || undefined,
      };
      const response = await patientService.getPatientPrescriptions(params);
      if (response.success) {
        const validPrescriptions = response.prescriptions.filter(
          (p) => p.prescriptions && p.prescriptions.length > 0
        );
        setPrescriptions(validPrescriptions);
        setPagination(response.pagination);
        setCurrentPage(response.pagination.page);
      } else {
        throw new Error(response.message || "Failed to fetch prescriptions");
      }
    } catch (err) {
      console.error("Fetch prescriptions error:", err);
      setError(err.message || "Could not load prescriptions.");
      toast.error(err.message || "Could not load prescriptions.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrescriptions(currentPage, filterHospitalId);
  }, [fetchPrescriptions, currentPage, filterHospitalId]);

  const handlePageChange = (page) => setCurrentPage(page);

  const handleHospitalFilterChange = (selectedOption) => {
    setFilterHospitalId(selectedOption ? selectedOption.value : "");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-800">
          My Prescriptions
        </h1>
        <HospitalFilter
          selectedHospital={filterHospitalId}
          onHospitalChange={handleHospitalFilterChange}
          className="w-full md:w-1/3"
        />
      </div>
      {error && <p className="text-center text-danger-500 py-4">{error}</p>}
      {isLoading ? (
        <LoadingSpinner />
      ) : prescriptions.length > 0 ? (
        <div className="space-y-4">
          {prescriptions.map((record) => (
            <Card key={record._id}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-md font-semibold text-primary-700 flex items-center">
                  <ClipboardDocumentListIcon className="w-5 h-5 mr-2" />{" "}
                  Prescription Details
                </h3>
                <div className="text-xs text-gray-500 text-right">
                  <p className="flex items-center justify-end">
                    <CalendarDaysIcon className="w-3 h-3 mr-1" />{" "}
                    {formatDate(record.date)}
                  </p>
                  {record.hospitalId?.name && (
                    <p className="mt-1 flex items-center justify-end">
                      <BuildingOfficeIcon className="w-3 h-3 mr-1 text-gray-400" />{" "}
                      At: {record.hospitalId.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="mb-3 text-sm text-gray-600 flex items-center">
                <UserIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                Prescribed by: Dr. {record.doctorId?.userId?.name || "N/A"}
              </div>
              <div className="space-y-2 border-t pt-3">
                {record.prescriptions.map((p, index) => (
                  <div
                    key={index}
                    className="text-sm border-b pb-2 last:border-b-0 last:pb-0"
                  >
                    <p className="font-medium text-gray-800">{p.medicine}</p>
                    <p className="text-xs text-gray-600">Dosage: {p.dosage}</p>
                    <p className="text-xs text-gray-600">
                      Frequency: {p.frequency}
                    </p>
                    <p className="text-xs text-gray-600">
                      Duration: {p.duration}
                    </p>
                    {p.instructions && (
                      <p className="text-xs text-gray-500 mt-1">
                        Instructions: {p.instructions}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {record.notes && (
                <p className="mt-3 text-xs text-gray-500 italic">
                  Notes: {record.notes}
                </p>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-4">
          No prescriptions found
          {filterHospitalId ? ` at selected hospital` : ""}.
        </p>
      )}
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={pagination.pages}
          onPageChange={handlePageChange}
          itemsPerPage={pagination.limit}
          totalItems={pagination.total}
        />
      )}
    </div>
  );
};

export default PrescriptionsPage;
