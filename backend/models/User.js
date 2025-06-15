// models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId; // Password not required if googleId exists
      },
    },
    googleId: {
      type: String,
      default: null,
    },
    image: {
      type: String,
      default: "https://icon-icons.com/icon/avatar-default-user/92824",
    },
    phone: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: [
        "patient",
        "doctor",
        "receptionist",
        "admin",
        "superAdmin",
        "labTechnician",
        "radiologist",
      ],
      required: true,
    },
    hospital: {
      // <<--- MODIFIED HERE
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: function () {
        // Hospital ID required for all roles except superAdmin AND patient
        return this.role !== "superAdmin" && this.role !== "patient";
      },
      default: null, // Allow null, especially for patients
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: function () {
        return ["doctor", "labTechnician", "radiologist"].includes(this.role);
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    verificationOTP: String,
    verificationOTPExpires: Date,
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

// Password hash middleware
userSchema.pre("save", async function (next) {
  const user = this;

  if (user.isModified("password") && user.password) {
    // Added check for user.password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false; // If no password (e.g. Google signup), comparison fails
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update timestamps on update
userSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
