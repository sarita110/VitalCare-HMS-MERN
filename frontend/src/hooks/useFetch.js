// src/hooks/useFetch.js
import { useState, useEffect, useCallback } from "react";
import api from "../services/api"; // Using the configured Axios instance

/**
 * Custom hook for making API requests.
 * Handles loading, error, and data states.
 * @param {string} url - The API endpoint URL (relative to the base URL in api.js).
 * @param {object} options - Axios request configuration options (method, data, params, etc.).
 * @param {boolean} manual - If true, the fetch is not triggered automatically on mount/url change.
 */
const useFetch = (url, options = {}, manual = false) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(!manual); // Start loading if not manual

  const executeFetch = useCallback(
    async (fetchOptions = options) => {
      setIsLoading(true);
      setError(null);
      setData(null); // Reset data on new fetch

      try {
        const response = await api({
          url,
          ...fetchOptions, // Merge initial options with execution-time options
        });
        setData(response.data);
        return response.data; // Return data on successful execution
      } catch (err) {
        // Error handling is mostly done by the interceptor in api.js
        setError(err?.message || "Failed to fetch data");
        console.error(`Workspace error for ${url}:`, err);
        // Ensure the promise rejects with the error for await users
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [url, options]
  ); // Dependency array needs careful consideration based on how options are used

  useEffect(() => {
    if (!manual) {
      executeFetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, manual]); // Re-fetch if URL changes and not manual

  return { data, error, isLoading, refetch: executeFetch }; // Rename executeFetch to refetch for clarity
};

export default useFetch;
