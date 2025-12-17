// src/context/ContextProvider.jsx
import React from "react";
import PropTypes from "prop-types";

// Import all individual providers
import { AuthProvider } from "./AuthContext";
import { AppProvider } from "./AppContext";
import { NotificationProvider } from "./NotificationContext";
import { HospitalProvider } from "./HospitalContext";
import { PatientProvider } from "./PatientContext";
import { AdminProvider } from "./AdminContext";
import { DoctorProvider } from "./DoctorContext";
import { ReceptionistProvider } from "./ReceptionistContext";
import { LabProvider } from "./LabContext";
import { RadiologyProvider } from "./RadiologyContext";
import { SuperAdminProvider } from "./SuperAdminContext";

// This component wraps all individual context providers
const ContextProvider = ({ children }) => {
  return (
    // Order providers: More fundamental contexts wrap others
    <AuthProvider>
      <AppProvider>
        <NotificationProvider>
          <HospitalProvider>
            {" "}
            {/* General hospital data */}
            <PatientProvider>
              <AdminProvider>
                <DoctorProvider>
                  <ReceptionistProvider>
                    <LabProvider>
                      <RadiologyProvider>
                        <SuperAdminProvider>
                          {/* Application components go here */}
                          {children}
                        </SuperAdminProvider>
                      </RadiologyProvider>
                    </LabProvider>
                  </ReceptionistProvider>
                </DoctorProvider>
              </AdminProvider>
            </PatientProvider>
          </HospitalProvider>
        </NotificationProvider>
      </AppProvider>
    </AuthProvider>
  );
};

ContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ContextProvider;
