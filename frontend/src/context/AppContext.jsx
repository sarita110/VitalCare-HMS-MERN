// src/context/AppContext.jsx
import React, { createContext, useState } from "react";
import PropTypes from "prop-types";

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024); // Default open on large screens
  const [theme, setTheme] = useState(
    localStorage.getItem("vitalcare_theme") || "light"
  );
  const [globalLoading, setGlobalLoading] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === "light" ? "dark" : "light";
      localStorage.setItem("vitalcare_theme", newTheme);
      // Add/remove 'dark' class to html or body element
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return newTheme;
    });
  };

  // Apply theme on initial load
  useState(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const value = {
    isSidebarOpen,
    toggleSidebar,
    theme,
    toggleTheme,
    globalLoading,
    setGlobalLoading,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

AppProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AppContext;
