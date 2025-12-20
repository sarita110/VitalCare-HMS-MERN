// src/hooks/useFormValidation.js
import { useState, useCallback } from "react";
import * as Yup from "yup"; // Using Yup for validation schema

/**
 * Custom hook for handling form state, validation, and submission.
 * @param {object} initialValues - Initial form values.
 * @param {Yup.ObjectSchema} validationSchema - Yup validation schema.
 * @param {function} onSubmit - Async function to execute on valid submission.
 */
const useFormValidation = (initialValues, validationSchema, onSubmit) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null); // Error from onSubmit

  const handleChange = useCallback(
    (event) => {
      const { name, value, type, checked } = event.target;
      setValues((prevValues) => ({
        ...prevValues,
        [name]: type === "checkbox" ? checked : value,
      }));
      // Optionally clear error on change
      if (errors[name]) {
        setErrors((prevErrors) => ({ ...prevErrors, [name]: undefined }));
      }
    },
    [errors]
  );

  // Function to manually set a field's value
  const setFieldValue = useCallback(
    (name, value) => {
      setValues((prevValues) => ({
        ...prevValues,
        [name]: value,
      }));
      if (errors[name]) {
        setErrors((prevErrors) => ({ ...prevErrors, [name]: undefined }));
      }
    },
    [errors]
  );

  const validateForm = useCallback(async () => {
    try {
      await validationSchema.validate(values, { abortEarly: false });
      setErrors({});
      return true;
    } catch (validationErrors) {
      const formattedErrors = {};
      if (validationErrors.inner) {
        validationErrors.inner.forEach((error) => {
          if (error.path && !formattedErrors[error.path]) {
            formattedErrors[error.path] = error.message;
          }
        });
      }
      setErrors(formattedErrors);
      return false;
    }
  }, [values, validationSchema]);

  const handleSubmit = useCallback(
    async (event) => {
      if (event) {
        event.preventDefault();
      }
      setIsSubmitting(true);
      setSubmitError(null);
      const isValid = await validateForm();

      if (isValid) {
        try {
          await onSubmit(values);
          // Optionally reset form on success: setValues(initialValues); setErrors({});
        } catch (error) {
          console.error("Form submission error:", error);
          setSubmitError(
            error?.message || "Submission failed. Please try again."
          );
        }
      }
      setIsSubmitting(false);
    },
    [validateForm, onSubmit, values]
  );

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setIsSubmitting(false);
    setSubmitError(null);
  }, [initialValues]);

  return {
    values,
    errors,
    isSubmitting,
    submitError,
    handleChange,
    handleSubmit,
    setFieldValue, // Expose setFieldValue
    resetForm,
  };
};

export default useFormValidation;
