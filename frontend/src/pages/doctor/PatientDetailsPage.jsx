// src/pages/doctor/PatientDetailsPage.jsx

import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import doctorService from "../../services/doctorService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Card from "../../components/common/Card";
import Avatar from "../../components/common/Avatar";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import FormInput from "../../components/common/FormInput";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  LAB_TEST_COSTS,
  LAB_TEST_TYPES,
  RADIOLOGY_COSTS,
} from "../../constants/testCosts";
import {
  formatDate,
  formatDateTime,
  calculateAge,
  getStatusBadgeClass,
  getDisplayStatus,
} from "../../utils/helpers";
import {
  UserIcon,
  CalendarDaysIcon,
  PhoneIcon,
  EnvelopeIcon,
  ClipboardDocumentListIcon,
  BeakerIcon,
  ViewfinderCircleIcon,
  PlusIcon,
  CurrencyRupeeIcon,
} from "@heroicons/react/24/outline";

// Validation Schemas
const labTestSchema = Yup.object({
  testName: Yup.string()
    .required("Test name is required")
    .oneOf(Object.keys(LAB_TEST_COSTS), "Please select a valid test"),
  testType: Yup.string()
    .required("Test type is required")
    .oneOf(Object.keys(LAB_TEST_TYPES), "Please select a valid test type"),
  description: Yup.string().optional(),
  instructions: Yup.string().optional(),
  priority: Yup.string()
    .oneOf(["routine", "urgent", "emergency"])
    .default("routine"),
});

const radiologyTestSchema = Yup.object({
  procedureType: Yup.string()
    .required("Procedure type is required")
    .oneOf(Object.keys(RADIOLOGY_COSTS), "Please select a valid procedure"),
  bodyPart: Yup.string().required("Body part is required"),
  description: Yup.string().optional(),
  priority: Yup.string()
    .oneOf(["routine", "urgent", "emergency"])
    .default("routine"),
  notes: Yup.string().optional(),
});

const medicalRecordSchema = Yup.object({
  type: Yup.string()
    .required("Record type is required")
    .oneOf(
      ["diagnosis", "surgery", "follow-up", "other"],
      "Invalid record type"
    ),
  diagnosis: Yup.string().when("type", (typeValue, schema) => {
    // Yup passes the field value as an array in recent versions
    // Extract the actual value from the array
    const actualType = Array.isArray(typeValue) ? typeValue[0] : typeValue;
    return actualType !== "other"
      ? schema.required("Diagnosis is required")
      : schema.optional();
  }),
  symptoms: Yup.string().optional(),
  treatment: Yup.string().optional(),
  notes: Yup.string().optional(),
  prescriptions: Yup.array()
    .of(
      Yup.object({
        medicine: Yup.string().required("Medicine name is required"),
        dosage: Yup.string().required("Dosage is required"),
        frequency: Yup.string().required("Frequency is required"),
        duration: Yup.string().required("Duration is required"),
        instructions: Yup.string().optional(),
      })
    )
    .optional(),
});

