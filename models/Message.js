const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: [5000, 'Message cannot be more than 5000 characters']
  },
  type: {
    type: String,
    enum: ['text', 'image', 'audio', 'video', 'file', 'location'],
    default: 'text'
  },
  mediaUrl: {
    type: String,
    default: null
  },
  mediaType: {
    type: String,
    default: null
  },
  mediaSize: {
    type: Number,
    default: null
  },
  mediaDuration: {
    type: Number,
    default: null // For audio/video messages
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  deliveredTo: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deliveredAt: {
      type: Date,
      default: Date.now
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for message status
messageSchema.virtual('status').get(function() {
  if (this.isDeleted) return 'deleted';
  if (this.readBy.length > 0) return 'read';
  if (this.deliveredTo.length > 0) return 'delivered';
  return 'sent';
});

// Index for better query performance
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ 'readBy.user': 1 });

// Pre-save middleware to update chat's last message
messageSchema.pre('save', async function(next) {
  if (this.isNew && !this.isDeleted) {
    try {
      const Chat = require('./Chat');
      await Chat.findByIdAndUpdate(this.chat, {
        lastMessage: this._id,
        lastMessageAt: this.createdAt || new Date()
      });
    } catch (error) {
      console.error('Error updating chat last message:', error);
    }
  }
  next();
});

// Method to mark message as read by user
messageSchema.methods.markAsRead = function(userId) {
  const existingRead = this.readBy.find(read => read.user.toString() === userId.toString());
  
  if (!existingRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
  }
  
  return this.save();
};

// Method to mark message as delivered to user
messageSchema.methods.markAsDelivered = function(userId) {
  const existingDelivery = this.deliveredTo.find(delivery => delivery.user.toString() === userId.toString());
  
  if (!existingDelivery) {
    this.deliveredTo.push({
      user: userId,
      deliveredAt: new Date()
    });
  }
  
  return this.save();
};

// Method to add reaction
messageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(reaction => reaction.user.toString() !== userId.toString());
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    emoji: emoji,
    createdAt: new Date()
  });
  
  return this.save();
};

// Method to remove reaction
messageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(reaction => reaction.user.toString() !== userId.toString());
  return this.save();
};

// Method to soft delete message
messageSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Method to edit message
messageSchema.methods.editMessage = function(newContent) {
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

// Static method to get messages for a chat
messageSchema.statics.getChatMessages = function(chatId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  
  return this.find({
    chat: chatId,
    isDeleted: false
  })
  .populate('sender', 'name profilePhoto')
  .populate('replyTo', 'content sender')
  .populate('readBy.user', 'name profilePhoto')
  .populate('reactions.user', 'name profilePhoto')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .lean();
};

// Static method to get unread messages count for a user in a chat
messageSchema.statics.getUnreadCount = function(chatId, userId) {
  return this.countDocuments({
    chat: chatId,
    sender: { $ne: userId },
    isDeleted: false,
    'readBy.user': { $ne: userId }
  });
};

// Static method to mark all messages in a chat as read for a user
messageSchema.statics.markChatAsRead = function(chatId, userId) {
  return this.updateMany(
    {
      chat: chatId,
      sender: { $ne: userId },
      isDeleted: false,
      'readBy.user': { $ne: userId }
    },
    {
      $push: {
        readBy: {
          user: userId,
          readAt: new Date()
        }
      }
    }
  );
};

module.exports = mongoose.model('Message', messageSchema);

