const nodemailer = require('nodemailer');
const { sendCustomerOrderSMS, sendRestaurantOrderSMS,sendOrderStatusUpdateSMS } = require('./smsService');

// Create reusable transporter
const createTransporter = () => {
  // For production, use your actual SMTP credentials
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Send order confirmation email to customer
const sendOrderConfirmationEmail = async (order, customerEmail, customerPhone = null) => {
  try {
    const transporter = createTransporter();
    
    // Format order items for email
    const itemsList = order.items.map(item => 
      `${item.name} (${item.size}) - Quantity: ${item.quantity} - Price: $${item.price.toFixed(2)}`
    ).join('\n');
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: `Order Confirmation #${order._id}`,
      html: `
        <h2>Order Confirmation</h2>
        <p>Dear Customer,</p>
        <p>Thank you for your order! Your order #${order._id} has been received and is now being processed.</p>
        
        <h3>Order Details:</h3>
        <p><strong>Restaurant:</strong> ${order.restaurantName}</p>
        <p><strong>Status:</strong> ${order.status}</p>
        <p><strong>Total Amount:</strong> $${order.totalAmount.toFixed(2)}</p>
        <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
        <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
        
        <h3>Items:</h3>
        <pre>${itemsList}</pre>
        
        <h3>Delivery Address:</h3>
        <p>${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.zipCode}</p>
        
        <p>We'll notify you when your order status changes.</p>
        <p>Thank you for choosing our service!</p>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Order confirmation email sent to ${customerEmail}`);
    
    // Also send SMS if phone number is available
    if (customerPhone) {
      await sendCustomerOrderSMS(customerPhone, order);
    }
    
    return true;
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    return false;
  }
};

// Send order notification to restaurant
const sendRestaurantOrderNotification = async (order, restaurantEmail, restaurantPhone = null) => {
  try {
    const transporter = createTransporter();
    
    // Format order items for email
    const itemsList = order.items.map(item => 
      `${item.name} (${item.size}) - Quantity: ${item.quantity} - Price: $${item.price.toFixed(2)}`
    ).join('\n');
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: restaurantEmail,
      subject: `New Order #${order._id}`,
      html: `
        <h2>New Order Received</h2>
        <p>You have received a new order (#${order._id}).</p>
        
        <h3>Order Details:</h3>
        <p><strong>Order ID:</strong> ${order._id}</p>
        <p><strong>Total Amount:</strong> $${order.totalAmount.toFixed(2)}</p>
        <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
        
        <h3>Items:</h3>
        <pre>${itemsList}</pre>
        
        <p>Please log in to your dashboard to accept and process this order.</p>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Order notification email sent to restaurant ${restaurantEmail}`);
    
    // Also send SMS if phone number is available
    if (restaurantPhone) {
      await sendRestaurantOrderSMS(restaurantPhone, order);
    }
    
    return true;
  } catch (error) {
    console.error('Error sending restaurant order notification:', error);
    return false;
  }
};

// Send order status update email to customer
const sendOrderStatusUpdateEmail = async (order, customerEmail, customerPhone = null) => {
  try {
    const transporter = createTransporter();
    
    const statusMessages = {
      preparing: 'The restaurant is now preparing your order.',
      ready: 'Your order is ready. It will be delivered by the delivery person.', // updated message here
    };
    
    const statusMessage = statusMessages[order.status] || 'Your order status has been updated.';
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: `Order #${order._id} Status Update`,
      html: `
        <h2>Order Status Update</h2>
        <p>Dear Customer,</p>
        <p>Your order #${order._id} from ${order.restaurantName} has been updated.</p>
        <p><strong>New Status:</strong> ${order.status}</p>
        <p>${statusMessage}</p>
        
        <p>Thank you for choosing our service!</p>
      `
    };
    
    // Send Email
    await transporter.sendMail(mailOptions);
    console.log(`Order status update email sent to ${customerEmail}`);
    
    // If customerPhone is provided, send SMS too
    if (customerPhone) {
      await sendOrderStatusUpdateSMS(order, customerPhone);
      console.log(`Order status update SMS sent to ${customerPhone}`);
    } else {
      console.log('No phone number provided for SMS. Skipping SMS sending.');
    }
    
    return true;
  } catch (error) {
    console.error('Error sending order status update email and SMS:', error);
    return false;
  }
};


module.exports = {
  sendOrderConfirmationEmail,
  sendRestaurantOrderNotification,
  sendOrderStatusUpdateEmail
}; 