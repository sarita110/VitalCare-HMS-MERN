import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import patientService from "../../services/patientService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Card from "../../components/common/Card";
import Pagination from "../../components/common/Pagination";
import HospitalFilter from "../../components/common/HospitalFilter";
import { formatDate, getDisplayStatus } from "../../utils/helpers";
import {
  DocumentTextIcon,
  UserIcon,
  CalendarDaysIcon,
  LinkIcon,
  BuildingOfficeIcon, // For hospital display
} from "@heroicons/react/24/outline";
import Select from "react-select";

const MedicalRecordsPage = () => {
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState("");
  const [filterHospitalId, setFilterHospitalId] = useState("");

  const RECORDS_PER_PAGE = 10;

  const fetchRecords = useCallback(
    async (page = 1, type = "", hospitalId = "") => {
      setIsLoading(true);
      setError(null);
      try {
        const params = {
          page,
          limit: RECORDS_PER_PAGE,
          type: type || undefined,
          hospitalId: hospitalId || undefined,
        };
        const response = await patientService.getPatientMedicalRecords(params);
        if (response.success) {
          setRecords(response.records);
          setPagination(response.pagination);
          setCurrentPage(response.pagination.page);
        } else {
          throw new Error(
            response.message || "Failed to fetch medical records"
          );
        }
      } catch (err) {
        console.error("Fetch medical records error:", err);
        setError(err.message || "Could not load medical records.");
        toast.error(err.message || "Could not load medical records.");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchRecords(currentPage, filterType, filterHospitalId);
  }, [fetchRecords, currentPage, filterType, filterHospitalId]);

  const handlePageChange = (page) => setCurrentPage(page);

  const handleTypeChange = (selectedOption) => {
    setFilterType(selectedOption ? selectedOption.value : "");
    setCurrentPage(1);
  };

  const handleHospitalFilterChange = (selectedOption) => {
    setFilterHospitalId(selectedOption ? selectedOption.value : "");
    setCurrentPage(1);
  };

  const recordTypeOptions = [
    { value: "", label: "All Types" },
    { value: "diagnosis", label: "Diagnosis" },
    { value: "prescription", label: "Prescription" },
    { value: "lab", label: "Lab Test Record" },
    { value: "radiology", label: "Radiology Record" },
    { value: "surgery", label: "Surgery Note" },
    { value: "follow-up", label: "Follow-up Note" },
    { value: "other", label: "Other" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-800">
          Medical Records
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto">
          <HospitalFilter
            selectedHospital={filterHospitalId}
            onHospitalChange={handleHospitalFilterChange}
            className="w-full"
          />
          <div>
            <label htmlFor="typeFilterMedRec" className="form-label sr-only">
              Filter by Type
            </label>
            <Select
              id="typeFilterMedRec"
              name="type"
              options={recordTypeOptions}
              value={
                recordTypeOptions.find((opt) => opt.value === filterType) ||
                null
              }
              onChange={handleTypeChange}
              placeholder="Filter by record type..."
              isClearable
              className="min-w-[200px] w-full"
            />
          </div>
        </div>
      </div>
      {error && <p className="text-center text-danger-500 py-4">{error}</p>}
      {isLoading ? (
        <LoadingSpinner />
      ) : records.length > 0 ? (
        <div className="space-y-4">
          {records.map((record) => (
            <Card key={record._id}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-primary-700 capitalize">
                  {record.type}
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
              <div className="space-y-1 text-sm">
                {record.doctorId && (
                  <p className="text-gray-600 flex items-center">
                    <UserIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                    Dr. {record.doctorId.userId?.name || "N/A"}
                  </p>
                )}
                {record.diagnosis && (
                  <p>
                    <span className="font-medium">Diagnosis:</span>{" "}
                    {record.diagnosis}
                  </p>
                )}
                {record.symptoms && record.symptoms.length > 0 && (
                  <p>
                    <span className="font-medium">Symptoms:</span>{" "}
                    {record.symptoms.join(", ")}
                  </p>
                )}
                {record.treatment && (
                  <p>
                    <span className="font-medium">Treatment:</span>{" "}
                    {record.treatment}
                  </p>
                )}
                {record.notes && (
                  <p className="text-gray-500">
                    <span className="font-medium text-gray-600">Notes:</span>{" "}
                    {record.notes}
                  </p>
                )}
                {record.type === "prescription" &&
                  record.prescriptions?.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <h4 className="font-medium text-xs uppercase text-gray-500 mb-1">
                        Prescriptions
                      </h4>
                      <ul className="list-disc list-inside space-y-0.5 pl-2">
                        {record.prescriptions.map((p, index) => (
                          <li key={index} className="text-xs text-gray-700">
                            {p.medicine} - {p.dosage} ({p.frequency},{" "}
                            {p.duration}){" "}
                            {p.instructions ? ` - ${p.instructions}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                {record.attachments?.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <h4 className="font-medium text-xs uppercase text-gray-500 mb-1">
                      Attachments
                    </h4>
                    {record.attachments.map((att, index) => (
                      <a
                        key={index}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary-600 hover:underline flex items-center"
                      >
                        <LinkIcon className="w-3 h-3 mr-1" />{" "}
                        {att.name || "View Attachment"}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-4">
          No medical records found{filterType ? ` for type: ${filterType}` : ""}
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

export default MedicalRecordsPage;
