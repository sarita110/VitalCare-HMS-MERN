// src/constants/testCosts.js

export const RADIOLOGY_COSTS = {
  "X-Ray": 800, // Typical cost in Nepal: NPR 500-1500
  "CT-Scan": 4500, // Typical cost in Nepal: NPR 3000-8000
  MRI: 12000, // Typical cost in Nepal: NPR 10000-18000
  Ultrasound: 1200, // Typical cost in Nepal: NPR 800-2000
  Mammogram: 2500, // Typical cost in Nepal: NPR 2000-3500
  "PET-Scan": 35000, // Typical cost in Nepal: NPR 30000-50000
  Fluoroscopy: 3000, // Typical cost in Nepal: NPR 2500-4000
  "DEXA-Scan": 3500, // Typical cost in Nepal: NPR 3000-5000
  "Nuclear-Medicine": 15000, // Typical cost in Nepal: NPR 12000-20000
  Angiography: 25000, // Typical cost in Nepal: NPR 20000-35000
};

export const LAB_TEST_COSTS = {
  "Complete Blood Count (CBC)": 350, // Typical cost in Nepal: NPR 300-500
  "Basic Metabolic Panel": 600, // Typical cost in Nepal: NPR 500-800
  "Lipid Panel": 450, // Typical cost in Nepal: NPR 400-600
  "Liver Function Test": 700, // Typical cost in Nepal: NPR 600-1000
  "Thyroid Function Test": 1200, // Typical cost in Nepal: NPR 1000-1500
  "Blood Glucose Test": 150, // Typical cost in Nepal: NPR 100-250
  HbA1c: 800, // Typical cost in Nepal: NPR 700-1000
  "Urine Analysis": 250, // Typical cost in Nepal: NPR 200-400
  "Blood Culture": 1200, // Typical cost in Nepal: NPR 1000-1500
  "Stool Analysis": 300, // Typical cost in Nepal: NPR 250-450
  "HIV Test": 1000, // Typical cost in Nepal: NPR 800-1500
  "Hepatitis Panel": 1800, // Typical cost in Nepal: NPR 1500-2500
  "Pregnancy Test": 200, // Typical cost in Nepal: NPR 150-300
  "PSA Test": 1200, // Typical cost in Nepal: NPR 1000-1500
  "Vitamin D Test": 1500, // Typical cost in Nepal: NPR 1200-2000
  "Iron Studies": 900, // Typical cost in Nepal: NPR 800-1200
  "Cardiac Enzymes": 2500, // Typical cost in Nepal: NPR 2000-3500
  "C-Reactive Protein": 600, // Typical cost in Nepal: NPR 500-800
  "Electrolyte Panel": 500, // Typical cost in Nepal: NPR 400-700
  "Coagulation Profile": 1200, // Typical cost in Nepal: NPR 1000-1500
};

export const LAB_TEST_TYPES = {
  Blood: "Blood",
  Urine: "Urine",
  Stool: "Stool",
  Tissue: "Tissue",
  Fluid: "Fluid",
  Swab: "Swab",
  Sputum: "Sputum",
};
