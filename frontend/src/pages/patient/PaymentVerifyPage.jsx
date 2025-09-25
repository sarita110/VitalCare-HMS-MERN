// src/pages/patient/PaymentVerifyPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
// Remove unused service import if not needed elsewhere in this file
// import paymentService from "../../services/paymentService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import Button from "../../components/common/Button";
import api from "../../services/api"; // Use raw api call for the new GET endpoint
import {
  formatCurrency,
  formatDateTime,
  getDisplayStatus,
  getStatusBadgeClass,
} from "../../utils/helpers"; // Import getDisplayStatus

const PaymentVerifyPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState("pending"); // pending, success, failed
  const [message, setMessage] = useState(
    "Verifying your payment, please wait..."
  );
  const [paymentDetails, setPaymentDetails] = useState(null);

  const verifyCallback = useCallback(async () => {
    setIsLoading(true);
    setVerificationStatus("pending");
    setMessage("Verifying your payment with server, please wait...");

    // Extract parameters from URL
    const pidx = searchParams.get("pidx");
    const purchase_order_id = searchParams.get("purchase_order_id");
    const amount = searchParams.get("amount"); // Khalti often includes amount
    const transaction_id = searchParams.get("transaction_id"); // Khalti transaction ID
    const status = searchParams.get("status"); // Khalti status ('Completed', 'Pending', etc.)
    const messageParam = searchParams.get("message"); // Optional message from Khalti

    // Basic validation of Khalti callback parameters
    if (!pidx || !purchase_order_id || !amount || !transaction_id || !status) {
      setMessage(
        "Invalid payment verification link. Missing parameters from Khalti."
      );
      setVerificationStatus("failed");
      setIsLoading(false);
      toast.error("Invalid payment verification link.");
      return;
    }

    // Prepare parameters to send to backend
    const paramsToSend = {
      pidx,
      purchase_order_id,
      transaction_id,
      status,
      amount,
      // You can optionally include messageParam if your backend needs it
      // message: messageParam
    };

    // ---- CORRECTED LOGGING ----
    console.log(
      "Calling backend /payments/verify-callback with params:",
      paramsToSend
    );
    // ---- END CORRECTION ----

    // If Khalti status is Completed (or potentially others), verify with backend
    try {
      // Make GET request to your backend endpoint
      const response = await api.get("/payments/verify-callback", {
        params: paramsToSend, // Axios uses 'params' for GET query parameters
      });

      // Process response from YOUR backend
      if (
        response.data.success &&
        response.data.payment?.status === "completed"
      ) {
        setVerificationStatus("success");
        setMessage(response.data.message || "Payment verified successfully!");
        setPaymentDetails(response.data.payment); // Store details from your DB
        toast.success("Payment verified successfully!");
      } else {
        setVerificationStatus("failed");
        setMessage(
          response.data.message || "Payment verification failed on the server."
        );
        setPaymentDetails(response.data.payment); // Store details even if failed
        toast.error(response.data.message || "Payment verification failed.");
      }
    } catch (error) {
      console.error(
        "Backend payment verification error:",
        error.response?.data || error.message || error
      );
      setVerificationStatus("failed");

      // Extract meaningful error message
      const errMsg =
        error?.response?.data?.message || // Prefer backend message
        error?.response?.data?.error || // Backend error detail
        error?.message || // Axios or network error message
        "An error occurred during server verification.";

      setMessage(`${errMsg} Please contact support if payment was deducted.`);
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Rerun if query params change

  useEffect(() => {
    verifyCallback();
  }, [verifyCallback]);

  // --- Rest of the component remains the same ---
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center px-4 py-12">
      {isLoading && (
        <>
          <LoadingSpinner size={50} />
          <p className="mt-4 text-lg text-gray-600">{message}</p>
        </>
      )}

      {!isLoading && verificationStatus === "success" && (
        <>
          <CheckCircleIcon className="w-16 h-16 text-success-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Payment Successful!
          </h1>
          <p className="text-gray-600 mb-6">{message}</p>
          {/* Display details received from YOUR backend */}
          {paymentDetails && (
            <div className="text-sm text-left text-gray-700 mb-6 border p-4 rounded bg-green-50 max-w-md w-full shadow-sm">
              <h3 className="font-semibold text-base mb-2 text-gray-800">
                Payment Confirmation
              </h3>
              <p>
                <strong>Transaction ID:</strong>{" "}
                {paymentDetails.transactionId || "N/A"}
              </p>
              <p>
                <strong>Amount Paid:</strong>{" "}
                {formatCurrency(paymentDetails.amount)}
              </p>
              <p>
                <strong>Payment Date:</strong>{" "}
                {formatDateTime(paymentDetails.date)}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={`font-semibold px-2 py-0.5 rounded text-xs ${getStatusBadgeClass(
                    paymentDetails.status
                  )}`}
                >
                  {getDisplayStatus(paymentDetails.status)}
                </span>
              </p>
              {/* You might want to fetch and display what was paid for */}
              {/* <p><strong>For:</strong> {paymentDetails.relatedItem?.type || 'N/A'}</p> */}
            </div>
          )}
          <div className="flex space-x-4">
            <Link to="/patient/payments">
              <Button variant="outline">View Payment History</Button>
            </Link>
            <Link to="/patient/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </div>
        </>
      )}

      {!isLoading && verificationStatus === "failed" && (
        <>
          <XCircleIcon className="w-16 h-16 text-danger-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Payment Verification Failed
          </h1>
          <p className="text-gray-600 mb-6 max-w-lg">{message}</p>
          {paymentDetails && ( // Show details even on failure if available
            <div className="text-sm text-left text-gray-700 mb-6 border p-4 rounded bg-red-50 max-w-md w-full shadow-sm">
              <h3 className="font-semibold text-base mb-2 text-gray-800">
                Attempted Payment Details
              </h3>
              <p>
                <strong>Order ID:</strong>{" "}
                {searchParams.get("purchase_order_id")}
              </p>
              {/* Check if amount exists before formatting */}
              {paymentDetails.amount !== undefined &&
                paymentDetails.amount !== null && (
                  <p>
                    <strong>Attempted Amount:</strong>{" "}
                    {formatCurrency(paymentDetails.amount)}
                  </p>
                )}
              {paymentDetails.status && (
                <p>
                  <strong>Final Status:</strong>{" "}
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-xs ${getStatusBadgeClass(
                      paymentDetails.status
                    )}`}
                  >
                    {getDisplayStatus(paymentDetails.status)}
                  </span>
                </p>
              )}
              {paymentDetails.notes && (
                <p>
                  <strong>Notes:</strong> {paymentDetails.notes}
                </p>
              )}
              {/* Check if date exists before formatting */}
              {paymentDetails.date && (
                <p>
                  <strong>Attempt Date:</strong>{" "}
                  {formatDateTime(paymentDetails.date)}
                </p>
              )}
            </div>
          )}
          <div className="flex space-x-4">
            <Link to="/patient/payments">
              <Button variant="outline">View Payment History</Button>
            </Link>
            <Link to="/patient/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default PaymentVerifyPage;
