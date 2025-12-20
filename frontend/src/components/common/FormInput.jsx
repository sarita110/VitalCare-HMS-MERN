// src/components/common/FormInput.jsx
import React from "react";

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
  ...props
}) => {
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
      <input
        type={type}
        id={id || name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`form-input mt-1 block focus:ring-opacity-50 ${borderClass} ${inputClassName}`}
        aria-invalid={showError}
        aria-describedby={showError ? `${id || name}-error` : undefined}
        {...props}
      />
      {helpText && (
        <p className="text-xs text-gray-500 mt-1">{helpText}</p> // ⬅️ Display help text
      )}
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
