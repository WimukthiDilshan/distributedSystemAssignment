const twilio = require('twilio');



// Initialize Twilio client with Account SID and Auth Token
const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

/**
 * Format phone number to ensure proper international format for Sri Lankan numbers
 * @param {string} phoneNumber - The phone number to format
 * @returns {string} - Properly formatted phone number
 */
const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Remove any non-digit characters except '+'
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // For Sri Lankan numbers
  // Format rules based on successful delivery in logs: (LK) +94 7618369946
  
  // If starts with 0, it's a local number, replace with +94
  if (cleaned.startsWith('0')) {
    return '+94' + cleaned.substring(1);
  } 
  // If it starts with 94 without +, add the +
  else if (cleaned.startsWith('94')) {
    return '+' + cleaned;
  } 
  // If already properly formatted with +94, return as is
  else if (cleaned.startsWith('+94')) {
    return cleaned;
  } 
  // If it's a 9 digit number (typical mobile number without country code)
  else if (cleaned.length === 9) {
    return '+94' + cleaned;
  }
  // If it's a 10 digit number and starts with 7 (mobile without country code but with leading 0)
  else if (cleaned.length === 10 && cleaned.startsWith('7')) {
    return '+94' + cleaned;
  }
  
  // If it already has a plus, keep it as is
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // If we get here, it's likely a mobile number without proper formatting
  // Check if it starts with 7 (typical for Sri Lankan mobile)
  if (cleaned.startsWith('7')) {
    return '+94' + cleaned;
  }
  
  // Default to adding Sri Lankan country code
  return '+94' + cleaned;
};

/**
 * Send an SMS notification to a customer about their new order
 * @param {string} phoneNumber - The customer's phone number
 * @param {Object} order - The order details
 * @returns {Promise<boolean>} - Success status
 */
const sendCustomerOrderSMS = async (phoneNumber, order) => {
  try {
    if (!phoneNumber || !phoneNumber.trim()) {
      console.log('No valid phone number provided for customer SMS');
      return false;
    }

    // Format phone number using our helper function
    const formattedNumber = formatPhoneNumber(phoneNumber);
    console.log(`Formatted customer phone number: ${phoneNumber} → ${formattedNumber}`);

    const message = `Your order #${order._id} from ${order.restaurantName} has been received and is pending processing. Total: $${order.totalAmount.toFixed(2)}`;

    // Send the SMS
    await client.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: formattedNumber
    });

    console.log(`Order confirmation SMS sent to customer at ${formattedNumber}`);
    return true;
  } catch (error) {
    console.error('Error sending customer order SMS:', error.message);
    console.error('Phone number attempted:', phoneNumber);
    return false;
  }
};

/**
 * Send an SMS notification to a restaurant about a new order
 * @param {string} phoneNumber - The restaurant's phone number
 * @param {Object} order - The order details
 * @returns {Promise<boolean>} - Success status
 */
const sendRestaurantOrderSMS = async (phoneNumber, order) => {
  try {
    if (!phoneNumber || !phoneNumber.trim()) {
      console.log('No valid phone number provided for restaurant SMS');
      return false;
    }

    // Format phone number using our helper function
    const formattedNumber = formatPhoneNumber(phoneNumber);
    console.log(`Formatted restaurant phone number: ${phoneNumber} → ${formattedNumber}`);

    // Create message for new order
    const message = `New order #${order._id} received! Total: $${order.totalAmount.toFixed(2)}. ${order.items.length} items. Please check your dashboard.`;

    // Send the SMS
    await client.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: formattedNumber
    });

    console.log(`Order notification SMS sent to restaurant at ${formattedNumber}`);
    return true;
  } catch (error) {
    console.error('Error sending restaurant order SMS:', error.message);
    console.error('Phone number attempted:', phoneNumber);
    return false;
  }
};
/**
 * Send an SMS notification to a customer about their order status update
 * @param {Object} order - The order details
 * @param {string} phoneNumber - The customer's phone number
 * @returns {Promise<boolean>} - Success status
 */
const sendOrderStatusUpdateSMS = async (order, phoneNumber) => {
  try {
    if (!phoneNumber || !phoneNumber.trim()) {
      console.log('No valid phone number provided for status update SMS');
      return false;
    }

    // Format phone number
    const formattedNumber = formatPhoneNumber(phoneNumber);
    console.log(`Formatted customer phone number for status update: ${phoneNumber} → ${formattedNumber}`);

    // Define a simple mapping of statuses to custom messages
    const statusMessages = {
      pending: 'Your order has been received and is pending processing.',
      preparing: 'Your order is being prepared by the restaurant.',
      ready: 'Your order is ready and will be delivered shortly.',
      out_for_delivery: 'Your order is out for delivery. It will reach you soon!',
      delivered: 'Your order has been delivered. Enjoy your meal!',
      cancelled: 'Your order has been cancelled.'
    };

    // Choose message based on current order status
    const statusMessage = statusMessages[order.status] || 'Your order status has been updated.';

    // Create final SMS text
    const message = `Order #${order._id} from ${order.restaurantName}: ${statusMessage}`;

    // Send SMS
    await client.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: formattedNumber
    });

    console.log(`Order status update SMS sent to customer at ${formattedNumber}`);
    return true;
  } catch (error) {
    console.error('Error sending order status update SMS:', error.message);
    console.error('Phone number attempted:', phoneNumber);
    return false;
  }
};

module.exports = {
  sendCustomerOrderSMS,
  sendRestaurantOrderSMS,
  sendOrderStatusUpdateSMS
}; 