// src/pages/auth/RegisterPage.jsx
import React, { useContext, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthContext from "../../context/AuthContext";
import RegisterForm from "../../components/auth/RegisterForm"; //
import config from "../../config"; // For Google OAuth URL [cite: 3033]

const RegisterPage = () => {
  const {
    register,
    isAuthenticated,
    user,
    loading: authLoading,
    authError,
  } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect based on role
      const dashboardPath = `/${user.role}/dashboard`;
      navigate(dashboardPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleRegister = async (userData) => {
    setIsLoading(true);
    try {
      const response = await register(userData);
      // Backend's authController sends message "Registration successful. Please verify your email." [cite: 569]
      // And it doesn't log the user in immediately, but returns a token with isVerified: false [cite: 568]
      if (response.success && response.message?.includes("verify your email")) {
        toast.success(response.message);
        // Navigate to OTP verification page, passing the email
        navigate("/verify-otp", { state: { email: userData.email } });
      } else if (response.success && response.token && response.user) {
        // Handle case where registration might auto-verify and log in (e.g., future social login)
        toast.success("Registration successful!");
        // Navigation handled by useEffect
      }
      // No explicit else needed, error is thrown by register function in context
    } catch (error) {
      // Error is handled and displayed by AuthContext/interceptor
      console.error("Register page caught error:", error);
      // Toast likely shown by interceptor/context
    } finally {
      setIsLoading(false);
    }
  };

  const googleAuthUrl = `${config.backendUrl}/api/auth/google`;

  return (
    <div>
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
        Create your VitalCare Account
      </h2>
      {/* Display auth errors from context if any */}
      {authError && !isLoading && (
        <p className="text-sm text-center text-danger-600 bg-danger-100 p-2 rounded-md mb-4">
          {authError}
        </p>
      )}
      <RegisterForm
        onSubmit={handleRegister}
        isLoading={isLoading || authLoading}
        error={null}
      />
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or sign up with</span>
          </div>
        </div>

        <div className="mt-6">
          {/* Link to backend Google OAuth endpoint */}
          <a
            href={googleAuthUrl}
            className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
          >
            <span className="sr-only">Sign up with Google</span>
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 48 48"
            >
              {/* SVG Path Copied from LoginPage */}
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              ></path>
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              ></path>
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              ></path>
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.87-2.13 15.84-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.11 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              ></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
            Sign up with Google
          </a>
        </div>
      </div>
      <p className="mt-8 text-center text-sm text-gray-600">
        Already have an account?{" "}
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

export default RegisterPage;
