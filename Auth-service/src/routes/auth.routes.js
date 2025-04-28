const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { auth, checkRole } = require('../middleware/auth.middleware');

const router = express.Router();

// Request logging middleware
router.use((req, res, next) => {
  console.log(`[Auth Service] ${req.method} ${req.path}`, req.body);
  next();
});

// Register user
router.post('/register', async (req, res) => {
  try {
    console.log('[Auth Service] Processing registration request:', req.body);
    const { email, password, name, role, phone } = req.body;

    // Validate role
    const validRoles = ['customer', 'restaurant_admin', 'delivery_personnel', 'admin'];
    if (role && !validRoles.includes(role)) {
      console.log('[Auth Service] Registration failed: Invalid role');
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('[Auth Service] Registration failed: Email already exists');
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create new user
    const user = new User({
      email,
      password,
      name,
      role: role || 'customer', // Default to customer if no role specified
      phone
    });

    await user.save();
    console.log('[Auth Service] User created successfully with role:', user.role);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        isVerified: user.isVerified,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('[Auth Service] Registration error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    console.log('[Auth Service] Processing login request:', req.body);
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('[Auth Service] Login failed: User not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('[Auth Service] Login failed: Invalid password');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('[Auth Service] Login failed: User account is deactivated');
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
    }

    console.log('[Auth Service] Login successful');

    // Prepare JWT payload
    const tokenPayload = { 
      userId: user._id, 
      role: user.role 
    };
    
    // Add restaurantId to token for restaurant admins
    if (user.role === 'restaurant_admin' && user.restaurantId) {
      tokenPayload.restaurantId = user.restaurantId;
    }

    // Generate JWT token
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        restaurantId: user.restaurantId
      }
    });
  } catch (error) {
    console.error('[Auth Service] Login error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get current user details
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Verify restaurant (Admin only)
router.post('/verify-restaurant', auth, checkRole('admin'), async (req, res) => {
  try {
    const { userId } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'restaurant_admin') {
      return res.status(400).json({ message: 'User is not a restaurant admin' });
    }

    user.isVerified = true;
    await user.save();

    res.json({ message: 'Restaurant verified successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update restaurant ID for restaurant admin
router.patch('/update-restaurant-id', auth, checkRole('restaurant_admin', 'admin'), async (req, res) => {
  try {
    const { userId, restaurantId } = req.body;
    
    // Ensure the current user is updating their own profile or is an admin
    if (req.user.role !== 'admin' && req.user.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this user' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'restaurant_admin') {
      return res.status(400).json({ message: 'User is not a restaurant admin' });
    }

    // Update the user's restaurantId
    user.restaurantId = restaurantId;
    await user.save();
    
    console.log(`Updated user ${userId} with restaurant ID ${restaurantId}`);
    res.json({ message: 'Restaurant ID updated successfully' });
  } catch (error) {
    console.error('Error updating restaurant ID:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get user by ID - For internal service use only
router.get('/users/:id', auth, async (req, res) => {
  try {
    const userId = req.params.id;
    
    console.log(`[Auth Service] Looking up user with ID: ${userId}`);
    
    // Only allow certain roles to access this endpoint
    if (!['admin', 'delivery_personnel', 'restaurant_admin','customer','internal-service'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to access user information' });
    }
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone
    });
  } catch (error) {
    console.error('[Auth Service] Error fetching user by ID:', error);
    res.status(500).json({ message: error.message });
  }
});

// Admin routes for user management
router.get('/admin/users', auth, checkRole('admin'), async (req, res) => {
  try {
    console.log('[Auth Service] Fetching all users for admin');
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('[Auth Service] Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

router.patch('/admin/users/:userId/role', auth, checkRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    console.log(`[Auth Service] Updating user role for ${userId} to ${role}`);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    await user.save();

    res.json({ message: 'User role updated successfully', user });
  } catch (error) {
    console.error('[Auth Service] Error updating user role:', error);
    res.status(500).json({ message: 'Error updating user role' });
  }
});

router.patch('/admin/users/:userId/status', auth, checkRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    console.log(`[Auth Service] Updating user status for ${userId} to ${isActive}`);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = isActive;
    await user.save();

    res.json({ message: 'User status updated successfully', user });
  } catch (error) {
    console.error('[Auth Service] Error updating user status:', error);
    res.status(500).json({ message: 'Error updating user status' });
  }
});

module.exports = router; 