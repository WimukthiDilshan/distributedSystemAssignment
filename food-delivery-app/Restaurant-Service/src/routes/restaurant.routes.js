const express = require('express');
const Restaurant = require('../models/restaurant.model');
const User = require('../../../Auth-service/src/models/user.model');
const { auth, optionalAuth, checkRole } = require('../middleware/auth.middleware');
const { upload, loggedUpload } = require('../middleware/upload.middleware');
const path = require('path');
const axios = require('axios');

const router = express.Router();

// Public route to get all available restaurants (no auth required) - Placed BEFORE /:id route to avoid conflicts
router.get('/public', async (req, res) => {
  try {
    console.log('==========================================');
    console.log('GET /restaurants/public request');
    
    // Only return restaurants that are available - explicitly set to true
    const query = { isAvailable: true };
    console.log('Query filter:', query);
    
    const restaurants = await Restaurant.find(query)
      .select('-adminId')
      .populate('menu');
    
    // Log each restaurant availability status for debugging
    console.log('Restaurants availability status:');
    restaurants.forEach(restaurant => {
      console.log(`Restaurant ID: ${restaurant._id}, Name: ${restaurant.name}, isAvailable: ${restaurant.isAvailable}`);
    });
    
    console.log(`Found ${restaurants.length} available restaurants for public view`);
    console.log('==========================================');
    
    res.json(restaurants);
  } catch (error) {
    console.error('Error fetching public restaurants:', error);
    res.status(400).json({ message: error.message });
  }
});

// Add menu item with image upload
router.post('/:id/menu-with-image', auth, checkRole('restaurant_admin'), loggedUpload('image'), async (req, res) => {
  try {
    const isDebug = req.query.debug === 'true';
    console.log('==========================================');
    console.log('DEBUG - MENU ITEM WITH IMAGE CREATION');
    console.log('Is Debug Mode:', isDebug);
    console.log('URL:', req.originalUrl);
    console.log('Query Parameters:', req.query);
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    console.log('Request body type:', typeof req.body);
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Name field:', req.body.name);
    console.log('Received file:', req.file);
    console.log('==========================================');
    
    const restaurant = await Restaurant.findOne({
      _id: req.params.id,
      adminId: req.user.userId
    });

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    // Check if req.body is empty or not properly parsed
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error('Request body is empty or not properly parsed');
      
      if (isDebug) {
        return res.status(400).json({ 
          message: 'Request data is missing or invalid',
          debug: {
            headers: req.headers,
            bodyType: typeof req.body,
            bodyKeys: Object.keys(req.body),
            file: req.file ? 'Present' : 'Missing'
          }
        });
      }
      // Return validation error but continue processing for debug purposes
      // return res.status(400).json({ message: 'Request data is missing or invalid' });
    }

    // Basic validation - temporarily relaxed for debugging
    if (!req.body.name || req.body.name.trim() === '') {
      console.error('Name is missing or empty');
      if (req.file) {
        console.log('But file was uploaded, proceeding with placeholder name for debugging');
        req.body.name = 'Debug Menu Item ' + Date.now();
      } else {
        return res.status(400).json({ message: 'Name is required' });
      }
    }

    if (req.body.price === undefined || req.body.price === null || isNaN(Number(req.body.price))) {
      console.error('Price is invalid:', req.body.price);
      return res.status(400).json({ message: 'Valid price is required' });
    }

    if (!req.body.category) {
      console.error('Category is missing');
      return res.status(400).json({ message: 'Category is required' });
    }

    // Create menu item data
    const menuItemData = {
      name: req.body.name,
      description: req.body.description || '',
      price: Number(req.body.price),
      category: req.body.category,
      size: req.body.size || 'Medium',
      isAvailable: req.body.isAvailable === 'true' || req.body.isAvailable === true || req.body.isAvailable === 'True'
    };

    // Add image path if an image was uploaded
    if (req.file) {
      const relativePath = `/uploads/${path.basename(req.file.path)}`;
      menuItemData.image = relativePath;
      console.log('Added image path:', relativePath);
    }

    console.log('Menu item data to be added with image:', menuItemData);
    restaurant.menu.push(menuItemData);
    await restaurant.save();
    
    console.log('Menu item with image added successfully');
    res.status(201).json(restaurant);
  } catch (error) {
    console.error('Error adding menu item with image:', error);
    res.status(400).json({ message: error.message });
  }
});

