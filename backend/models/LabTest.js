import mongoose from "mongoose";

const labTestSchema = new mongoose.Schema(
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
    testName: {
      type: String,
      required: true,
    },
    testType: {
      type: String,
      required: true,
    },
    description: String,
    requestDate: {
      type: Date,
      default: Date.now,
    },
    scheduledDate: Date,
    status: {
      type: String,
      enum: [
        "requested",
        "confirmed",
        "scheduled",
        "sample-collected",
        "in-progress",
        "completed",
        "cancelled",
      ],
      default: "requested",
    },
    priority: {
      type: String,
      enum: ["routine", "urgent", "emergency"],
      default: "routine",
    },
    notes: String,
    instructions: String,
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
    resultId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LabReport",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
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

const LabTest =
  mongoose.models.LabTest || mongoose.model("LabTest", labTestSchema);
export default LabTest;
