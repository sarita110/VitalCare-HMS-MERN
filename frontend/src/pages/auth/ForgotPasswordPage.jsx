// src/pages/auth/ForgotPasswordPage.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import authService from "../../services/authService"; //
import ForgotPasswordForm from "../../components/auth/ForgotPasswordForm"; // Import the form component

const ForgotPasswordPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleForgotPassword = async ({ email }) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await authService.forgotPassword(email); //
      if (response.success) {
        setSuccessMessage(
          response.message ||
            "If an account exists, password reset instructions have been sent."
        );
        toast.success("Password reset instructions sent (if email exists).");
      } else {
        // This case might not be hit if backend always returns success for security
        throw new Error(response.message || "Failed to send reset link");
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      // Display generic error even if user not found, for security
      setSuccessMessage(
        "If an account with that email exists, password reset instructions have been sent."
      );
      // setError(err.message || 'Could not send reset link.');
      // toast.error(err.message || 'Could not send reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
        Forgot Your Password?
      </h2>
      <p className="text-sm text-center text-gray-600 mb-6">
        Enter your email address below, and we&apos;ll send you a link to reset
        your password.
      </p>
      <ForgotPasswordForm
        onSubmit={handleForgotPassword}
        isLoading={isLoading}
        error={error} // Might not show error for security, only success
        successMessage={successMessage}
      />
      <p className="mt-8 text-center text-sm text-gray-600">
        Remember your password?{" "}
        <Link
          to="/login"
          className="font-medium text-primary-600 hover:text-primary-500"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default ForgotPasswordPage;
