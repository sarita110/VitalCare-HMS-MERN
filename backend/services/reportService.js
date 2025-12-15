// services/reportService.js
import mongoose from "mongoose";
import Appointment from "../models/Appointment.js";
import Payment from "../models/Payment.js";
import Doctor from "../models/Doctor.js";
import User from "../models/User.js";
import Patient from "../models/Patient.js";
import Hospital from "../models/Hospital.js";
import Department from "../models/Department.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";
// Assuming helpers are in ../utils/helpers.js and export these functions
import {
  calculateAge,
  formatDate,
  formatDateTime,
  formatCurrency,
  getDisplayStatus,
} from "../utils/helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Define the base directory for reports relative to this file's location
const reportsBaseDir = path.join(__dirname, "..", "uploads", "reports");

// --- Data Aggregation Functions ---

// Helper to get date range, defaults to last 30 days if start/end not provided
const getDateRange = (options = {}) => {
  const endDate = options.endDate ? new Date(options.endDate) : new Date();
  let startDate;
  if (options.startDate) {
    startDate = new Date(options.startDate);
  } else {
    // Default to 30 days ago from endDate
    startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 30);
  }
  // Ensure start time is beginning of the day and end time is end of the day
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  return { startDate, endDate };
};

// --- Admin Report Data Fetchers ---

/**
 * Fetches data for Appointment Summary Report (Admin)
 * @param {string} hospitalId - ID of the hospital
 * @param {object} options - Filter options (startDate, endDate)
 * @returns {Promise<object>} Aggregated appointment data
 */
async function getAppointmentSummaryData(hospitalId, options) {
  const { startDate, endDate } = getDateRange(options);
  const query = { hospitalId, dateTime: { $gte: startDate, $lte: endDate } };

  const appointments = await Appointment.find(query)
    .populate({
      path: "doctorId",
      populate: { path: "userId", select: "name" },
    })
    .lean();

  const total = appointments.length;
  const statusCounts = appointments.reduce((acc, appt) => {
    acc[appt.status] = (acc[appt.status] || 0) + 1;
    return acc;
  }, {});

  const appointmentsByDoctor = appointments.reduce((acc, appt) => {
    const doctorName = appt.doctorId?.userId?.name || "Unassigned";
    acc[doctorName] = (acc[doctorName] || 0) + 1;
    return acc;
  }, {});

  return {
    totalAppointments: total,
    appointmentsByStatus: statusCounts,
    appointmentsByDoctor,
    dateRange: { startDate, endDate },
  };
}

/**
 * Fetches data for Appointment Detail Report (Admin)
 * @param {string} hospitalId - ID of the hospital
 * @param {object} options - Filter options (startDate, endDate, doctorId, status)
 * @returns {Promise<object>} Detailed appointment list
 */
async function getAppointmentDetailData(hospitalId, options) {
  const { startDate, endDate, doctorId, status } = options;
  const { startDate: rangeStart, endDate: rangeEnd } = getDateRange({
    startDate,
    endDate,
  });

  const query = { hospitalId, dateTime: { $gte: rangeStart, $lte: rangeEnd } };
  if (doctorId) query.doctorId = doctorId;
  if (status) query.status = status;

  const appointments = await Appointment.find(query)
    .populate({
      path: "patientId",
      populate: { path: "userId", select: "name email" },
    })
    .populate({
      path: "doctorId",
      populate: { path: "userId", select: "name" },
    })
    .sort({ dateTime: 1 }) // Sort chronologically
    .lean();

  return {
    appointments,
    filters: options, // Include filters used in the report data
    dateRange: { startDate: rangeStart, endDate: rangeEnd },
  };
}

/**
 * Fetches data for Financial Summary Report (Admin)
 * @param {string} hospitalId - ID of the hospital
 * @param {object} options - Filter options (startDate, endDate)
 * @returns {Promise<object>} Aggregated financial data
 */
async function getFinancialSummaryData(hospitalId, options) {
  const { startDate, endDate } = getDateRange(options);
  // Query for completed payments within the date range based on paymentDate
  const query = {
    hospitalId,
    status: "completed",
    paymentDate: { $gte: startDate, $lte: endDate },
  };

  const payments = await Payment.find(query).lean();

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

  const revenueByMethod = payments.reduce((acc, p) => {
    acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + p.amount;
    return acc;
  }, {});

  const revenueByService = payments.reduce((acc, p) => {
    acc[p.relatedTo] = (acc[p.relatedTo] || 0) + p.amount;
    return acc;
  }, {});

  const revenueByDate = payments.reduce((acc, p) => {
    const dateStr = formatDate(p.paymentDate, "yyyy-MM-dd"); // Use helper
    acc[dateStr] = (acc[dateStr] || 0) + p.amount;
    return acc;
  }, {});

  return {
    totalRevenue,
    totalPayments: payments.length,
    revenueByMethod,
    revenueByService,
    revenueByDate,
    dateRange: { startDate, endDate },
    details: payments, // Include details for potential table in report
  };
}

