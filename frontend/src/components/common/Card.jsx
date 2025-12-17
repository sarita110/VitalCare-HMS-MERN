// src/components/common/Card.jsx
import React from "react";

const Card = ({
  title,
  children,
  className = "",
  actions,
  titleClassName = "",
  bodyClassName = "",
}) => {
  return (
    <div
      className={`form-input bg-white overflow-hidden ${className}`}
    >
      {(title || actions) && (
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          {title && (
            <h3
              className={`text-lg leading-6 font-medium text-gray-900 ${titleClassName}`}
            >
              {title}
            </h3>
          )}
          {actions && <div className="ml-4 flex-shrink-0">{actions}</div>}
        </div>
      )}
      <div className={`px-4 py-5 sm:p-6 ${bodyClassName}`}>{children}</div>
    </div>
  );
};

export default Card;