// Add new restaurant with image (Restaurant Admin)
router.post('/with-image', auth, checkRole('restaurant_admin'), loggedUpload('image'), async (req, res) => {
  try {
    console.log('==========================================');
    console.log('DEBUG - RESTAURANT WITH IMAGE CREATION');
    console.log('Request body:', req.body);
    console.log('Location raw value:', req.body.location);
    console.log('Location type:', typeof req.body.location);
    console.log('Received file:', req.file);
    console.log('==========================================');
    
    // Parse JSON strings from FormData
    let locationData = req.body.location;
    let addressData = req.body.address;
    
    console.log('Before parsing - locationData:', locationData);
    
    // Properly parse the stringified JSON fields
    try {
      if (typeof locationData === 'string') {
        console.log('Parsing location string:', locationData);
        locationData = JSON.parse(locationData);
        console.log('After parsing - locationData:', locationData);
      }
      if (typeof addressData === 'string') {
        addressData = JSON.parse(addressData);
      }
    } catch (parseError) {
      console.error('Error parsing JSON from form data:', parseError);
      return res.status(400).json({ message: 'Invalid JSON in form data' });
    }
    
    // Ensure location has the correct structure
    if (locationData && !locationData.type) {
      console.log('Adding type to location data');
      locationData = {
        type: 'Point',
        coordinates: locationData.coordinates || [0, 0]
      };
    }
    
    // Create restaurant data from body
    const restaurantData = {
      ...req.body,
      location: locationData,
      address: addressData,
      adminId: req.user.userId
    };
    
    // Add image path if an image was uploaded
    if (req.file) {
      const relativePath = `/uploads/${path.basename(req.file.path)}`;
      restaurantData.image = relativePath;
      console.log('Added restaurant image path:', relativePath);
    }
    
    console.log('Final restaurant data:', restaurantData);
    console.log('Final location data:', restaurantData.location);
    
    const restaurant = new Restaurant(restaurantData);
    await restaurant.save();
    
    // Update the user profile with the restaurant ID
    try {
      await axios.patch(
        'http://localhost:3000/api/auth/update-restaurant-id',
        { 
          userId: req.user.userId,
          restaurantId: restaurant._id
        },
        {
          headers: {
            Authorization: `Bearer ${req.header('Authorization')?.replace('Bearer ', '')}`
          }
        }
      );
      console.log('User profile updated with restaurant ID');
    } catch (error) {
      console.error('Failed to update user profile with restaurant ID:', error);
      // Continue even if this fails - we'll handle it separately
    }
    
    res.status(201).json(restaurant);
  } catch (error) {
    console.error('Error creating restaurant with image:', error);
    res.status(400).json({ message: error.message });
  }
});