/**
 * Fetches data for Patient Demographics Report (Admin)
 * @param {string} hospitalId - ID of the hospital
 * @param {object} options - Filter options (startDate, endDate for registration date)
 * @returns {Promise<object>} Aggregated patient demographic data
 */
async function getPatientDemographicsData(hospitalId, options) {
  const { startDate, endDate } = getDateRange(options);
  const query = {
    hospitalId,
    registrationDate: { $gte: startDate, $lte: endDate },
  };

  const patients = await Patient.find(query).populate("userId", "name").lean(); // Populate name for details table

  const totalPatients = patients.length;
  const genderDistribution = patients.reduce((acc, p) => {
    const gender = p.gender || "Unknown";
    acc[gender] = (acc[gender] || 0) + 1;
    return acc;
  }, {});

  const ageDistribution = patients.reduce((acc, p) => {
    const age = calculateAge(p.dob);
    let group = "Unknown";
    if (age !== null) {
      if (age <= 18) group = "0-18";
      else if (age <= 35) group = "19-35";
      else if (age <= 50) group = "36-50";
      else if (age <= 65) group = "51-65";
      else group = "65+";
    }
    acc[group] = (acc[group] || 0) + 1;
    return acc;
  }, {});

  return {
    totalPatients,
    genderDistribution,
    ageDistribution,
    dateRange: { startDate, endDate },
    details: patients.map((p) => ({
      // Prepare details for table
      name: p.userId?.name || "N/A",
      gender: p.gender,
      dob: formatDate(p.dob),
      age: calculateAge(p.dob),
      registrationDate: formatDate(p.registrationDate),
    })),
  };
}

/**
 * Fetches data for Doctor Performance Report (Admin)
 * @param {string} hospitalId - ID of the hospital
 * @param {object} options - Filter options (startDate, endDate)
 * @returns {Promise<object>} Doctor performance data
 */
async function getDoctorPerformanceData(hospitalId, options) {
  const { startDate, endDate } = getDateRange(options);

  // Find doctor profiles linked to users in the specified hospital
  const doctors = await Doctor.find({
    userId: {
      $in: await User.find({
        hospital: hospitalId,
        role: "doctor",
        isActive: true,
      }).distinct("_id"),
    },
  })
    .populate("userId", "name")
    .lean();

  const performanceData = await Promise.all(
    doctors.map(async (doctor) => {
      // Find appointments for this doctor in the date range
      const apptQuery = {
        doctorId: doctor._id,
        dateTime: { $gte: startDate, $lte: endDate },
      };
      const appointments = await Appointment.find(apptQuery).lean();

      const completedAppointments = appointments.filter(
        (a) => a.status === "completed"
      ).length;
      const totalAppointments = appointments.length;

      // Find completed payments linked to this doctor's completed appointments in the date range
      const completedAppointmentIds = appointments
        .filter((a) => a.status === "completed")
        .map((a) => a._id);

      const paymentQuery = {
        hospitalId,
        relatedTo: "appointment",
        relatedId: { $in: completedAppointmentIds },
        status: "completed",
        paymentDate: { $gte: startDate, $lte: endDate }, // Filter payments by date as well
      };
      const payments = await Payment.find(paymentQuery).lean();
      const revenue = payments.reduce((sum, p) => sum + p.amount, 0);

      return {
        doctorId: doctor._id,
        doctorName: doctor.userId?.name || "N/A", // Handle potential missing user
        totalAppointments,
        completedAppointments,
        revenue,
        completionRate:
          totalAppointments > 0
            ? (completedAppointments / totalAppointments) * 100
            : 0,
      };
    })
  );

  return {
    performanceData,
    dateRange: { startDate, endDate },
  };
}

// --- SuperAdmin Report Data Fetchers ---

/**
 * Fetches data for System Overview Report (SuperAdmin)
 * @returns {Promise<object>} System overview statistics
 */
async function getSystemOverviewData() {
  const totalHospitals = await Hospital.countDocuments();
  const activeHospitals = await Hospital.countDocuments({ isActive: true });
  const usersByRole = await User.aggregate([
    { $group: { _id: "$role", count: { $sum: 1 } } },
  ]);
  const roleCounts = usersByRole.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
  const totalUsers = await User.countDocuments();

  return {
    totalHospitals,
    activeHospitals,
    inactiveHospitals: totalHospitals - activeHospitals,
    totalUsers,
    usersByRole: roleCounts,
  };
}

/**
 * Fetches data for Hospital Activity Summary Report (SuperAdmin)
 * @param {object} options - Filter options (startDate, endDate)
 * @returns {Promise<object>} Summary statistics per hospital
 */
