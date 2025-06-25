import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    speciality: {
      type: String,
      required: true,
    },
    degree: {
      type: String,
      required: true,
    },
    experience: {
      type: String,
      required: true,
    },
    about: {
      type: String,
      required: true,
    },
    available: {
      type: Boolean,
      default: true,
    },
    fees: {
      type: Number,
      required: true,
    },
    slots_booked: {
      type: Object,
      default: {},
    },
    workingHours: {
      monday: { start: String, end: String, isActive: Boolean },
      tuesday: { start: String, end: String, isActive: Boolean },
      wednesday: { start: String, end: String, isActive: Boolean },
      thursday: { start: String, end: String, isActive: Boolean },
      friday: { start: String, end: String, isActive: Boolean },
      saturday: { start: String, end: String, isActive: Boolean },
      sunday: { start: String, end: String, isActive: Boolean },
    },
    consultationTime: {
      type: Number, // in minutes
      default: 30,
    },
    registrationNumber: {
      type: String,
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

// Add this mongoose middleware to ensure slots_booked is marked as modified when updated
doctorSchema.pre("save", function (next) {
  if (this.isModified("slots_booked")) {
    // Ensure the modification is detected by Mongoose
    this.markModified("slots_booked");
  }
  next();
});

const Doctor = mongoose.models.Doctor || mongoose.model("Doctor", doctorSchema);
export default Doctor;