const PatientDetailsPage = () => {
  const { id: patientId } = useParams();
  const [patientDetails, setPatientDetails] = useState(null);
  const [medicalData, setMedicalData] = useState({
    appointments: [],
    medicalRecords: [],
    labTests: [],
    radiologyTests: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await doctorService.getDoctorPatientDetails(patientId);
      if (response.success) {
        setPatientDetails(response.patient);
        setMedicalData(
          response.medicalData || {
            appointments: [],
            medicalRecords: [],
            labTests: [],
            radiologyTests: [],
          }
        );
      } else {
        throw new Error(response.message || "Failed to fetch patient details");
      }
    } catch (err) {
      console.error("Fetch patient details error:", err);
      setError(err.message || "Could not load patient details.");
      toast.error(err.message || "Could not load patient details.");
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Medical Record Formik
  const recordFormik = useFormik({
    initialValues: {
      type: "diagnosis",
      diagnosis: "",
      symptoms: "",
      treatment: "",
      notes: "",
      prescriptions: [],
    },
    validationSchema: medicalRecordSchema,
    onSubmit: async (values, { resetForm }) => {
      setActionLoading(true);
      try {
        const payload = {
          ...values,
          patientId,
          // Convert symptoms array to JSON string
          symptoms: values.symptoms
            ? JSON.stringify(
                values.symptoms
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            : "[]",
          // Convert prescriptions array to JSON string
          prescriptions: JSON.stringify(values.prescriptions),
        };
        const response = await doctorService.createMedicalRecord(payload);
        if (response.success) {
          toast.success("Medical record added successfully!");
          setMedicalData((prev) => ({
            ...prev,
            medicalRecords: [response.medicalRecord, ...prev.medicalRecords],
          }));
          closeModal();
          resetForm();
        } else {
          throw new Error(response.message || "Failed to add record");
        }
      } catch (err) {
        console.error("Add medical record error:", err);
        toast.error(err.message || "Could not add record.");
      } finally {
        setActionLoading(false);
      }
    },
  });

  // Prescription handling functions
  const addPrescription = () => {
    recordFormik.setFieldValue("prescriptions", [
      ...recordFormik.values.prescriptions,
      {
        medicine: "",
        dosage: "",
        frequency: "",
        duration: "",
        instructions: "",
      },
    ]);
  };

  const removePrescription = (index) => {
    const newPrescriptions = [...recordFormik.values.prescriptions];
    newPrescriptions.splice(index, 1);
    recordFormik.setFieldValue("prescriptions", newPrescriptions);
  };

  const updatePrescription = (index, field, value) => {
    const newPrescriptions = [...recordFormik.values.prescriptions];
    newPrescriptions[index][field] = value;
    recordFormik.setFieldValue("prescriptions", newPrescriptions);
  };

  // Lab Test Formik
  const labTestFormik = useFormik({
    initialValues: {
      testName: "",
      testType: "",
      description: "",
      instructions: "",
      priority: "routine",
    },
    validationSchema: labTestSchema,
    onSubmit: async (values, { resetForm }) => {
      setActionLoading(true);
      try {
        const payload = { ...values, patientId };
        const response = await doctorService.requestLabTest(payload);
        if (response.success) {
          toast.success(
            `Lab test requested successfully! Cost: Rs ${response.cost}`
          );
          setMedicalData((prev) => ({
            ...prev,
            labTests: [response.labTest, ...prev.labTests],
          }));
          closeModal();
          resetForm();
        } else {
          throw new Error(response.message || "Failed to request lab test");
        }
      } catch (err) {
        console.error("Request lab test error:", err);
        toast.error(err.message || "Could not request lab test.");
      } finally {
        setActionLoading(false);
      }
    },
  });

  // Radiology Test Formik
  const radiologyTestFormik = useFormik({
    initialValues: {
      procedureType: "",
      bodyPart: "",
      description: "",
      priority: "routine",
      notes: "",
    },
    validationSchema: radiologyTestSchema,
    onSubmit: async (values, { resetForm }) => {
      setActionLoading(true);
      try {
        const payload = { ...values, patientId };
        const response = await doctorService.requestRadiologyTest(payload);
        if (response.success) {
          toast.success(
            `Radiology test requested successfully! Cost: Rs ${response.cost}`
          );
          setMedicalData((prev) => ({
            ...prev,
            radiologyTests: [response.radiologyTest, ...prev.radiologyTests],
          }));
          closeModal();
          resetForm();
        } else {
          throw new Error(
            response.message || "Failed to request radiology test"
          );
        }
      } catch (err) {
        console.error("Request radiology test error:", err);
        toast.error(err.message || "Could not request radiology test.");
      } finally {
        setActionLoading(false);
      }
    },
  });

  const openModal = (type) => setModalType(type);

  const closeModal = () => {
    setModalType(null);
    recordFormik.resetForm();
    labTestFormik.resetForm();
    radiologyTestFormik.resetForm();
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-center text-danger-600 py-4">{error}</div>;
  }

  if (!patientDetails) {
    return (
      <div className="text-center text-gray-500 py-4">
        Patient data not found.
      </div>
    );
  }

  const { user: patientUser, ...patientProfileData } = patientDetails;

  return (
    <div className="space-y-6">
      {/* Patient Summary Card */}
      <Card>
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
          <Avatar src={patientUser?.image} alt={patientUser?.name} size="xl" />
          <div className="flex-grow text-center md:text-left">
            <h1 className="text-2xl font-bold text-gray-900">
              {patientUser?.name || "N/A"}
            </h1>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
              <p className="flex items-center">
                <EnvelopeIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                {patientUser?.email || "N/A"}
              </p>
              <p className="flex items-center">
                <PhoneIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                {patientUser?.phone || "N/A"}
              </p>
              <p>Gender: {patientProfileData.gender || "N/A"}</p>
              <p>
                DOB: {formatDate(patientProfileData.dob) || "N/A"} (
                {calculateAge(patientProfileData.dob) ?? "N/A"} years)
              </p>
              <p>Blood Group: {patientProfileData.bloodGroup || "N/A"}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
              <Button
                size="sm"
                onClick={() => openModal("record")}
                leftIcon={<PlusIcon className="h-4 w-4" />}
              >
                Add Record
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openModal("lab")}
                leftIcon={<BeakerIcon className="h-4 w-4" />}
              >
                Request Lab Test
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openModal("radiology")}
                leftIcon={<ViewfinderCircleIcon className="h-4 w-4" />}
              >
                Request Radiology
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Medical Data Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments History */}
        <Card title="Appointments History (with you)">
          {medicalData.appointments?.length > 0 ? (
            <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {medicalData.appointments.map((appt) => (
                <li key={appt._id} className="py-3">
                  <p className="text-sm font-medium">
                    {formatDateTime(appt.dateTime)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Status:{" "}
                    <span
                      className={`badge ${getStatusBadgeClass(appt.status)}`}
                    >
                      {getDisplayStatus(appt.status)}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Reason: {appt.reason}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">
              No appointment history found.
            </p>
          )}
        </Card>

        {/* Medical Records */}
        <Card title="Medical Records (by you)">
          {medicalData.medicalRecords?.length > 0 ? (
            <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {medicalData.medicalRecords.map((rec) => (
                <li key={rec._id} className="py-3">
                  <p className="text-sm font-medium capitalize">
                    {rec.type} - {formatDate(rec.date)}
                  </p>
                  {rec.diagnosis && (
                    <p className="text-xs text-gray-600">
                      Diagnosis: {rec.diagnosis}
                    </p>
                  )}
                  {rec.notes && (
                    <p className="text-xs text-gray-500 mt-1">
                      Notes: {rec.notes}
                    </p>
                  )}
                  {rec.prescriptions?.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Prescriptions added.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">
              No medical records added by you.
            </p>
          )}
          <div className="mt-4 text-right">
            <Link
              to={`/doctor/patients/${patientId}/medical-history`}
              className="text-sm font-medium text-primary-600 hover:underline"
            >
              View Full History &rarr;
            </Link>
          </div>
        </Card>

        {/* Lab Tests */}
        <Card title="Lab Tests (Requested by you)">
          {medicalData.labTests?.length > 0 ? (
            <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {medicalData.labTests.map((test) => (
                <li key={test._id} className="py-3">
                  <p className="text-sm font-medium">
                    {test.testName} ({test.testType})
                  </p>
                  <p className="text-xs text-gray-500">
                    Requested: {formatDate(test.requestDate)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Status:{" "}
                    <span
                      className={`badge ${getStatusBadgeClass(test.status)}`}
                    >
                      {getDisplayStatus(test.status)}
                    </span>
                  </p>
                  {test.resultId && (
                    <Link
                      to={`/doctor/lab-results/${test.resultId}`}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      View Result
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">
              No lab tests requested by you.
            </p>
          )}
          <div className="mt-4 text-right">
            <Link
              to="/doctor/lab-results"
              className="text-sm font-medium text-primary-600 hover:underline"
            >
              View All Lab Results &rarr;
            </Link>
          </div>
        </Card>

        {/* Radiology Tests */}
        <Card title="Radiology Tests (Requested by you)">
          {medicalData.radiologyTests?.length > 0 ? (
            <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {medicalData.radiologyTests.map((test) => (
                <li key={test._id} className="py-3">
                  <p className="text-sm font-medium">
                    {test.procedureType} - {test.bodyPart}
                  </p>
                  <p className="text-xs text-gray-500">
                    Requested: {formatDate(test.requestDate)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Status:{" "}
                    <span
                      className={`badge ${getStatusBadgeClass(test.status)}`}
                    >
                      {getDisplayStatus(test.status)}
                    </span>
                  </p>
                  {test.status === "completed" && test.findings && (
                    <Link
                      to={`/doctor/radiology-results/${test._id}`}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      View Report
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">
              No radiology tests requested by you.
            </p>
          )}
          <div className="mt-4 text-right">
            <Link
              to="/doctor/radiology-results"
              className="text-sm font-medium text-primary-600 hover:underline"
            >
              View All Radiology Results &rarr;
            </Link>
          </div>
        </Card>
      </div>

      {/* Medical Record Modal */}
      <Modal
        isOpen={modalType === "record"}
        onClose={closeModal}
        title="Add Medical Record"
      >
        <form onSubmit={recordFormik.handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="type" className="form-label">
              Record Type *
            </label>
            <select
              id="type"
              name="type"
              {...recordFormik.getFieldProps("type")}
              className="form-input"
              required
            >
              <option value="diagnosis">Diagnosis</option>
              <option value="surgery">Surgery</option>
              <option value="follow-up">Follow-up</option>
              <option value="other">Other</option>
            </select>
            {recordFormik.touched.type && recordFormik.errors.type && (
              <p className="mt-1 text-sm text-red-600">
                {recordFormik.errors.type}
              </p>
            )}
          </div>

          {recordFormik.values.type !== "other" && (
            <FormInput
              label="Diagnosis *"
              id="diagnosis"
              name="diagnosis"
              {...recordFormik.getFieldProps("diagnosis")}
              error={recordFormik.errors.diagnosis}
              touched={recordFormik.touched.diagnosis}
              required
            />
          )}

          <FormInput
            label="Symptoms (comma-separated)"
            id="symptoms"
            name="symptoms"
            {...recordFormik.getFieldProps("symptoms")}
            error={recordFormik.errors.symptoms}
            touched={recordFormik.touched.symptoms}
          />

          <FormInput
            label="Treatment"
            id="treatment"
            name="treatment"
            type="textarea"
            rows={2}
            {...recordFormik.getFieldProps("treatment")}
            error={recordFormik.errors.treatment}
            touched={recordFormik.touched.treatment}
          />

          <FormInput
            label="Notes"
            id="notes"
            name="notes"
            type="textarea"
            rows={3}
            {...recordFormik.getFieldProps("notes")}
            error={recordFormik.errors.notes}
            touched={recordFormik.touched.notes}
          />

          {/* Prescriptions Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="form-label">Prescriptions</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPrescription}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Prescription
              </Button>
            </div>

            {recordFormik.values.prescriptions.map((prescription, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 rounded-lg space-y-3"
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-gray-700">
                    Prescription {index + 1}
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removePrescription(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    label="Medicine *"
                    id={`prescriptions.${index}.medicine`}
                    name={`prescriptions.${index}.medicine`}
                    value={prescription.medicine}
                    onChange={(e) =>
                      updatePrescription(index, "medicine", e.target.value)
                    }
                    required
                  />
                  <FormInput
                    label="Dosage *"
                    id={`prescriptions.${index}.dosage`}
                    name={`prescriptions.${index}.dosage`}
                    value={prescription.dosage}
                    onChange={(e) =>
                      updatePrescription(index, "dosage", e.target.value)
                    }
                    required
                  />
                  <FormInput
                    label="Frequency *"
                    id={`prescriptions.${index}.frequency`}
                    name={`prescriptions.${index}.frequency`}
                    value={prescription.frequency}
                    onChange={(e) =>
                      updatePrescription(index, "frequency", e.target.value)
                    }
                    required
                  />
                  <FormInput
                    label="Duration *"
                    id={`prescriptions.${index}.duration`}
                    name={`prescriptions.${index}.duration`}
                    value={prescription.duration}
                    onChange={(e) =>
                      updatePrescription(index, "duration", e.target.value)
                    }
                    required
                  />
                </div>
                <FormInput
                  label="Instructions"
                  id={`prescriptions.${index}.instructions`}
                  name={`prescriptions.${index}.instructions`}
                  value={prescription.instructions}
                  onChange={(e) =>
                    updatePrescription(index, "instructions", e.target.value)
                  }
                />
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={actionLoading}
              disabled={actionLoading || !recordFormik.isValid}
            >
              Add Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* Lab Test Modal */}
      <Modal
        isOpen={modalType === "lab"}
        onClose={closeModal}
        title="Request Lab Test"
      >
        <form onSubmit={labTestFormik.handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="testName" className="form-label">
              Test Name
            </label>
            <select
              id="testName"
              name="testName"
              {...labTestFormik.getFieldProps("testName")}
              className="form-input"
              required
            >
              <option value="">Select a test</option>
              {Object.keys(LAB_TEST_COSTS).map((test) => (
                <option key={test} value={test}>
                  {test}
                </option>
              ))}
            </select>
            {labTestFormik.touched.testName &&
              labTestFormik.errors.testName && (
                <p className="mt-1 text-sm text-red-600">
                  {labTestFormik.errors.testName}
                </p>
              )}
          </div>

          <div>
            <label htmlFor="testType" className="form-label">
              Test Type
            </label>
            <select
              id="testType"
              name="testType"
              {...labTestFormik.getFieldProps("testType")}
              className="form-input"
              required
            >
              <option value="">Select test type</option>
              {Object.keys(LAB_TEST_TYPES).map((type) => (
                <option key={type} value={type}>
                  {LAB_TEST_TYPES[type]}
                </option>
              ))}
            </select>
            {labTestFormik.touched.testType &&
              labTestFormik.errors.testType && (
                <p className="mt-1 text-sm text-red-600">
                  {labTestFormik.errors.testType}
                </p>
              )}
          </div>

          <FormInput
            label="Description"
            id="description"
            name="description"
            type="textarea"
            rows={2}
            {...labTestFormik.getFieldProps("description")}
            error={labTestFormik.errors.description}
            touched={labTestFormik.touched.description}
          />

          <FormInput
            label="Instructions"
            id="instructions"
            name="instructions"
            type="textarea"
            rows={2}
            {...labTestFormik.getFieldProps("instructions")}
            error={labTestFormik.errors.instructions}
            touched={labTestFormik.touched.instructions}
          />

          <div>
            <label htmlFor="labPriority" className="form-label">
              Priority
            </label>
            <select
              id="labPriority"
              name="priority"
              {...labTestFormik.getFieldProps("priority")}
              className="form-input"
            >
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>

          {labTestFormik.values.testName && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2">
                <CurrencyRupeeIcon className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Estimated Cost</p>
                  <p className="text-lg font-semibold text-gray-900">
                    Rs {LAB_TEST_COSTS[labTestFormik.values.testName]}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={actionLoading}
              disabled={actionLoading || !labTestFormik.isValid}
            >
              Request Test
            </Button>
          </div>
        </form>
      </Modal>

      {/* Radiology Test Modal */}
      <Modal
        isOpen={modalType === "radiology"}
        onClose={closeModal}
        title="Request Radiology Test"
      >
        <form onSubmit={radiologyTestFormik.handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="procedureType" className="form-label">
              Procedure Type
            </label>
            <select
              id="procedureType"
              name="procedureType"
              {...radiologyTestFormik.getFieldProps("procedureType")}
              className="form-input"
              required
            >
              <option value="">Select a procedure</option>
              {Object.keys(RADIOLOGY_COSTS).map((procedure) => (
                <option key={procedure} value={procedure}>
                  {procedure}
                </option>
              ))}
            </select>
            {radiologyTestFormik.touched.procedureType &&
              radiologyTestFormik.errors.procedureType && (
                <p className="mt-1 text-sm text-red-600">
                  {radiologyTestFormik.errors.procedureType}
                </p>
              )}
          </div>

          <FormInput
            label="Body Part"
            id="bodyPart"
            name="bodyPart"
            required
            {...radiologyTestFormik.getFieldProps("bodyPart")}
            error={radiologyTestFormik.errors.bodyPart}
            touched={radiologyTestFormik.touched.bodyPart}
          />

          <FormInput
            label="Clinical Information/Reason"
            id="radiologyDescription"
            name="description"
            type="textarea"
            rows={2}
            {...radiologyTestFormik.getFieldProps("description")}
            error={radiologyTestFormik.errors.description}
            touched={radiologyTestFormik.touched.description}
          />

          <FormInput
            label="Notes"
            id="radiologyNotes"
            name="notes"
            type="textarea"
            rows={2}
            {...radiologyTestFormik.getFieldProps("notes")}
            error={radiologyTestFormik.errors.notes}
            touched={radiologyTestFormik.touched.notes}
          />

          <div>
            <label htmlFor="radioPriority" className="form-label">
              Priority
            </label>
            <select
              id="radioPriority"
              name="priority"
              {...radiologyTestFormik.getFieldProps("priority")}
              className="form-input"
            >
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>

          {radiologyTestFormik.values.procedureType && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2">
                <CurrencyRupeeIcon className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Estimated Cost</p>
                  <p className="text-lg font-semibold text-gray-900">
                    Rs{" "}
                    {RADIOLOGY_COSTS[radiologyTestFormik.values.procedureType]}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={actionLoading}
              disabled={actionLoading || !radiologyTestFormik.isValid}
            >
              Request Test
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PatientDetailsPage;
