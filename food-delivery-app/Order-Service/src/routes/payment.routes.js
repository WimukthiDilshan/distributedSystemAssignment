const express = require('express');
const { auth } = require('../middleware/auth.middleware');
const Order = require('../models/order.model');
const Payment = require('../models/payment.model'); // adjust the path as needed
const router = express.Router();

// Use API keys directly - a better approach would be to use environment variables,
// but this is a quick fix for the error


router.post('/create-payment-intent', auth, async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify the user is the owner of the order
    if (order.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to pay for this order' });
    }

    // Calculate order total in cents for Stripe (plus delivery fee and tax)
    const deliveryFee = 3.99;
    const taxRate = 0.07;
    const tax = order.totalAmount * taxRate;
    const totalAmount = order.totalAmount + deliveryFee + tax;
    const amountInCents = Math.round(totalAmount * 100);

    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        orderId: order._id.toString(),
        userId: req.user.userId
      }
    });

    // ✅ Save payment data to the Payment collection
    await Payment.create({
      orderId: order._id,
      restaurantId: order.restaurantId,
      userId: req.user.userId,
      amountPaid: order.totalAmount,
      totalAmount: totalAmount,
      paymentMethod: 'card',
      paymentStatus: 'pending',
      transactionId: paymentIntent.id
    });

    // Respond with client secret
    res.json({
      clientSecret: paymentIntent.client_secret,
      publishableKey: STRIPE_PUBLISHABLE_KEY
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ message: 'Error creating payment intent' });
  }
});

// Webhook to handle Stripe events
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  let event;

  try {
    // Verify the webhook signature
    if (STRIPE_WEBHOOK_SECRET && STRIPE_WEBHOOK_SECRET !== 'whsec_your_webhook_secret_here') {
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } else {
      // For development without webhook secret or with placeholder value
      console.log('Using webhook without signature verification - DEVELOPMENT ONLY');
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.log(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata.orderId;

      // Update order payment status to completed
      await Order.findByIdAndUpdate(orderId, { 
        paymentStatus: 'completed',
        paymentMethod: 'card'
      });
      
      console.log(`Payment for order ${orderId} succeeded!`);
      break;
      
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      const failedOrderId = failedPayment.metadata.orderId;
      
      // Update order payment status to failed
      await Order.findByIdAndUpdate(failedOrderId, { 
        paymentStatus: 'failed' 
      });
      
      console.log(`Payment for order ${failedOrderId} failed!`);
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 success response
  res.json({ received: true });
});

// Endpoint to confirm payment status
router.get('/status/:orderId', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify the user is the owner of the order
    if (order.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json({ 
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ message: 'Error fetching payment status' });
  }
});

module.exports = router; 