async function getHospitalActivitySummaryData(options) {
  const { startDate, endDate } = getDateRange(options);
  const hospitals = await Hospital.find({ isActive: true })
    .select("_id name")
    .lean();

  const summary = await Promise.all(
    hospitals.map(async (hospital) => {
      const apptQuery = {
        hospitalId: hospital._id,
        dateTime: { $gte: startDate, $lte: endDate },
      };
      const paymentQuery = {
        hospitalId: hospital._id,
        status: "completed",
        paymentDate: { $gte: startDate, $lte: endDate },
      };
      const patientQuery = {
        hospitalId: hospital._id,
        registrationDate: { $gte: startDate, $lte: endDate },
      };

      const [apptCount, paymentResult, patientCount] = await Promise.all([
        Appointment.countDocuments(apptQuery),
        Payment.aggregate([
          { $match: paymentQuery },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Patient.countDocuments(patientQuery),
      ]);

      return {
        hospitalId: hospital._id,
        hospitalName: hospital.name,
        totalAppointments: apptCount,
        totalRevenue: paymentResult[0]?.total || 0,
        newPatients: patientCount,
      };
    })
  );

  return {
    summary,
    dateRange: { startDate, endDate },
  };
}

/**
 * Fetches data for User List Report (SuperAdmin)
 * @param {object} options - Filter options (role, hospitalId, status)
 * @returns {Promise<object>} List of users matching filters
 */
async function getUserListData(options) {
  const { role, hospitalId, status } = options;
  const query = {};
  if (role) query.role = role;
  if (hospitalId) query.hospital = hospitalId;
  if (status) query.isActive = status === "active";

  const users = await User.find(query)
    .populate("hospital", "name")
    .populate("department", "name")
    .select("name email role hospital department isActive isVerified createdAt")
    .sort({ createdAt: -1 }) // Example sort
    .lean();

  return { users }; // Return the array directly under 'users' key
}

// --- Report Generation (PDF/Excel) ---

// Helper function to add a table to PDF (Improved)
function addTableToPDF(doc, tableData, columnConfig, startY) {
  let tableTop = startY || doc.y;
  const startX = doc.page.margins.left;
  const usableWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columnWidths = columnConfig.map((c) => c.width * usableWidth);
  const rowHeight = 18; // Base row height
  const headerBgColor = "#E5E7EB"; // gray-200
  const borderColor = "#D1D5DB"; // gray-300
  const headerTextColor = "#1F2937"; // gray-800
  const rowTextColor = "#374151"; // gray-700
  const cellPadding = 5;

  // Function to draw a row
  const drawRow = (rowData, isHeader = false) => {
    let currentY = doc.y;
    let maxRowHeight = 0;

    // Calculate max height needed for this row
    doc
      .font(isHeader ? "Helvetica-Bold" : "Helvetica")
      .fontSize(isHeader ? 8 : 7);
    columnConfig.forEach((col, i) => {
      const cellValue = String(rowData[col.accessor] ?? "-");
      const textHeight = doc.heightOfString(cellValue, {
        width: columnWidths[i] - cellPadding * 2,
      });
      maxRowHeight = Math.max(maxRowHeight, textHeight + cellPadding * 2);
    });
    maxRowHeight = Math.max(maxRowHeight, rowHeight); // Ensure minimum row height

    // Check for page break BEFORE drawing
    if (currentY + maxRowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      currentY = doc.page.margins.top; // Reset Y for new page
      doc.y = currentY; // Important: update doc.y
      // Redraw header on new page
      drawRow(
        columnConfig.reduce((acc, col) => {
          acc[col.accessor] = col.header;
          return acc;
        }, {}),
        true
      );
      currentY = doc.y; // Update Y after header redraw
    }

    let currentX = startX;
    // Draw background for header
    if (isHeader) {
      doc
        .rect(startX, currentY, usableWidth, maxRowHeight)
        .fill(headerBgColor)
        .stroke(borderColor);
    }

    // Draw cells
    doc.fillColor(isHeader ? headerTextColor : rowTextColor);
    columnConfig.forEach((col, i) => {
      const cellValue = String(rowData[col.accessor] ?? "-");
      // Draw cell border first
      if (!isHeader) {
        // Don't redraw border for header cells
        doc
          .rect(currentX, currentY, columnWidths[i], maxRowHeight)
          .stroke(borderColor);
      }
      doc.text(cellValue, currentX + cellPadding, currentY + cellPadding, {
        width: columnWidths[i] - cellPadding * 2,
        align: col.align || "left",
        ellipsis: true,
      });
      currentX += columnWidths[i];
    });
    doc.y = currentY + maxRowHeight; // Move Y position down
  };

  // Draw Header Row
  const headerRowData = columnConfig.reduce((acc, col) => {
    acc[col.accessor] = col.header;
    return acc;
  }, {});
  drawRow(headerRowData, true);

  // Draw Data Rows
  tableData.forEach((row) => {
    const rowData = columnConfig.reduce((acc, col) => {
      // Access nested data using accessor string like 'patientId.userId.name'
      const keys = col.accessor.split(".");
      let value = row;
      for (const key of keys) {
        if (value === null || typeof value === "undefined") {
          value = "-"; // Default if path is invalid or value is null/undefined
          break;
        }
        value = value[key];
        if (value === null || typeof value === "undefined") {
          // Check again after accessing key
          value = "-";
          break;
        }
      }
      acc[col.accessor] = col.format ? col.format(value) : value ?? "-"; // Apply formatting if provided, handle null/undefined
      return acc;
    }, {});
    drawRow(rowData, false);
  });
  doc.moveDown(); // Add space after table
}

// --- PDF Content Generation Helpers ---

// Modified function to add ONLY the header to the CURRENT page
function addCommonPDFHeader(doc, title, dateRange) {
  // Renamed for clarity
  const pageMargins = doc.page.margins;
  const pageWidth = doc.page.width;

  // Header Content (Draws on the current page)
  doc
    .fontSize(16)
    .font("Helvetica-Bold")
    .text("VitalCare - Confidential Report", pageMargins.left, 30, {
      // Position from top
      align: "center",
      width: pageWidth - pageMargins.left - pageMargins.right,
    });
  doc
    .fontSize(12)
    .font("Helvetica")
    .text(title.replace(/_/g, " "), { align: "center" }); // No specific y, flows naturally
  if (dateRange && dateRange.startDate && dateRange.endDate) {
    doc
      .fontSize(9)
      .text(
        `Period: ${formatDate(dateRange.startDate)} to ${formatDate(
          dateRange.endDate
        )}`,
        { align: "center" }
      );
  }
  doc
    .fontSize(8)
    .text(`Generated: ${formatDateTime(new Date())}`, { align: "center" });

  // Move down to start content below header
  doc.moveDown(2); // Adjust spacing as needed

  // Reset Y position for the main content to start below header
  // Ensure doc.y is set appropriately AFTER calling this header function
  // Generally, letting the text flow is fine, but if you need precise start:
  // doc.y = pageMargins.top + 60; // Or calculate based on header height
}

// --- NEW FUNCTION: Add Page Numbers ---
function addPageNumbersToPDF(doc) {
  const pages = doc.bufferedPageRange(); // Get range { start: 0, count: X }
  const pageCount = pages.count;
  const pageMargins = doc.page.margins;
  const pageHeight = doc.page.height;
  const pageWidth = doc.page.width;

  if (pageCount <= 0) return; // No pages to number

  doc.fontSize(8).font("Helvetica"); // Set font for page numbers

  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i); // Switch to the specific page (0-indexed)

    // Add page number at the bottom right
    doc.text(
      `Page ${i + 1} of ${pageCount}`,
      pageMargins.left, // Start from left margin
      pageHeight - pageMargins.bottom + 10, // Position near bottom
      {
        align: "right",
        width: pageWidth - pageMargins.left - pageMargins.right, // Align within margins
      }
    );
  }

  // Optionally switch back to the last page if needed for further operations before ending
  if (pageCount > 0) {
    doc.switchToPage(pageCount - 1);
  }
}

