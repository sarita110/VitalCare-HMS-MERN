// src/services/paymentService.js
import api from "./api";

/**
 * Initiate payment (usually Khalti or creates pending Cash payment).
 * @param {object} paymentData - { paymentFor: 'appointment'|'labTest'|'radiologyTest', itemId: '...', paymentMethod: 'khalti'|'cash' }
 * @returns {Promise<object>} Response containing payment URL/pidx for Khalti or confirmation for Cash.
 */
export const initiatePayment = async (paymentData) => {
  const response = await api.post("/payments/initiate", paymentData);
  // For Khalti: { success, payment: { id, amount, method, paymentUrl, pidx } }
  // For Cash: { success, message, payment: { id, amount, method } }
  return response.data;
};

/**
 * Verify Khalti payment using pidx.
 * @param {object} verificationData - { pidx: '...', purchase_order_id: '...' }
 * @returns {Promise<object>} Response indicating success or failure of verification.
 */
export const verifyKhaltiPayment = async (verificationData) => {
  const response = await api.post("/payments/verify", verificationData);
  // { success, message, payment: { id, amount, status, method, transactionId, date } }
  return response.data;
};

/**
 * Process a cash payment (Receptionist).
 * @param {object} cashPaymentData - { paymentId: '...', receiptNumber: '...', notes: '...' }
 * @returns {Promise<object>} Response data for the processed payment.
 */
export const processCashPayment = async (cashPaymentData) => {
  const response = await api.post("/payments/process-cash", cashPaymentData);
  return response.data; // { success, message, payment }
};

/**
 * Get details of a specific payment.
 * @param {string} id - Payment ID.
 * @returns {Promise<object>} Response data including payment details and related item info.
 */
export const getPaymentDetails = async (id) => {
  const response = await api.get(`/payments/${id}`);
  return response.data; // { success, payment: { ..., relatedItem } }
};

/**
 * Get payments list based on filters and user role.
 * @param {object} params - Query parameters (status, paymentMethod, relatedTo, page, limit)
 * @returns {Promise<object>} Response data including payments list and pagination.
 */
export const getPayments = async (params = {}) => {
  const response = await api.get("/payments", { params });
  return response.data; // { success, payments, pagination }
};

export default {
  initiatePayment,
  verifyKhaltiPayment,
  processCashPayment,
  getPaymentDetails,
  getPayments,
};
