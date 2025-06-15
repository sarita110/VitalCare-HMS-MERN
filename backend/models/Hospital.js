import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true }
  },
  contactNumber: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  website: { 
    type: String 
  },
  logo: {
    type: String,
    default: 'https://res.cloudinary.com/vitalcare/image/upload/v1/default-hospital.png'
  },
  description: {
    type: String,
    default: ''
  },
  departments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
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

const Hospital = mongoose.models.Hospital || mongoose.model('Hospital', hospitalSchema);
export default Hospital;