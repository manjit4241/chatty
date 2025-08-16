const express = require('express');
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const { uploadSingle, deleteFile } = require('../middleware/upload');

const router = express.Router();

// Get socket.io instance
let io;
const setIO = (socketIO) => {
  io = socketIO;
};

// Export the setIO function
module.exports = { router, setIO };

// Validation middleware
const validateSendMessage = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message content must be between 1 and 5000 characters'),
  body('type')
    .optional()
    .isIn(['text', 'image', 'audio', 'video', 'file', 'location'])
    .withMessage('Invalid message type'),
  body('replyTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid reply message ID')
];

// @route   GET /api/messages/:chatId
// @desc    Get messages for a chat
// @access  Private
router.get('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if user is participant of the chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    const isParticipant = chat.participants.some(
      p => p.user.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get messages
    const messages = await Message.getChatMessages(chatId, parseInt(page), parseInt(limit));

    // Mark messages as read
    await Message.markChatAsRead(chatId, req.user._id);

    // Reset unread count for this chat
    await chat.resetUnreadCount(req.user._id);

    // Emit socket event for read status update
    if (io) {
      io.to(chatId).emit('messages-read', {
        chatId,
        userId: req.user._id,
        timestamp: new Date()
      });
      console.log(`💬 Socket event emitted for messages read in chat ${chatId}`);
    }

    // Format messages for response
    const formattedMessages = messages.map(message => ({
      id: message._id,
      content: message.content,
      type: message.type,
      mediaUrl: message.mediaUrl,
      mediaType: message.mediaType,
      mediaSize: message.mediaSize,
      mediaDuration: message.mediaDuration,
      location: message.location,
      sender: {
        id: message.sender._id,
        name: message.sender.name,
        profilePhoto: message.sender.profilePhoto
      },
      replyTo: message.replyTo ? {
        id: message.replyTo._id,
        content: message.replyTo.content,
        sender: {
          id: message.replyTo.sender._id,
          name: message.replyTo.sender.name
        }
      } : null,
      readBy: message.readBy.map(read => ({
        user: {
          id: read.user._id,
          name: read.user.name,
          profilePhoto: read.user.profilePhoto
        },
        readAt: read.readAt
      })),
      reactions: message.reactions.map(reaction => ({
        user: {
          id: reaction.user._id,
          name: reaction.user.name,
          profilePhoto: reaction.user.profilePhoto
        },
        emoji: reaction.emoji,
        createdAt: reaction.createdAt
      })),
      isEdited: message.isEdited,
      editedAt: message.editedAt,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt
    }));

    res.json({
      success: true,
      data: {
        messages: formattedMessages.reverse(), // Reverse to get chronological order
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: messages.length === parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/messages/:chatId
// @desc    Send a message
// @access  Private
router.post('/:chatId', validateSendMessage, async (req, res) => {
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
    const { content, type = 'text', replyTo, location } = req.body;

    // Check if user is participant of the chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    const isParticipant = chat.participants.some(
      p => p.user.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if chat is active
    if (!chat.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Chat is not active'
      });
    }

    // Check group chat restrictions
    if (chat.type === 'group' && chat.settings.onlyAdminsCanSendMessages) {
      const isAdmin = chat.admins.some(
        admin => admin.toString() === req.user._id.toString()
      );

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only admins can send messages in this group'
        });
      }
    }

    // Validate reply message if provided
    if (replyTo) {
      const replyMessage = await Message.findById(replyTo);
      if (!replyMessage || replyMessage.chat.toString() !== chatId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid reply message'
        });
      }
    }

    // Create message
    const messageData = {
      chat: chatId,
      sender: req.user._id,
      content,
      type,
      replyTo
    };

    // Add location if provided
    if (location && type === 'location') {
      messageData.location = location;
    }

    const message = new Message(messageData);
    await message.save();

    // Populate the message
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name profilePhoto')
      .populate('replyTo', 'content sender')
      .populate('readBy.user', 'name profilePhoto')
      .populate('reactions.user', 'name profilePhoto');

    // Increment unread count for other participants
    const otherParticipants = chat.participants.filter(
      p => p.user.toString() !== req.user._id.toString()
    );

    for (const participant of otherParticipants) {
      await chat.incrementUnreadCount(participant.user);
    }

    // Format message for response
    const formattedMessage = {
      id: populatedMessage._id,
      content: populatedMessage.content,
      type: populatedMessage.type,
      mediaUrl: populatedMessage.mediaUrl,
      mediaType: populatedMessage.mediaType,
      mediaSize: populatedMessage.mediaSize,
      mediaDuration: populatedMessage.mediaDuration,
      location: populatedMessage.location,
      sender: {
        id: populatedMessage.sender._id,
        name: populatedMessage.sender.name,
        profilePhoto: populatedMessage.sender.profilePhoto
      },
      replyTo: populatedMessage.replyTo ? {
        id: populatedMessage.replyTo._id,
        content: populatedMessage.replyTo.content,
        sender: {
          id: populatedMessage.replyTo.sender._id,
          name: populatedMessage.replyTo.sender.name
        }
      } : null,
      readBy: [],
      reactions: [],
      isEdited: false,
      createdAt: populatedMessage.createdAt,
      updatedAt: populatedMessage.updatedAt
    };

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message: formattedMessage
      }
    });

    // Emit socket event for real-time updates
    if (io) {
      io.to(chatId).emit('new-message', {
        chatId,
        message: formattedMessage,
        sender: req.user._id,
        timestamp: new Date()
      });
      console.log(`💬 Socket event emitted for new message in chat ${chatId}`);
    }
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/messages/:chatId/upload
// @desc    Upload media message
// @access  Private
router.post('/:chatId/upload', uploadSingle, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { type = 'image', replyTo } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Check if user is participant of the chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    const isParticipant = chat.participants.some(
      p => p.user.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Determine message type based on file
    let messageType = type;
    if (req.file.mimetype.startsWith('image/')) {
      messageType = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      messageType = 'video';
    } else if (req.file.mimetype.startsWith('audio/')) {
      messageType = 'audio';
    } else {
      messageType = 'file';
    }

    // Create message
    const messageData = {
      chat: chatId,
      sender: req.user._id,
      content: `Sent a ${messageType}`,
      type: messageType,
      mediaUrl: req.file.path,
      mediaType: req.file.mimetype,
      mediaSize: req.file.size,
      replyTo
    };

    const message = new Message(messageData);
    await message.save();

    // Populate the message
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name profilePhoto')
      .populate('replyTo', 'content sender');

    // Increment unread count for other participants
    const otherParticipants = chat.participants.filter(
      p => p.user.toString() !== req.user._id.toString()
    );

    for (const participant of otherParticipants) {
      await chat.incrementUnreadCount(participant.user);
    }

    // Format message for response
    const formattedMessage = {
      id: populatedMessage._id,
      content: populatedMessage.content,
      type: populatedMessage.type,
      mediaUrl: populatedMessage.mediaUrl,
      mediaType: populatedMessage.mediaType,
      mediaSize: populatedMessage.mediaSize,
      mediaDuration: populatedMessage.mediaDuration,
      sender: {
        id: populatedMessage.sender._id,
        name: populatedMessage.sender.name,
        profilePhoto: populatedMessage.sender.profilePhoto
      },
      replyTo: populatedMessage.replyTo ? {
        id: populatedMessage.replyTo._id,
        content: populatedMessage.replyTo.content,
        sender: {
          id: populatedMessage.replyTo.sender._id,
          name: populatedMessage.replyTo.sender.name
        }
      } : null,
      readBy: [],
      reactions: [],
      isEdited: false,
      createdAt: populatedMessage.createdAt,
      updatedAt: populatedMessage.updatedAt
    };

    res.status(201).json({
      success: true,
      message: 'Media message sent successfully',
      data: {
        message: formattedMessage
      }
    });

    // Emit socket event for real-time updates
    if (io) {
      io.to(chatId).emit('new-message', {
        chatId,
        message: formattedMessage,
        sender: req.user._id,
        timestamp: new Date()
      });
      console.log(`💬 Socket event emitted for new media message in chat ${chatId}`);
    }
  } catch (error) {
    console.error('Upload media message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/messages/:messageId
// @desc    Edit a message
// @access  Private
router.put('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own messages'
      });
    }

    // Check if message is not deleted
    if (message.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit deleted message'
      });
    }

    // Edit message
    await message.editMessage(content.trim());

    // Populate the message
    const updatedMessage = await Message.findById(messageId)
      .populate('sender', 'name profilePhoto')
      .populate('replyTo', 'content sender')
      .populate('readBy.user', 'name profilePhoto')
      .populate('reactions.user', 'name profilePhoto');

    res.json({
      success: true,
      message: 'Message edited successfully',
      data: {
        message: updatedMessage
      }
    });

    // Emit socket event for real-time updates
    if (io) {
      const chatId = updatedMessage.chat.toString();
      io.to(chatId).emit('message-updated', {
        chatId,
        message: updatedMessage,
        sender: req.user._id,
        timestamp: new Date()
      });
      console.log(`💬 Socket event emitted for message edit in chat ${chatId}`);
    }
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/messages/:messageId
// @desc    Delete a message
// @access  Private
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the sender or admin
    const chat = await Chat.findById(message.chat);
    const isSender = message.sender.toString() === req.user._id.toString();
    const isAdmin = chat.type === 'group' && chat.admins.some(
      admin => admin.toString() === req.user._id.toString()
    );

    if (!isSender && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages'
      });
    }

    // Check if message is already deleted
    if (message.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Message is already deleted'
      });
    }

    // Soft delete message
    await message.softDelete(req.user._id);

    // Delete media file if exists
    if (message.mediaUrl) {
      try {
        await deleteFile(message.mediaUrl);
      } catch (error) {
        console.error('Error deleting media file:', error);
      }
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

    // Emit socket event for real-time updates
    if (io) {
      const chatId = message.chat.toString();
      io.to(chatId).emit('message-deleted', {
        chatId,
        messageId: messageId,
        sender: req.user._id,
        timestamp: new Date()
      });
      console.log(`💬 Socket event emitted for message deletion in chat ${chatId}`);
    }
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/messages/:messageId/reactions
// @desc    Add reaction to message
// @access  Private
router.post('/:messageId/reactions', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required'
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if message is not deleted
    if (message.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Cannot react to deleted message'
      });
    }

    // Add reaction
    await message.addReaction(req.user._id, emoji);

    // Populate the message
    const updatedMessage = await Message.findById(messageId)
      .populate('sender', 'name profilePhoto')
      .populate('reactions.user', 'name profilePhoto');

    res.json({
      success: true,
      message: 'Reaction added successfully',
      data: {
        message: updatedMessage
      }
    });

    // Emit socket event for real-time updates
    if (io) {
      const chatId = updatedMessage.chat.toString();
      io.to(chatId).emit('message-reaction-added', {
        chatId,
        messageId: messageId,
        message: updatedMessage,
        sender: req.user._id,
        timestamp: new Date()
      });
      console.log(`💬 Socket event emitted for reaction added in chat ${chatId}`);
    }
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/messages/:messageId/reactions
// @desc    Remove reaction from message
// @access  Private
router.delete('/:messageId/reactions', async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Remove reaction
    await message.removeReaction(req.user._id);

    // Populate the message
    const updatedMessage = await Message.findById(messageId)
      .populate('sender', 'name profilePhoto')
      .populate('reactions.user', 'name profilePhoto');

    res.json({
      success: true,
      message: 'Reaction removed successfully'
    });

    // Emit socket event for real-time updates
    if (io) {
      const chatId = message.chat.toString();
      io.to(chatId).emit('message-reaction-removed', {
        chatId,
        messageId: messageId,
        message: message,
        sender: req.user._id,
        timestamp: new Date()
      });
      console.log(`💬 Socket event emitted for reaction removed in chat ${chatId}`);
    }
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

