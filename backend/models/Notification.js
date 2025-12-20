import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "appointment",
        "medical-record",
        "payment",
        "lab-result",
        "radiology-result",
        "referral",
        "system",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedTo: {
      model: {
        type: String,
        enum: [
          "Appointment",
          "MedicalRecord",
          "Payment",
          "LabTest",
          "RadiologyReport",
          "Referral",
          "User",
          "Hospital",
        ],
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    isEmail: {
      type: Boolean,
      default: false,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: Date,
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

const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);
export default Notification;
