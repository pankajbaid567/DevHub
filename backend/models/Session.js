const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['host', 'co-host', 'participant', 'moderator'],
    default: 'participant'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  leftAt: {
    type: Date
  },
  isPresent: {
    type: Boolean,
    default: true
  },
  permissions: {
    canShare: {
      type: Boolean,
      default: true
    },
    canChat: {
      type: Boolean,
      default: true
    },
    canVideo: {
      type: Boolean,
      default: true
    },
    canAudio: {
      type: Boolean,
      default: true
    },
    canRecord: {
      type: Boolean,
      default: false
    }
  },
  mediaState: {
    video: {
      type: Boolean,
      default: false
    },
    audio: {
      type: Boolean,
      default: false
    },
    screenShare: {
      type: Boolean,
      default: false
    }
  },
  socketId: String,
  peerId: String
});

const chatMessageSchema = new mongoose.Schema({
  senderId: {
    type: String,
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'system', 'file', 'emoji'],
    default: 'text'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  recipientId: String
});

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  hostId: {
    type: String,
    required: true
  },
  hostName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'ended', 'cancelled'],
    default: 'scheduled'
  },
  type: {
    type: String,
    enum: ['meeting', 'webinar', 'study-session', 'interview', 'presentation'],
    default: 'meeting'
  },
  scheduledStartTime: {
    type: Date,
    required: true
  },
  scheduledEndTime: {
    type: Date,
    required: true
  },
  actualStartTime: {
    type: Date
  },
  actualEndTime: {
    type: Date
  },
  participants: [participantSchema],
  chatMessages: [chatMessageSchema],
  settings: {
    isPublic: {
      type: Boolean,
      default: false
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    allowRecording: {
      type: Boolean,
      default: true
    },
    maxParticipants: {
      type: Number,
      default: 100
    },
    waitingRoom: {
      type: Boolean,
      default: false
    },
    muteOnEntry: {
      type: Boolean,
      default: false
    },
    disableVideo: {
      type: Boolean,
      default: false
    },
    allowScreenShare: {
      type: Boolean,
      default: true
    },
    allowChat: {
      type: Boolean,
      default: true
    },
    allowBreakoutRooms: {
      type: Boolean,
      default: false
    }
  },
  recording: {
    isRecording: {
      type: Boolean,
      default: false
    },
    recordingId: String,
    recordingUrl: String,
    startedAt: Date,
    endedAt: Date,
    recordedBy: String
  },
  breakoutRooms: [{
    roomId: String,
    name: String,
    participants: [String],
    isActive: {
      type: Boolean,
      default: false
    }
  }],
  whiteboard: {
    isEnabled: {
      type: Boolean,
      default: true
    },
    data: [{
      type: String,
      path: String,
      color: String,
      width: Number,
      timestamp: Date,
      userId: String
    }]
  },
  polls: [{
    pollId: String,
    question: String,
    options: [String],
    votes: [{
      userId: String,
      option: String,
      timestamp: Date
    }],
    isActive: {
      type: Boolean,
      default: false
    },
    createdBy: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  analytics: {
    totalParticipants: {
      type: Number,
      default: 0
    },
    peakParticipants: {
      type: Number,
      default: 0
    },
    averageDuration: {
      type: Number,
      default: 0
    },
    chatMessages: {
      type: Number,
      default: 0
    },
    screenShares: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance (avoid duplicating automatic unique index on sessionId)
sessionSchema.index({ hostId: 1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ scheduledStartTime: 1 });
sessionSchema.index({ 'participants.userId': 1 });

// Instance methods
sessionSchema.methods.addParticipant = function(participant) {
  const existingParticipant = this.participants.find(p => p.userId === participant.userId);
  if (!existingParticipant) {
    this.participants.push(participant);
    this.analytics.totalParticipants += 1;
    if (this.participants.filter(p => p.isPresent).length > this.analytics.peakParticipants) {
      this.analytics.peakParticipants = this.participants.filter(p => p.isPresent).length;
    }
  }
  return this.save();
};

sessionSchema.methods.removeParticipant = function(userId) {
  const participant = this.participants.find(p => p.userId === userId);
  if (participant) {
    participant.isPresent = false;
    participant.leftAt = new Date();
  }
  return this.save();
};

sessionSchema.methods.updateParticipantPermissions = function(userId, permissions) {
  const participant = this.participants.find(p => p.userId === userId);
  if (participant) {
    participant.permissions = { ...participant.permissions, ...permissions };
  }
  return this.save();
};

sessionSchema.methods.addChatMessage = function(message) {
  this.chatMessages.push(message);
  this.analytics.chatMessages += 1;
  return this.save();
};

sessionSchema.methods.startSession = function() {
  this.status = 'live';
  this.actualStartTime = new Date();
  return this.save();
};

sessionSchema.methods.endSession = function() {
  this.status = 'ended';
  this.actualEndTime = new Date();
  
  // Calculate average duration
  const duration = (this.actualEndTime - this.actualStartTime) / 1000 / 60; // minutes
  this.analytics.averageDuration = duration;
  
  // Mark all participants as left
  this.participants.forEach(p => {
    if (p.isPresent) {
      p.isPresent = false;
      p.leftAt = new Date();
    }
  });
  
  return this.save();
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;