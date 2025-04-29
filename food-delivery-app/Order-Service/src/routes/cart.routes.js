const express = require('express');
const Cart = require('../models/cart.model');
const { auth } = require('../middleware/auth.middleware');

const router = express.Router();

// Get user cart
router.get('/', auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user.userId });
    
    if (!cart) {
      cart = new Cart({
        userId: req.user.userId,
        items: [],
        totalAmount: 0
      });
      await cart.save();
    }
    
    res.json(cart);
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Error fetching cart' });
  }
});

// Add item to cart
router.post('/items', auth, async (req, res) => {
  try {
    const { menuItemId, name, price, quantity, size, restaurantId, restaurantName } = req.body;
    
    // Validate required fields
    if (!menuItemId || !restaurantId || !name) {
      return res.status(400).json({ message: 'Missing required fields: menuItemId, restaurantId, and name are required' });
    }

    // Validate numeric fields
    if (price === undefined || isNaN(price) || price < 0) {
      return res.status(400).json({ message: 'Invalid price: must be a number greater than or equal to 0' });
    }

    // Convert quantity to number with default of 1
    const itemQuantity = quantity ? parseInt(quantity, 10) : 1;
    if (isNaN(itemQuantity) || itemQuantity < 1) {
      return res.status(400).json({ message: 'Invalid quantity: must be a number greater than 0' });
    }

    // Validate size
    const itemSize = size || 'Medium';
    if (!['Small', 'Medium', 'Large'].includes(itemSize)) {
      return res.status(400).json({ message: 'Invalid size: must be Small, Medium, or Large' });
    }

    let cart = await Cart.findOne({ userId: req.user.userId });
    
    if (!cart) {
      cart = new Cart({
        userId: req.user.userId,
        items: [],
        totalAmount: 0
      });
    }

    // Check if cart has items from different restaurant
    if (cart.items.length > 0) {
      const existingRestaurantId = cart.items[0].restaurantId.toString();
      const newRestaurantId = restaurantId.toString();
      
      if (existingRestaurantId !== newRestaurantId) {
        return res.status(400).json({ 
          message: 'Cannot add items from different restaurants to the same cart. Please clear your cart first.'
        });
      }
    }

    // Check if item already in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.menuItemId.toString() === menuItemId.toString() && item.size === itemSize
    );

    if (existingItemIndex > -1) {
      // Update quantity if item exists
      cart.items[existingItemIndex].quantity += itemQuantity;
    } else {
      // Add new item to cart
      cart.items.push({
        menuItemId,
        name,
        price,
        quantity: itemQuantity,
        size: itemSize,
        restaurantId,
        restaurantName: restaurantName || 'Restaurant' // Provide default if missing
      });
    }

    await cart.save();
    res.status(201).json(cart);
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Error adding item to cart', error: error.message });
  }
});

// Update cart item quantity
router.patch('/items/:itemId', auth, async (req, res) => {
  try {
    const { quantity } = req.body;
    
    if (quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    const cart = await Cart.findOne({ userId: req.user.userId });
    
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => item._id.toString() === req.params.itemId);
    
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();
    
    res.json(cart);
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ message: 'Error updating cart item' });
  }
});

// Remove item from cart
router.delete('/items/:itemId', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.userId });
    
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => item._id.toString() === req.params.itemId);
    
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();
    
    res.json(cart);
  } catch (error) {
    console.error('Remove cart item error:', error);
    res.status(500).json({ message: 'Error removing item from cart' });
  }
});

// Clear cart
router.delete('/', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.userId });
    
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = [];
    await cart.save();
    
    res.json({ message: 'Cart cleared successfully', cart });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Error clearing cart' });
  }
});

// Get cart item count
router.get('/count', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.userId });
    
    if (!cart) {
      return res.json({ count: 0 });
    }

    const itemCount = cart.items.reduce((total, item) => total + item.quantity, 0);
    res.json({ count: itemCount });
  } catch (error) {
    console.error('Get cart count error:', error);
    res.status(500).json({ message: 'Error fetching cart count' });
  }
});

module.exports = router; 