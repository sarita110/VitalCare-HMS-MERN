import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  description: {
    type: String,
    default: ''
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  head: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
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

const Department = mongoose.models.Department || mongoose.model('Department', departmentSchema);
export default Department;