// src/components/common/Checkbox.jsx
import React from "react";
import PropTypes from "prop-types";

const Checkbox = ({
  label,
  id,
  name,
  checked,
  onChange,
  value,
  disabled = false,
  className = "",
  labelClassName = "",
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <input
        id={id || name}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        value={value}
        disabled={disabled}
        className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {label && (
        <label
          htmlFor={id || name}
          className={`ml-2 block text-sm text-gray-700 cursor-pointer ${labelClassName} ${
            disabled ? "opacity-50" : ""
          }`}
        >
          {label}
        </label>
      )}
    </div>
  );
};

Checkbox.propTypes = {
  label: PropTypes.node,
  id: PropTypes.string,
  name: PropTypes.string,
  checked: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.any,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  labelClassName: PropTypes.string,
};

export default Checkbox;