function addAppointmentSummaryPDF(doc, data) {
  doc.fontSize(14).text("Appointment Summary", { underline: true }).moveDown();
  doc
    .fontSize(10)
    .text(`Total Appointments: ${data.totalAppointments}`)
    .moveDown();

  doc.fontSize(12).text("By Status:", { underline: true }).moveDown(0.5);
  Object.entries(data.appointmentsByStatus).forEach(([key, value]) => {
    doc.fontSize(9).text(`${getDisplayStatus(key)}: ${value}`);
  });
  doc.moveDown();

  doc.fontSize(12).text("By Doctor:", { underline: true }).moveDown(0.5);
  Object.entries(data.appointmentsByDoctor).forEach(([key, value]) => {
    doc.fontSize(9).text(`${key}: ${value}`);
  });
}

function addAppointmentDetailPDF(doc, data) {
  doc
    .fontSize(14)
    .text("Detailed Appointment List", { underline: true })
    .moveDown();
  if (data.filters) {
    doc
      .fontSize(9)
      .text(
        `Filters Applied: Status=${data.filters.status || "All"}, Doctor=${
          data.filters.doctorId || "All"
        }`
      )
      .moveDown();
  }
  const columns = [
    {
      header: "Date/Time",
      accessor: "dateTime",
      width: 0.18,
      format: (d) => formatDateTime(d),
    },
    { header: "Patient", accessor: "patientId.userId.name", width: 0.17 },
    { header: "Doctor", accessor: "doctorId.userId.name", width: 0.17 },
    { header: "Reason", accessor: "reason", width: 0.28 },
    {
      header: "Status",
      accessor: "status",
      width: 0.1,
      format: getDisplayStatus,
    },
    {
      header: "Payment",
      accessor: "payment.status",
      width: 0.1,
      format: getDisplayStatus,
    },
  ];
  addTableToPDF(doc, data.appointments, columns);
}

