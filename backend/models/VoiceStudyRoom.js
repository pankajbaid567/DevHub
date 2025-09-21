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
    enum: ['admin', 'moderator', 'participant'],
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
  voiceState: {
    isMuted: {
      type: Boolean,
      default: false
    },
    isSpeaking: {
      type: Boolean,
      default: false
    },
    isDeafened: {
      type: Boolean,
      default: false
    },
    volume: {
      type: Number,
      default: 1,
      min: 0,
      max: 1
    }
  },
  permissions: {
    canSpeak: {
      type: Boolean,
      default: true
    },
    canInvite: {
      type: Boolean,
      default: false
    },
    canKick: {
      type: Boolean,
      default: false
    },
    canMuteOthers: {
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
    enum: ['text', 'system', 'file', 'emoji', 'link'],
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
  recipientId: String,
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number
  }]
});

const voiceStudyRoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  createdBy: {
    type: String,
    required: true
  },
  creatorName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'ended'],
    default: 'active'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'invite-only'],
    default: 'private'
  },
  maxParticipants: {
    type: Number,
    default: 20,
    min: 2,
    max: 50
  },
  participants: [participantSchema],
  chatMessages: [chatMessageSchema],
  inviteCode: {
    type: String,
    unique: true
  },
  settings: {
    allowTextChat: {
      type: Boolean,
      default: true
    },
    allowRecording: {
      type: Boolean,
      default: true
    },
    muteNewParticipants: {
      type: Boolean,
      default: false
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    allowFileSharing: {
      type: Boolean,
      default: true
    },
    autoDeleteMessages: {
      type: Boolean,
      default: false
    },
    messageRetentionDays: {
      type: Number,
      default: 30
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
    recordedBy: String,
    duration: Number
  },
  analytics: {
    totalParticipants: {
      type: Number,
      default: 0
    },
    peakParticipants: {
      type: Number,
      default: 0
    },
    totalMessages: {
      type: Number,
      default: 0
    },
    sessionDuration: {
      type: Number,
      default: 0
    },
    averageParticipationTime: {
      type: Number,
      default: 0
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  subject: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
// roomId already has unique: true implicitly indexed
voiceStudyRoomSchema.index({ createdBy: 1 });
voiceStudyRoomSchema.index({ status: 1 });
voiceStudyRoomSchema.index({ visibility: 1 });
// inviteCode has unique: true implicitly indexed
voiceStudyRoomSchema.index({ 'participants.userId': 1 });
voiceStudyRoomSchema.index({ subject: 1 });
voiceStudyRoomSchema.index({ tags: 1 });

// Instance methods
voiceStudyRoomSchema.methods.addParticipant = function(participant) {
  const existingParticipant = this.participants.find(p => p.userId === participant.userId);
  if (!existingParticipant) {
    // Set admin role for creator
    if (participant.userId === this.createdBy) {
      participant.role = 'admin';
      participant.permissions = {
        canSpeak: true,
        canInvite: true,
        canKick: true,
        canMuteOthers: true
      };
    }
    
    this.participants.push(participant);
    this.analytics.totalParticipants += 1;
    
    // Update peak participants
    const currentActive = this.participants.filter(p => p.isPresent).length;
    if (currentActive > this.analytics.peakParticipants) {
      this.analytics.peakParticipants = currentActive;
    }
  } else {
    // Rejoin existing participant
    existingParticipant.isPresent = true;
    existingParticipant.leftAt = undefined;
    existingParticipant.joinedAt = new Date();
  }
  return this.save();
};

voiceStudyRoomSchema.methods.removeParticipant = function(userId) {
  const participant = this.participants.find(p => p.userId === userId);
  if (participant) {
    participant.isPresent = false;
    participant.leftAt = new Date();
    
    // Calculate participation time
    if (participant.joinedAt) {
      const participationTime = (participant.leftAt - participant.joinedAt) / 1000 / 60; // minutes
      this.analytics.averageParticipationTime = 
        (this.analytics.averageParticipationTime + participationTime) / 2;
    }
  }
  return this.save();
};

voiceStudyRoomSchema.methods.updateParticipantVoiceState = function(userId, voiceState) {
  const participant = this.participants.find(p => p.userId === userId);
  if (participant) {
    participant.voiceState = { ...participant.voiceState, ...voiceState };
  }
  return this.save();
};

voiceStudyRoomSchema.methods.updateParticipantPermissions = function(userId, permissions) {
  const participant = this.participants.find(p => p.userId === userId);
  if (participant) {
    participant.permissions = { ...participant.permissions, ...permissions };
  }
  return this.save();
};

voiceStudyRoomSchema.methods.addChatMessage = function(message) {
  this.chatMessages.push(message);
  this.analytics.totalMessages += 1;
  return this.save();
};

voiceStudyRoomSchema.methods.startRecording = function(recordedBy, recordingId) {
  this.recording = {
    isRecording: true,
    recordingId,
    startedAt: new Date(),
    recordedBy
  };
  return this.save();
};

voiceStudyRoomSchema.methods.stopRecording = function(recordingUrl) {
  if (this.recording.isRecording) {
    this.recording.isRecording = false;
    this.recording.endedAt = new Date();
    this.recording.recordingUrl = recordingUrl;
    
    if (this.recording.startedAt) {
      this.recording.duration = (this.recording.endedAt - this.recording.startedAt) / 1000 / 60; // minutes
    }
  }
  return this.save();
};

voiceStudyRoomSchema.methods.generateInviteCode = function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  this.inviteCode = result;
  return this.save();
};

voiceStudyRoomSchema.methods.endSession = function() {
  this.status = 'ended';
  
  // Mark all participants as left
  this.participants.forEach(p => {
    if (p.isPresent) {
      p.isPresent = false;
      p.leftAt = new Date();
    }
  });
  
  // Calculate total session duration
  if (this.createdAt) {
    this.analytics.sessionDuration = (new Date() - this.createdAt) / 1000 / 60; // minutes
  }
  
  return this.save();
};

const VoiceStudyRoom = mongoose.model('VoiceStudyRoom', voiceStudyRoomSchema);

module.exports = VoiceStudyRoom;