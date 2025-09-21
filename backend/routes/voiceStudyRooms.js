const express = require('express');
const router = express.Router();
const VoiceStudyRoom = require('../models/VoiceStudyRoom');
const authMiddleware = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');

// Get all voice study rooms (with filtering)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { 
      status, 
      visibility, 
      subject, 
      limit = 20, 
      page = 1,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const userId = req.user.id;
    
    const query = {};
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by visibility (show public rooms and user's own rooms)
    if (visibility) {
      query.visibility = visibility;
    } else {
      query.$or = [
        { visibility: 'public' },
        { createdBy: userId },
        { 'participants.userId': userId }
      ];
    }
    
    // Filter by subject
    if (subject) {
      query.subject = new RegExp(subject, 'i');
    }
    
    // Search functionality
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { subject: new RegExp(search, 'i') },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const rooms = await VoiceStudyRoom.find(query)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-chatMessages -participants.socketId -participants.peerId');

    const total = await VoiceStudyRoom.countDocuments(query);

    res.json({
      success: true,
      rooms,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching voice study rooms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch voice study rooms'
    });
  }
});

// Get user's voice study rooms
router.get('/my-rooms', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const rooms = await VoiceStudyRoom.find({
      $or: [
        { createdBy: userId },
        { 'participants.userId': userId }
      ]
    })
    .sort({ createdAt: -1 })
    .select('-chatMessages -participants.socketId -participants.peerId');

    res.json({
      success: true,
      rooms
    });
  } catch (error) {
    console.error('Error fetching user rooms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user rooms'
    });
  }
});

// Create a new voice study room
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      name,
      description,
      visibility = 'private',
      maxParticipants = 20,
      subject,
      tags = [],
      settings = {}
    } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Room name is required'
      });
    }

    const roomId = uuidv4();
    
    const room = new VoiceStudyRoom({
      roomId,
      name: name.trim(),
      description: description?.trim() || '',
      createdBy: req.user.id,
      creatorName: req.user.username,
      visibility,
      maxParticipants: Math.min(Math.max(maxParticipants, 2), 50),
      subject: subject?.trim() || '',
      tags: Array.isArray(tags) ? tags.map(tag => tag.trim()).filter(Boolean) : [],
      settings: {
        allowTextChat: true,
        allowRecording: true,
        muteNewParticipants: false,
        requireApproval: false,
        allowFileSharing: true,
        autoDeleteMessages: false,
        messageRetentionDays: 30,
        ...settings
      }
    });

    // Generate invite code
    await room.generateInviteCode();

    // Add creator as admin participant
    await room.addParticipant({
      userId: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: 'admin'
    });

    res.status(201).json({
      success: true,
      room: {
        roomId: room.roomId,
        name: room.name,
        description: room.description,
        visibility: room.visibility,
        maxParticipants: room.maxParticipants,
        inviteCode: room.inviteCode,
        createdBy: room.createdBy,
        creatorName: room.creatorName,
        subject: room.subject,
        tags: room.tags,
        settings: room.settings,
        participantCount: room.participants.filter(p => p.isPresent).length
      }
    });
  } catch (error) {
    console.error('Error creating voice study room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create voice study room'
    });
  }
});

// Get room details
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await VoiceStudyRoom.findOne({ roomId })
      .select('-chatMessages -participants.socketId -participants.peerId');

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Voice study room not found'
      });
    }

    res.json({
      success: true,
      room
    });
  } catch (error) {
    console.error('Error fetching room details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch room details'
    });
  }
});

