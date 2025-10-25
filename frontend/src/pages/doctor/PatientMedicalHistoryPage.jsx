// src/pages/doctor/PatientMedicalHistoryPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import doctorService from "../../services/doctorService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Card from "../../components/common/Card";
import Avatar from "../../components/common/Avatar";
import Button from "../../components/common/Button";
import { formatDate, formatDateTime } from "../../utils/helpers";
import {
  UserIcon,
  ArrowLeftIcon,
  DocumentTextIcon,
  BeakerIcon,
  ViewfinderCircleIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

const PatientMedicalHistoryPage = () => {
  const { id: patientId } = useParams();
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("records");

  const fetchMedicalHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await doctorService.getPatientMedicalHistoryForDoctor(patientId);
      if (response.success) {
        setMedicalHistory(response.medicalHistory);
        // Also fetch patient details
        const patientResponse = await doctorService.getDoctorPatientDetails(patientId);
        if (patientResponse.success) {
          setPatient(patientResponse.patient);
        }
      } else {
        throw new Error(response.message || "Failed to fetch medical history");
      }
    } catch (err) {
      console.error("Fetch medical history error:", err);
      setError(err.message || "Could not load medical history.");
      toast.error(err.message || "Could not load medical history.");
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchMedicalHistory();
  }, [fetchMedicalHistory]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-center text-danger-600 py-4">{error}</div>;
  }

  if (!medicalHistory || !patient) {
    return (
      <div className="text-center text-gray-500 py-4">
        Medical history not found.
      </div>
    );
  }

  const tabs = [
    { id: "records", label: "Medical Records", icon: DocumentTextIcon },
    { id: "lab", label: "Lab Tests", icon: BeakerIcon },
    { id: "radiology", label: "Radiology", icon: ViewfinderCircleIcon },
    { id: "prescriptions", label: "Prescriptions", icon: ClipboardDocumentListIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center space-x-4">
        <Link to="/doctor/patients">
          <Button variant="outline" size="sm">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Patients
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-gray-800">
          Medical History
        </h1>
      </div>

      {/* Patient Summary Card */}
      <Card>
        <div className="flex items-center space-x-4">
          <Avatar
            src={patient.userId?.image}
            alt={patient.userId?.name}
            size="lg"
          />
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {patient.userId?.name || "N/A"}
            </h2>
            <p className="text-sm text-gray-600">
              {patient.userId?.email || "N/A"}
            </p>
            <p className="text-sm text-gray-600">
              Patient ID: {patient.patientNumber}
            </p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-1 py-4 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content based on active tab */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === "records" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Medical Records</h3>
            {medicalHistory.records.length > 0 ? (
              <div className="space-y-4">
                {medicalHistory.records.map((record) => (
                  <Card key={record._id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900 capitalize">
                          {record.type} Record
                        </h4>
                        <p className="text-sm text-gray-500">
                          {formatDate(record.date)}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">
                        By Dr. {record.doctorId?.userId?.name}
                      </div>
                    </div>
                    {record.diagnosis && (
                      <p className="mt-2 text-gray-700">
                        <span className="font-medium">Diagnosis:</span>{" "}
                        {record.diagnosis}
                      </p>
                    )}
                    {record.symptoms?.length > 0 && (
                      <p className="mt-2 text-gray-700">
                        <span className="font-medium">Symptoms:</span>{" "}
                        {record.symptoms.join(", ")}
                      </p>
                    )}
                    {record.treatment && (
                      <p className="mt-2 text-gray-700">
                        <span className="font-medium">Treatment:</span>{" "}
                        {record.treatment}
                      </p>
                    )}
                    {record.notes && (
                      <p className="mt-2 text-gray-700">
                        <span className="font-medium">Notes:</span>{" "}
                        {record.notes}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No medical records found.</p>
            )}
          </div>
        )}

        {activeTab === "lab" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Lab Tests</h3>
            {medicalHistory.labTests.length > 0 ? (
              <div className="space-y-4">
                {medicalHistory.labTests.map((test) => (
                  <Card key={test._id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {test.testName}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {formatDate(test.requestDate)}
                        </p>
                      </div>
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
                    {test.resultId && (
                      <div className="mt-4">
                        <p className="font-medium">Results:</p>
                        <p>{test.resultId.summary}</p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No lab tests found.</p>
            )}
          </div>
        )}

        {activeTab === "radiology" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Radiology Tests</h3>
            {medicalHistory.radiologyTests.length > 0 ? (
              <div className="space-y-4">
                {medicalHistory.radiologyTests.map((test) => (
                  <Card key={test._id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {test.procedureType} - {test.bodyPart}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {formatDate(test.requestDate)}
                        </p>
                      </div>
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
                    {test.findings && (
                      <div className="mt-4">
                        <p className="font-medium">Findings:</p>
                        <p>{test.findings}</p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No radiology tests found.</p>
            )}
          </div>
        )}

        {activeTab === "prescriptions" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Prescriptions</h3>
            {medicalHistory.prescriptions.length > 0 ? (
              <div className="space-y-4">
                {medicalHistory.prescriptions.map((record) => (
                  <Card key={record._id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          Prescription
                        </h4>
                        <p className="text-sm text-gray-500">
                          {formatDate(record.date)}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">
                        By Dr. {record.doctorId?.userId?.name}
                      </div>
                    </div>
                    <div className="mt-4">
                      {record.prescriptions.map((prescription, index) => (
                        <div key={index} className="border-t pt-2 mt-2">
                          <p className="font-medium">{prescription.medicine}</p>
                          <p className="text-sm text-gray-600">
                            {prescription.dosage} - {prescription.frequency} for{" "}
                            {prescription.duration}
                          </p>
                          {prescription.instructions && (
                            <p className="text-sm text-gray-500">
                              Instructions: {prescription.instructions}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No prescriptions found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientMedicalHistoryPage;