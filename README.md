# VitalCare - Comprehensive Hospital Management System (HMS)

![React](https://img.shields.io/badge/React-19.0-blue?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=for-the-badge&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-brightgreen?style=for-the-badge&logo=mongodb)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)

VitalCare is a full-stack, highly scalable Hospital Management System built with the MERN stack. It streamlines daily hospital operations, ranging from patient registration and doctor appointments to lab/radiology reporting and payment processing.

## 🚀 Features by Role

### 🧑‍⚕️ Doctors

- **Appointment Management:** View daily schedules, accept/cancel appointments, and review patient histories.
- **Medical Records:** Add diagnoses, symptoms, treatments, and prescriptions to a patient's timeline.
- **Diagnostics:** Directly request lab tests and radiology imaging from the dashboard.
- **Referrals:** Create and track inter-hospital patient referrals.

### 🏥 Receptionists

- **Patient Registration:** Register new patients and manage demographic data.
- **Scheduling:** Book appointments on behalf of patients based on doctor availability.
- **Billing:** Process cash payments and verify digital transactions.
- **Document Management:** Upload external medical reports securely.

### 🔬 Lab Technicians & Radiologists

- **Queue Management:** View pending test requests prioritized by urgency (Routine, Urgent, Emergency).
- **Result Uploads:** Upload test results, detailed findings, and attach PDF/Image reports directly to the patient's file.

### 👑 Administrators (Super & Hospital Admin)

- **Hospital Configuration:** Manage departments, doctor working hours, and staff access.
- **System Reports:** Generate downloadable PDF and Excel reports for financial summaries, patient demographics, and doctor performance.

### 👤 Patients

- **Self-Service Booking:** Browse hospitals/doctors and book appointments in real-time.
- **Digital Records:** Access prescriptions, lab results, and radiology reports securely.
- **Khalti Integration:** Pay for consultations and tests seamlessly using the Khalti payment gateway.

## 🛠️ Technical Architecture

- **Frontend:** React 19, Vite, React Router v7, Tailwind CSS v4, Formik + Yup (Validation), Chart.js (Data Visualization). State managed via a modular Context API structure.
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB with Mongoose ODM.
- **Authentication:** JWT (JSON Web Tokens) with OTP email verification.
- **Storage:** Cloudinary (Image/Document uploads), AWS S3 setup available.
- **Integrations:** Khalti Payment Gateway, Nodemailer (Automated Email Alerts), PDFKit & ExcelJS (Reporting).

## 💻 Local Setup & Installation

**1. Clone the repository:**
\`\`\`bash
git clone https://github.com/YOUR_USERNAME/VitalCare-HMS.git
cd VitalCare-HMS
\`\`\`

**2. Setup Backend:**
\`\`\`bash
cd backend
npm install
\`\`\`
_Create a `.env` file in the `backend` directory with the following variables:_
\`\`\`env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_SECRET_KEY=your_cloudinary_secret
KHALTI_SECRET_KEY=your_khalti_secret
FRONTEND_URL=http://localhost:5173
\`\`\`
_Run the backend:_ `npm run dev`

**3. Setup Frontend:**
\`\`\`bash
cd ../frontend
npm install
\`\`\`
_Create a `.env` file in the `frontend` directory:_
\`\`\`env
VITE_BACKEND_URL=http://localhost:5000
VITE_FRONTEND_URL=http://localhost:5173
VITE_KHALTI_PUBLIC_KEY=your_khalti_public_key
\`\`\`
_Run the frontend:_ `npm run dev`

## 🛡️ Security Measures

- Passwords hashed using `bcryptjs`.
- Role-Based Access Control (RBAC) middleware protecting all sensitive API routes.
- Mongoose schema validation preventing NoSQL injections.
- Secure image uploads via Cloudinary to prevent malicious file execution.
