const User = require('../models/User');

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.id });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const updates = req.body;
    // Remove fields that shouldn't be updated
    delete updates.userId;
    delete updates.email;
    
    const user = await User.findOneAndUpdate(
      { userId: req.params.id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ userId: req.params.id });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Handle user.created event from RabbitMQ
exports.handleUserCreated = async (userData) => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ userId: userData.id });
    if (existingUser) {
      console.log(`User with ID ${userData.id} already exists`);
      return;
    }
    
    // Create new user profile
    const user = new User({
      userId: userData.id,
      name: userData.name,
      email: userData.email,
      createdAt: userData.createdAt || new Date()
    });
    
    await user.save();
    console.log(`User profile created for user ID: ${userData.id}`);
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}; 