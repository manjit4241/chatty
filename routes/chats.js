const express = require('express');
const { body, validationResult } = require('express-validator');
const Chat = require('../models/Chat');
const User = require('../models/User');
const Message = require('../models/Message');

const router = express.Router();

// Validation middleware
const validateCreateGroup = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Group name must be between 2 and 100 characters'),
  body('participants')
    .isArray({ min: 1 })
    .withMessage('At least one participant is required'),
  body('participants.*')
    .isMongoId()
    .withMessage('Invalid participant ID')
];

const validateUpdateGroup = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Group name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot be more than 500 characters')
];

// @route   GET /api/chats
// @desc    Get user's chats
// @access  Private
router.get('/', async (req, res) => {
  try {
    const chats = await Chat.getUserChats(req.user._id);

    // Format chats for frontend
    const formattedChats = chats.map(chat => {
      const otherParticipants = chat.participants.filter(
        p => p.user._id.toString() !== req.user._id.toString()
      );

      let chatName = chat.name;
      let isGroup = chat.type === 'group';

      if (chat.type === 'individual' && otherParticipants.length > 0) {
        chatName = otherParticipants[0].user.name;
      }

      return {
        id: chat._id,
        name: chatName,
        type: chat.type,
        isGroup,
        lastMessage: chat.lastMessage ? {
          content: chat.lastMessage.content,
          type: chat.lastMessage.type,
          timestamp: chat.lastMessage.createdAt
        } : null,
        lastMessageAt: chat.lastMessageAt,
        unreadCount: chat.unreadCount.get(req.user._id.toString()) || 0,
        participants: chat.participants.map(p => ({
          id: p.user._id,
          name: p.user.name,
          profilePhoto: p.user.profilePhoto,
          isOnline: p.user.isOnline,
          lastSeen: p.user.lastSeen
        })),
        admins: chat.admins?.map(admin => ({
          id: admin._id,
          name: admin.name,
          profilePhoto: admin.profilePhoto
        })) || []
      };
    });

    res.json({
      success: true,
      data: {
        chats: formattedChats
      }
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/chats/individual
// @desc    Create or get individual chat
// @access  Private
router.post('/individual', async (req, res) => {
  try {
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({
        success: false,
        message: 'Participant ID is required'
      });
    }

    // Check if participant exists
    const participant = await User.findById(participantId);
    if (!participant || !participant.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    // Check if trying to chat with self
    if (participantId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create chat with yourself'
      });
    }

    // Find or create individual chat
    const chat = await Chat.findOrCreateIndividualChat(req.user._id, participantId);

    // Format chat for response
    const otherParticipant = chat.participants.find(
      p => p.user._id.toString() !== req.user._id.toString()
    );

    const formattedChat = {
      id: chat._id,
      name: otherParticipant.user.name,
      type: 'individual',
      isGroup: false,
      lastMessage: null,
      lastMessageAt: chat.lastMessageAt,
      unreadCount: 0,
      participants: chat.participants.map(p => ({
        id: p.user._id,
        name: p.user.name,
        profilePhoto: p.user.profilePhoto,
        isOnline: p.user.isOnline,
        lastSeen: p.user.lastSeen
      })),
      admins: []
    };

    res.json({
      success: true,
      data: {
        chat: formattedChat
      }
    });
  } catch (error) {
    console.error('Create individual chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/chats/group
// @desc    Create group chat
// @access  Private
router.post('/group', validateCreateGroup, async (req, res) => {
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

    const { name, participants, description } = req.body;

    // Add current user to participants if not already included
    const allParticipants = [...new Set([...participants, req.user._id.toString()])];

    // Check if all participants exist
    const participantUsers = await User.find({
      _id: { $in: allParticipants },
      isActive: true
    });

    if (participantUsers.length !== allParticipants.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more participants not found'
      });
    }

    // Create group chat
    const chat = new Chat({
      name,
      type: 'group',
      description,
      participants: allParticipants.map(userId => ({
        user: userId,
        role: userId === req.user._id.toString() ? 'admin' : 'member'
      }))
    });

    await chat.save();

    // Populate the chat
    const populatedChat = await Chat.findById(chat._id)
      .populate('participants.user', 'name profilePhoto status isOnline lastSeen')
      .populate('admins', 'name profilePhoto');

    // Format chat for response
    const formattedChat = {
      id: populatedChat._id,
      name: populatedChat.name,
      type: 'group',
      isGroup: true,
      description: populatedChat.description,
      lastMessage: null,
      lastMessageAt: populatedChat.lastMessageAt,
      unreadCount: 0,
      participants: populatedChat.participants.map(p => ({
        id: p.user._id,
        name: p.user.name,
        profilePhoto: p.user.profilePhoto,
        isOnline: p.user.isOnline,
        lastSeen: p.user.lastSeen,
        role: p.role
      })),
      admins: populatedChat.admins.map(admin => ({
        id: admin._id,
        name: admin.name,
        profilePhoto: admin.profilePhoto
      }))
    };

    res.status(201).json({
      success: true,
      message: 'Group chat created successfully',
      data: {
        chat: formattedChat
      }
    });
  } catch (error) {
    console.error('Create group chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/chats/:chatId
// @desc    Get chat by ID
// @access  Private
router.get('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId)
      .populate('participants.user', 'name profilePhoto status isOnline lastSeen')
      .populate('lastMessage')
      .populate('admins', 'name profilePhoto');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is participant
    const isParticipant = chat.participants.some(
      p => p.user._id.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Format chat for response
    const otherParticipants = chat.participants.filter(
      p => p.user._id.toString() !== req.user._id.toString()
    );

    let chatName = chat.name;
    if (chat.type === 'individual' && otherParticipants.length > 0) {
      chatName = otherParticipants[0].user.name;
    }

    const formattedChat = {
      id: chat._id,
      name: chatName,
      type: chat.type,
      isGroup: chat.type === 'group',
      description: chat.description,
      lastMessage: chat.lastMessage ? {
        content: chat.lastMessage.content,
        type: chat.lastMessage.type,
        timestamp: chat.lastMessage.createdAt
      } : null,
      lastMessageAt: chat.lastMessageAt,
      unreadCount: chat.unreadCount.get(req.user._id.toString()) || 0,
      participants: chat.participants.map(p => ({
        id: p.user._id,
        name: p.user.name,
        profilePhoto: p.user.profilePhoto,
        isOnline: p.user.isOnline,
        lastSeen: p.user.lastSeen,
        role: p.role
      })),
      admins: chat.admins.map(admin => ({
        id: admin._id,
        name: admin.name,
        profilePhoto: admin.profilePhoto
      }))
    };

    res.json({
      success: true,
      data: {
        chat: formattedChat
      }
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/chats/:chatId
// @desc    Update group chat
// @access  Private
router.put('/:chatId', validateUpdateGroup, async (req, res) => {
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

    const { chatId } = req.params;
    const { name, description } = req.body;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is admin (for group chats)
    if (chat.type === 'group') {
      const isAdmin = chat.admins.some(
        admin => admin.toString() === req.user._id.toString()
      );

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only admins can update group chat'
        });
      }
    }

    // Update chat
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { name, description },
      { new: true }
    )
    .populate('participants.user', 'name profilePhoto status isOnline lastSeen')
    .populate('admins', 'name profilePhoto');

    res.json({
      success: true,
      message: 'Chat updated successfully',
      data: {
        chat: updatedChat
      }
    });
  } catch (error) {
    console.error('Update chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/chats/:chatId/participants
// @desc    Add participants to group chat
// @access  Private
router.post('/:chatId/participants', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { participants } = req.body;

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Participants array is required'
      });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (chat.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'Can only add participants to group chats'
      });
    }

    // Check if user is admin
    const isAdmin = chat.admins.some(
      admin => admin.toString() === req.user._id.toString()
    );

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can add participants'
      });
    }

    // Add participants
    for (const participantId of participants) {
      await chat.addParticipant(participantId);
    }

    const updatedChat = await Chat.findById(chatId)
      .populate('participants.user', 'name profilePhoto status isOnline lastSeen')
      .populate('admins', 'name profilePhoto');

    res.json({
      success: true,
      message: 'Participants added successfully',
      data: {
        chat: updatedChat
      }
    });
  } catch (error) {
    console.error('Add participants error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/chats/:chatId/participants/:participantId
// @desc    Remove participant from group chat
// @access  Private
router.delete('/:chatId/participants/:participantId', async (req, res) => {
  try {
    const { chatId, participantId } = req.params;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (chat.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'Can only remove participants from group chats'
      });
    }

    // Check if user is admin
    const isAdmin = chat.admins.some(
      admin => admin.toString() === req.user._id.toString()
    );

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can remove participants'
      });
    }

    // Remove participant
    await chat.removeParticipant(participantId);

    const updatedChat = await Chat.findById(chatId)
      .populate('participants.user', 'name profilePhoto status isOnline lastSeen')
      .populate('admins', 'name profilePhoto');

    res.json({
      success: true,
      message: 'Participant removed successfully',
      data: {
        chat: updatedChat
      }
    });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/chats/:chatId
// @desc    Leave chat
// @access  Private
router.delete('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is participant
    const isParticipant = chat.participants.some(
      p => p.user.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant of this chat'
      });
    }

    if (chat.type === 'group') {
      // Remove from group
      await chat.removeParticipant(req.user._id);
    } else {
      // For individual chats, mark as inactive
      chat.isActive = false;
      await chat.save();
    }

    res.json({
      success: true,
      message: 'Left chat successfully'
    });
  } catch (error) {
    console.error('Leave chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

