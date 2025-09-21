const mongoose = require('mongoose');

// Enhanced Room schema for DevHub+ collaboration
const collabRoomSchema = new mongoose.Schema({
  // Room identification - use same format as existing Prisma rooms
  roomId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 50,
    index: true
  },
  
  // Basic room info
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Room settings
  isPublic: {
    type: Boolean,
    default: false
  },
  maxParticipants: {
    type: Number,
    default: 10,
    min: 2,
    max: 50
  },
  
  // Owner information (reference to User in PostgreSQL by ID)
  ownerId: {
    type: String, // Store PostgreSQL user ID as string
    required: true,
    index: true
  },
  ownerUsername: {
    type: String, // Cache username for quick display
    required: true
  },
  
  // Participants tracking
  participants: [{
    userId: {
      type: String, // PostgreSQL user ID
      required: true
    },
    username: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['OWNER', 'ADMIN', 'PARTICIPANT'],
      default: 'PARTICIPANT'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastActive: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Collaboration data
  whiteboardData: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
  stickyNotes: [{
    id: String,
    content: String,
    x: Number,
    y: Number,
    color: String,
    author: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }],
  notesData: {
    type: String,
    default: '',
    maxlength: 100000 // 100KB limit
  },
  
  // Chat messages
  chatMessages: [{
    id: String,
    userId: String,
    username: String,
    message: String,
    timestamp: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text'
    }
  }],
  
  // File uploads
  files: [{
    id: String,
    name: String,
    size: Number,
    type: String,
    url: String,
    uploadedBy: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Polls and interactive elements
  polls: [{
    id: String,
    question: String,
    options: [String],
    votes: {
      type: Map,
      of: Number // userId -> optionIndex
    },
    createdBy: String,
    createdAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
  }],
  
  // Room settings and preferences
  settings: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    allowAnonymous: {
      type: Boolean,
      default: false
    },
    enableVoiceChat: {
      type: Boolean,
      default: true
    },
    enableScreenShare: {
      type: Boolean,
      default: true
    },
    autoSave: {
      type: Boolean,
      default: true
    }
  },
  
  // Activity tracking
  metadata: {
    totalSessions: {
      type: Number,
      default: 0
    },
    totalMessages: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true
    },
    activeUsers: {
      type: Number,
      default: 0
    }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance (only define unique indexes, roomId already has unique: true)
collabRoomSchema.index({ isPublic: 1, 'metadata.lastActivity': -1 });
collabRoomSchema.index({ 'participants.userId': 1 });
collabRoomSchema.index({ updatedAt: -1 });

// Pre-save middleware
collabRoomSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  this.metadata.lastActivity = new Date();
  next();
});

collabRoomSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  this.set({ 'metadata.lastActivity': new Date() });
  next();
});

// Instance methods
collabRoomSchema.methods.addParticipant = function(userId, username, role = 'PARTICIPANT') {
  // Check if user already exists
  const existingIndex = this.participants.findIndex(p => p.userId === userId);
  
  if (existingIndex !== -1) {
    // Update existing participant
    this.participants[existingIndex].lastActive = new Date();
    return false; // Already exists
  } else {
    // Add new participant
    this.participants.push({
      userId,
      username,
      role,
      joinedAt: new Date(),
      lastActive: new Date()
    });
    return true; // New participant added
  }
};

collabRoomSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(p => p.userId !== userId);
};

collabRoomSchema.methods.updateActivity = function() {
  this.metadata.lastActivity = new Date();
  this.updatedAt = new Date();
  return this.save();
};

collabRoomSchema.methods.addChatMessage = function(userId, username, message, type = 'text') {
  const messageId = new Date().getTime().toString() + Math.random().toString(36).substr(2, 9);
  this.chatMessages.push({
    id: messageId,
    userId,
    username,
    message,
    timestamp: new Date(),
    type
  });
  this.metadata.totalMessages += 1;
  return messageId;
};

// Static methods
collabRoomSchema.statics.findByRoomId = function(roomId) {
  return this.findOne({ roomId });
};

collabRoomSchema.statics.findPublicRooms = function(page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  return this.find({ isPublic: true })
    .sort({ 'metadata.lastActivity': -1 })
    .skip(skip)
    .limit(limit)
    .select('roomId name description ownerId ownerUsername participants metadata createdAt updatedAt');
};

collabRoomSchema.statics.findUserRooms = function(userId) {
  return this.find({ 
    $or: [
      { ownerId: userId },
      { 'participants.userId': userId }
    ]
  })
  .sort({ updatedAt: -1 })
  .select('roomId name description ownerId ownerUsername participants metadata createdAt updatedAt');
};

// Clean up old inactive rooms (can be called periodically)
collabRoomSchema.statics.cleanupInactiveRooms = function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.deleteMany({
    'metadata.lastActivity': { $lt: cutoffDate },
    isPublic: false // Only cleanup private rooms
  });
};

module.exports = mongoose.model('CollabRoom', collabRoomSchema);