// Join a voice study room
router.post('/:roomId/join', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, username, email, inviteCode } = req.body;

    if (!userId || !username) {
      return res.status(400).json({
        success: false,
        error: 'User ID and username are required'
      });
    }

    const room = await VoiceStudyRoom.findOne({ roomId });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Voice study room not found'
      });
    }

    // Check room status
    if (room.status === 'ended') {
      return res.status(400).json({
        success: false,
        error: 'This study room has ended'
      });
    }

    // Check visibility and invite code
    if (room.visibility === 'private' && room.inviteCode !== inviteCode) {
      return res.status(401).json({
        success: false,
        error: 'Invalid invite code'
      });
    }

    // Check participant limit
    const activeParticipants = room.participants.filter(p => p.isPresent).length;
    if (activeParticipants >= room.maxParticipants) {
      return res.status(400).json({
        success: false,
        error: 'Room is full'
      });
    }

    // Add participant
    const participant = {
      userId,
      username,
      email: email || '',
      role: 'participant',
      voiceState: {
        isMuted: room.settings.muteNewParticipants,
        isSpeaking: false,
        isDeafened: false,
        volume: 1
      },
      permissions: {
        canSpeak: true,
        canInvite: false,
        canKick: false,
        canMuteOthers: false
      }
    };

    await room.addParticipant(participant);

    res.json({
      success: true,
      room: {
        roomId: room.roomId,
        name: room.name,
        description: room.description,
        settings: room.settings,
        participantRole: participant.role,
        permissions: participant.permissions,
        voiceState: participant.voiceState
      }
    });
  } catch (error) {
    console.error('Error joining voice study room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join voice study room'
    });
  }
});

// Leave a voice study room
router.post('/:roomId/leave', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await VoiceStudyRoom.findOne({ roomId });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Voice study room not found'
      });
    }

    await room.removeParticipant(userId);

    res.json({
      success: true,
      message: 'Left voice study room successfully'
    });
  } catch (error) {
    console.error('Error leaving voice study room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to leave voice study room'
    });
  }
});

// Update room settings (admin only)
router.put('/:roomId/settings', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { settings } = req.body;
    const userId = req.user.id;

    const room = await VoiceStudyRoom.findOne({ roomId });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Voice study room not found'
      });
    }

    // Check if user is admin
    const participant = room.participants.find(p => p.userId === userId && p.isPresent);
    if (!participant || participant.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only room admin can update settings'
      });
    }

    room.settings = { ...room.settings, ...settings };
    await room.save();

    res.json({
      success: true,
      settings: room.settings
    });
  } catch (error) {
    console.error('Error updating room settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update room settings'
    });
  }
});

// Update participant permissions
router.put('/:roomId/participants/:participantId/permissions', authMiddleware, async (req, res) => {
  try {
    const { roomId, participantId } = req.params;
    const { permissions } = req.body;
    const userId = req.user.id;

    const room = await VoiceStudyRoom.findOne({ roomId });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Voice study room not found'
      });
    }

    // Check if user has permission to modify permissions
    const requester = room.participants.find(p => p.userId === userId && p.isPresent);
    if (!requester || !['admin', 'moderator'].includes(requester.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    await room.updateParticipantPermissions(participantId, permissions);

    res.json({
      success: true,
      message: 'Participant permissions updated'
    });
  } catch (error) {
    console.error('Error updating participant permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update participant permissions'
    });
  }
});

// Remove participant (admin/moderator only)
router.delete('/:roomId/participants/:participantId', authMiddleware, async (req, res) => {
  try {
    const { roomId, participantId } = req.params;
    const userId = req.user.id;

    const room = await VoiceStudyRoom.findOne({ roomId });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Voice study room not found'
      });
    }

    // Check permissions
    const requester = room.participants.find(p => p.userId === userId && p.isPresent);
    if (!requester || !['admin', 'moderator'].includes(requester.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    // Can't remove the admin
    const targetParticipant = room.participants.find(p => p.userId === participantId);
    if (targetParticipant?.role === 'admin') {
      return res.status(400).json({
        success: false,
        error: 'Cannot remove room admin'
      });
    }

    await room.removeParticipant(participantId);

    res.json({
      success: true,
      message: 'Participant removed successfully'
    });
  } catch (error) {
    console.error('Error removing participant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove participant'
    });
  }
});

