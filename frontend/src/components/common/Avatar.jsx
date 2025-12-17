// src/components/common/Avatar.jsx
import React, { useState } from "react"; // Import useState
import { UserIcon } from "@heroicons/react/24/solid";

const Avatar = ({ src, alt = "User Avatar", size = "md", className = "" }) => {
  const [imageError, setImageError] = useState(false); // State to track loading errors

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14",
    xl: "h-20 w-20",
  };

  const handleImageError = () => {
    setImageError(true); // Set error state to true if image fails to load
  };

  // Determine if the fallback icon should be shown
  const showFallbackIcon = !src || imageError;

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden bg-gray-200 rounded-full ${sizeClasses[size]} ${className}`}
    >
      {/* Conditionally render image only if there's a src and no error */}
      {src && !imageError && (
        <img
          src={src}
          alt={alt}
          className="object-cover w-full h-full"
          onError={handleImageError} // Use the new error handler
        />
      )}

      {/* Conditionally render fallback icon */}
      {showFallbackIcon && (
        <UserIcon
          className={`absolute text-gray-500 ${
            size === "sm"
              ? "h-5 w-5"
              : size === "md"
              ? "h-6 w-6"
              : size === "lg"
              ? "h-8 w-8"
              : "h-12 w-12" // Adjust icon size based on avatar size
          }`}
        />
      )}
    </div>
  );
};

export default Avatar;
