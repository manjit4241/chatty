const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Chat name cannot be more than 100 characters']
  },
  type: {
    type: String,
    enum: ['individual', 'group'],
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: new Map()
  },
  isActive: {
    type: Boolean,
    default: true
  },
  groupPhoto: {
    type: String,
    default: null
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters'],
    default: ''
  },
  settings: {
    onlyAdminsCanSendMessages: {
      type: Boolean,
      default: false
    },
    onlyAdminsCanEditInfo: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for chat display name
chatSchema.virtual('displayName').get(function() {
  if (this.type === 'group') {
    return this.name || 'Group Chat';
  }
  return this.name || 'Chat';
});

// Index for better query performance
chatSchema.index({ participants: 1 });
chatSchema.index({ type: 1, lastMessageAt: -1 });
chatSchema.index({ 'participants.user': 1, lastMessageAt: -1 });

// Pre-save middleware to set admins for group chats
chatSchema.pre('save', function(next) {
  if (this.type === 'group' && this.participants.length > 0) {
    // Set first participant as admin if no admins exist
    if (!this.admins || this.admins.length === 0) {
      this.admins = [this.participants[0].user];
      this.participants[0].role = 'admin';
    }
  }
  next();
});

// Method to add participant to group
chatSchema.methods.addParticipant = function(userId, role = 'member') {
  const existingParticipant = this.participants.find(p => p.user.toString() === userId.toString());
  
  if (!existingParticipant) {
    this.participants.push({
      user: userId,
      role: role,
      joinedAt: new Date(),
      isActive: true
    });
    
    if (role === 'admin') {
      this.admins.push(userId);
    }
  }
  
  return this.save();
};

// Method to remove participant from group
chatSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(p => p.user.toString() !== userId.toString());
  this.admins = this.admins.filter(admin => admin.toString() !== userId.toString());
  
  return this.save();
};

// Method to update unread count for a user
chatSchema.methods.updateUnreadCount = function(userId, count = 0) {
  this.unreadCount.set(userId.toString(), count);
  return this.save();
};

// Method to increment unread count for a user
chatSchema.methods.incrementUnreadCount = function(userId) {
  const currentCount = this.unreadCount.get(userId.toString()) || 0;
  this.unreadCount.set(userId.toString(), currentCount + 1);
  return this.save();
};

// Method to reset unread count for a user
chatSchema.methods.resetUnreadCount = function(userId) {
  this.unreadCount.set(userId.toString(), 0);
  return this.save();
};

// Static method to find or create individual chat
chatSchema.statics.findOrCreateIndividualChat = async function(user1Id, user2Id) {
  // Check if chat already exists
  let chat = await this.findOne({
    type: 'individual',
    'participants.user': { $all: [user1Id, user2Id] },
    'participants.1': { $exists: false } // Ensure only 2 participants
  }).populate('participants.user', 'name profilePhoto status isOnline lastSeen');

  if (!chat) {
    // Create new individual chat
    chat = new this({
      type: 'individual',
      participants: [
        { user: user1Id, role: 'member' },
        { user: user2Id, role: 'member' }
      ]
    });
    await chat.save();
    
    // Populate the participants
    chat = await this.findById(chat._id).populate('participants.user', 'name profilePhoto status isOnline lastSeen');
  }

  return chat;
};

// Static method to get user's chats
chatSchema.statics.getUserChats = function(userId) {
  return this.find({
    'participants.user': userId,
    isActive: true
  })
  .populate('participants.user', 'name profilePhoto status isOnline lastSeen')
  .populate('lastMessage')
  .populate('admins', 'name profilePhoto')
  .sort({ lastMessageAt: -1 });
};

module.exports = mongoose.model('Chat', chatSchema);

