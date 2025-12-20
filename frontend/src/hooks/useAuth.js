// src/hooks/useAuth.js
import { useContext } from "react";
import AuthContext from "../context/AuthContext";

/**
 * Custom hook to access the authentication context.
 * Provides user info, auth status, login/logout functions.
 */
const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default useAuth;
