// src/pages/receptionist/RegisterPatientPage.jsx
import React, { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import receptionistService from "../../services/receptionistService"; //
import Card from "../../components/common/Card"; //
import Button from "../../components/common/Button"; //
import FormInput from "../../components/common/FormInput"; //
import ImageUpload from "../../components/common/ImageUpload"; //
import { useFormik } from "formik";
import * as Yup from "yup";

// More detailed schema for manual registration
const patientRegistrationSchema = Yup.object({
  name: Yup.string().required("Name is required").min(2),
  email: Yup.string().email("Invalid email").required("Email is required"),
  phone: Yup.string()
    .matches(/^(?:\+977|0)?(?:98|97)\d{8}$/, {
      message: "Invalid Nepali phone number",
      excludeEmptyString: true,
    })
    .nullable(),
  dob: Yup.date()
    .required("Date of Birth is required")
    .max(new Date(), "Date of Birth cannot be in the future"),
  gender: Yup.string()
    .required("Gender is required")
    .oneOf(["Male", "Female", "Other"]),
  bloodGroup: Yup.string()
    .oneOf(
      ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""],
      "Invalid blood group"
    )
    .nullable(),
  address: Yup.object({
    street: Yup.string().required("Street is required"),
    city: Yup.string().required("City is required"),
    state: Yup.string().required("State is required"),
    zipCode: Yup.string().required("Zip code is required"),
    country: Yup.string().required("Country is required"),
  }),
  emergencyContact: Yup.object({
    name: Yup.string().required("Emergency contact name is required"),
    relationship: Yup.string().required("Relationship is required"),
    phone: Yup.string()
      .matches(/^(?:\+977|0)?(?:98|97)\d{8}$/, {
        message: "Invalid Nepali phone number",
        excludeEmptyString: false,
      })
      .required("Emergency contact phone is required"),
  }),
  allergies: Yup.string().nullable(), // Handle as comma-separated string
  chronicDiseases: Yup.string().nullable(), // Handle as comma-separated string
  // Insurance info can be added here if needed by receptionists
});

const RegisterPatientPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState(null);

  const formik = useFormik({
    initialValues: {
      name: "",
      email: "",
      phone: "",
      dob: "",
      gender: "",
      bloodGroup: "",
      address: { street: "", city: "", state: "", zipCode: "", country: "" },
      emergencyContact: { name: "", relationship: "", phone: "" },
      allergies: "",
      chronicDiseases: "",
    },
    validationSchema: patientRegistrationSchema,
    onSubmit: async (values, { resetForm }) => {
      setIsLoading(true);
      try {
        const formData = new FormData();
        // Append basic info
        formData.append("name", values.name);
        formData.append("email", values.email);
        formData.append("phone", values.phone || "");
        formData.append("dob", values.dob);
        formData.append("gender", values.gender);
        formData.append("bloodGroup", values.bloodGroup || "");

        // Append stringified objects/arrays
        formData.append("address", JSON.stringify(values.address));
        formData.append(
          "emergencyContact",
          JSON.stringify(values.emergencyContact)
        );
        formData.append(
          "allergies",
          JSON.stringify(
            values.allergies
              ? values.allergies
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : []
          )
        );
        formData.append(
          "chronicDiseases",
          JSON.stringify(
            values.chronicDiseases
              ? values.chronicDiseases
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : []
          )
        );

        if (profileImageFile) {
          formData.append("image", profileImageFile);
        }

        const response = await receptionistService.registerPatient(formData); //

        if (response.success && response.patient) {
          toast.success("Patient registered successfully!");
          resetForm();
          setProfileImageFile(null);
          // Optionally navigate to the new patient's details page or back to dashboard
          // navigate(`/receptionist/patients/${response.patient._id}`);
          navigate("/receptionist/dashboard");
        } else {
          throw new Error(response.message || "Failed to register patient");
        }
      } catch (error) {
        console.error("Register patient error:", error);
        toast.error(error.message || "Could not register patient.");
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">
        Register New Patient
      </h1>
      <Card>
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <h3 className="text-lg font-medium mb-3 border-b pb-2">
            Personal Information
          </h3>
          <ImageUpload
            label="Profile Picture (Optional)"
            onChange={setProfileImageFile}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Full Name"
              id="name"
              name="name"
              required
              {...formik.getFieldProps("name")}
              error={formik.errors.name}
              touched={formik.touched.name}
            />
            <FormInput
              label="Email Address"
              id="email"
              name="email"
              type="email"
              required
              {...formik.getFieldProps("email")}
              error={formik.errors.email}
              touched={formik.touched.email}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormInput
              label="Phone Number"
              id="phone"
              name="phone"
              {...formik.getFieldProps("phone")}
              error={formik.errors.phone}
              touched={formik.touched.phone}
            />
            <FormInput
              label="Date of Birth"
              id="dob"
              name="dob"
              type="date"
              required
              max={new Date().toISOString().split("T")[0]}
              {...formik.getFieldProps("dob")}
              error={formik.errors.dob}
              touched={formik.touched.dob}
            />
            <div>
              <label htmlFor="gender" className="form-label">
                Gender <span className="text-danger-600">*</span>
              </label>
              <select
                id="gender"
                name="gender"
                required
                {...formik.getFieldProps("gender")}
                className={`form-input ${
                  formik.touched.gender && formik.errors.gender
                    ? "border-danger-500"
                    : ""
                }`}
              >
                <option value="" disabled>
                  Select...
                </option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {formik.touched.gender && formik.errors.gender ? (
                <p className="form-error">{formik.errors.gender}</p>
              ) : null}
            </div>
          </div>
          <FormInput
            label="Blood Group"
            id="bloodGroup"
            name="bloodGroup"
            {...formik.getFieldProps("bloodGroup")}
            error={formik.errors.bloodGroup}
            touched={formik.touched.bloodGroup}
          />

          <h3 className="text-lg font-medium mb-3 border-b pb-2 pt-4">
            Address Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Street"
              id="address.street"
              name="address.street"
              required
              {...formik.getFieldProps("address.street")}
              error={formik.errors.address?.street}
              touched={formik.touched.address?.street}
            />
            <FormInput
              label="City"
              id="address.city"
              name="address.city"
              required
              {...formik.getFieldProps("address.city")}
              error={formik.errors.address?.city}
              touched={formik.touched.address?.city}
            />
            <FormInput
              label="State"
              id="address.state"
              name="address.state"
              required
              {...formik.getFieldProps("address.state")}
              error={formik.errors.address?.state}
              touched={formik.touched.address?.state}
            />
            <FormInput
              label="Zip Code"
              id="address.zipCode"
              name="address.zipCode"
              required
              {...formik.getFieldProps("address.zipCode")}
              error={formik.errors.address?.zipCode}
              touched={formik.touched.address?.zipCode}
            />
            <FormInput
              label="Country"
              id="address.country"
              name="address.country"
              required
              {...formik.getFieldProps("address.country")}
              error={formik.errors.address?.country}
              touched={formik.touched.address?.country}
            />
          </div>

          <h3 className="text-lg font-medium mb-3 border-b pb-2 pt-4">
            Emergency Contact
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormInput
              label="Contact Name"
              id="emergencyContact.name"
              name="emergencyContact.name"
              required
              {...formik.getFieldProps("emergencyContact.name")}
              error={formik.errors.emergencyContact?.name}
              touched={formik.touched.emergencyContact?.name}
            />
            <FormInput
              label="Relationship"
              id="emergencyContact.relationship"
              name="emergencyContact.relationship"
              required
              {...formik.getFieldProps("emergencyContact.relationship")}
              error={formik.errors.emergencyContact?.relationship}
              touched={formik.touched.emergencyContact?.relationship}
            />
            <FormInput
              label="Contact Phone"
              id="emergencyContact.phone"
              name="emergencyContact.phone"
              type="tel"
              required
              {...formik.getFieldProps("emergencyContact.phone")}
              error={formik.errors.emergencyContact?.phone}
              touched={formik.touched.emergencyContact?.phone}
            />
          </div>

          <h3 className="text-lg font-medium mb-3 border-b pb-2 pt-4">
            Medical Information (Optional)
          </h3>
          <FormInput
            label="Allergies (comma-separated)"
            id="allergies"
            name="allergies"
            type="textarea"
            rows={2}
            {...formik.getFieldProps("allergies")}
            error={formik.errors.allergies}
            touched={formik.touched.allergies}
          />
          <FormInput
            label="Chronic Diseases (comma-separated)"
            id="chronicDiseases"
            name="chronicDiseases"
            type="textarea"
            rows={2}
            {...formik.getFieldProps("chronicDiseases")}
            error={formik.errors.chronicDiseases}
            touched={formik.touched.chronicDiseases}
          />

          <div className="pt-4 flex justify-end">
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={isLoading || !formik.isValid}
            >
              Register Patient
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default RegisterPatientPage;
