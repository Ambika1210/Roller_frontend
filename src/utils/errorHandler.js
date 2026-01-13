/**
 * Extract error message from API response
 * @param {Error} error - The error object from axios
 * @returns {string} - User-friendly error message
 */
export const getErrorMessage = (error) => {
  // Check if it's an axios error with response
  if (error.response?.data) {
    // Handle new response helper structure
    if (error.response.data.status === 'Error' && error.response.data.data) {
      return error.response.data.data;
    }
    // Handle old structure
    if (error.response.data.message) {
      return error.response.data.message;
    }
  }
  
  // Check if it's a network error
  if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
    return 'Unable to connect to server. Please check your connection.';
  }
  
  // Check for timeout
  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.';
  }
  
  // Default error message
  return error.message || 'An unexpected error occurred. Please try again.';
};

/**
 * Check if error is a validation error (400 status)
 * @param {Error} error - The error object from axios
 * @returns {boolean} - True if it's a validation error
 */
export const isValidationError = (error) => {
  return error.response?.status === 400;
};

/**
 * Check if error is an authentication error (401 status)
 * @param {Error} error - The error object from axios
 * @returns {boolean} - True if it's an authentication error
 */
export const isAuthError = (error) => {
  return error.response?.status === 401;
};

/**
 * Check if error is a server error (500+ status)
 * @param {Error} error - The error object from axios
 * @returns {boolean} - True if it's a server error
 */
export const isServerError = (error) => {
  return error.response?.status >= 500;
};