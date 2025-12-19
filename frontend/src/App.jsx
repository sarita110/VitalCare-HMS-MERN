// src/App.jsx
import React from "react";
import AppRouter from "./router"; // Import the router configuration
import ContextProvider from "./context/ContextProvider"; // Import the combined context provider
import NotificationContainer from "./components/common/Notification"; // Import toast container

function App() {
  return (
    <ContextProvider>
      <NotificationContainer /> {/* Toast container */}
      <AppRouter /> {/* Render the router */}
    </ContextProvider>
  );
}

export default App;
