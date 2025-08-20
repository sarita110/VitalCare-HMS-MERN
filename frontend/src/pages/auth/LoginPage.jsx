// src/pages/auth/LoginPage.jsx
import React, { useContext, useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import AuthContext from "../../context/AuthContext";
import LoginForm from "../../components/auth/LoginForm";
import config from "../../config";
import { ROLES } from "../../constants";

const roleToUrlPath = (role) => {
  if (!role) return "/";
  if (role === ROLES.SUPER_ADMIN) return "super-admin";
  if (role === ROLES.LAB_TECHNICIAN) return "lab";
  if (role === ROLES.RADIOLOGIST) return "radiology";
  return role.toLowerCase();
};

const LoginPage = () => {
  const {
    login,
    isAuthenticated,
    user,
    loading: authLoadingFromContext, // Loading from AuthContext (initial auth check)
    authError, // Error from AuthContext (e.g., "Invalid credentials")
  } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false); // Local loading state for form submission

  useEffect(() => {
    if (isAuthenticated && user) {
      const urlRole = roleToUrlPath(user.role);
      const dashboardPath = `/${urlRole}/dashboard`;
      const from = location.state?.from?.pathname || dashboardPath;
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location.state]);

  const handleLogin = async (credentials) => {
    setIsSubmitting(true);
    // authError will be cleared in AuthContext's login before the attempt
    try {
      const response = await login(credentials); // This will set authError in context if it fails

      // Handle successful login response
      if (response && response.success) {
        // Check if response is defined
        if (response.rolePath) {
          toast.success("Login successful!");
          navigate(response.rolePath, { replace: true });
        } else if (
          response.user?.role === "patient" &&
          !response.user?.isVerified
        ) {
          toast.info("Please verify your email to complete login.");
          navigate("/verify-otp", { state: { email: response.user.email } });
        }
      }
      // If login fails, AuthContext sets authError, and this component will re-render to display it.
      // The API interceptor also shows a toast for the API error.
    } catch (error) {
      // This catch is for errors *not* handled by setting authError (e.g., network issues before API call)
      // or if login itself throws an error that isn't just setting authError.
      console.error("Login page submission - caught error:", error);
      // A toast for this type of error would already be shown by the API interceptor if it's an API call failure.
      // If it's a different kind of JS error, toast here.
      if (!error.isAxiosError && !authError) {
        // Avoid double-toasting if authError is already set
        toast.error("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const googleAuthUrl = `${config.backendUrl}/api/auth/google`;

  return (
    <div>
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
        Sign in to VitalCare
      </h2>
      {/* 
        The LoginForm will now receive the authError from context.
        It should display this error if present.
      */}
      <LoginForm
        onSubmit={handleLogin}
        isLoading={isSubmitting || authLoadingFromContext}
        error={authError} // Pass the authError from AuthContext
      />
      <div className="mt-6">
        {/* ... Google Sign-In button ... */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              Or continue with
            </span>
          </div>
        </div>
        <div className="mt-6">
          <a
            href={googleAuthUrl}
            className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
          >
            <span className="sr-only">Sign in with Google</span>
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.87-2.13 15.84-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.11 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
            Sign in with Google
          </a>
        </div>
      </div>
      <p className="mt-8 text-center text-sm text-gray-600">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="font-medium text-primary-600 hover:text-primary-500"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
};

export default LoginPage;
