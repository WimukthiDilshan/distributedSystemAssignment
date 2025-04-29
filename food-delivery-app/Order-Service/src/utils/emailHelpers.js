const axios = require('axios');
const { getUserPhone, getRestaurantPhone } = require('./phoneHelpers');

/**
 * Fetches a user's email by their ID
 * @param {string} userId - The ID of the user
 * @param {string} token - JWT token for authorization
 * @returns {Promise<string>} - The user's email
 */
const getUserEmail = async (userId, token) => {
  try {
    const response = await axios.get(`${process.env.AUTH_SERVICE_URL}/api/auth/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data && response.data.email) {
      return response.data.email;
    }
    throw new Error('User email not found');
  } catch (error) {
    console.error('Error fetching user email:', error.message);
    throw error;
  }
};

/**
 * Fetches a restaurant's admin email by restaurant ID
 * @param {string} restaurantId - The ID of the restaurant
 * @param {string} token - JWT token for authorization
 * @returns {Promise<string>} - The restaurant admin's email
 */
const getRestaurantEmail = async (restaurantId) => {
  try {
    const response = await axios.get(
      `${process.env.RESTAURANT_SERVICE_URL}/api/restaurants/internal/${restaurantId}`,
      {
        headers: {
          'x-internal-service': 'true'  // Optional internal flag if you're using it
        }
      }
    );

    if (response.data && response.data.adminEmail) {
      return response.data.adminEmail;
    }

    throw new Error('Admin email not found in Restaurant Service response');
  } catch (error) {
    console.error('[getRestaurantEmail] Error:', error.response?.data?.message || error.message);
    throw new Error('Failed to fetch restaurant admin email');
  }
};


module.exports = {
  getUserEmail,
  getRestaurantEmail,
  getUserPhone,
  getRestaurantPhone
}; 