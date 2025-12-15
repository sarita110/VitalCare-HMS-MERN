// src/components/users/AdminForm.jsx
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import FormInput from "../common/FormInput";
import Button from "../common/Button";
import Select from "react-select";
import superAdminService from "../../services/superAdminService";

const AdminForm = ({ onSubmit, isLoading = false }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    hospitalId: ""
  });
  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [errors, setErrors] = useState({});

  // Fetch hospitals for dropdown
  useEffect(() => {
    const fetchHospitals = async () => {
      setLoadingHospitals(true);
      try {
        const response = await superAdminService.getHospitals({
          limit: 500,
          status: "active",
        });
        if (response.success) {
          setHospitals(
            response.hospitals.map((h) => ({ value: h._id, label: h.name }))
          );
        }
      } catch (err) {
        console.error("Failed to fetch hospitals:", err);
      } finally {
        setLoadingHospitals(false);
      }
    };
    fetchHospitals();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleHospitalChange = (selectedOption) => {
    setFormData(prev => ({
      ...prev,
      hospitalId: selectedOption ? selectedOption.value : ""
    }));
    // Clear error when field is edited
    if (errors.hospitalId) {
      setErrors(prev => ({ ...prev, hospitalId: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email is invalid";
    if (!formData.hospitalId) newErrors.hospitalId = "Hospital is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const noHospitals = hospitals.length === 0 && !loadingHospitals;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormInput
        label="Full Name"
        id="name"
        name="name"
        value={formData.name}
        onChange={handleInputChange}
        error={errors.name}
        required
      />
      
      <FormInput
        label="Email"
        id="email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleInputChange}
        error={errors.email}
        required
      />
      
      <div>
        <label htmlFor="hospitalId" className="form-label">
          Hospital <span className="text-danger-600">*</span>
        </label>
        <Select
          id="hospitalId"
          name="hospitalId"
          options={hospitals}
          value={hospitals.find(opt => opt.value === formData.hospitalId) || null}
          onChange={handleHospitalChange}
          placeholder="Select hospital..."
          isLoading={loadingHospitals}
          className={errors.hospitalId ? "border-danger-500" : ""}
        />
        {errors.hospitalId && (
          <p className="form-error mt-1">{errors.hospitalId}</p>
        )}
        {noHospitals && (
          <p className="form-error mt-1">
            No hospitals available. Please create a hospital first.
          </p>
        )}
      </div>
      
      <p className="text-sm text-info-600">
        A temporary password will be generated and sent to the admin's email.
      </p>
      
      <div className="pt-4 flex justify-end space-x-3">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => onSubmit(null)} // Cancel action
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={isLoading || noHospitals}
        >
          Create Admin
        </Button>
      </div>
    </form>
  );
};

AdminForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool
};

export default AdminForm;