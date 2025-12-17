// src/components/common/Button.jsx
import React from "react";

const Button = ({
  children,
  onClick,
  type = "button",
  variant = "primary", // primary, secondary, success, danger, warning, outline, link
  size = "md", // sm, md, lg
  disabled = false,
  isLoading = false,
  className = "",
  leftIcon,
  rightIcon,
  ...props
}) => {
  const baseClasses =
    "btn inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition ease-in-out duration-150";

  const variantClasses = {
    primary:
      "btn-primary bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500",
    secondary:
      "btn-secondary bg-secondary-600 text-white hover:bg-secondary-700 focus:ring-secondary-500",
    success:
      "btn-success bg-success-600 text-white hover:bg-success-700 focus:ring-success-500",
    danger:
      "btn-danger bg-danger-600 text-white hover:bg-danger-700 focus:ring-danger-500",
    warning:
      "btn-warning bg-warning-500 text-white hover:bg-warning-600 focus:ring-warning-400",
    outline:
      "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-primary-700",
    link: "text-primary-600 hover:text-primary-800 focus:ring-primary-500 underline disabled:text-gray-400",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const loadingClasses = isLoading ? "opacity-75 cursor-wait" : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${loadingClasses} ${className}`}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {leftIcon && !isLoading && (
        <span className="mr-2 -ml-1 h-5 w-5">{leftIcon}</span>
      )}
      {children}
      {rightIcon && !isLoading && (
        <span className="ml-2 -mr-1 h-5 w-5">{rightIcon}</span>
      )}
    </button>
  );
};

export default Button;