function addFinancialSummaryPDF(doc, data) {
  doc.fontSize(14).text("Financial Summary", { underline: true }).moveDown();
  doc.fontSize(10).text(`Total Revenue: ${formatCurrency(data.totalRevenue)}`);
  doc.text(`Total Completed Payments: ${data.totalPayments}`).moveDown();

  doc
    .fontSize(12)
    .text("Revenue by Method:", { underline: true })
    .moveDown(0.5);
  Object.entries(data.revenueByMethod).forEach(([key, value]) => {
    doc.fontSize(9).text(`${getDisplayStatus(key)}: ${formatCurrency(value)}`);
  });
  doc.moveDown();

  doc
    .fontSize(12)
    .text("Revenue by Service:", { underline: true })
    .moveDown(0.5);
  Object.entries(data.revenueByService).forEach(([key, value]) => {
    doc.fontSize(9).text(`${getDisplayStatus(key)}: ${formatCurrency(value)}`);
  });
  doc.moveDown();

  doc
    .fontSize(12)
    .text("Revenue Trend (Daily):", { underline: true })
    .moveDown(0.5);
  Object.entries(data.revenueByDate)
    .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
    .forEach(([date, value]) => {
      doc.fontSize(9).text(`${formatDate(date)}: ${formatCurrency(value)}`);
    });
}

function addPatientDemographicsPDF(doc, data) {
  doc.fontSize(14).text("Patient Demographics", { underline: true }).moveDown();
  doc
    .fontSize(10)
    .text(`Total New Patients in Period: ${data.totalPatients}`)
    .moveDown();

  doc.fontSize(12).text("By Gender:", { underline: true }).moveDown(0.5);
  Object.entries(data.genderDistribution).forEach(([key, value]) => {
    doc.fontSize(9).text(`${key}: ${value}`);
  });
  doc.moveDown();

  doc.fontSize(12).text("By Age Group:", { underline: true }).moveDown(0.5);
  Object.entries(data.ageDistribution).forEach(([key, value]) => {
    doc.fontSize(9).text(`Age ${key}: ${value}`);
  });
  doc.moveDown();

  doc.fontSize(12).text("Patient List:", { underline: true }).moveDown(0.5);
  const columns = [
    { header: "Name", accessor: "name", width: 0.3 },
    { header: "Gender", accessor: "gender", width: 0.15 },
    { header: "DOB", accessor: "dob", width: 0.2 },
    { header: "Age", accessor: "age", width: 0.1 },
    { header: "Registered", accessor: "registrationDate", width: 0.25 },
  ];
  addTableToPDF(doc, data.details, columns);
}

function addDoctorPerformancePDF(doc, data) {
  doc
    .fontSize(14)
    .text("Doctor Performance Summary", { underline: true })
    .moveDown();
  const columns = [
    { header: "Doctor", accessor: "doctorName", width: 0.3 },
    {
      header: "Total Appts",
      accessor: "totalAppointments",
      width: 0.15,
      align: "right",
    },
    {
      header: "Completed",
      accessor: "completedAppointments",
      width: 0.15,
      align: "right",
    },
    {
      header: "Completion %",
      accessor: "completionRate",
      width: 0.15,
      align: "right",
      format: (v) => v.toFixed(1) + "%",
    },
    {
      header: "Revenue",
      accessor: "revenue",
      width: 0.25,
      align: "right",
      format: (v) => formatCurrency(v),
    },
  ];
  addTableToPDF(doc, data.performanceData, columns);
}

function addSystemOverviewPDF(doc, data) {
  doc.fontSize(14).text("System Overview", { underline: true }).moveDown();
  doc
    .fontSize(10)
    .text(
      `Total Hospitals: ${data.totalHospitals} (${data.activeHospitals} Active, ${data.inactiveHospitals} Inactive)`
    );
  doc.text(`Total Users: ${data.totalUsers}`).moveDown();
  doc.fontSize(12).text("Users by Role:", { underline: true }).moveDown(0.5);
  Object.entries(data.usersByRole).forEach(([key, value]) => {
    doc.fontSize(9).text(`${getDisplayStatus(key)}: ${value}`);
  });
}

