// src/components/hospitals/HospitalForm.jsx - Fixed version
import React, { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import FormInput from "../common/FormInput";
import Button from "../common/Button";
import ImageUpload from "../common/ImageUpload";

const hospitalSchema = Yup.object({
  name: Yup.string().required("Hospital name is required"),
  contactNumber: Yup.string().required("Contact number is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  website: Yup.string()
    .url("Invalid URL (e.g., https://example.com)")
    .nullable(),
  description: Yup.string().nullable(),
  // Address validation
  address: Yup.object({
    street: Yup.string().required("Street is required"),
    city: Yup.string().required("City is required"),
    state: Yup.string().required("State/Province is required"),
    zipCode: Yup.string().required("Zip/Postal code is required"),
    country: Yup.string().required("Country is required"),
  }),
});

const HospitalForm = ({ onSubmit, initialValues = null, isLoading }) => {
  const [logoFile, setLogoFile] = useState(null);
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Properly structure initial values
  const getInitialValues = () => {
    return {
      name: initialValues?.name || "",
      contactNumber: initialValues?.contactNumber || "",
      email: initialValues?.email || "",
      website: initialValues?.website || "",
      description: initialValues?.description || "",
      // Properly nest address as an object
      address: {
        street: initialValues?.address?.street || "",
        city: initialValues?.address?.city || "",
        state: initialValues?.address?.state || "",
        zipCode: initialValues?.address?.zipCode || "",
        country: initialValues?.address?.country || "",
      },
    };
  };

  const formik = useFormik({
    initialValues: getInitialValues(),
    validationSchema: hospitalSchema,
    onSubmit: (values) => {
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("email", values.email);
      formData.append("contactNumber", values.contactNumber);

      if (values.website) {
        formData.append("website", values.website);
      }

      if (values.description) {
        formData.append("description", values.description);
      }

      // Handle address fields with dot notation for FormData
      formData.append("address.street", values.address.street);
      formData.append("address.city", values.address.city);
      formData.append("address.state", values.address.state);
      formData.append("address.zipCode", values.address.zipCode);
      formData.append("address.country", values.address.country);

      if (logoFile) {
        formData.append("logo", logoFile);
      }

      onSubmit(formData);
    },
    enableReinitialize: true,
  });

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-4">
      <ImageUpload
        label="Hospital Logo"
        initialImageUrl={initialValues?.logo}
        onChange={(file) => setLogoFile(file)}
        alt={`${formik.values.name || "Hospital"} Logo`}
      />
      <FormInput
        label="Hospital Name"
        id="name"
        name="name"
        required
        value={formik.values.name}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.name && formik.errors.name}
        touched={formik.touched.name}
      />
      <FormInput
        label="Contact Number"
        id="contactNumber"
        name="contactNumber"
        required
        value={formik.values.contactNumber}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.contactNumber && formik.errors.contactNumber}
        touched={formik.touched.contactNumber}
      />
      <FormInput
        label="Email"
        id="email"
        name="email"
        type="email"
        required
        value={formik.values.email}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.email && formik.errors.email}
        touched={formik.touched.email}
      />
      <FormInput
        label="Website (Optional)"
        id="website"
        name="website"
        type="url"
        value={formik.values.website}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.website && formik.errors.website}
        touched={formik.touched.website}
        placeholder="https://example.com"
      />
      <FormInput
        label="Description (Optional)"
        id="description"
        name="description"
        type="textarea"
        rows={3}
        value={formik.values.description}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.description && formik.errors.description}
        touched={formik.touched.description}
      />

      <fieldset className="border p-4 rounded mt-4">
        <legend className="text-sm font-medium px-1">Address</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Street"
            id="address.street"
            name="address.street"
            required
            value={formik.values.address.street}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={
              formik.touched.address?.street && formik.errors.address?.street
            }
            touched={formik.touched.address?.street}
          />
          <FormInput
            label="City"
            id="address.city"
            name="address.city"
            required
            value={formik.values.address.city}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.address?.city && formik.errors.address?.city}
            touched={formik.touched.address?.city}
          />
          <FormInput
            label="State/Province"
            id="address.state"
            name="address.state"
            required
            value={formik.values.address.state}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={
              formik.touched.address?.state && formik.errors.address?.state
            }
            touched={formik.touched.address?.state}
          />
          <FormInput
            label="Zip/Postal Code"
            id="address.zipCode"
            name="address.zipCode"
            required
            value={formik.values.address.zipCode}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={
              formik.touched.address?.zipCode && formik.errors.address?.zipCode
            }
            touched={formik.touched.address?.zipCode}
          />
          <FormInput
            label="Country"
            id="address.country"
            name="address.country"
            required
            value={formik.values.address.country}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={
              formik.touched.address?.country && formik.errors.address?.country
            }
            touched={formik.touched.address?.country}
          />
        </div>
      </fieldset>

      <div className="pt-4 flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => formik.resetForm()}
        >
          Reset
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
          // Allow form submission even with validation errors initially
          disabled={isLoading || (formSubmitted && !formik.isValid)}
          onClick={() => setFormSubmitted(true)}
        >
          {initialValues ? "Update Hospital" : "Create Hospital"}
        </Button>
      </div>
    </form>
  );
};

export default HospitalForm;
