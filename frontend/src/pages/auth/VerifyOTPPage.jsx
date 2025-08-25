// src/pages/auth/VerifyOTPPage.jsx
import React, { useContext, useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useFormik } from "formik";
import toast from "react-hot-toast";
import AuthContext from "../../context/AuthContext";
import authService from "../../services/authService"; //
import { otpSchema } from "../../utils/validators"; // [cite: 3092]
import FormInput from "../../components/common/FormInput"; //
import Button from "../../components/common/Button"; //

const VerifyOTPPage = () => {
  const {
    verifyOtpAndLogin,
    loading: authLoading,
    authError,
  } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState(null);
  const [resendSuccess, setResendSuccess] = useState(null);

  // Get email from navigation state passed from RegisterPage
  const email = location.state?.email;

  // Redirect if email is missing or user somehow gets here while authenticated
  useEffect(() => {
    if (!email) {
      toast.error("Email not found for verification.");
      navigate("/register"); // Redirect back if no email provided
    }
    // Add check for isAuthenticated later if needed
  }, [email, navigate]);

  const formik = useFormik({
    initialValues: {
      otp: "",
    },
    validationSchema: otpSchema,
    onSubmit: async (values) => {
      setIsLoading(true);
      setResendError(null); // Clear resend messages on submit attempt
      setResendSuccess(null);
      try {
        await verifyOtpAndLogin(email, values.otp);
        // AuthContext handles setting user and isAuthenticated state
        toast.success("Email verified successfully! Logging in...");
        // Redirect to dashboard happens automatically via AuthLayout/ProtectedRoute
        // based on isAuthenticated becoming true. Or we can force it:
        // navigate('/dashboard'); // Or role-specific dashboard
      } catch (error) {
        // Error handled by AuthContext, potentially shown via authError
        console.error("OTP Verification page caught error:", error);
        // Toast shown by context/interceptor
      } finally {
        setIsLoading(false);
      }
    },
  });

  const handleResendOtp = async () => {
    setResendLoading(true);
    setResendError(null);
    setResendSuccess(null);
    try {
      const response = await authService.sendOtp(email); //
      if (response.success) {
        toast.success("New OTP sent to your email.");
        setResendSuccess("New OTP sent.");
      } else {
        throw new Error(response.message || "Failed to resend OTP");
      }
    } catch (err) {
      console.error("Resend OTP error:", err);
      const errMsg = err.message || "Could not resend OTP.";
      setResendError(errMsg);
      toast.error(errMsg);
    } finally {
      setResendLoading(false);
    }
  };

  if (!email) {
    // Render minimal content or redirect indicator while useEffect redirects
    return <div className="text-center p-4">Redirecting...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
        Verify Your Email
      </h2>
      <p className="text-sm text-center text-gray-600 mb-6">
        Enter the 6-digit code sent to <strong>{email}</strong>.
      </p>
      {/* Display auth errors from context if any */}
      {authError && !isLoading && (
        <p className="text-sm text-center text-danger-600 bg-danger-100 p-2 rounded-md mb-4">
          {authError}
        </p>
      )}
      <form onSubmit={formik.handleSubmit} className="space-y-6">
        <FormInput
          label="Verification Code"
          id="otp"
          name="otp"
          type="text" // Keep as text to allow leading zeros if any issue with number type
          maxLength={6}
          inputMode="numeric" // Hint for mobile keyboards
          value={formik.values.otp}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.errors.otp}
          touched={formik.touched.otp}
          placeholder="Enter 6-digit code"
          required
          inputClassName="tracking-[0.5em] text-center" // Add spacing between digits
        />

        <div>
          <Button
            type="submit"
            className="w-full justify-center"
            isLoading={isLoading || authLoading}
            disabled={isLoading || authLoading || !formik.isValid}
          >
            Verify Email
          </Button>
        </div>
      </form>
      <div className="mt-4 text-center text-sm">
        {resendError && <p className="text-danger-600">{resendError}</p>}
        {resendSuccess && <p className="text-success-600">{resendSuccess}</p>}
        <button
          type="button"
          onClick={handleResendOtp}
          disabled={resendLoading}
          className="font-medium text-primary-600 hover:text-primary-500 disabled:opacity-50 disabled:cursor-wait"
        >
          {resendLoading ? "Sending..." : "Didn't receive code? Resend"}
        </button>
      </div>
      <p className="mt-8 text-center text-sm text-gray-600">
        Entered the wrong email?{" "}
        <Link
          to="/register"
          className="font-medium text-primary-600 hover:text-primary-500"
        >
          Register again
        </Link>
      </p>
    </div>
  );
};

export default VerifyOTPPage;
