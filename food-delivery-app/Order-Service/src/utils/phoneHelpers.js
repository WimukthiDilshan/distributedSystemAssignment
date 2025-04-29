const axios = require('axios');

/**
 * Fetches a user's phone number by their ID
 * @param {string} userId - The ID of the user
 * @param {string} token - JWT token for authorization
 * @returns {Promise<string>} - The user's phone number
 */
const getUserPhone = async (userId, token) => {
  try {
    const response = await axios.get(`${process.env.AUTH_SERVICE_URL}/api/auth/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data && response.data.phone) {
      return response.data.phone;
    }
    console.log('User phone not found, using email notifications only');
    return null;
  } catch (error) {
    console.error('Error fetching user phone:', error.message);
    return null; // Return null instead of throwing, so we can fall back to email
  }
};

/**
 * Fetches a restaurant's phone number by restaurant ID
 * @param {string} restaurantId - The ID of the restaurant
 * @returns {Promise<string>} - The restaurant's phone number
 */
const getRestaurantPhone = async (restaurantId) => {
  try {
    const response = await axios.get(
      `${process.env.RESTAURANT_SERVICE_URL}/api/restaurants/internal/${restaurantId}`,
      {
        headers: {
          'x-internal-service': 'true'
        }
      }
    );

    if (response.data && response.data.phoneNumber) {
      return response.data.phoneNumber;
    }

    console.log('Restaurant phone not found, using email notifications only');
    return null;
  } catch (error) {
    console.error('[getRestaurantPhone] Error:', error.response?.data?.message || error.message);
    return null; // Return null instead of throwing, so we can fall back to email
  }
};

module.exports = {
  getUserPhone,
  getRestaurantPhone
}; 