import { body, param, query, validationResult } from 'express-validator';

// Middleware to check validation results
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({ field: err.param, message: err.msg }))
    });
  }
  next();
};

// User validation rules
export const userValidation = {
  register: [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('role')
      .isIn([
        'patient', 'doctor', 'receptionist', 'admin', 
        'superAdmin', 'labTechnician', 'radiologist'
      ])
      .withMessage('Invalid role'),
    body('hospitalId')
      .optional({ nullable: true })
      .isMongoId()
      .withMessage('Invalid hospital ID')
  ],
  login: [
    body('email').isEmail().withMessage('Invalid email address'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  resetPassword: [
    body('token').notEmpty().withMessage('Token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
  ]
};

// Hospital validation rules
export const hospitalValidation = {
  create: [
    body('name').trim().notEmpty().withMessage('Hospital name is required'),
    body('address.street').trim().notEmpty().withMessage('Street address is required'),
    body('address.city').trim().notEmpty().withMessage('City is required'),
    body('address.state').trim().notEmpty().withMessage('State is required'),
    body('address.zipCode').trim().notEmpty().withMessage('Zip code is required'),
    body('address.country').trim().notEmpty().withMessage('Country is required'),
    body('contactNumber').trim().notEmpty().withMessage('Contact number is required'),
    body('email').isEmail().withMessage('Invalid email address')
  ],
  update: [
    param('id').isMongoId().withMessage('Invalid hospital ID'),
    body('name').optional().trim().notEmpty().withMessage('Hospital name cannot be empty'),
    body('email').optional().isEmail().withMessage('Invalid email address')
  ]
};

// Doctor validation rules
export const doctorValidation = {
  create: [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('speciality').trim().notEmpty().withMessage('Speciality is required'),
    body('degree').trim().notEmpty().withMessage('Degree is required'),
    body('experience').trim().notEmpty().withMessage('Experience is required'),
    body('fees').isNumeric().withMessage('Fees must be a number'),
    body('hospitalId').isMongoId().withMessage('Invalid hospital ID'),
    body('departmentId').isMongoId().withMessage('Invalid department ID')
  ]
};

// Appointment validation rules
export const appointmentValidation = {
  create: [
    body('doctorId').isMongoId().withMessage('Invalid doctor ID'),
    body('dateTime').isISO8601().withMessage('Invalid date/time format'),
    body('reason').trim().notEmpty().withMessage('Reason is required')
  ],
  update: [
    param('id').isMongoId().withMessage('Invalid appointment ID'),
    body('status')
      .optional()
      .isIn(['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'])
      .withMessage('Invalid status')
  ]
};

// Payment validation rules
export const paymentValidation = {
  create: [
    body('patientId').isMongoId().withMessage('Invalid patient ID'),
    body('relatedTo')
      .isIn(['appointment', 'labTest', 'radiologyReport', 'pharmacy', 'other'])
      .withMessage('Invalid payment type'),
    body('relatedId').isMongoId().withMessage('Invalid related ID'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('paymentMethod')
      .isIn(['cash', 'khalti', 'insurance', 'credit_card', 'other'])
      .withMessage('Invalid payment method')
  ]
};

// Lab test validation rules
export const labTestValidation = {
  create: [
    body('patientId').isMongoId().withMessage('Invalid patient ID'),
    body('doctorId').isMongoId().withMessage('Invalid doctor ID'),
    body('testName').trim().notEmpty().withMessage('Test name is required'),
    body('testType').trim().notEmpty().withMessage('Test type is required')
  ],
  updateStatus: [
    param('id').isMongoId().withMessage('Invalid test ID'),
    body('status')
      .isIn(['requested', 'scheduled', 'sample-collected', 'in-progress', 'completed', 'cancelled'])
      .withMessage('Invalid status')
  ]
};

// Export all validations
export default {
  validate,
  userValidation,
  hospitalValidation,
  doctorValidation,
  appointmentValidation,
  paymentValidation,
  labTestValidation
};