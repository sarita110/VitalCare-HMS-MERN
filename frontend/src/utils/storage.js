// src/utils/storage.js

const TOKEN_KEY = "vitalcare_auth_token";
const USER_KEY = "vitalcare_user_info";

/**
 * Get the auth token from local storage.
 * @returns {string | null} The token or null if not found.
 */
export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error("Error getting token from localStorage:", error);
    return null;
  }
};

/**
 * Set the auth token in local storage.
 * @param {string} token - The auth token.
 */
export const setToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (error) {
    console.error("Error setting token in localStorage:", error);
  }
};

/**
 * Remove the auth token from local storage.
 */
export const removeToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error("Error removing token from localStorage:", error);
  }
};

/**
 * Get user info from local storage.
 * @returns {object | null} The user object or null if not found/error.
 */
export const getUser = () => {
  try {
    const userJson = localStorage.getItem(USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error("Error getting user info from localStorage:", error);
    removeUser(); // Clear invalid data
    return null;
  }
};

/**
 * Set user info in local storage.
 * @param {object} user - The user object.
 */
export const setUser = (user) => {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch (error) {
    console.error("Error setting user info in localStorage:", error);
  }
};

/**
 * Remove user info from local storage.
 */
export const removeUser = () => {
  try {
    localStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error("Error removing user info from localStorage:", error);
  }
};

/**
 * Clear all auth-related data (token and user info).
 */
export const clearAuthData = () => {
  removeToken();
  removeUser();
};

export default {
  getToken,
  setToken,
  removeToken,
  getUser,
  setUser,
  removeUser,
  clearAuthData,
};