function addHospitalActivitySummaryPDF(doc, data) {
  doc
    .fontSize(14)
    .text("Hospital Activity Summary", { underline: true })
    .moveDown();
  const columns = [
    { header: "Hospital", accessor: "hospitalName", width: 0.35 },
    {
      header: "Appointments",
      accessor: "totalAppointments",
      width: 0.2,
      align: "right",
    },
    {
      header: "New Patients",
      accessor: "newPatients",
      width: 0.2,
      align: "right",
    },
    {
      header: "Revenue",
      accessor: "totalRevenue",
      width: 0.25,
      align: "right",
      format: (v) => formatCurrency(v),
    },
  ];
  addTableToPDF(doc, data.summary, columns);
}

function addUserListPDF(doc, data) {
  doc.fontSize(14).text("User List", { underline: true }).moveDown();
  const columns = [
    { header: "Name", accessor: "name", width: 0.2 },
    { header: "Email", accessor: "email", width: 0.25 },
    { header: "Role", accessor: "role", width: 0.15, format: getDisplayStatus },
    { header: "Hospital", accessor: "hospital.name", width: 0.2 },
    {
      header: "Status",
      accessor: "isActive",
      width: 0.1,
      format: (v) => (v ? "Active" : "Inactive"),
    },
    {
      header: "Verified",
      accessor: "isVerified",
      width: 0.1,
      format: (v) => (v ? "Yes" : "No"),
    },
  ];
  addTableToPDF(doc, data.users, columns);
}

// --- Excel Content Generation Helpers ---

function addHeaderRow(sheet, columns) {
  sheet.columns = columns.map((col) => ({
    // Ensure key is present
    header: col.header,
    key: col.key || col.accessor.replace(".", "_"), // Use accessor as key, replace dots
    width: col.width || 20, // Default width
    style: col.style || {}, // Apply styles like numFmt
  }));
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE5E7EB" }, // Light Gray
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.border = {
    // bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } } // gray-300
  };
  sheet.views = [{ state: "frozen", ySplit: 1 }]; // Freeze header row
}

function addAppointmentDetailExcel(workbook, data) {
  const sheet = workbook.addWorksheet("Appointment Details");
  addHeaderRow(sheet, [
    { header: "Date/Time", key: "dateTime", width: 25 },
    { header: "Patient Name", key: "patientName", width: 25 },
    { header: "Patient Email", key: "patientEmail", width: 30 },
    { header: "Doctor Name", key: "doctorName", width: 25 },
    { header: "Reason", key: "reason", width: 40 },
    { header: "Type", key: "type", width: 15 },
    { header: "Status", key: "status", width: 15 },
    { header: "Payment Status", key: "paymentStatus", width: 15 },
  ]);

  data.appointments.forEach((a) => {
    sheet.addRow({
      dateTime: formatDateTime(a.dateTime),
      patientName: a.patientId?.userId?.name || "N/A",
      patientEmail: a.patientId?.userId?.email || "N/A",
      doctorName: a.doctorId?.userId?.name || "N/A",
      reason: a.reason,
      type: getDisplayStatus(a.type),
      status: getDisplayStatus(a.status),
      paymentStatus: getDisplayStatus(a.payment?.status || "N/A"),
    });
  });
}

function addFinancialSummaryExcel(workbook, data) {
  const summarySheet = workbook.addWorksheet("Financial Summary");
  addHeaderRow(summarySheet, [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Value", key: "value", width: 20 },
  ]);
  summarySheet.addRow({ metric: "Total Revenue", value: data.totalRevenue });
  summarySheet.getCell("B2").numFmt = '"NPR" #,##0.00';
  summarySheet.addRow({
    metric: "Total Completed Payments",
    value: data.totalPayments,
  });
  summarySheet.addRow({}); // Spacer

  summarySheet.addRow({ metric: "Revenue by Payment Method" }).font = {
    bold: true,
  };
  Object.entries(data.revenueByMethod).forEach(([key, value]) => {
    summarySheet.addRow({ metric: getDisplayStatus(key), value: value });
    summarySheet.getCell(`B${summarySheet.rowCount}`).numFmt = '"NPR" #,##0.00';
  });
  summarySheet.addRow({}); // Spacer

  summarySheet.addRow({ metric: "Revenue by Service Type" }).font = {
    bold: true,
  };
  Object.entries(data.revenueByService).forEach(([key, value]) => {
    summarySheet.addRow({ metric: getDisplayStatus(key), value: value });
    summarySheet.getCell(`B${summarySheet.rowCount}`).numFmt = '"NPR" #,##0.00';
  });

  // Add revenue trend data
  const trendSheet = workbook.addWorksheet("Revenue Trend");
  addHeaderRow(trendSheet, [
    { header: "Date", key: "date", width: 15 },
    {
      header: "Revenue",
      key: "revenue",
      width: 20,
      style: { numFmt: '"NPR" #,##0.00' },
    },
  ]);
  Object.entries(data.revenueByDate)
    .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB)) // Sort by date
    .forEach(([date, revenue]) => {
      trendSheet.addRow({ date: formatDate(date), revenue });
    });
}

