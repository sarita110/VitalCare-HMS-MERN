// src/pages/auth/ResetPasswordPage.jsx
import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import authService from "../../services/authService"; //
import ResetPasswordForm from "../../components/auth/ResetPasswordForm"; //

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const resetToken = searchParams.get("token");
    if (!resetToken) {
      setError("Invalid or missing password reset token.");
      toast.error("Invalid or missing password reset token.");
      // Optionally redirect after a delay
      // setTimeout(() => navigate('/login'), 3000);
    }
    setToken(resetToken);
  }, [searchParams, navigate]);

  const handleResetPassword = async ({ password }) => {
    if (!token) {
      setError("Password reset token is missing.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await authService.resetPassword(token, password); //
      if (response.success) {
        setSuccessMessage(response.message || "Password reset successfully!");
        toast.success("Password reset successfully! Please log in.");
        // Optionally redirect to login after success
        setTimeout(() => navigate("/login"), 3000);
      } else {
        throw new Error(
          response.message ||
            "Failed to reset password. Token might be invalid or expired."
        );
      }
    } catch (err) {
      console.error("Reset password error:", err);
      const errMsg =
        err.message || "Could not reset password. The link may have expired.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
        Reset Your Password
      </h2>
      {!token && error ? (
        <p className="text-center text-danger-600">{error}</p>
      ) : (
        <ResetPasswordForm
          onSubmit={handleResetPassword}
          isLoading={isLoading}
          error={error}
          successMessage={successMessage}
        />
      )}
      <p className="mt-8 text-center text-sm text-gray-600">
        Return to{" "}
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

export default ResetPasswordPage;
