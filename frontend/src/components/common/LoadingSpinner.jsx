// src/components/common/LoadingSpinner.jsx
import React from "react";
import { ClipLoader } from "react-spinners"; // Using react-spinners

const LoadingSpinner = ({
  loading = true,
  color = "#0284c7",
  size = 35,
  className = "",
  style = {},
}) => {
  if (!loading) return null;

  return (
    <div
      className={`flex justify-center items-center ${className}`}
      style={style}
    >
      <ClipLoader
        color={color}
        loading={loading}
        size={size}
        aria-label="Loading Spinner"
      />
    </div>
  );
};

export default LoadingSpinner;
