// src/components/common/FormInput.jsx
import React, { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

const FormInput = ({
  label,
  id,
  name,
  type = "text",
  value,
  onChange,
  onBlur,
  error,
  touched,
  placeholder,
  required = false,
  disabled = false,
  className = "",
  labelClassName = "",
  inputClassName = "",
  errorClassName = "",
  helpText,
  icon: Icon, // Allow passing a custom left icon
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  // Determine if this is a password field and what type it currently is
  const isPasswordField = type === "password";
  const currentType = isPasswordField && showPassword ? "text" : type;

  const showError = error && touched;
  const borderClass = showError
    ? "border-danger-500 focus:border-danger-500 focus:ring-danger-500"
    : "border-gray-300 focus:border-primary-500 focus:ring-primary-500";

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label
          htmlFor={id || name}
          className={`form-label block text-sm font-medium text-gray-700 mb-1 ${labelClassName}`}
        >
          {label} {required && <span className="text-danger-600">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Optional Left Icon */}
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
        )}

        <input
          type={currentType}
          id={id || name}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`form-input mt-1 block w-full focus:ring-opacity-50 ${borderClass} ${
            Icon ? "pl-10" : ""
          } ${isPasswordField ? "pr-10" : ""} ${inputClassName}`}
          aria-invalid={showError}
          aria-describedby={showError ? `${id || name}-error` : undefined}
          {...props}
        />

        {/* Eye Icon for Password Fields */}
        {isPasswordField && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-primary-600 focus:outline-none"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex="-1" // Prevents the tab key from focusing the eye icon
          >
            {showPassword ? (
              <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <EyeIcon className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
      {showError && (
        <p
          id={`${id || name}-error`}
          className={`form-error mt-1 text-xs text-danger-600 ${errorClassName}`}
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default FormInput;
