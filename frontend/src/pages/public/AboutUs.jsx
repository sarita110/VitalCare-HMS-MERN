// src/pages/public/AboutUs.jsx
import React from "react";
import {
  LifebuoyIcon,
  ScaleIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";

const AboutUs = () => {
  return (
    <div className="bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            About VitalCare
          </h1>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            Connecting patients, doctors, and hospitals for a healthier future.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="mt-16 grid grid-cols-1 gap-y-16 lg:grid-cols-2 lg:gap-x-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">
              Our Mission
            </h2>
            <p className="mt-4 text-gray-600">
              To revolutionize healthcare access and management by providing an
              integrated, efficient, and user-friendly platform that empowers
              patients, supports healthcare professionals, and streamlines
              hospital operations across Nepal.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">Our Vision</h2>
            <p className="mt-4 text-gray-600">
              To be the leading digital health ecosystem in the region,
              fostering better health outcomes through technology,
              collaboration, and patient-centric care for everyone, everywhere.
            </p>
          </div>
        </div>

        {/* Values/Features */}
        <div className="mt-16">
          <h2 className="text-2xl font-semibold text-center text-gray-800 mb-10">
            What We Stand For
          </h2>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3 lg:gap-y-16">
            <div className="relative pl-16">
              <dt className="text-base font-semibold leading-7 text-gray-900">
                <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                  <HeartIcon
                    className="h-6 w-6 text-white"
                    aria-hidden="true"
                  />
                </div>
                Patient-Centricity
              </dt>
              <dd className="mt-2 text-base leading-7 text-gray-600">
                Putting patients at the heart of everything we do, ensuring easy
                access, clear communication, and control over their health
                journey.
              </dd>
            </div>
            <div className="relative pl-16">
              <dt className="text-base font-semibold leading-7 text-gray-900">
                <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                  <ScaleIcon
                    className="h-6 w-6 text-white"
                    aria-hidden="true"
                  />
                </div>
                Efficiency & Integration
              </dt>
              <dd className="mt-2 text-base leading-7 text-gray-600">
                Streamlining workflows for hospitals and doctors, reducing
                administrative burden, and enabling better focus on care
                delivery.
              </dd>
            </div>
            <div className="relative pl-16">
              <dt className="text-base font-semibold leading-7 text-gray-900">
                <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                  <LifebuoyIcon
                    className="h-6 w-6 text-white"
                    aria-hidden="true"
                  />
                </div>
                Reliability & Security
              </dt>
              <dd className="mt-2 text-base leading-7 text-gray-600">
                Building a robust and secure platform that healthcare providers
                and patients can trust with sensitive health information.
              </dd>
            </div>
          </dl>
        </div>

        {/* Team Section (Placeholder) */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Our Team
          </h2>
          <p className="text-gray-600">
            VitalCare is built by a dedicated team of healthcare professionals,
            technologists, and designers passionate about improving healthcare
            in Nepal. (Team details coming soon!)
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
