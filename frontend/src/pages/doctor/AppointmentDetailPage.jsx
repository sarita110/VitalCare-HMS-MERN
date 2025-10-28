// pages/doctor/AppointmentDetailPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import doctorService from "../../services/doctorService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { toast } from "react-hot-toast";
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";
import FormInput from "../../components/common/FormInput";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  DocumentTextIcon,
  BeakerIcon,
  ViewfinderCircleIcon,
  ArrowTopRightOnSquareIcon,
  PlusIcon,
  CurrencyRupeeIcon,
} from "@heroicons/react/24/outline";
import {
  LAB_TEST_COSTS,
  LAB_TEST_TYPES,
  RADIOLOGY_COSTS,
} from "../../constants/testCosts";
import { getStatusBadgeClass, getDisplayStatus } from "../../utils/helpers";

// Validation Schemas
const medicalRecordSchema = Yup.object({
  type: Yup.string()
    .required("Record type is required")
    .oneOf(
      ["diagnosis", "surgery", "follow-up", "other"],
      "Invalid record type"
    ),
  diagnosis: Yup.string().when("type", (typeValue, schema) => {
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

const AppointmentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [modalType, setModalType] = useState(null);
  const [viewMedicalRecords, setViewMedicalRecords] = useState(false);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [medicalRecordsLoading, setMedicalRecordsLoading] = useState(false);

  // Extract this into a separate function that can be called from multiple places
  const fetchAppointmentDetails = async () => {
    setIsLoading(true);
    try {
      const response = await doctorService.getDoctorAppointmentDetails(id);
      if (response.success) {
        setAppointment(response.appointment);
        setPatientData(response.patientData);
      } else {
        throw new Error(
          response.message || "Failed to fetch appointment details"
        );
      }
    } catch (err) {
      console.error("Fetch appointment details error:", err);
      setError(err.message || "Could not load appointment details.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPatientMedicalRecords = async () => {
    if (!appointment?.patientId?._id) return;

    setMedicalRecordsLoading(true);
    try {
      const response = await doctorService.getPatientMedicalHistoryForDoctor(
        appointment.patientId._id
      );
      if (response.success) {
        setMedicalRecords(response.medicalHistory);
      } else {
        throw new Error(response.message || "Failed to fetch medical records");
      }
    } catch (err) {
      console.error("Fetch medical records error:", err);
      toast.error(err.message || "Could not load medical records.");
    } finally {
      setMedicalRecordsLoading(false);
    }
  };

  // Call the fetch function when the component loads
  useEffect(() => {
    if (id) {
      fetchAppointmentDetails();
    }
  }, [id]);

  useEffect(() => {
    if (viewMedicalRecords && appointment?.patientId?._id) {
      fetchPatientMedicalRecords();
    }
  }, [viewMedicalRecords, appointment]);

  // Determine if completion should be allowed
  const canComplete =
    appointment && ["confirmed", "in-progress"].includes(appointment.status); // Allow completion if confirmed or already started

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
      setIsSubmitting(true);
      try {
        const symptomsArray = values.symptoms
          ? values.symptoms
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

        const payload = {
          type: values.type,
          diagnosis: values.diagnosis,
          treatment: values.treatment,
          notes: values.notes,
          patientId: appointment.patientId._id,
          appointmentId: appointment._id, // Include appointment ID
          // Convert symptoms array to JSON string
          symptoms: symptomsArray,
          // Send the prescriptions array directly
          prescriptions: values.prescriptions,
        };

        const response = await doctorService.createMedicalRecord(payload);
        if (response.success) {
          toast.success("Medical record added successfully!");
          closeModal();
          resetForm();
          fetchAppointmentDetails(); // Refresh appointment data to show new medical record
        } else {
          throw new Error(response.message || "Failed to add record");
        }
      } catch (err) {
        const errorMsg =
          err.response?.data?.message || err.message || "Could not add record.";
        toast.error(errorMsg);
      } finally {
        setIsSubmitting(false);
      }
    },
  });

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
      setIsSubmitting(true);
      try {
        const payload = {
          ...values,
          patientId: appointment.patientId._id,
          appointmentId: appointment._id, // Include appointment ID
        };

        const response = await doctorService.requestLabTest(payload);
        if (response.success) {
          toast.success(
            `Lab test requested successfully! Cost: Rs ${response.cost}`
          );
          closeModal();
          resetForm();
          fetchAppointmentDetails(); // Refresh appointment data to show new lab test
        } else {
          throw new Error(response.message || "Failed to request lab test");
        }
      } catch (err) {
        console.error("Request lab test error:", err);
        toast.error(err.message || "Could not request lab test.");
      } finally {
        setIsSubmitting(false);
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
      setIsSubmitting(true);
      try {
        const payload = {
          ...values,
          patientId: appointment.patientId._id,
          appointmentId: appointment._id, // Include appointment ID
        };

        const response = await doctorService.requestRadiologyTest(payload);
        if (response.success) {
          toast.success(
            `Radiology test requested successfully! Cost: Rs ${response.cost}`
          );
          closeModal();
          resetForm();
          fetchAppointmentDetails(); // Refresh appointment data to show new radiology test
        } else {
          throw new Error(
            response.message || "Failed to request radiology test"
          );
        }
      } catch (err) {
        console.error("Request radiology test error:", err);
        toast.error(err.message || "Could not request radiology test.");
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  // Prescription handling functions for medical record form
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

  if (isLoading) return <LoadingSpinner />;

  if (error)
    return <div className="text-center text-danger-600 py-4">{error}</div>;

  if (!appointment)
    return (
      <div className="text-center text-gray-500 py-4">
        Appointment not found.
      </div>
    );

  const handleComplete = async () => {
    try {
      setIsSubmitting(true);
      const response = await doctorService.completeAppointment(id, {
        notes: notes,
      });
      if (response.success) {
        toast.success("Appointment completed successfully");
        fetchAppointmentDetails();
      }
    } catch (err) {
      console.error("Complete appointment error:", err);
      toast.error(err.message || "Failed to complete appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    try {
      const reason = window.prompt("Please provide a reason for cancellation:");
      if (!reason) return;

      setIsSubmitting(true);
      const response = await doctorService.cancelDoctorAppointment(id, {
        reason,
      });
      if (response.success) {
        toast.success("Appointment cancelled successfully");
        navigate("/doctor/appointments");
      }
    } catch (err) {
      console.error("Cancel appointment error:", err);
      toast.error(err.message || "Failed to cancel appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openModal = (type) => setModalType(type);

  const closeModal = () => {
    setModalType(null);
    recordFormik.resetForm();
    labTestFormik.resetForm();
    radiologyTestFormik.resetForm();
  };

  const toggleMedicalRecords = () => {
    setViewMedicalRecords(!viewMedicalRecords);
  };

  return (
    <div className="space-y-6">
      {/* Header with title and completion/cancel buttons */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">
          Appointment Details
        </h1>

        {/* Conditionally render Complete/Cancel buttons */}
        {appointment &&
          appointment.status !== "completed" &&
          appointment.status !== "cancelled" && (
            <div className="flex space-x-2">
              <Button
                variant="primary"
                onClick={handleComplete}
                disabled={isSubmitting || !canComplete} // Disable based on status
                title={
                  !canComplete
                    ? `Cannot complete a ${appointment.status} appointment`
                    : "Mark as completed"
                }
              >
                Complete Appointment
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel} // Doctor's cancel logic might differ (e.g., reason required)
                disabled={isSubmitting}
              >
                Cancel Appointment
              </Button>
            </div>
          )}
      </div>

      {/* Action buttons row */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={viewMedicalRecords ? "primary" : "outline"}
          onClick={toggleMedicalRecords}
          leftIcon={<DocumentTextIcon className="h-5 w-5" />}
        >
          {viewMedicalRecords ? "Hide Medical Records" : "View Medical Records"}
        </Button>
        <Button
          variant="outline"
          onClick={() => openModal("record")}
          leftIcon={<DocumentTextIcon className="h-5 w-5" />}
        >
          Create Medical Record
        </Button>
        <Button
          variant="outline"
          onClick={() => openModal("lab")}
          leftIcon={<BeakerIcon className="h-5 w-5" />}
        >
          Request Lab Test
        </Button>
        <Button
          variant="outline"
          onClick={() => openModal("radiology")}
          leftIcon={<ViewfinderCircleIcon className="h-5 w-5" />}
        >
          Request Radiology
        </Button>
      </div>

      {/* Display appointment details */}
      <div className="bg-white rounded shadow p-4">
        <h2 className="text-xl font-medium mb-4">Patient Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">
              Name:{" "}
              <span className="font-medium text-gray-800">
                {appointment.patientId?.userId?.name}
              </span>
            </p>
            <p className="text-gray-600">
              Email:{" "}
              <span className="font-medium text-gray-800">
                {appointment.patientId?.userId?.email}
              </span>
            </p>
            {appointment.patientId?.userId?.phone && (
              <p className="text-gray-600">
                Phone:{" "}
                <span className="font-medium text-gray-800">
                  {appointment.patientId?.userId?.phone}
                </span>
              </p>
            )}
          </div>
          <div>
            <p className="text-gray-600">
              Date & Time:{" "}
              <span className="font-medium text-gray-800">
                {new Date(appointment.dateTime).toLocaleString()}
              </span>
            </p>
            <p className="text-gray-600">
              Status:{" "}
              <span className="font-medium text-gray-800">
                {appointment.status}
              </span>
            </p>
            <p className="text-gray-600">
              Type:{" "}
              <span className="font-medium text-gray-800">
                {appointment.type || "Regular"}
              </span>
            </p>
            <p className="text-gray-600">
              Payment Status:{" "}
              <span
                className={`font-medium badge ${getStatusBadgeClass(
                  appointment.payment?.status
                )}`}
              >
                {getDisplayStatus(appointment.payment?.status || "N/A")}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Appointment Reason & Notes */}
      <div className="bg-white rounded shadow p-4">
        <h2 className="text-xl font-medium mb-4">Appointment Details</h2>
        {appointment.reason && (
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Reason</h3>
            <p className="text-gray-800">{appointment.reason}</p>
          </div>
        )}
        {appointment.notes && (
          <div>
            <h3 className="text-lg font-medium mb-2">Notes</h3>
            <p className="text-gray-800">{appointment.notes}</p>
          </div>
        )}
      </div>

      {/* Medical Records Section - shown when toggle is clicked */}
      {viewMedicalRecords && (
        <div className="space-y-4">
          <h2 className="text-xl font-medium">Patient Medical Records</h2>
          {medicalRecordsLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="space-y-4">
              {/* Medical Records Tab */}
              <div className="bg-white rounded shadow p-4">
                <h3 className="text-lg font-medium mb-4">Medical Records</h3>
                {medicalRecords?.records?.length > 0 ? (
                  <div className="space-y-4">
                    {medicalRecords.records.map((record) => (
                      <div key={record._id} className="border-b pb-4">
                        <div className="flex justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900 capitalize">
                              {record.type}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {new Date(record.date).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-sm text-gray-500">
                            By: Dr. {record.doctorId?.userId?.name}
                          </p>
                        </div>
                        {record.diagnosis && (
                          <p className="mt-2 text-gray-700">
                            <span className="font-medium">Diagnosis:</span>{" "}
                            {record.diagnosis}
                          </p>
                        )}
                        {record.symptoms?.length > 0 && (
                          <p className="mt-1 text-gray-700">
                            <span className="font-medium">Symptoms:</span>{" "}
                            {record.symptoms.join(", ")}
                          </p>
                        )}
                        {record.prescriptions?.length > 0 && (
                          <div className="mt-2">
                            <p className="font-medium">Prescriptions:</p>
                            <ul className="text-sm text-gray-700 ml-4 list-disc">
                              {record.prescriptions.map((p, idx) => (
                                <li key={idx}>
                                  {p.medicine} - {p.dosage}, {p.frequency} for{" "}
                                  {p.duration}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No medical records found.</p>
                )}
              </div>

              {/* Lab Tests Tab */}
              <div className="bg-white rounded shadow p-4">
                <h3 className="text-lg font-medium mb-4">Lab Tests</h3>
                {medicalRecords?.labTests?.length > 0 ? (
                  <div className="space-y-4">
                    {medicalRecords.labTests.map((test) => (
                      <div key={test._id} className="border-b pb-4">
                        <div className="flex justify-between">
                          <h4 className="font-medium text-gray-900">
                            {test.testName} ({test.testType})
                          </h4>
                          <span
                            className={`badge ${
                              test.status === "completed"
                                ? "badge-success"
                                : test.status === "cancelled"
                                ? "badge-danger"
                                : "badge-warning"
                            }`}
                          >
                            {test.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          Requested:{" "}
                          {new Date(test.requestDate).toLocaleDateString()}
                        </p>
                        {test.resultId && (
                          <div className="mt-2">
                            <p className="font-medium">Results:</p>
                            <p className="text-sm">{test.resultId.summary}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No lab tests found.</p>
                )}
              </div>

              {/* Radiology Tests Tab */}
              <div className="bg-white rounded shadow p-4">
                <h3 className="text-lg font-medium mb-4">Radiology Tests</h3>
                {medicalRecords?.radiologyTests?.length > 0 ? (
                  <div className="space-y-4">
                    {medicalRecords.radiologyTests.map((test) => (
                      <div key={test._id} className="border-b pb-4">
                        <div className="flex justify-between">
                          <h4 className="font-medium text-gray-900">
                            {test.procedureType} - {test.bodyPart}
                          </h4>
                          <span
                            className={`badge ${
                              test.status === "completed"
                                ? "badge-success"
                                : test.status === "cancelled"
                                ? "badge-danger"
                                : "badge-warning"
                            }`}
                          >
                            {test.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          Requested:{" "}
                          {new Date(test.requestDate).toLocaleDateString()}
                        </p>
                        {test.findings && (
                          <div className="mt-2">
                            <p className="font-medium">Findings:</p>
                            <p className="text-sm">{test.findings}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No radiology tests found.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Patient Medical History */}
      {patientData && !viewMedicalRecords && (
        <>
          {/* Display Medical Records */}
          {patientData.medicalRecords &&
            patientData.medicalRecords.length > 0 && (
              <div className="bg-white rounded shadow p-4">
                <h2 className="text-xl font-medium mb-4">Medical Records</h2>
                {patientData.medicalRecords.map((record) => (
                  <div key={record._id} className="mb-4 pb-4 border-b">
                    <p className="font-medium">
                      {new Date(record.date).toLocaleDateString()}
                    </p>
                    <p className="text-gray-600">{record.diagnosis}</p>
                  </div>
                ))}
              </div>
            )}

          {/* Display Lab Tests */}
          {patientData.labTests && patientData.labTests.length > 0 && (
            <div className="bg-white rounded shadow p-4">
              <h2 className="text-xl font-medium mb-4">Lab Tests</h2>
              {patientData.labTests.map((test) => (
                <div key={test._id} className="mb-4 pb-4 border-b">
                  <p className="font-medium">{test.testName}</p>
                  <p className="text-gray-600">Status: {test.status}</p>
                  <p className="text-gray-600">
                    Requested: {new Date(test.requestDate).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Display Radiology Tests */}
          {patientData.radiologyTests &&
            patientData.radiologyTests.length > 0 && (
              <div className="bg-white rounded shadow p-4">
                <h2 className="text-xl font-medium mb-4">Radiology Tests</h2>
                {patientData.radiologyTests.map((test) => (
                  <div key={test._id} className="mb-4 pb-4 border-b">
                    <p className="font-medium">
                      {test.procedureType} - {test.bodyPart}
                    </p>
                    <p className="text-gray-600">Status: {test.status}</p>
                    <p className="text-gray-600">
                      Requested:{" "}
                      {new Date(test.requestDate).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
        </>
      )}

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
              isLoading={isSubmitting}
              disabled={isSubmitting || !recordFormik.isValid}
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
              isLoading={isSubmitting}
              disabled={isSubmitting || !labTestFormik.isValid}
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
              isLoading={isSubmitting}
              disabled={isSubmitting || !radiologyTestFormik.isValid}
            >
              Request Test
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AppointmentDetailPage;
