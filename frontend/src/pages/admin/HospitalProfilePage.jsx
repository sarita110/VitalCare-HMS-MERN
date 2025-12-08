// src/pages/admin/HospitalProfilePage.jsx
import React, { useContext, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useFormik } from "formik";
import * as Yup from "yup";
import AdminContext from "../../context/AdminContext";
import adminService from "../../services/adminService"; //
import Card from "../../components/common/Card"; //
import Button from "../../components/common/Button"; //
import FormInput from "../../components/common/FormInput"; //
import ImageUpload from "../../components/common/ImageUpload"; //
import LoadingSpinner from "../../components/common/LoadingSpinner"; //
import {
  BuildingOffice2Icon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";

const hospitalSchema = Yup.object({
  name: Yup.string().required("Hospital name is required"),
  contactNumber: Yup.string().required("Contact number is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  website: Yup.string().url("Invalid URL").nullable(),
  description: Yup.string().nullable(),
  address: Yup.object({
    street: Yup.string().required("Street is required"),
    city: Yup.string().required("City is required"),
    state: Yup.string().required("State is required"),
    zipCode: Yup.string().required("Zip code is required"),
    country: Yup.string().required("Country is required"),
  }).required("Address is required"),
});

const HospitalProfilePage = () => {
  const {
    hospitalProfile,
    loadingProfile,
    profileError,
    updateLocalHospitalProfile,
    fetchHospitalProfile,
  } = useContext(AdminContext);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [logoFile, setLogoFile] = useState(null);

  const formik = useFormik({
    initialValues: {
      name: "",
      contactNumber: "",
      email: "",
      website: "",
      description: "",
      address: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
      },
    },
    validationSchema: hospitalSchema,
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        const formData = new FormData();
        formData.append("name", values.name);
        formData.append("email", values.email);
        formData.append("contactNumber", values.contactNumber);
        formData.append("website", values.website || "");
        formData.append("description", values.description || "");
        // Stringify the address object before appending
        formData.append("address", JSON.stringify(values.address));

        if (logoFile) {
          formData.append("logo", logoFile); // Key matches backend multer field [cite: 2786]
        }

        const response = await adminService.updateAdminHospitalProfile(
          formData
        ); // [cite: 3100]

        if (response.success && response.hospital) {
          updateLocalHospitalProfile(response.hospital); // Update context
          toast.success("Hospital profile updated successfully!");
          setLogoFile(null); // Reset file state
          setIsEditing(false); // Exit edit mode
        } else {
          throw new Error(response.message || "Failed to update profile");
        }
      } catch (error) {
        console.error("Hospital profile update error:", error);
        toast.error(error.message || "Could not update hospital profile.");
      } finally {
        setIsLoading(false);
      }
    },
    enableReinitialize: true, // Update form when context data changes
  });

  // Populate form when hospitalProfile loads or changes
  useEffect(() => {
    if (hospitalProfile) {
      formik.setValues({
        name: hospitalProfile.name || "",
        contactNumber: hospitalProfile.contactNumber || "",
        email: hospitalProfile.email || "",
        website: hospitalProfile.website || "",
        description: hospitalProfile.description || "",
        address: {
          street: hospitalProfile.address?.street || "",
          city: hospitalProfile.address?.city || "",
          state: hospitalProfile.address?.state || "",
          zipCode: hospitalProfile.address?.zipCode || "",
          country: hospitalProfile.address?.country || "",
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalProfile]);

  if (loadingProfile && !hospitalProfile) {
    return <LoadingSpinner />;
  }

  if (profileError) {
    return (
      <div className="text-center text-danger-500 py-4">{profileError}</div>
    );
  }

  if (!hospitalProfile) {
    return (
      <div className="text-center text-gray-500 py-4">
        Hospital profile data not found.
      </div>
    );
  }

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset form to original values if cancelling edit
      formik.resetForm();
      setLogoFile(null);
    }
    setIsEditing(!isEditing);
  };

  const fullAddress = hospitalProfile.address
    ? `${hospitalProfile.address.street}, ${hospitalProfile.address.city}, ${hospitalProfile.address.state} ${hospitalProfile.address.zipCode}, ${hospitalProfile.address.country}`
    : "N/A";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">
          Hospital Profile
        </h1>
        <Button
          onClick={handleEditToggle}
          variant={isEditing ? "outline" : "primary"}
        >
          {isEditing ? "Cancel Edit" : "Edit Profile"}
        </Button>
      </div>

      <Card>
        {!isEditing ? (
          // View Mode
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <img
                src={hospitalProfile.logo || "/default-hospital.png"}
                alt={`${hospitalProfile.name} Logo`}
                className="h-20 w-20 rounded-md object-contain border"
              />
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {hospitalProfile.name}
                </h2>
                <p className="text-sm text-gray-500">
                  {hospitalProfile.description || "No description provided."}
                </p>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center text-sm text-gray-600">
                <BuildingOffice2Icon className="h-5 w-5 mr-2 text-gray-400" />{" "}
                Address: {fullAddress}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <PhoneIcon className="h-5 w-5 mr-2 text-gray-400" /> Contact:{" "}
                {hospitalProfile.contactNumber}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <EnvelopeIcon className="h-5 w-5 mr-2 text-gray-400" /> Email:{" "}
                {hospitalProfile.email}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <GlobeAltIcon className="h-5 w-5 mr-2 text-gray-400" /> Website:{" "}
                {hospitalProfile.website ? (
                  <a
                    href={hospitalProfile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    {hospitalProfile.website}
                  </a>
                ) : (
                  "N/A"
                )}
              </div>
            </div>
          </div>
        ) : (
          // Edit Mode
          <form onSubmit={formik.handleSubmit} className="space-y-4">
            <ImageUpload
              label="Hospital Logo"
              initialImageUrl={hospitalProfile.logo}
              onChange={(file) => setLogoFile(file)}
              alt={`${hospitalProfile.name} Logo`}
            />
            <FormInput
              label="Hospital Name"
              id="name"
              name="name"
              required
              {...formik.getFieldProps("name")}
              error={formik.errors.name}
              touched={formik.touched.name}
            />
            <FormInput
              label="Contact Number"
              id="contactNumber"
              name="contactNumber"
              required
              {...formik.getFieldProps("contactNumber")}
              error={formik.errors.contactNumber}
              touched={formik.touched.contactNumber}
            />
            <FormInput
              label="Email"
              id="email"
              name="email"
              type="email"
              required
              {...formik.getFieldProps("email")}
              error={formik.errors.email}
              touched={formik.touched.email}
            />
            <FormInput
              label="Website (Optional)"
              id="website"
              name="website"
              type="url"
              {...formik.getFieldProps("website")}
              error={formik.errors.website}
              touched={formik.touched.website}
            />
            <FormInput
              label="Description (Optional)"
              id="description"
              name="description"
              type="textarea"
              rows={3}
              {...formik.getFieldProps("description")}
              error={formik.errors.description}
              touched={formik.touched.description}
            />

            <h4 className="text-md font-medium pt-2 border-t mt-4">Address</h4>
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

            <div className="pt-4 flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleEditToggle}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={isLoading}
                disabled={isLoading || !formik.isValid}
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};

export default HospitalProfilePage;
