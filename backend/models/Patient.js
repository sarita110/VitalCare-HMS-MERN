// models/Patient.js
import mongoose from "mongoose";

const patientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    hospitalId: {
      // This field represents the hospital the patient is primarily associated with.
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: false, // <<--- MODIFIED: No longer strictly required for booking logic
      default: null,
    },
    dob: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
    },
    allergies: [String],
    chronicDiseases: [String],
    registrationDate: {
      type: Date,
      default: Date.now,
    },
    insuranceInfo: {
      provider: String,
      policyNumber: String,
      expiryDate: Date,
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

const Patient =
  mongoose.models.Patient || mongoose.model("Patient", patientSchema);
export default Patient;