function addPatientDemographicsExcel(workbook, data) {
  const sheet = workbook.addWorksheet("Patient Demographics");
  addHeaderRow(sheet, [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Value", key: "value", width: 15 },
  ]);
  sheet.addRow({ metric: "Total New Patients", value: data.totalPatients });
  sheet.addRow({}); // Spacer

  sheet.addRow({ metric: "Gender Distribution" }).font = { bold: true };
  Object.entries(data.genderDistribution).forEach(([key, value]) => {
    sheet.addRow({ metric: key, value: value });
  });
  sheet.addRow({}); // Spacer

  sheet.addRow({ metric: "Age Distribution" }).font = { bold: true };
  Object.entries(data.ageDistribution).forEach(([key, value]) => {
    sheet.addRow({ metric: `Age ${key}`, value: value });
  });

  // Add Patient List Detail Sheet
  const detailSheet = workbook.addWorksheet("Patient List");
  addHeaderRow(detailSheet, [
    { header: "Name", key: "name", width: 25 },
    { header: "Gender", key: "gender", width: 10 },
    { header: "DOB", key: "dob", width: 15 },
    { header: "Age", key: "age", width: 10 },
    { header: "Registered Date", key: "registrationDate", width: 15 },
  ]);
  data.details.forEach((p) => {
    detailSheet.addRow({
      name: p.name,
      gender: p.gender,
      dob: p.dob, // Already formatted
      age: p.age,
      registrationDate: p.registrationDate, // Already formatted
    });
  });
}

function addDoctorPerformanceExcel(workbook, data) {
  const sheet = workbook.addWorksheet("Doctor Performance");
  addHeaderRow(sheet, [
    { header: "Doctor", key: "doctorName", width: 30 },
    { header: "Total Appts", key: "totalAppointments", width: 15 },
    { header: "Completed Appts", key: "completedAppointments", width: 18 },
    {
      header: "Completion Rate (%)",
      key: "completionRate",
      width: 18,
      style: { numFmt: '0.00"%"' },
    }, // Use 0.00 for percentage
    {
      header: "Revenue (NPR)",
      key: "revenue",
      width: 20,
      style: { numFmt: '"NPR" #,##0.00' },
    },
  ]);

  data.performanceData.forEach((d) => {
    sheet.addRow({
      doctorName: d.doctorName,
      totalAppointments: d.totalAppointments,
      completedAppointments: d.completedAppointments,
      completionRate: d.completionRate / 100, // Store as decimal for % format
      revenue: d.revenue,
    });
  });
}

function addSystemOverviewExcel(workbook, data) {
  const sheet = workbook.addWorksheet("System Overview");
  addHeaderRow(sheet, [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Value", key: "value", width: 15 },
  ]);

  sheet.addRow({ metric: "Total Hospitals", value: data.totalHospitals });
  sheet.addRow({ metric: "Active Hospitals", value: data.activeHospitals });
  sheet.addRow({ metric: "Inactive Hospitals", value: data.inactiveHospitals });
  sheet.addRow({ metric: "Total Users", value: data.totalUsers });
  sheet.addRow({}); // Spacer
  sheet.addRow({ metric: "Users by Role" }).font = { bold: true };
  Object.entries(data.usersByRole).forEach(([key, value]) => {
    sheet.addRow({ metric: getDisplayStatus(key), value: value });
  });
}

function addHospitalActivitySummaryExcel(workbook, data) {
  const sheet = workbook.addWorksheet("Hospital Activity Summary");
  addHeaderRow(sheet, [
    { header: "Hospital", key: "hospitalName", width: 35 },
    { header: "Total Appointments", key: "totalAppointments", width: 20 },
    { header: "New Patients", key: "newPatients", width: 15 },
    {
      header: "Total Revenue",
      key: "totalRevenue",
      width: 20,
      style: { numFmt: '"NPR" #,##0.00' },
    },
  ]);

  data.summary.forEach((h) => {
    sheet.addRow({
      hospitalName: h.hospitalName,
      totalAppointments: h.totalAppointments,
      newPatients: h.newPatients,
      totalRevenue: h.totalRevenue,
    });
  });
}

function addUserListExcel(workbook, data) {
  const sheet = workbook.addWorksheet("User List");
  addHeaderRow(sheet, [
    { header: "Name", key: "name", width: 25 },
    { header: "Email", key: "email", width: 30 },
    { header: "Role", key: "role", width: 15 },
    { header: "Hospital", key: "hospitalName", width: 25 },
    { header: "Department", key: "departmentName", width: 20 },
    { header: "Status", key: "status", width: 10 },
    { header: "Verified", key: "verified", width: 10 },
    { header: "Created At", key: "createdAt", width: 20 },
  ]);

  data.users.forEach((u) => {
    sheet.addRow({
      name: u.name,
      email: u.email,
      role: getDisplayStatus(u.role),
      hospitalName: u.hospital?.name || "N/A",
      departmentName: u.department?.name || "N/A",
      status: u.isActive ? "Active" : "Inactive",
      verified: u.isVerified ? "Yes" : "No",
      createdAt: formatDateTime(u.createdAt),
    });
  });
}

