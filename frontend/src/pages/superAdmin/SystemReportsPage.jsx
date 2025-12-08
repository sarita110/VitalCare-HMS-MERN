// src/pages/superAdmin/SystemReportsPage.jsx
import React from "react";
import ReportGenerator from "../../components/reports/ReportGenerator"; // Reuse the generator
import Card from "../../components/common/Card";
import { ROLES } from "../../constants";

// Define the report types available specifically for Super Admins
const superAdminReportTypes = [
  { value: "SYSTEM_OVERVIEW", label: "System Overview" },
  { value: "HOSPITAL_ACTIVITY_SUMMARY", label: "Hospital Activity Summary" },
  { value: "USER_LIST", label: "User List Export" },
  // Add more system-wide report types here as needed
];

const SystemReportsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">System Reports</h1>

      <Card title="Generate System Report">
        <p className="text-sm text-gray-600 mb-4">
          Select the type of system-wide report you want to generate and the
          desired format. You can optionally specify a date range.
        </p>
        {/* Pass the allowed report types to the generator */}
        <ReportGenerator allowedReportTypes={superAdminReportTypes} />{" "}
        {/* <--- CORRECTED USAGE */}
      </Card>
    </div>
  );
};

export default SystemReportsPage;
