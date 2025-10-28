// src/pages/doctor/ReferralsPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import doctorService from "../../services/doctorService";
import hospitalService from "../../services/hospitalService";
// Use patient service specifically for fetching records by ID for selection
import { getMedicalRecordsForPatient } from "../../services/patientService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Pagination from "../../components/common/Pagination";
import FormInput from "../../components/common/FormInput";
import Select from "react-select";
import SelectAsync from "react-select/async";
import { useFormik } from "formik";
import * as Yup from "yup";
import { PlusIcon } from "@heroicons/react/24/outline";
import {
  formatDate,
  getStatusBadgeClass,
  getDisplayStatus,
} from "../../utils/helpers";
import { Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import Checkbox from "../../components/common/Checkbox"; // Import Checkbox

const referralSchema = Yup.object({
  patientId: Yup.string().required("Patient is required"),
  toHospitalId: Yup.string().required("Destination hospital is required"),
  reason: Yup.string().required("Reason for referral is required").min(10),
  details: Yup.string()
    .required("Details/Clinical summary is required")
    .min(10),
  priority: Yup.string()
    .oneOf(["normal", "urgent", "emergency"])
    .default("normal"),
  selectedRecordIds: Yup.array().of(Yup.string()).optional(), // Array of selected record IDs
});

const ReferralsPage = () => {
  const { user } = useAuth(); // Get logged-in doctor's user info
  const [referrals, setReferrals] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [loadingFormData, setLoadingFormData] = useState(false);
  const [availableRecords, setAvailableRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const REFERRALS_PER_PAGE = 15;

  const fetchReferrals = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { page, limit: REFERRALS_PER_PAGE };
      const response = await doctorService.getDoctorReferrals(params);
      if (response.success) {
        setReferrals(response.referrals);
        setPagination(response.pagination);
        setCurrentPage(response.pagination.page);
      } else {
        throw new Error(response.message || "Failed to fetch referrals");
      }
    } catch (err) {
      console.error("Fetch referrals error:", err);
      setError(err.message || "Could not load referrals.");
      toast.error(err.message || "Could not load referrals.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferrals(currentPage);
  }, [fetchReferrals, currentPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const fetchModalData = async () => {
    setLoadingFormData(true);
    setAvailableRecords([]);
    try {
      const hospitalResponse = await hospitalService.getAllHospitals({
        limit: 500,
      });
      if (hospitalResponse.success) {
        const filteredHospitals = hospitalResponse.hospitals
          .filter((h) => h._id !== user?.hospital)
          .map((h) => ({ value: h._id, label: h.name }));
        setHospitals(filteredHospitals);
      }
    } catch (err) {
      toast.error("Failed to load hospital list for referral form.");
      console.error("Referral form data error:", err);
    } finally {
      setLoadingFormData(false);
    }
  };

  const openModal = () => {
    fetchModalData();
    formik.resetForm();
    setAvailableRecords([]);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const loadPatientOptions = async (inputValue) => {
    try {
      // For empty or short search terms, load recent patients
      if (!inputValue || inputValue.length < 2) {
        const response = await doctorService.getDoctorPatients({
          limit: 10, // Just load 10 recent patients
          page: 1,
        });

        if (response.success && response.patients?.length > 0) {
          return response.patients.map((p) => ({
            value: p._id,
            label: `${p.userId?.name} (${
              p.userId?.email || p.userId?.phone || "No contact info"
            })`,
          }));
        }
        return [];
      }

      // For search terms, search as before
      const response = await doctorService.getDoctorPatients({
        search: inputValue,
        limit: 20,
      });

      if (response.success) {
        return response.patients.map((p) => ({
          value: p._id,
          label: `${p.userId?.name} (${
            p.userId?.email || p.userId?.phone || "No contact info"
          })`,
        }));
      }
      return [];
    } catch (error) {
      console.error("Error searching patients:", error);
      return [];
    }
  };

  const formik = useFormik({
    initialValues: {
      patientId: "",
      patientLabel: "", // Add this field
      toHospitalId: "",
      reason: "",
      details: "",
      priority: "normal",
      doctorId: "",
      selectedRecordIds: [],
    },
    validationSchema: referralSchema,
    onSubmit: async (values, { resetForm }) => {
      setActionLoading(true);
      try {
        const payload = {
          patientId: values.patientId,
          toHospitalId: values.toHospitalId,
          reason: values.reason,
          details: values.details,
          priority: values.priority,
          // Convert array to JSON string for backend
          medicalRecordIds: JSON.stringify(values.selectedRecordIds || []),
        };
        // Don't send selectedRecordIds itself if backend doesn't expect it
        // delete payload.selectedRecordIds;

        const response = await doctorService.createReferral(payload);
        if (response.success) {
          toast.success("Referral created successfully!");
          fetchReferrals(1); // Refresh list
          closeModal();
          resetForm();
        } else {
          throw new Error(response.message || "Failed to create referral");
        }
      } catch (err) {
        console.error("Create referral error:", err);
        toast.error(err.message || "Could not create referral.");
      } finally {
        setActionLoading(false);
      }
    },
  });

  // Fetch medical records when patient changes

  useEffect(() => {
    const fetchRecordsForPatient = async (selectedPatientId) => {
      if (!selectedPatientId) {
        setAvailableRecords([]);
        formik.setFieldValue("selectedRecordIds", []);
        return;
      }

      setLoadingRecords(true);
      formik.setFieldValue("selectedRecordIds", []);

      try {
        // Use the correct service function
        const response = await doctorService.getPatientRecordsForReferral(
          selectedPatientId
        );

        if (response.success) {
          setAvailableRecords(response.records || []);
        } else {
          setAvailableRecords([]);
          toast.error(
            response.message || "Could not load records for patient."
          );
        }
      } catch (err) {
        console.error("Error fetching records for referral:", err);
        setAvailableRecords([]);
        toast.error("Could not load patient records for selection.");
      } finally {
        setLoadingRecords(false);
      }
    };

    fetchRecordsForPatient(formik.values.patientId);
  }, [formik.values.patientId]);

  // Handle checkbox changes for medical records
  const handleRecordSelection = (event) => {
    const { value, checked } = event.target;
    formik.setFieldValue(
      "selectedRecordIds",
      checked
        ? [...formik.values.selectedRecordIds, value]
        : formik.values.selectedRecordIds.filter((id) => id !== value)
    );
  };

  const columns = useMemo(
    () => [
      {
        Header: "Date",
        accessor: "referralDate",
        Cell: ({ value }) => formatDate(value),
      },
      {
        Header: "Patient",
        accessor: "patientId.userId.name",
        Cell: ({ value }) => value || "N/A",
      },
      {
        Header: "Referred To",
        accessor: "toHospitalId.name",
        Cell: ({ value }) => value || "N/A",
      },
      {
        Header: "Reason",
        accessor: "reason",
        Cell: ({ value }) => (
          <span className="truncate block w-40" title={value}>
            {value}
          </span>
        ),
      },
      {
        Header: "Priority",
        accessor: "priority",
        Cell: ({ value }) => getDisplayStatus(value),
      },
      {
        Header: "Status",
        accessor: "status",
        Cell: ({ value }) => (
          <span className={`badge ${getStatusBadgeClass(value)}`}>
            {getDisplayStatus(value)}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Referrals Sent</h1>
        <Button
          onClick={openModal}
          leftIcon={<PlusIcon className="h-5 w-5 mr-1" />}
        >
          Create Referral
        </Button>
      </div>
      {error && <p className="text-center text-danger-500 py-4">{error}</p>}
      <Table
        columns={columns}
        data={referrals}
        isLoading={isLoading}
        emptyMessage="No referrals sent."
      />
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={pagination.pages}
          onPageChange={handlePageChange}
          itemsPerPage={pagination.limit}
          totalItems={pagination.total}
        />
      )}

      {/* Create Referral Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Create New Referral"
        size="3xl"
      >
        {loadingFormData ? (
          <LoadingSpinner />
        ) : (
          <form onSubmit={formik.handleSubmit} className="space-y-4">
            {/* Patient AsyncSelect */}
            <div>
              <label htmlFor="patientIdRefD" className="form-label">
                Patient <span className="text-danger-600">*</span>
              </label>
              <SelectAsync
                id="patientIdRefDoc"
                name="patientId"
                cacheOptions
                loadOptions={loadPatientOptions}
                defaultOptions={true}
                value={
                  formik.values.patientId
                    ? {
                        value: formik.values.patientId,
                        // Store the selected option's label for display
                        label:
                          formik.values.patientLabel || "Selected Patient...",
                      }
                    : null
                }
                onChange={(selectedOption) => {
                  if (selectedOption) {
                    // Store both the ID and the label
                    formik.setFieldValue("patientId", selectedOption.value);
                    formik.setFieldValue("patientLabel", selectedOption.label);
                    formik.setFieldValue("selectedRecordIds", []);
                  } else {
                    formik.setFieldValue("patientId", "");
                    formik.setFieldValue("patientLabel", "");
                    formik.setFieldValue("selectedRecordIds", []);
                  }
                }}
                onBlur={formik.handleBlur}
                placeholder="Search for a patient..."
                isClearable
                styles={{
                  control: (base) =>
                    formik.touched.patientId && formik.errors.patientId
                      ? { ...base, borderColor: "#dc2626" }
                      : base,
                }}
              />
              {formik.touched.patientId && formik.errors.patientId ? (
                <p className="form-error">{formik.errors.patientId}</p>
              ) : null}
            </div>
            {/* To Hospital Select */}
            <div>
              <label htmlFor="toHospitalIdRefD" className="form-label">
                Refer To Hospital <span className="text-danger-600">*</span>
              </label>
              <Select
                id="toHospitalIdRefD"
                name="toHospitalId"
                options={hospitals}
                value={
                  hospitals.find(
                    (opt) => opt.value === formik.values.toHospitalId
                  ) || null
                }
                onChange={(option) =>
                  formik.setFieldValue(
                    "toHospitalId",
                    option ? option.value : ""
                  )
                }
                onBlur={formik.handleBlur}
                placeholder="Select destination hospital..."
                styles={{
                  control: (base) =>
                    formik.touched.toHospitalId && formik.errors.toHospitalId
                      ? { ...base, borderColor: "#dc2626" }
                      : base,
                }}
              />
              {formik.touched.toHospitalId && formik.errors.toHospitalId ? (
                <p className="form-error">{formik.errors.toHospitalId}</p>
              ) : null}
            </div>
            {/* Reason, Details, Priority Inputs... */}
            <FormInput
              label="Reason for Referral"
              id="reasonRefD"
              name="reason"
              required
              {...formik.getFieldProps("reason")}
              error={formik.errors.reason}
              touched={formik.touched.reason}
            />
            <FormInput
              label="Details / Clinical Summary"
              id="detailsRefD"
              name="details"
              type="textarea"
              rows={4}
              required
              {...formik.getFieldProps("details")}
              error={formik.errors.details}
              touched={formik.touched.details}
            />
            <div>
              <label htmlFor="priorityRefD" className="form-label">
                Priority
              </label>
              <select
                id="priorityRefD"
                name="priority"
                {...formik.getFieldProps("priority")}
                className="form-input"
              >
                <option value="normal">Normal</option>{" "}
                <option value="urgent">Urgent</option>{" "}
                <option value="emergency">Emergency</option>
              </select>
            </div>

            {/* Medical Record Selection */}
            {formik.values.patientId && (
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-2 text-sm">
                  Attach Medical Records (Optional)
                </h4>
                {loadingRecords ? (
                  <LoadingSpinner size={20} />
                ) : availableRecords.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto space-y-1 border p-2 rounded bg-gray-50">
                    {availableRecords.map((record) => (
                      <Checkbox
                        key={record._id}
                        id={`rec-select-${record._id}`}
                        value={record._id}
                        checked={formik.values.selectedRecordIds?.includes(
                          record._id
                        )}
                        onChange={handleRecordSelection}
                        label={`${formatDate(record.date)} - ${
                          record.type === "diagnosis"
                            ? "Diagnosis"
                            : record.type === "surgery"
                            ? "Surgery"
                            : record.type === "follow-up"
                            ? "Follow-up"
                            : "Other Record"
                        } ${
                          record.diagnosis
                            ? `(${record.diagnosis})`
                            : record.notes
                            ? `(${record.notes.substring(0, 30)}...)`
                            : ""
                        }`}
                        labelClassName="text-xs text-gray-700 cursor-pointer"
                        className="py-1"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic p-3 border rounded">
                    <p>No medical records available for this patient.</p>
                    <p className="text-xs mt-1">
                      You need to create medical records for this patient before
                      they can be shared in referrals.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="pt-4 flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={actionLoading}
                disabled={actionLoading || !formik.isValid}
              >
                Create Referral
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default ReferralsPage;
