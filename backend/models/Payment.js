import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
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
  relatedTo: {
    type: String,
    enum: ['appointment', 'labTest', 'radiologyReport', 'pharmacy', 'other'],
    required: true
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    // dynamically refers to different collections
    refPath: 'relatedTo'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'NPR'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'khalti', 'insurance', 'credit_card', 'other'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionId: String,
  khaltiPidx: String,
  paymentDate: {
    type: Date
  },
  paymentDetails: {
    type: Object
  },
  receiptNumber: String,
  notes: String,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
export default Payment;