// --- Main Report Generation Service ---

const reportGenerators = {
  pdf: {
    APPOINTMENT_SUMMARY: addAppointmentSummaryPDF,
    APPOINTMENT_DETAIL: addAppointmentDetailPDF,
    FINANCIAL_SUMMARY: addFinancialSummaryPDF,
    PATIENT_DEMOGRAPHICS: addPatientDemographicsPDF,
    DOCTOR_PERFORMANCE: addDoctorPerformancePDF,
    SYSTEM_OVERVIEW: addSystemOverviewPDF,
    HOSPITAL_ACTIVITY_SUMMARY: addHospitalActivitySummaryPDF,
    USER_LIST: addUserListPDF,
    // Add other PDF types
  },
  excel: {
    APPOINTMENT_SUMMARY: null, // Define Excel version if needed (e.g., charts, pivot tables)
    APPOINTMENT_DETAIL: addAppointmentDetailExcel,
    FINANCIAL_SUMMARY: addFinancialSummaryExcel,
    PATIENT_DEMOGRAPHICS: addPatientDemographicsExcel,
    DOCTOR_PERFORMANCE: addDoctorPerformanceExcel,
    SYSTEM_OVERVIEW: addSystemOverviewExcel,
    HOSPITAL_ACTIVITY_SUMMARY: addHospitalActivitySummaryExcel,
    USER_LIST: addUserListExcel,
    // Add other Excel types
  },
};

// --- Modify generateReport ---
const generateReport = async (reportType, format, data) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safeReportType = reportType
      .replace(/[^a-z0-9_]/gi, "_")
      .toLowerCase();
    const filename = `${safeReportType}_${timestamp}.${format}`;
    const outputPath = path.join(reportsBaseDir, filename);

    if (!fs.existsSync(reportsBaseDir)) {
      fs.mkdirSync(reportsBaseDir, { recursive: true });
    }

    if (format === "pdf") {
      const doc = new PDFDocument({
        margin: 50,
        layout: "portrait",
        size: "A4",
        bufferPages: true, // Ensure pages are buffered for numbering later
      });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // --- Call the new header function ONCE at the beginning ---
      addCommonPDFHeader(doc, reportType, data.dateRange);

      // Set the starting Y position for the main content below the header
      doc.y = doc.page.margins.top + 70; // Adjust this value as needed based on header height

      // --- Call the specific content generator ---
      const contentGenerator = reportGenerators.pdf[reportType];
      if (contentGenerator) {
        contentGenerator(doc, data); // This adds the main report content
      } else {
        doc
          .fontSize(12)
          .text(
            `Report type '${reportType}' PDF generation not implemented yet.`
          );
      }

      // --- Call the page numbering function AFTER content is added ---
      addPageNumbersToPDF(doc);

      // --- Finalize the PDF ---
      doc.end();

      // ... (keep promise logic for stream finish/error) ...
      return new Promise((resolve, reject) => {
        stream.on("finish", () =>
          resolve({ success: true, fileName: filename })
        );
        stream.on("error", (error) => {
          console.error("PDF stream error:", error);
          reject({ success: false, error: error.message });
        });
      });
    } else if (format === "excel") {
      // ... (keep excel generation logic) ...
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "VitalCare System";
      workbook.created = new Date();
      workbook.properties.date1904 = true; // Ensure date compatibility

      const contentGenerator = reportGenerators.excel[reportType];
      if (contentGenerator) {
        contentGenerator(workbook, data);
      } else {
        const sheet = workbook.addWorksheet("Not Implemented");
        sheet.addRow([
          `Report type '${reportType}' Excel generation not implemented yet.`,
        ]);
      }

      await workbook.xlsx.writeFile(outputPath);
      return { success: true, fileName: filename };
    } else {
      throw new Error("Invalid report format specified");
    }
  } catch (error) {
    console.error(`Error generating ${format} report (${reportType}):`, error);
    return { success: false, error: error.message };
  }
};

// --- Exported Service Functions ---
export default {
  // Data Aggregation Functions
  getAppointmentSummaryData,
  getAppointmentDetailData,
  getFinancialSummaryData,
  getPatientDemographicsData,
  getDoctorPerformanceData,
  getSystemOverviewData,
  getHospitalActivitySummaryData,
  getUserListData,
  // Main Report Generator
  generateReport,
};
