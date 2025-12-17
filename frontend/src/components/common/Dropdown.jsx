// src/components/common/Dropdown.jsx
import React, { useState, useRef, useEffect } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";

const Dropdown = ({
  buttonContent,
  children,
  className = "",
  menuClassName = "",
  showChevron = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => setIsOpen(!isOpen);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      className={`relative inline-block text-left ${className}`}
      ref={dropdownRef}
    >
      <div>
        <button
          type="button"
          className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          id="options-menu"
          aria-haspopup="true"
          aria-expanded={isOpen}
          onClick={toggleDropdown}
        >
          {buttonContent}
          {showChevron && (
            <ChevronDownIcon
              className="-mr-1 ml-2 h-5 w-5"
              aria-hidden="true"
            />
          )}
        </button>
      </div>

      {isOpen && (
        <div
          className={`origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10 ${menuClassName}`}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="options-menu"
        >
          <div className="py-1" role="none">
            {/* Wrap children to automatically close dropdown on item click */}
            {React.Children.map(children, (child) =>
              React.isValidElement(child)
                ? React.cloneElement(child, {
                    onClick: (e) => {
                      child.props.onClick?.(e); // Call original onClick if exists
                      setIsOpen(false); // Close dropdown
                    },
                  })
                : child
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Example usage within Dropdown children:
export const DropdownItem = ({ children, onClick, ...props }) => (
  <button
    onClick={onClick}
    className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 hover:text-gray-900"
    role="menuitem"
    {...props}
  >
    {children}
  </button>
);

export default Dropdown;
