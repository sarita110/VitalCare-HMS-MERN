// src/config/index.js

// Ensure your .env file in the root directory has these variables defined
// Example .env content:
// VITE_BACKEND_URL=http://localhost:5000
// VITE_FRONTEND_URL=http://localhost:5173
// VITE_KHALTI_PUBLIC_KEY=your_khalti_public_key

const config = {
  backendUrl: import.meta.env.VITE_BACKEND_URL || "http://localhost:5000",
  frontendUrl: import.meta.env.VITE_FRONTEND_URL || "http://localhost:5173",
  khaltiPublicKey: import.meta.env.VITE_KHALTI_PUBLIC_KEY || "",
};

export default config;
