import axios from 'axios';

// Base URL for Khalti API
const KHALTI_BASE_URL = 'https://dev.khalti.com/api/v2';
const API_KEY = process.env.KHALTI_SECRET_KEY;

/**
 * Initiate payment with Khalti
 * @param {Object} options - Payment details
 * @param {number} options.amount - Amount to charge in paisa (multiply NPR by 100)
 * @param {string} options.purchase_order_id - Order ID reference in your system
 * @param {string} options.purchase_order_name - Order description
 * @param {string} options.return_url - URL where user will be redirected after payment
 * @param {string} options.website_url - Your website URL
 * @param {Object} options.customer_info - Customer info object (name, email, phone)
 * @returns {Promise<Object>} - Response from Khalti API
 */
const initiatePayment = async (options) => {
  try {
    const {
      amount,
      purchase_order_id,
      purchase_order_name,
      return_url,
      website_url,
      customer_info,
      amount_breakdown,
      product_details
    } = options;

    const payload = {
      return_url,
      website_url,
      amount,
      purchase_order_id,
      purchase_order_name,
      customer_info,
      amount_breakdown,
      product_details
    };

    const response = await axios.post(
      `${KHALTI_BASE_URL}/epayment/initiate/`,
      payload,
      {
        headers: {
          'Authorization': `Key ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Khalti initiate payment error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.detail || error.message
    };
  }
};

/**
 * Verify payment after Khalti payment
 * @param {string} pidx - Payment ID from Khalti
 * @returns {Promise<Object>} - Response from Khalti API
 */
const verifyPayment = async (pidx) => {
  try {
    const response = await axios.post(
      `${KHALTI_BASE_URL}/epayment/lookup/`,
      { pidx },
      {
        headers: {
          'Authorization': `Key ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Khalti verify payment error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.detail || error.message
    };
  }
};

/**
 * Get payment status from Khalti
 * @param {string} pidx - Payment ID from Khalti
 * @returns {Promise<Object>} - Payment status details
 */
const getPaymentStatus = async (pidx) => {
  const result = await verifyPayment(pidx);
  
  if (result.success) {
    return {
      success: true,
      status: result.data.status,
      transactionId: result.data.transaction_id,
      amount: result.data.total_amount,
      data: result.data
    };
  } else {
    return {
      success: false,
      error: result.error
    };
  }
};

export default {
  initiatePayment,
  verifyPayment,
  getPaymentStatus
};