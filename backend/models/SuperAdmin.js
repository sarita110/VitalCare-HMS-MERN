import mongoose from 'mongoose';

const superAdminSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  role: {
    type: String,
    enum: ['master', 'limited'],
    default: 'limited'
  },
  permissions: {
    manageHospitals: {
      type: Boolean,
      default: true
    },
    manageUsers: {
      type: Boolean,
      default: true
    },
    viewReports: {
      type: Boolean,
      default: true
    },
    systemSettings: {
      type: Boolean,
      default: true
    }
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

const SuperAdmin = mongoose.models.SuperAdmin || mongoose.model('SuperAdmin', superAdminSchema);
export default SuperAdmin;