// Add new restaurant (Restaurant Admin)
router.post('/', auth, checkRole('restaurant_admin'), async (req, res) => {
  try {
    console.log('==========================================');
    console.log('DEBUG - RESTAURANT CREATION');
    console.log('Request body:', req.body);
    console.log('==========================================');
    
    // Ensure location has the correct structure
    if (req.body.location && !req.body.location.type) {
      req.body.location = {
        type: 'Point',
        coordinates: req.body.location.coordinates || [0, 0]
      };
    }
    
    // Get admin email from request body
    const { adminEmail } = req.body;

    const restaurant = new Restaurant({
      ...req.body,
      adminId: req.user.userId
    });
    
    console.log('Restaurant data to save:', restaurant);
    await restaurant.save();
    
    // Update the user profile with the restaurant ID
    try {
      await axios.patch(
        'http://localhost:3000/api/auth/update-restaurant-id',
        { 
          userId: req.user.userId,
          restaurantId: restaurant._id
        },
        {
          headers: {
            Authorization: `Bearer ${req.header('Authorization')?.replace('Bearer ', '')}`
          }
        }
      );
      console.log('User profile updated with restaurant ID');
    } catch (error) {
      console.error('Failed to update user profile with restaurant ID:', error);
      // Continue even if this fails - we'll handle it separately
    }
    
    res.status(201).json(restaurant);
  } catch (error) {
    console.error('Error creating restaurant:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update restaurant image
router.patch('/:id/image', auth, checkRole('restaurant_admin'), loggedUpload('image'), async (req, res) => {
  try {
    console.log('==========================================');
    console.log('DEBUG - RESTAURANT IMAGE UPDATE');
    console.log('Received file:', req.file);
    console.log('==========================================');
    
    const restaurant = await Restaurant.findOne({
      _id: req.params.id,
      adminId: req.user.userId
    });

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    // Update image if a new one was uploaded
    if (req.file) {
      const relativePath = `/uploads/${path.basename(req.file.path)}`;
      restaurant.image = relativePath;
      console.log('Updated restaurant image path:', relativePath);
      await restaurant.save();
    } else {
      return res.status(400).json({ message: 'No image file uploaded' });
    }
    
    res.json(restaurant);
  } catch (error) {
    console.error('Error updating restaurant image:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update restaurant details with image
router.put('/:id/with-image', auth, checkRole('restaurant_admin'), loggedUpload('image'), async (req, res) => {
  try {
    console.log('==========================================');
    console.log('DEBUG - RESTAURANT WITH IMAGE UPDATE');
    console.log('Request body:', req.body);
    console.log('Received file:', req.file);
    console.log('==========================================');

    const restaurant = await Restaurant.findOne({
      _id: req.params.id,
      adminId: req.user.userId
    });

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    // Parse JSON strings from FormData
    let locationData = req.body.location;
    let addressData = req.body.address;
    
    // Properly parse the stringified JSON fields
    try {
      if (typeof locationData === 'string') {
        locationData = JSON.parse(locationData);
      }
      if (typeof addressData === 'string') {
        addressData = JSON.parse(addressData);
      }
    } catch (parseError) {
      console.error('Error parsing JSON from form data:', parseError);
      return res.status(400).json({ message: 'Invalid JSON in form data' });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== 'menu' && key !== 'adminId' && key !== 'address' && key !== 'location') {
        // Handle boolean conversions
        if (key === 'isVerified' || key === 'isAvailable') {
          if (req.body[key] === 'true' || req.body[key] === true) {
            restaurant[key] = true;
          } else if (req.body[key] === 'false' || req.body[key] === false) {
            restaurant[key] = false;
          } else if (req.body[key] === '') {
            // Skip empty strings for boolean fields
            console.log(`Skipping empty string for boolean field ${key}`);
          } else {
            restaurant[key] = Boolean(req.body[key]);
          }
        } else {
          restaurant[key] = req.body[key];
        }
      }
    });
    
    // Set parsed address and location
    if (addressData) {
      restaurant.address = addressData;
    }
    
    if (locationData) {
      restaurant.location = locationData;
    }

    // Add image path if an image was uploaded
    if (req.file) {
      const relativePath = `/uploads/${path.basename(req.file.path)}`;
      restaurant.image = relativePath;
      console.log('Updated restaurant image path:', relativePath);
    }

    console.log('Final restaurant data to save:', restaurant);
    await restaurant.save();
    res.json(restaurant);
  } catch (error) {
    console.error('Error updating restaurant with image:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update restaurant details
router.put('/:id', auth, checkRole('restaurant_admin'), async (req, res) => {
  try {
    console.log('==========================================');
    console.log('DEBUG - RESTAURANT UPDATE');
    console.log('Request body:', req.body);
    console.log('==========================================');

    const restaurant = await Restaurant.findOne({
      _id: req.params.id,
      adminId: req.user.userId
    });

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    // Ensure location has the correct structure if provided
    if (req.body.location && !req.body.location.type) {
      req.body.location = {
        type: 'Point',
        coordinates: req.body.location.coordinates || restaurant.location.coordinates
      };
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== 'menu' && key !== 'adminId') { // Menu items and adminId are handled separately
        // Handle boolean conversions
        if (key === 'isVerified' || key === 'isAvailable') {
          if (req.body[key] === 'true' || req.body[key] === true) {
            restaurant[key] = true;
          } else if (req.body[key] === 'false' || req.body[key] === false) {
            restaurant[key] = false;
          } else if (req.body[key] === '') {
            // Skip empty strings for boolean fields
            console.log(`Skipping empty string for boolean field ${key}`);
          } else {
            restaurant[key] = Boolean(req.body[key]);
          }
        } else {
          restaurant[key] = req.body[key];
        }
      }
    });

    console.log('Restaurant data to save:', restaurant);
    await restaurant.save();
    res.json(restaurant);
  } catch (error) {
    console.error('Error updating restaurant:', error);
    res.status(400).json({ message: error.message });
  }
});

// Set restaurant availability
router.patch('/:id/availability', auth, checkRole('restaurant_admin'), async (req, res) => {
  try {
    console.log('==========================================');
    console.log('DEBUG - TOGGLE RESTAURANT AVAILABILITY');
    console.log('Restaurant ID:', req.params.id);
    console.log('Request body:', req.body);
    console.log('User ID:', req.user.userId);
    console.log('==========================================');
    
    const restaurant = await Restaurant.findOne({
      _id: req.params.id,
      adminId: req.user.userId
    });

    if (!restaurant) {
      console.log('Restaurant not found for ID:', req.params.id);
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    const previousStatus = restaurant.isAvailable;
    restaurant.isAvailable = req.body.isAvailable;
    
    console.log(`Changing restaurant availability: ${previousStatus} -> ${restaurant.isAvailable}`);
    
    await restaurant.save();
    
    // Double check that the status was saved correctly by retrieving the restaurant again
    const updatedRestaurant = await Restaurant.findById(req.params.id);
    console.log('Saved restaurant availability:', updatedRestaurant.isAvailable);
    
    res.json(updatedRestaurant);
  } catch (error) {
    console.error('Error toggling restaurant availability:', error);
    res.status(400).json({ message: error.message });
  }
});

// Add menu item (basic version without image upload)
router.post('/:id/menu', auth, checkRole('restaurant_admin'), async (req, res) => {
  try {
    console.log('Received request body for menu item creation:', req.body);
    
    const restaurant = await Restaurant.findOne({
      _id: req.params.id,
      adminId: req.user.userId
    });

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    // Basic validation
    if (!req.body.name) {
      console.error('Name is missing');
      return res.status(400).json({ message: 'Name is required' });
    }

    if (req.body.price === undefined || req.body.price === null || isNaN(Number(req.body.price))) {
      console.error('Price is invalid:', req.body.price);
      return res.status(400).json({ message: 'Valid price is required' });
    }

    if (!req.body.category) {
      console.error('Category is missing');
      return res.status(400).json({ message: 'Category is required' });
    }

    // Create menu item data
    const menuItemData = {
      name: req.body.name,
      description: req.body.description || '',
      price: Number(req.body.price),
      category: req.body.category,
      size: req.body.size || 'Medium',
      isAvailable: req.body.isAvailable
    };

    console.log('Menu item data to be added:', menuItemData);
    restaurant.menu.push(menuItemData);
    await restaurant.save();
    
    console.log('Menu item added successfully');
    res.status(201).json(restaurant);
  } catch (error) {
    console.error('Error adding menu item:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update menu item (basic version without image upload)
router.put('/menu/:itemId', auth, checkRole('restaurant_admin'), async (req, res) => {
  try {
    console.log('Received request body for menu item update:', req.body);
    
    const restaurant = await Restaurant.findOne({
      'menu._id': req.params.itemId,
      adminId: req.user.userId
    });

    if (!restaurant) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    const menuItem = restaurant.menu.id(req.params.itemId);
    
    // Update fields
    if (req.body.name !== undefined) menuItem.name = req.body.name;
    if (req.body.description !== undefined) menuItem.description = req.body.description;
    if (req.body.price !== undefined) {
      const price = Number(req.body.price);
      if (isNaN(price)) {
        return res.status(400).json({ message: 'Price must be a valid number' });
      }
      menuItem.price = price;
    }
    if (req.body.category !== undefined) menuItem.category = req.body.category;
    if (req.body.size !== undefined) menuItem.size = req.body.size;
    if (req.body.isAvailable !== undefined) menuItem.isAvailable = req.body.isAvailable;
    
    console.log('Updated menu item:', menuItem);
    await restaurant.save();
    res.json(restaurant);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update menu item with image upload
router.put('/menu-with-image/:itemId', auth, checkRole('restaurant_admin'), loggedUpload('image'), async (req, res) => {
  try {
    console.log('==========================================');
    console.log('DEBUG - MENU ITEM WITH IMAGE UPDATE');
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    console.log('Request body type:', typeof req.body);
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Name field:', req.body.name);
    console.log('Received file for update:', req.file);
    console.log('==========================================');
    
    const restaurant = await Restaurant.findOne({
      'menu._id': req.params.itemId,
      adminId: req.user.userId
    });

    if (!restaurant) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    // Check if req.body is empty and log warning
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error('Update: Request body is empty or not properly parsed');
      console.log('Proceeding with existing menu item data and only updating image if provided');
    }

    const menuItem = restaurant.menu.id(req.params.itemId);
    
    // Update fields
    if (req.body.name !== undefined) menuItem.name = req.body.name;
    if (req.body.description !== undefined) menuItem.description = req.body.description;
    if (req.body.price !== undefined) {
      const price = Number(req.body.price);
      if (isNaN(price)) {
        return res.status(400).json({ message: 'Price must be a valid number' });
      }
      menuItem.price = price;
    }
    if (req.body.category !== undefined) menuItem.category = req.body.category;
    if (req.body.size !== undefined) menuItem.size = req.body.size;
    if (req.body.isAvailable !== undefined) {
      menuItem.isAvailable = req.body.isAvailable === 'true' || req.body.isAvailable === true || req.body.isAvailable === 'True';
    }
    
    // Update image if a new one was uploaded
    if (req.file) {
      const relativePath = `/uploads/${path.basename(req.file.path)}`;
      menuItem.image = relativePath;
      console.log('Updated image path:', relativePath);
    }
    
    console.log('Updated menu item with image:', menuItem);
    await restaurant.save();
    res.json(restaurant);
  } catch (error) {
    console.error('Error updating menu item with image:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete menu item
router.delete('/menu/:itemId', auth, checkRole('restaurant_admin'), async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({
      'menu._id': req.params.itemId,
      adminId: req.user.userId
    });

    if (!restaurant) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    restaurant.menu.pull(req.params.itemId);
    await restaurant.save();
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get restaurant by ID - with permission check
router.get('/:id', auth, async (req, res) => {
  try {
    let restaurant;

    const isInternal = req.headers['x-internal-service'] === 'true';

    if (req.user.role === 'restaurant_admin') {
      restaurant = await Restaurant.findOne({
        _id: req.params.id,
        adminId: req.user.userId
      }).populate('menu');
    } else {
      restaurant = await Restaurant.findOne({
        _id: req.params.id,
        isAvailable: true
      })
      .select(isInternal ? '' : '-adminId')  // 👈 this allows adminId for internal calls
      .populate('menu');
    }

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    res.json(restaurant);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/internal/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    console.log('[Internal] Restaurant:', restaurant);

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    res.json({
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
      phoneNumber: restaurant.phoneNumber || '',
      adminId: restaurant.adminId, // You can return this to fetch admin later
      adminEmail: restaurant.adminEmail || '' // Fallback if email stored directly
    });

  } catch (error) {
    console.error('[Internal Route Error]:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// Get list of restaurants - filtered by role
router.get('/', optionalAuth, async (req, res) => {
  try {
    console.log('==========================================');
    console.log('GET /restaurants request');
    let query = {};
    
    // If we have auth data from the middleware
    if (req.user) {
      console.log('User role:', req.user.role);
      
      // If user is restaurant_admin, only show their restaurants regardless of availability status
      if (req.user.role === 'restaurant_admin') {
        query.adminId = req.user.userId;
        console.log('Restaurant admin - showing all owned restaurants');
      } else {
        // For customers and other roles, only show available restaurants
        query.isAvailable = true;
        console.log('Customer view - filtering to show only available restaurants');
      }
    } else {
      // No auth token or invalid token - show only available restaurants
      console.log('Unauthenticated user');
      query.isAvailable = true;
      console.log('Unauthenticated view - filtering to show only available restaurants');
    }
    
    console.log('Query filter:', query);
    
    const restaurants = await Restaurant.find(query)
      .select(req.user && req.user.role === 'restaurant_admin' ? '' : '-adminId')
      .populate('menu');
    
    // Log each restaurant availability status for debugging
    console.log('Restaurants availability status:');
    restaurants.forEach(restaurant => {
      console.log(`Restaurant ID: ${restaurant._id}, Name: ${restaurant.name}, isAvailable: ${restaurant.isAvailable}`);
    });
    
    console.log(`Found ${restaurants.length} restaurants matching criteria`);
    console.log('==========================================');
    
    res.json(restaurants);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(400).json({ message: error.message });
  }
});

module.exports = router; 