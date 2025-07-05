import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  dateTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled'
  },
  type: {
    type: String,
    enum: ['regular', 'follow-up', 'emergency', 'referral'],
    default: 'regular'
  },
  reason: {
    type: String,
    required: true
  },
  notes: {
    type: String
  },
  payment: {
    status: {
      type: String,
      enum: ['pending', 'completed', 'refunded', 'failed'],
      default: 'pending'
    },
    method: {
      type: String,
      enum: ['cash', 'khalti', 'insurance', 'other'],
      default: 'cash'
    },
    amount: {
      type: Number,
      required: true
    },
    transactionId: {
      type: String
    },
    khalti_pidx: {
      type: String
    },
    date: {
      type: Date
    }
  },
  isRescheduled: {
    type: Boolean,
    default: false
  },
  previousAppointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

// Index for faster querying by dateTime
appointmentSchema.index({ dateTime: 1 });
// Compound index for doctor and date range queries
appointmentSchema.index({ doctorId: 1, dateTime: 1 });
// Index for patient appointment lookups
appointmentSchema.index({ patientId: 1, dateTime: -1 });

const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);
export default Appointment;