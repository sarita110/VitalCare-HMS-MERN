// src/components/dashboard/StatCard.jsx
import React from "react";
import Card from "../common/Card"; // Use the common Card component

const StatCard = ({
  title,
  value,
  icon,
  description,
  className = "",
  iconBgColor = "bg-primary-100",
  iconColor = "text-primary-600",
}) => {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="flex items-center">
        <div className={`flex-shrink-0 ${iconBgColor} rounded-md p-3`}>
          {React.cloneElement(icon, {
            className: `h-6 w-6 ${iconColor}`,
            "aria-hidden": "true",
          })}
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd className="text-2xl font-semibold text-gray-900">{value}</dd>
          </dl>
        </div>
      </div>
      {description && (
        <div className="mt-4 text-sm text-gray-500">{description}</div>
      )}
    </Card>
  );
};

export default StatCard;
