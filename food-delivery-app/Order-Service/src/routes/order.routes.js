const express = require('express');
const Order = require('../models/order.model');
const Cart = require('../models/cart.model');
const { auth, checkRole } = require('../middleware/auth.middleware');
const { compareIds, toIdString } = require('../utils/idHelpers');
const { sendOrderConfirmationEmail, sendRestaurantOrderNotification, sendOrderStatusUpdateEmail } = require('../utils/emailService');
const { getUserEmail, getRestaurantEmail, getUserPhone, getRestaurantPhone } = require('../utils/emailHelpers');

const router = express.Router();

// Create a new order from cart
router.post('/', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.userId });
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const { deliveryAddress, paymentMethod } = req.body;
    
    // More lenient address validation
    if (!deliveryAddress || !deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.state) {
      return res.status(400).json({ message: 'Street, city and state are required in delivery address' });
    }

    // Make sure zipCode exists, even if empty
    if (!deliveryAddress.zipCode) {
      deliveryAddress.zipCode = '00000'; // Default value
    }

    if (!paymentMethod || !['cash', 'card', 'wallet'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Valid payment method is required' });
    }

    // All items in cart are from the same restaurant
    const restaurantId = cart.items[0].restaurantId;
    const restaurantName = cart.items[0].restaurantName;

    const order = new Order({
      userId: req.user.userId,
      restaurantId,
      restaurantName,
      items: cart.items.map(item => ({
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size
      })),
      totalAmount: cart.totalAmount,
      status: 'pending',
      deliveryAddress,
      paymentStatus: paymentMethod === 'card' ? 'pending' : 'completed',
      paymentMethod
    });

    await order.save();

    // Clear the cart only if not using card payment (for card payment, we clear after successful payment)
    if (paymentMethod !== 'card') {
      cart.items = [];
      await cart.save();
    }

    // Send email and SMS notifications for order creation
    try {
      const token = req.header('Authorization').split(' ')[1];
      
      // Get customer email and phone for SMS + email notifications
      const customerEmail = await getUserEmail(req.user.userId, token);
      const customerPhone = await getUserPhone(req.user.userId, token);
      
      // Send confirmation email and SMS to customer
      await sendOrderConfirmationEmail(order, customerEmail, customerPhone);
      
      // Get restaurant email and phone for SMS + email notifications
      const restaurantEmail = await getRestaurantEmail(restaurantId);
      const restaurantPhone = await getRestaurantPhone(restaurantId);
      
      // Send notification email and SMS to restaurant
      await sendRestaurantOrderNotification(order, restaurantEmail, restaurantPhone);
      
      console.log('Order notifications sent successfully via email and SMS');
    } catch (notificationError) {
      console.error('Error sending order notifications:', notificationError);
      // Don't fail the order creation if notifications fail
    }

    res.status(201).json({
      order,
      requiresPaymentProcessing: paymentMethod === 'card'
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Error creating order' });
  }
});

// Get user orders
router.get('/user', auth, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.userId })
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

// Get order by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Get the restaurantId from all possible sources
    const userRestaurantId = req.user.restaurantId || req.query.restaurantId || req.header('X-Restaurant-Id');

    // Check if the user is the owner of the order or a restaurant admin or a delivery agent
    const isOwner = compareIds(order.userId, req.user.userId);
    const isRestaurantAdmin = req.user.role === 'restaurant_admin' && compareIds(order.restaurantId, userRestaurantId);
    const isDeliveryPersonnel = req.user.role === 'delivery_personnel';
    const isAdminRole = req.user.role === 'admin';
    
    // Allow delivery personnel to view any order with status 'ready' or
    // orders that are specifically assigned to them
    const canDeliveryAgentAccess = isDeliveryPersonnel && 
      (order.status === 'ready' || 
       (order.deliveryPersonId && compareIds(order.deliveryPersonId, req.user.userId)));
    
    if (!isOwner && !isRestaurantAdmin && !canDeliveryAgentAccess && !isAdminRole) {
      console.log(`[Order Service] Unauthorized access to order ${order._id} by user ${req.user.userId} with role ${req.user.role}`);
      return res.status(403).json({ 
        message: 'Not authorized to view this order',
        orderRestaurantId: toIdString(order.restaurantId),
        userRestaurantId: toIdString(userRestaurantId)
      });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ message: 'Error fetching order details' });
  }
});

