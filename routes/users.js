const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { profilePhotoUpload, deleteFile } = require('../middleware/upload');

const router = express.Router();

// Validation middleware
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Bio cannot be more than 200 characters'),
  body('phoneNumber')
    .optional()
    .trim()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid phone number'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location cannot be more than 100 characters')
];

// @route   GET /api/users/profile
// @desc    Get current user's profile
// @access  Private
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshToken');
    
    res.json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', validateProfileUpdate, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { name, bio, phoneNumber, location, dateOfBirth } = req.body;

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        name,
        bio,
        phoneNumber,
        location,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined
      },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during profile update'
    });
  }
});

// @route   POST /api/users/profile-photo
// @desc    Upload profile photo
// @access  Private
router.post('/profile-photo', profilePhotoUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Delete old profile photo if exists
    if (req.user.profilePhoto) {
      try {
        await deleteFile(req.user.profilePhoto);
      } catch (error) {
        console.error('Error deleting old profile photo:', error);
      }
    }

    // Update user with new profile photo
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { profilePhoto: req.file.path },
      { new: true }
    ).select('-password -refreshToken');

    res.json({
      success: true,
      message: 'Profile photo updated successfully',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    console.error('Upload profile photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during profile photo upload'
    });
  }
});

// @route   DELETE /api/users/profile-photo
// @desc    Remove profile photo
// @access  Private
router.delete('/profile-photo', async (req, res) => {
  try {
    if (!req.user.profilePhoto) {
      return res.status(400).json({
        success: false,
        message: 'No profile photo to remove'
      });
    }

    // Delete from Cloudinary
    try {
      await deleteFile(req.user.profilePhoto);
    } catch (error) {
      console.error('Error deleting profile photo from Cloudinary:', error);
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { profilePhoto: null },
      { new: true }
    ).select('-password -refreshToken');

    res.json({
      success: true,
      message: 'Profile photo removed successfully',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    console.error('Remove profile photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during profile photo removal'
    });
  }
});

// @route   GET /api/users/search
// @desc    Search users
// @access  Private
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const users = await User.searchUsers(q.trim(), req.user._id);

    res.json({
      success: true,
      data: {
        users,
        count: users.length
      }
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during user search'
    });
  }
});

// @route   GET /api/users/online
// @desc    Get online users
// @access  Private
router.get('/online', async (req, res) => {
  try {
    const onlineUsers = await User.getOnlineUsers();

    res.json({
      success: true,
      data: {
        users: onlineUsers,
        count: onlineUsers.length
      }
    });
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/users/:userId
// @desc    Get user by ID
// @access  Private
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-password -refreshToken -email')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/users/online-status
// @desc    Update online status
// @access  Private
router.put('/online-status', async (req, res) => {
  try {
    const { isOnline } = req.body;

    await req.user.updateOnlineStatus(isOnline);

    res.json({
      success: true,
      message: 'Online status updated successfully'
    });
  } catch (error) {
    console.error('Update online status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during status update'
    });
  }
});

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', async (req, res) => {
  try {
    // Delete profile photo if exists
    if (req.user.profilePhoto) {
      try {
        await deleteFile(req.user.profilePhoto);
      } catch (error) {
        console.error('Error deleting profile photo:', error);
      }
    }

    // Soft delete user (set isActive to false)
    await User.findByIdAndUpdate(req.user._id, {
      isActive: false,
      refreshToken: null
    });

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during account deletion'
    });
  }
});

module.exports = router;

