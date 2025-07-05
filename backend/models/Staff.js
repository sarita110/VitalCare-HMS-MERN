import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  staffType: {
    type: String,
    enum: ['labTechnician', 'radiologist', 'nurse', 'pharmacist', 'other'],
    required: true
  },
  employeeId: {
    type: String,
    required: true
  },
  qualifications: [String],
  specialization: String,
  joinDate: {
    type: Date,
    default: Date.now
  },
  workingHours: {
    start: String,
    end: String
  },
  workingDays: [String],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

const Staff = mongoose.models.Staff || mongoose.model('Staff', staffSchema);
export default Staff;