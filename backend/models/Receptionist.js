import mongoose from 'mongoose';

const receptionistSchema = new mongoose.Schema({
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
  employeeId: {
    type: String,
    required: true
  },
  shiftHours: {
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

const Receptionist = mongoose.models.Receptionist || mongoose.model('Receptionist', receptionistSchema);
export default Receptionist;