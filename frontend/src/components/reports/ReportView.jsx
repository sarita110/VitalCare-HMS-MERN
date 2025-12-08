// src/components/reports/ReportView.jsx
import React from "react";
import Chart from "../common/Chart"; // Import the Chart component
import Table from "../common/Table"; // Import the Table component
import Card from "../common/Card";
import LoadingSpinner from "../common/LoadingSpinner";
import { formatCurrency } from "../../utils/helpers"; // Import formatting helper

const ReportView = ({ reportData, isLoading, error }) => {
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <p className="text-danger-600">Error loading report data: {error}</p>
    );
  }

  if (!reportData || !reportData.data) {
    return <p className="text-gray-500">No report data available.</p>;
  }

  const { type, period, dateRange, data } = reportData;

  // --- Render logic based on report type ---

  // Example: Financial Report View
  const renderFinancialReport = () => {
    const {
      totalRevenue,
      revenueByMethod,
      revenueByService,
      revenueByDate,
      details = [],
    } = data.revenueData || data; // Adjust based on actual data structure

    const paymentMethodData = {
      labels: Object.keys(revenueByMethod || {}),
      datasets: [
        {
          label: "Revenue by Payment Method",
          data: Object.values(revenueByMethod || {}),
          backgroundColor: [
            "#8b5cf6",
            "#10b981",
            "#f59e0b",
            "#ef4444",
            "#3b82f6",
          ], // Example colors
        },
      ],
    };

    const serviceRevenueData = {
      labels: Object.keys(revenueByService || {}),
      datasets: [
        {
          label: "Revenue by Service",
          data: Object.values(revenueByService || {}),
          backgroundColor: [
            "#6d28d9",
            "#059669",
            "#d97706",
            "#b91c1c",
            "#0ea5e9",
          ],
        },
      ],
    };

    const revenueTrendData = {
      labels: Object.keys(revenueByDate || {}).sort(), // Sort dates
      datasets: [
        {
          label: "Revenue Trend",
          data: Object.keys(revenueByDate || {})
            .sort()
            .map((date) => revenueByDate[date]),
          fill: true,
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
          backgroundColor: "rgba(75, 192, 192, 0.2)",
        },
      ],
    };

    const paymentColumns = [
      {
        Header: "Date",
        accessor: "date",
        Cell: ({ value }) => new Date(value).toLocaleDateString(),
      },
      {
        Header: "Amount",
        accessor: "amount",
        Cell: ({ value }) => formatCurrency(value),
      },
      { Header: "Method", accessor: "method" },
      { Header: "Status", accessor: "status" },
      { Header: "Service Type", accessor: "serviceType" },
    ];

    return (
      <div className="space-y-6">
        <Card title="Revenue Summary">
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(totalRevenue)}
          </p>
          <p className="text-sm text-gray-500">Total revenue for the period</p>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Revenue by Payment Method">
            <Chart type="pie" data={paymentMethodData} />
          </Card>
          <Card title="Revenue by Service Type">
            <Chart type="doughnut" data={serviceRevenueData} />
          </Card>
        </div>
        <Card title="Revenue Trend">
          <Chart type="line" data={revenueTrendData} />
        </Card>
        <Card title="Payment Details">
          <Table columns={paymentColumns} data={details} />
        </Card>
      </div>
    );
  };

  // Example: Appointments Report View
  const renderAppointmentsReport = () => {
    const { total, byStatus, byDate, byDoctor, details = [] } = data;

    const statusData = {
      labels: Object.keys(byStatus || {}),
      datasets: [
        {
          label: "Appointments by Status",
          data: Object.values(byStatus || {}),
          backgroundColor: [
            "#10b981",
            "#dc2626",
            "#f59e0b",
            "#0ea5e9",
            "#6d28d9",
          ], // Success, Danger, Warning, Info, Secondary
        },
      ],
    };

    const trendData = {
      labels: Object.keys(byDate || {}).sort(), // Sort dates
      datasets: [
        {
          label: "Appointments per Day",
          data: Object.keys(byDate || {})
            .sort()
            .map((date) => byDate[date]),
          borderColor: "#8b5cf6",
          tension: 0.1,
        },
      ],
    };

    const apptColumns = [
      {
        Header: "Date",
        accessor: "dateTime",
        Cell: ({ value }) => new Date(value).toLocaleString(),
      },
      { Header: "Patient", accessor: "patientName" },
      { Header: "Doctor", accessor: "doctorName" },
      { Header: "Status", accessor: "status" },
      { Header: "Type", accessor: "type" },
    ];

    return (
      <div className="space-y-6">
        <Card title="Appointments Summary">
          <p className="text-3xl font-bold text-gray-900">{total}</p>
          <p className="text-sm text-gray-500">
            Total appointments for the period
          </p>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Appointments by Status">
            <Chart type="bar" data={statusData} options={{ indexAxis: "y" }} />
          </Card>
          <Card title="Appointments Trend">
            <Chart type="line" data={trendData} />
          </Card>
        </div>
        {/* Add chart/table for appointments by doctor if desired */}
        <Card title="Appointment Details">
          <Table columns={apptColumns} data={details} />
        </Card>
      </div>
    );
  };

  // Add render functions for other report types (patients, doctors, hospital, system)
  // ...

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2 capitalize">{type} Report</h2>
      <p className="text-sm text-gray-600 mb-4">
        Period: {new Date(dateRange.startDate).toLocaleDateString()} -{" "}
        {new Date(dateRange.endDate).toLocaleDateString()}
      </p>
      {/* Render the specific report view based on type */}
      {type === "financial" && renderFinancialReport()}
      {type === "appointments" && renderAppointmentsReport()}
      {/* Add other report types */}
      {type === "hospital" && (
        <p>Hospital Performance Report View (Implementation needed)</p>
      )}
      {type === "system" && <p>System Report View (Implementation needed)</p>}
      {/* Add default or error message */}
      {!["financial", "appointments", "hospital", "system"].includes(type) && (
        <p>Report type view not implemented yet.</p>
      )}
    </div>
  );
};

export default ReportView;
