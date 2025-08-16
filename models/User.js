const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  profilePhoto: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'away'],
    default: 'offline'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  bio: {
    type: String,
    maxlength: [200, 'Bio cannot be more than 200 characters'],
    default: ''
  },
  phoneNumber: {
    type: String,
    default: null
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  location: {
    type: String,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  refreshToken: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for user's initials
userSchema.virtual('initials').get(function() {
  if (!this.name) return '';
  return this.name.split(' ').map(n => n[0]).join('').toUpperCase();
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ status: 1, lastSeen: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to update last seen
userSchema.methods.updateLastSeen = function() {
  this.lastSeen = new Date();
  return this.save();
};

// Method to update online status
userSchema.methods.updateOnlineStatus = function(isOnline) {
  this.isOnline = isOnline;
  this.status = isOnline ? 'online' : 'offline';
  if (!isOnline) {
    this.lastSeen = new Date();
  }
  return this.save();
};

// Static method to find users by search term
userSchema.statics.searchUsers = function(searchTerm, excludeUserId) {
  return this.find({
    $and: [
      { _id: { $ne: excludeUserId } },
      { isActive: true },
      {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } }
        ]
      }
    ]
  }).select('-password -refreshToken');
};

// Static method to get online users
userSchema.statics.getOnlineUsers = function() {
  return this.find({ isOnline: true, isActive: true })
    .select('_id name profilePhoto status lastSeen')
    .sort({ lastSeen: -1 });
};

module.exports = mongoose.model('User', userSchema);

