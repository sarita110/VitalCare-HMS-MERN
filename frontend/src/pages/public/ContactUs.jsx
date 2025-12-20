// src/pages/public/ContactUs.jsx
import React, { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import Button from "../../components/common/Button"; //
import FormInput from "../../components/common/FormInput"; //
import {
  BuildingOffice2Icon,
  EnvelopeIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";
// Assume a generic contact service/endpoint (needs backend implementation)
// import contactService from '../../services/contactService';

const contactSchema = Yup.object({
  name: Yup.string().required("Your name is required"),
  email: Yup.string()
    .email("Invalid email address")
    .required("Your email is required"),
  subject: Yup.string()
    .required("Subject is required")
    .min(5, "Subject is too short"),
  message: Yup.string()
    .required("Message is required")
    .min(10, "Message is too short"),
});

const ContactUs = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const formik = useFormik({
    initialValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
    validationSchema: contactSchema,
    onSubmit: async (values, { resetForm }) => {
      setIsLoading(true);
      setSubmitSuccess(false); // Reset success state
      try {
        // --- !!! BACKEND NEEDED !!! ---
        // Replace with actual API call to your backend endpoint
        // e.g., await contactService.sendMessage(values);
        console.log("Simulating contact form submission:", values);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate network delay
        // --- End Simulation ---

        toast.success("Your message has been sent successfully!");
        setSubmitSuccess(true);
        resetForm();
      } catch (error) {
        console.error("Contact form submission error:", error);
        toast.error(
          error.message || "Could not send message. Please try again later."
        );
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Contact Us
          </h1>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            Have questions or feedback? We&apos;d love to hear from you.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-16">
          {/* Contact Form */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              Send us a Message
            </h2>
            {submitSuccess ? (
              <div className="p-4 text-center bg-green-50 text-green-700 rounded-md">
                Thank you for your message! We will get back to you soon.
              </div>
            ) : (
              <form onSubmit={formik.handleSubmit} className="space-y-4">
                <FormInput
                  label="Your Name"
                  id="name"
                  name="name"
                  required
                  {...formik.getFieldProps("name")}
                  error={formik.errors.name}
                  touched={formik.touched.name}
                />
                <FormInput
                  label="Your Email"
                  id="email"
                  name="email"
                  type="email"
                  required
                  {...formik.getFieldProps("email")}
                  error={formik.errors.email}
                  touched={formik.touched.email}
                />
                <FormInput
                  label="Subject"
                  id="subject"
                  name="subject"
                  required
                  {...formik.getFieldProps("subject")}
                  error={formik.errors.subject}
                  touched={formik.touched.subject}
                />
                <FormInput
                  label="Message"
                  id="message"
                  name="message"
                  type="textarea"
                  rows={5}
                  required
                  {...formik.getFieldProps("message")}
                  error={formik.errors.message}
                  touched={formik.touched.message}
                />
                <Button
                  type="submit"
                  isLoading={isLoading}
                  disabled={isLoading || !formik.isValid}
                >
                  Send Message
                </Button>
              </form>
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800">
              Contact Information
            </h2>
            <div className="flex items-start space-x-3">
              <BuildingOffice2Icon className="h-6 w-6 text-primary-600 mt-1 shrink-0" />
              <div>
                <h3 className="font-medium text-gray-700">Our Office</h3>
                <p className="text-gray-600">123 Health Lane, Lakeside</p>
                <p className="text-gray-600">
                  Pokhara, Gandaki Province, Nepal
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <EnvelopeIcon className="h-6 w-6 text-primary-600 mt-1 shrink-0" />
              <div>
                <h3 className="font-medium text-gray-700">Email Us</h3>
                <a
                  href="mailto:info@vitalcare.com.np"
                  className="text-primary-600 hover:underline"
                >
                  info@vitalcare.com.np
                </a>
                <p className="text-gray-600 text-sm">For general inquiries</p>
                <a
                  href="mailto:support@vitalcare.com.np"
                  className="text-primary-600 hover:underline"
                >
                  support@vitalcare.com.np
                </a>
                <p className="text-gray-600 text-sm">For technical support</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <PhoneIcon className="h-6 w-6 text-primary-600 mt-1 shrink-0" />
              <div>
                <h3 className="font-medium text-gray-700">Call Us</h3>
                <p className="text-gray-600">+977-61-XXXXXX (Support)</p>
                <p className="text-gray-600">+977-98XXXXXXXX (Sales)</p>
                <p className="text-gray-600 text-sm">
                  Sun - Fri, 9 AM - 5 PM NPT
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
