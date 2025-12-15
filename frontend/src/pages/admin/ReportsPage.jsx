// src/pages/admin/ReportsPage.jsx
import React, { useState } from "react";
import ReportGenerator from "../../components/reports/ReportGenerator";
import ReportView from "../../components/reports/ReportView";
import adminService from "../../services/adminService";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import toast from "react-hot-toast";

const ReportsPage = () => {
  const [reportData, setReportData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState(null);

  // Define report types available for Admin
  const adminReportTypes = [
    { value: "APPOINTMENT_SUMMARY", label: "Appointment Summary" },
    { value: "APPOINTMENT_DETAIL", label: "Appointment Detail List" },
    { value: "FINANCIAL_SUMMARY", label: "Financial Summary" },
    { value: "PATIENT_DEMOGRAPHICS", label: "Patient Demographics" },
    { value: "DOCTOR_PERFORMANCE", label: "Doctor Performance" },
  ];

  // Function to fetch data for the ReportView component
  const handleFetchReportData = async (params) => {
    setIsLoadingData(true);
    setDataError(null);
    setReportData(null); // Clear previous data
    try {
      const response = await adminService.getAdminReportsData(params);
      if (response.success && response.reportData) {
        setReportData(response.reportData);
      } else {
        throw new Error(response.message || "Failed to fetch report data");
      }
    } catch (err) {
      console.error("Fetch report data error:", err);
      setDataError(err.message || "Could not load report data.");
      toast.error(err.message || "Could not load report data.");
    } finally {
      setIsLoadingData(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Reports</h1>
      {/* Pass the allowed report types to the generator */}
      <ReportGenerator allowedReportTypes={adminReportTypes} />{" "}
      {/* <--- CORRECTED USAGE */}
      <Card title="View Report Data">
        <p className="text-sm text-gray-600 mb-4">
          Select parameters to view report data for dashboard charts.
        </p>
        <div className="flex space-x-2 mb-4">
          <Button
            variant="outline"
            onClick={() =>
              handleFetchReportData({
                reportType: "financial",
                period: "month",
              })
            }
          >
            View Monthly Financial Data
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              handleFetchReportData({
                reportType: "appointments",
                period: "week",
              })
            }
          >
            View Weekly Appointments Data
          </Button>
        </div>
        <div className="mt-4 border-t pt-4">
          <ReportView
            reportData={reportData}
            isLoading={isLoadingData}
            error={dataError}
          />
        </div>
      </Card>
    </div>
  );
};

export default ReportsPage;
