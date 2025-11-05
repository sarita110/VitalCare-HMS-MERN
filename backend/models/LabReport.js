import mongoose from 'mongoose';

const labReportSchema = new mongoose.Schema({
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabTest',
    required: true,
    unique: true
  },
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
  reportDate: {
    type: Date,
    default: Date.now
  },
  results: [{
    parameter: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    },
    unit: String,
    normalRange: String,
    interpretation: {
      type: String,
      enum: ['normal', 'high', 'low', 'critical', 'inconclusive'],
    }
  }],
  summary: {
    type: String,
    required: true
  },
  conclusion: String,
  recommendations: String,
  attachment: {
    url: String,
    name: String,
    mimetype: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  technicianNotes: String,
  technician: {
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

const LabReport = mongoose.models.LabReport || mongoose.model('LabReport', labReportSchema);
export default LabReport;