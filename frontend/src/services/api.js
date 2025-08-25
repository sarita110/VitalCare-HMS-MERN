// src/services/api.js
import axios from "axios";
import config from "../config";
import { getToken, clearAuthData } from "../utils/storage";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: `${config.backendUrl}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;

    if (response) {
      if (response.status === 401) {
        toast.error(
          response.data?.message || "Session expired. Please log in again."
        );
        clearAuthData();
        // IMPORTANT: Avoid immediate redirect if the error is intended to be handled by context/page
        // For example, if LoginPage gets a 401 for "Invalid credentials", we want LoginPage to display it.
        // Only redirect if it's a general session expiry not tied to a specific form submission.
        // This logic might need to be more nuanced based on where the 401 originates.
        // For now, we'll let AuthContext handle the redirect for login failures.
        // If a protected route access fails with 401, ProtectedRoute will handle redirect.
        // window.location.href = "/login"; // Commenting this out to give pages a chance to handle it.
      } else if (response.status === 403) {
        toast.error(
          response.data?.message || "Access Denied. You do not have permission."
        );
      } else if (response.status === 404) {
        // For specific API "Not Found" errors, not general page 404s.
        // The error message on the login page "User not found" likely comes from the backend sending a 404 with that specific message.
        // If the backend sends a JSON { message: "User not found" } for a 404, this is fine.
        // If it sends an HTML 404 page, response.data.message will be undefined.
        toast.error(
          response.data?.message ||
            "The requested resource was not found on the server."
        );
      } else if (response.status >= 500) {
        toast.error(
          response.data?.message || "An unexpected server error occurred."
        );
      } else if (response.data?.message) {
        // For other client-side errors (e.g., 400 Bad Request with validation messages)
        if (response.data.errors && Array.isArray(response.data.errors)) {
          // This handles express-validator style errors
          const errorMessages = response.data.errors
            .map((err) => `${err.param || err.field || "Error"}: ${err.msg}`)
            .join("\n");
          toast.error(errorMessages, { duration: 7000 }); // Longer for multiple messages
        } else {
          toast.error(response.data.message);
        }
      } else {
        toast.error("An error occurred. Please try again.");
      }
    } else if (error.request) {
      toast.error(
        "Network error. Please check your connection and if the server is running."
      );
    } else {
      toast.error(`Error: ${error.message}`);
    }
    return Promise.reject(error.response ? error.response.data : error);
  }
);

export default api;