// Get room chat messages
router.get('/:roomId/messages', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, page = 1 } = req.query;
    const userId = req.user.id;

    const room = await VoiceStudyRoom.findOne({ roomId });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Voice study room not found'
      });
    }

    // Check if user is participant
    const participant = room.participants.find(p => p.userId === userId);
    if (!participant) {
      return res.status(403).json({
        success: false,
        error: 'You are not a participant in this room'
      });
    }

    // Get messages with pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    
    const messages = room.chatMessages
      .slice(-1000) // Get last 1000 messages for performance
      .slice(startIndex, endIndex)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.json({
      success: true,
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: room.chatMessages.length
      }
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat messages'
    });
  }
});

// Start recording (admin only)
router.post('/:roomId/recording/start', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await VoiceStudyRoom.findOne({ roomId });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Voice study room not found'
      });
    }

    // Check permissions
    const participant = room.participants.find(p => p.userId === userId && p.isPresent);
    if (!participant || !['admin', 'moderator'].includes(participant.role)) {
      return res.status(403).json({
        success: false,
        error: 'Only admin or moderator can start recording'
      });
    }

    if (!room.settings.allowRecording) {
      return res.status(400).json({
        success: false,
        error: 'Recording is not allowed in this room'
      });
    }

    if (room.recording.isRecording) {
      return res.status(400).json({
        success: false,
        error: 'Recording is already in progress'
      });
    }

    const recordingId = `rec_${Date.now()}_${roomId}`;
    await room.startRecording(userId, recordingId);

    res.json({
      success: true,
      recordingId,
      message: 'Recording started'
    });
  } catch (error) {
    console.error('Error starting recording:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start recording'
    });
  }
});

// Stop recording
router.post('/:roomId/recording/stop', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { recordingUrl } = req.body;
    const userId = req.user.id;

    const room = await VoiceStudyRoom.findOne({ roomId });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Voice study room not found'
      });
    }

    // Check permissions
    const participant = room.participants.find(p => p.userId === userId && p.isPresent);
    if (!participant || !['admin', 'moderator'].includes(participant.role)) {
      return res.status(403).json({
        success: false,
        error: 'Only admin or moderator can stop recording'
      });
    }

    if (!room.recording.isRecording) {
      return res.status(400).json({
        success: false,
        error: 'No recording in progress'
      });
    }

    await room.stopRecording(recordingUrl);

    res.json({
      success: true,
      recording: room.recording,
      message: 'Recording stopped'
    });
  } catch (error) {
    console.error('Error stopping recording:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop recording'
    });
  }
});

// End room session (admin only)
router.post('/:roomId/end', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await VoiceStudyRoom.findOne({ roomId });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Voice study room not found'
      });
    }

    // Check if user is admin
    const participant = room.participants.find(p => p.userId === userId && p.isPresent);
    if (!participant || participant.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only room admin can end the session'
      });
    }

    await room.endSession();

    res.json({
      success: true,
      message: 'Room session ended',
      analytics: room.analytics
    });
  } catch (error) {
    console.error('Error ending room session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end room session'
    });
  }
});

// Get room analytics (admin only)
router.get('/:roomId/analytics', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await VoiceStudyRoom.findOne({ roomId });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Voice study room not found'
      });
    }

    // Check permissions
    const participant = room.participants.find(p => p.userId === userId);
    if (!participant || !['admin', 'moderator'].includes(participant.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      analytics: {
        ...room.analytics,
        currentParticipants: room.participants.filter(p => p.isPresent).length,
        totalParticipantsEver: room.participants.length,
        participantDetails: room.participants.map(p => ({
          userId: p.userId,
          username: p.username,
          role: p.role,
          joinedAt: p.joinedAt,
          leftAt: p.leftAt,
          isPresent: p.isPresent,
          participationTime: p.leftAt && p.joinedAt 
            ? Math.round((p.leftAt - p.joinedAt) / 1000 / 60)
            : null
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching room analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch room analytics'
    });
  }
});

module.exports = router;