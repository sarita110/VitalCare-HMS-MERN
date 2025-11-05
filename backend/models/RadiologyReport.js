import mongoose from "mongoose";

const radiologyReportSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },
    procedureType: {
      type: String,
      enum: [
        "X-Ray",
        "CT Scan",
        "MRI",
        "Ultrasound",
        "Mammography",
        "PET Scan",
        "Fluoroscopy",
        "DEXA Scan",
        "Nuclear Medicine",
        "Angiography",
      ],
      required: true,
    },
    bodyPart: {
      type: String,
      required: true,
    },
    requestDate: {
      type: Date,
      default: Date.now,
    },
    scheduledDate: Date,
    completedDate: Date,
    status: {
      type: String,
      enum: ["requested", "confirmed", "scheduled", "in-progress", "completed", "cancelled"],
      default: "requested",
    },
    images: [
      {
        url: String,
        description: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    findings: String,
    impression: String,
    recommendations: String,
    priority: {
      type: String,
      enum: ["routine", "urgent", "emergency"],
      default: "routine",
    },
    notes: String,
    payment: {
      status: {
        type: String,
        enum: ["pending", "completed", "waived"],
        default: "pending",
      },
      amount: {
        type: Number,
        required: true,
      },
      transactionId: String,
    },
    radiologist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedAt: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const RadiologyReport =
  mongoose.models.RadiologyReport ||
  mongoose.model("RadiologyReport", radiologyReportSchema);
export default RadiologyReport;
