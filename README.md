# 🏥 VitalCare - Enterprise Hospital Management System

![React](https://img.shields.io/badge/React-19.0-blue?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=for-the-badge&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-brightgreen?style=for-the-badge&logo=mongodb)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)

**Live Demo:** [https://vital-care-hms-mern.vercel.app](https://vital-care-hms-mern.vercel.app)  
**Backend API:** Hosted on Render

VitalCare is a comprehensive, full-stack Hospital Management System (HMS) built with the MERN stack. Designed to digitize and streamline hospital operations, it provides dedicated interfaces for 7 different user roles, enabling seamless coordination between patients, medical staff, and administration.

---

## 🧪 Test Credentials for Recruiters

To explore the platform without registering, please use the following credentials at the [Login Page](https://vital-care-hms-mern.vercel.app/login):

| Role               | Email                             | Password        |
| :----------------- | :-------------------------------- | :-------------- |
| **Super Admin**    | `super.admin@test.com`            | `*Password123.` |
| **Hospital Admin** | `charak.admin@test.com`           | `*Password123.` |
| **Doctor**         | `charak.doctor1@test.com`         | `*Password123.` |
| **Doctor**         | `charak.doctor2@test.com`         | `*Password123.` |
| **Lab Technician** | `charak.labtechnician@test.com`   | `*Password123.` |
| **Radiologist**    | `charak.radiologist@test.com`     | `*Password123.` |
| **Receptionist**   | `charak.receptionist@test.com`    | `*Password123.` |
| **Hospital Admin** | `fewacity.admin@test.com`         | `*Password123.` |
| **Doctor**         | `fewacity.doctor1@test.com`       | `*Password123.` |
| **Doctor**         | `fewacity.doctor2@test.com`       | `*Password123.` |
| **Lab Technician** | `fewacity.labtechnician@test.com` | `*Password123.` |
| **Radiologist**    | `fewacity.radiologist@test.com`   | `*Password123.` |
| **Receptionist**   | `fewacity.receptionist@test.com`  | `*Password123.` |
| **Patient**        | `patient@test.com`                | `*Password123.` |

_(Note: Test accounts are periodically refreshed. If an account is locked, feel free to register a new Patient account or use the Super Admin to provision new staff)._

---

## 🚀 Features by User Role

### 👑 Super Admin (System Owner)

- **Global Oversight:** Dashboard displaying system-wide metrics (total hospitals, active users, etc.).
- **Onboarding:** Register new hospitals and assign root Hospital Administrators.
- **Analytics:** Generate and download system-wide Excel/PDF reports.

### 🏢 Hospital Admin

- **Staff Management:** Full CRUD capabilities for Doctors, Receptionists, Lab Techs, and Radiologists.
- **Department Configuration:** Create and manage hospital departments.
- **Hospital Profile:** Update hospital contact info, addresses, and upload logos.
- **Reporting:** Generate financial and demographic reports specific to their hospital.

### 🧑‍⚕️ Doctors

- **Schedule Management:** Configure weekly working hours, consultation times, and toggle availability.
- **Appointments:** View upcoming queues, mark appointments as complete or no-show.
- **Medical Records:** Add detailed diagnoses, symptoms, treatments, and prescriptions.
- **Diagnostics:** Directly request Lab Tests and Radiology imaging for patients.
- **Referrals:** Create secure, inter-hospital patient referrals with attached medical histories.

### 🏥 Receptionists

- **Patient Registration:** Walk-in patient registration and profile management.
- **Scheduling:** Override and book appointments on behalf of patients based on doctor availability.
- **Billing & Payments:** Process cash payments, verify online transactions, and generate receipts.
- **Document Management:** Upload external medical reports securely to a patient's file.

### 🔬 Lab Technicians & 🩻 Radiologists

- **Queue Management:** View pending test requests prioritized by urgency (Routine, Urgent, Emergency).
- **Result Uploads:** Upload structured test results, detailed findings, and attach PDF/Image reports directly to the patient's record.

### 👤 Patients

- **Self-Service Booking:** Browse hospitals/doctors, view real-time available time slots, and book appointments.
- **Digital Records:** Access prescriptions, lab results, and radiology reports securely from anywhere.
- **Online Payments:** Pay for consultations and tests seamlessly using the **Khalti Payment Gateway**.

---

## 🛠️ Technical Architecture & Stack

### Frontend (Client)

- **React 19 & Vite:** For a blazing fast, modern component-based UI.
- **Tailwind CSS v4:** Utility-first styling for a highly responsive design.
- **React Router v7:** Complex routing with nested layouts and role-based route guards.
- **Formik & Yup:** Robust form state management and schema-based validation.
- **Chart.js:** Interactive data visualization for Admin dashboards.
- **Context API:** Modular state management separating Auth, User, and Hospital data.

### Backend (API)

- **Node.js & Express.js:** RESTful API architecture.
- **MongoDB & Mongoose:** NoSQL database with complex relational population and indexing.
- **Authentication:** JWT (JSON Web Tokens) with OTP email verification & Google OAuth 2.0 (Passport.js).
- **Role-Based Access Control (RBAC):** Strict middleware ensuring users can only access data authorized for their specific role and hospital.

### Cloud & 3rd Party Integrations

- **Brevo API (formerly Sendinblue):** HTTP-based transactional email delivery (bypassing standard cloud SMTP blocks).
- **Cloudinary:** Secure, cloud-based image and document storage for avatars and medical reports.
- **Khalti API:** Integrated Nepalese digital wallet for seamless appointment and test payments.
- **PDFKit & ExcelJS:** Server-side generation of complex, downloadable hospital reports.

---

## 💻 Local Setup & Installation

### Prerequisites

- Node.js (v18+)
- MongoDB (Local or Atlas)
- Cloudinary Account
- Brevo Account (for emails)

### 1. Clone the repository

\`\`\`bash
git clone https://github.com/sarita110/VitalCare-HMS-MERN.git
cd VitalCare-HMS-MERN
\`\`\`

### 2. Setup Backend

\`\`\`bash
cd backend
npm install
\`\`\`
Create a `.env` file in the `backend` directory:
\`\`\`env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
BREVO_API_KEY=your_brevo_api_key
EMAIL_USER=your_registered_brevo_email@domain.com
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_SECRET_KEY=your_cloudinary_secret
KHALTI_SECRET_KEY=your_khalti_secret
FRONTEND_URL=http://localhost:5173
\`\`\`
Start the backend server:
\`\`\`bash
npm run dev
\`\`\`

### 3. Setup Frontend

Open a new terminal window:
\`\`\`bash
cd frontend
npm install
\`\`\`
Create a `.env` file in the `frontend` directory:
\`\`\`env
VITE_BACKEND_URL=http://localhost:5000
VITE_FRONTEND_URL=http://localhost:5173
VITE_KHALTI_PUBLIC_KEY=your_khalti_public_key
\`\`\`
Start the frontend development server:
\`\`\`bash
npm run dev
\`\`\`

---

## 🛡️ Security Highlights

- **Password Hashing:** All passwords are one-way hashed using `bcryptjs` before entering the database.
- **Route Protection:** Frontend routes are wrapped in a `<ProtectedRoute>` component that verifies JWT validity and user role matching.
- **Data Isolation:** Backend queries inherently filter by `hospitalId` to ensure multi-tenant data isolation (an Admin at Hospital A cannot see patients from Hospital B).
