// src/components/common/ImageUpload.jsx
import React, { useState, useRef } from "react";
import {
  ArrowUpTrayIcon,
  PhotoIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import Avatar from "./Avatar"; // Reuse Avatar for preview

const ImageUpload = ({
  label = "Upload Image",
  id = "image-upload",
  name = "image",
  onChange, // Callback function receiving the file object
  initialImageUrl = null, // URL of an existing image to display initially
  alt = "Image preview",
  className = "",
  labelClassName = "",
  error = null,
}) => {
  const [preview, setPreview] = useState(initialImageUrl);
  const [fileName, setFileName] = useState(
    initialImageUrl ? "Current Image" : ""
  );
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result); // Set preview URL
      };
      reader.readAsDataURL(file);
      setFileName(file.name);
      if (onChange) {
        onChange(file); // Pass the file object to the parent
      }
    } else {
      // Handle case where file selection is cancelled
      // If there was an initial image, keep it, otherwise clear preview
      // setPreview(initialImageUrl);
      // setFileName(initialImageUrl ? 'Current Image' : '');
      // if (onChange) {
      //   onChange(null);
      // }
      // Let's just keep the current preview if selection is cancelled
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click(); // Trigger hidden file input click
  };

  const handleRemoveImage = (event) => {
    event.stopPropagation(); // Prevent triggering the file input again
    setPreview(null);
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Clear the file input
    }
    if (onChange) {
      onChange(null); // Notify parent that image is removed
    }
  };

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label
          className={`form-label block text-sm font-medium text-gray-700 mb-2 ${labelClassName}`}
        >
          {label}
        </label>
      )}
      <div className="flex items-center space-x-4">
        {/* Image Preview */}
        <div className="shrink-0">
          {preview ? (
            <div className="relative group">
              <Avatar src={preview} alt={alt} size="lg" />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-0 right-0 p-0.5 bg-white rounded-full text-gray-500 hover:text-danger-600 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
                title="Remove image"
              >
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="h-14 w-14 rounded-full bg-gray-200 flex items-center justify-center">
              <PhotoIcon className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Upload Button and File Name */}
        <div className="flex-1">
          <input
            type="file"
            id={id}
            name={name}
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden" // Hide the default file input
            accept="image/png, image/jpeg, image/gif, image/webp" // Specify accepted image types
          />
          <button
            type="button"
            onClick={handleButtonClick}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <ArrowUpTrayIcon
              className="-ml-0.5 mr-2 h-4 w-4"
              aria-hidden="true"
            />
            {preview ? "Change" : "Upload"} image
          </button>
          {fileName && !preview && (
            <span className="ml-3 text-sm text-gray-600 truncate">
              {fileName}
            </span>
          )}
        </div>
      </div>
      {error && (
        <p className="form-error mt-2 text-xs text-danger-600">{error}</p>
      )}
    </div>
  );
};

export default ImageUpload;