// Get restaurant orders (Restaurant admin only)
router.get('/restaurant/orders', auth, checkRole('restaurant_admin'), async (req, res) => {
  try {
    // Try all possible sources for restaurantId
    let restaurantId = req.user.restaurantId || req.query.restaurantId || null;
    
    console.log('Restaurant ID from request:', restaurantId);
    
    // Additional fallback - check localStorage via a custom header
    if (!restaurantId && req.header('X-Restaurant-Id')) {
      restaurantId = req.header('X-Restaurant-Id');
      console.log('Using restaurant ID from custom header:', restaurantId);
    }
    
    // Ensure restaurantId is available
    if (!restaurantId) {
      return res.status(400).json({ 
        message: 'Restaurant ID not found in your profile',
        detail: 'Please go to the Restaurants page and select your restaurant'
      });
    }

    const orders = await Order.find({ restaurantId })
      .sort({ createdAt: -1 });
    
    console.log(`Found ${orders.length} orders for restaurant ${restaurantId}`);
    res.json(orders);
  } catch (error) {
    console.error('Get restaurant orders error:', error);
    res.status(500).json({ message: 'Error fetching restaurant orders' });
  }
});

// Update order status
// Update order status
router.patch('/:id/status', auth, checkRole('restaurant_admin', 'admin', 'delivery_personnel'), async (req, res) => {
  try {
    const { status, deliveryPersonId } = req.body;
    console.log(`[Order Service] PATCH /${req.params.id}/status request with status=${status}, deliveryPersonId=${deliveryPersonId || 'none'}`);
    
    // Restaurant admins can only set status to 'preparing' or 'ready'
    if (req.user.role === 'restaurant_admin' && !['preparing', 'ready'].includes(status)) {
      console.log(`[Order Service] Restaurant admin attempted to set invalid status: ${status}`);
      return res.status(400).json({ 
        message: 'Restaurant admins can only update order status to preparing or ready' 
      });
    }
    
    // Delivery personnel can only set status to 'out_for_delivery' or 'delivered'
    if (req.user.role === 'delivery_personnel' && !['out_for_delivery', 'delivered'].includes(status)) {
      console.log(`[Order Service] Delivery personnel attempted to set invalid status: ${status}`);
      return res.status(400).json({ 
        message: 'Delivery personnel can only update order status to out_for_delivery or delivered' 
      });
    }
    
    if (!['pending', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'].includes(status)) {
      console.log(`[Order Service] Invalid status provided: ${status}`);
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id);
    
    if (!order) {
      console.log(`[Order Service] Order not found: ${req.params.id}`);
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log('[Order Service] Order restaurantId:', toIdString(order.restaurantId));
    console.log('[Order Service] User restaurantId:', toIdString(req.user.restaurantId));

    // Check if the restaurant admin owns the restaurant
    if (req.user.role === 'restaurant_admin') {
      const adminRestaurantId = req.user.restaurantId || req.query.restaurantId || req.header('X-Restaurant-Id');
      
      if (!compareIds(order.restaurantId, adminRestaurantId)) {
        console.log(`[Order Service] Unauthorized restaurant access: Restaurant admin with restaurantId ${adminRestaurantId} attempted to access order for restaurant ${order.restaurantId}`);
        return res.status(403).json({ 
          message: 'Not authorized to update this order',
          orderRestaurantId: toIdString(order.restaurantId),
          adminRestaurantId: toIdString(adminRestaurantId)
        });
      }
    }
    
    // Special case for delivery personnel accepting an order
    const isDeliveryAcceptingReadyOrder = 
      req.user.role === 'delivery_personnel' && 
      status === 'out_for_delivery' && 
      order.status === 'ready' && 
      !order.deliveryPersonId;
    
    if (req.user.role === 'delivery_personnel' && 
        !isDeliveryAcceptingReadyOrder && 
        order.deliveryPersonId && 
        !compareIds(order.deliveryPersonId, req.user.userId)) {
      console.log(`[Order Service] Unauthorized delivery access: Delivery person ${req.user.userId} attempted to update order assigned to ${order.deliveryPersonId}`);
      return res.status(403).json({ 
        message: 'Not authorized to update this order - it is assigned to another delivery person'
      });
    }

    // Save the previous status for comparison
    const previousStatus = order.status;
    
    // Update order status
    order.status = status;
    
    // If delivery person is accepting the order, assign it to them
    if (status === 'out_for_delivery' && deliveryPersonId) {
      console.log(`[Order Service] Assigning order to delivery person: ${deliveryPersonId}`);
      order.deliveryPersonId = deliveryPersonId;
    }
    
    await order.save();
    console.log(`[Order Service] Order ${req.params.id} updated successfully to status: ${status}`);
    
    // Send status update email (and SMS) to customer if status changed to 'ready'
    if (previousStatus !== status && status === 'ready') {
      try {
        const token = req.header('Authorization').split(' ')[1];
        
        // Get customer email and phone
        const customerEmail = await getUserEmail(order.userId, token);
        const customerPhone = await getUserPhone(order.userId, token);
        
        // Send email (and inside it, SMS will also be sent)
        await sendOrderStatusUpdateEmail(order, customerEmail, customerPhone);
        
        console.log('Status update email and SMS (inside email function) sent successfully');
      } catch (notificationError) {
        console.error('Error sending status update notifications:', notificationError);
        // Don't fail the order update if notifications fail
      }
    }
    
    res.json(order);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Error updating order status' });
  }
});


// Get all orders with filtering
router.get('/', auth, async (req, res) => {
  try {
    const { status, deliveryPersonId } = req.query;
    console.log(`[Order Service] GET /orders request with status=${status}, deliveryPersonId=${deliveryPersonId}`);
    
    // Build query based on parameters
    const query = {};
    
    if (status) {
      query.status = status;
      console.log(`[Order Service] Filtering by status: ${status}`);
    }
    
    // If deliveryPersonId is provided, filter by it
    if (deliveryPersonId) {
      // If the requesting user is delivery personnel, they can only see their own orders
      if (req.user.role === 'delivery_personnel' && deliveryPersonId !== req.user.userId) {
        console.log(`[Order Service] Attempted unauthorized access: Delivery person ${req.user.userId} tried to access orders for ${deliveryPersonId}`);
        return res.status(403).json({ message: 'Not authorized to view orders for another delivery person' });
      }
      
      query.deliveryPersonId = deliveryPersonId;
      console.log(`[Order Service] Filtering by deliveryPersonId: ${deliveryPersonId}`);
    }
    
    // If user is a delivery person and no specific ID is requested, show only their orders
    if (req.user.role === 'delivery_personnel' && !deliveryPersonId && status !== 'ready') {
      query.deliveryPersonId = req.user.userId;
      console.log(`[Order Service] Auto-filtering by current user deliveryPersonId: ${req.user.userId}`);
    }
    
    // If no deliveryPersonId is specified and status is "ready", we want to show orders
    // that are ready for pickup but not yet assigned to any delivery person
    if (status === 'ready' && !deliveryPersonId) {
      // For ready orders, don't filter by deliveryPersonId to show ALL ready orders
      // from all restaurants - removed filter here
      console.log(`[Order Service] Fetching all ready orders across all restaurants`);
    }
    
    console.log(`[Order Service] Final query:`, query);
    
    // Execute query with no limit
    const orders = await Order.find(query).sort({ createdAt: -1 });
    
    console.log(`[Order Service] Found ${orders.length} orders matching query`);
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

// Complete a card payment and clear cart
router.post('/:id/payment-completed', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify the user is the owner of the order
    if (order.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    // Update payment status
    order.paymentStatus = 'completed';
    await order.save();

    // Clear the cart
    const cart = await Cart.findOne({ userId: req.user.userId });
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    
    // Send payment completion email to customer (no SMS)
    try {
      // Get customer email only
      const customerEmail = await getUserEmail(req.user.userId, req.header('Authorization').split(' ')[1]);
      
      // Create custom payment completion email
      const transporter = require('../utils/emailService').createTransporter();
      
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: customerEmail,
        subject: `Payment Completed for Order #${order._id}`,
        html: `
          <h2>Payment Confirmation</h2>
          <p>Dear Customer,</p>
          <p>Your payment for order #${order._id} has been successfully processed.</p>
          
          <h3>Order Details:</h3>
          <p><strong>Restaurant:</strong> ${order.restaurantName}</p>
          <p><strong>Total Amount:</strong> $${order.totalAmount.toFixed(2)}</p>
          <p><strong>Payment Status:</strong> Completed</p>
          
          <p>Thank you for your order!</p>
        `
      };
      
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Error sending payment confirmation email:', emailError);
      // Don't fail the payment completion if email fails
    }
    
    res.json({ success: true, order });
  } catch (error) {
    console.error('Complete payment error:', error);
    res.status(500).json({ message: 'Error completing payment' });
  }
});

module.exports = router; 