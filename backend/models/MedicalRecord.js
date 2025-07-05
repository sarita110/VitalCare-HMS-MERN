// models/MedicalRecord.js

import mongoose from "mongoose";

// --- Define Sub-Schemas ---

const PrescriptionSubSchema = new mongoose.Schema(
  {
    medicine: String,
    dosage: String,
    frequency: String,
    duration: String,
    instructions: String,
  },
  { _id: false }
); // Disable _id for subdocuments unless specifically needed

const LabTestLinkSubSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LabTest",
      required: true, // Make sure the link is always there if the object exists
    },
  },
  { _id: false }
);

const RadiologyTestLinkSubSchema = new mongoose.Schema(
  {
    type: {
      // e.g., 'X-Ray', 'MRI'
      type: String,
      required: true,
    },
    description: {
      // e.g., 'Chest', 'Left Knee'
      type: String,
      required: true,
    },
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RadiologyReport",
      required: true,
    },
  },
  { _id: false }
);

const AttachmentSubSchema = new mongoose.Schema(
  {
    name: String,
    url: String,
    type: String, // Mimetype
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ReferralHospitalSubSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
    },
    sharedAt: {
      type: Date,
      default: Date.now,
    },
    referralId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Referral",
    },
  },
  { _id: false }
);

const SharedWithSubSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
    },
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    sharedDate: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// --- Main Medical Record Schema ---

const medicalRecordSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["diagnosis", "surgery", "follow-up", "other"],
      required: true,
    },
    date: { type: Date, default: Date.now },
    diagnosis: { type: String },
    symptoms: [String],
    treatment: { type: String },
    notes: { type: String },

    // --- Use Sub-Schemas for Arrays ---
    prescriptions: [PrescriptionSubSchema],
    labTests: [LabTestLinkSubSchema], // <-- Use defined sub-schema
    radiologyTests: [RadiologyTestLinkSubSchema], // <-- Use defined sub-schema
    attachments: [AttachmentSubSchema],
    referralHospitalIds: [ReferralHospitalSubSchema],
    sharedWith: [SharedWithSubSchema],
    // --- End Sub-Schema Usage ---

    isShared: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // createdAt and updatedAt are handled by timestamps: true
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt
);

// Ensure index for efficient querying if needed
// medicalRecordSchema.index({ patientId: 1, date: -1 });

const MedicalRecord =
  mongoose.models.MedicalRecord ||
  mongoose.model("MedicalRecord", medicalRecordSchema);

export default MedicalRecord;
