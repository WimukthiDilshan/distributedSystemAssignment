const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  size: {
    type: String,
    enum: ['Small', 'Medium', 'Large'],
    default: 'Medium'
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  restaurantName: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  totalAmount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Calculate total amount before saving
cartSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  } else {
    this.totalAmount = 0;
  }
  next();
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart; 