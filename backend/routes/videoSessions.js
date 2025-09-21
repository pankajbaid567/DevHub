const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const authMiddleware = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');

// Get all sessions for a user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, type, limit = 20, page = 1, hostId } = req.query;
    const userIdStr = String(req.user.id);

    let query;
    if (hostId) {
      // Explicit hosting filter
      query = { hostId: String(hostId) };
    } else {
      // Sessions where user is host or participant
      query = {
        $or: [
          { hostId: userIdStr },
          { 'participants.userId': userIdStr }
        ]
      };
    }

    if (status) {
      query.status = status;
    }
    if (type) {
      query.type = type;
    }

    const sessions = await Session.find(query)
      .sort({ scheduledStartTime: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-chatMessages -whiteboard.data');

    const total = await Session.countDocuments(query);

    // Normalize hostId to number where possible for frontend comparison
    const normalized = sessions.map(s => ({
      ...s.toObject(),
      hostId: isNaN(Number(s.hostId)) ? s.hostId : Number(s.hostId)
    }));

    res.json({
      success: true,
      sessions: normalized,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sessions'
    });
  }
});

// Create a new session
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      scheduledStartTime,
      scheduledEndTime,
      type = 'meeting',
      settings = {}
    } = req.body;

    console.log('[VIDEO_SESSIONS][CREATE] userId=', req.user.id, 'body=', {
      title,
      description,
      scheduledStartTime,
      scheduledEndTime,
      type,
      settings
    });

    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }
    if (!scheduledStartTime || !scheduledEndTime) {
      return res.status(400).json({ success: false, error: 'Start and End time are required' });
    }

    const start = new Date(scheduledStartTime);
    const end = new Date(scheduledEndTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date format' });
    }
    if (end <= start) {
      return res.status(400).json({ success: false, error: 'End time must be after start time' });
    }

    const sessionId = uuidv4();
    
    const session = new Session({
      sessionId,
      title,
      description,
      hostId: String(req.user.id),
      hostName: req.user.username,
      scheduledStartTime: start,
      scheduledEndTime: end,
      type,
      settings: {
        isPublic: false,
        requireApproval: false,
        allowRecording: true,
        maxParticipants: 100,
        waitingRoom: false,
        muteOnEntry: false,
        disableVideo: false,
        allowScreenShare: true,
        allowChat: true,
        allowBreakoutRooms: false,
        ...settings
      }
    });

    // Add host as first participant
    await session.addParticipant({
      userId: String(req.user.id),
      username: req.user.username,
      email: req.user.email,
      role: 'host',
      permissions: {
        canShare: true,
        canChat: true,
        canVideo: true,
        canAudio: true,
        canRecord: true
      }
    });

    console.log('[VIDEO_SESSIONS][CREATE] success sessionId=', session.sessionId);
    res.status(201).json({
      success: true,
      session: {
        sessionId: session.sessionId,
        title: session.title,
        description: session.description,
        scheduledStartTime: session.scheduledStartTime,
        scheduledEndTime: session.scheduledEndTime,
        type: session.type,
        status: session.status,
        settings: session.settings
      }
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create session'
    });
  }
});

// Get session details
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await Session.findOne({ sessionId })
      .select('-chatMessages -whiteboard.data');

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session'
    });
  }
});

// Join a session
router.post('/:sessionId/join', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId, username, email, password } = req.body;

    const session = await Session.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Check if session has ended
    if (session.status === 'ended') {
      return res.status(400).json({
        success: false,
        error: 'Session has ended'
      });
    }

    // Check if session requires password (if it's private)
    if (!session.settings.isPublic && password && session.password !== password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid session password'
      });
    }

    // Check participant limit
    const activeParticipants = session.participants.filter(p => p.isPresent).length;
    if (activeParticipants >= session.settings.maxParticipants) {
      return res.status(400).json({
        success: false,
        error: 'Session is full'
      });
    }

    // Add participant
    const participant = {
      userId: userId || `guest_${Date.now()}`,
      username: username || 'Guest User',
      email: email || '',
      role: userId === session.hostId ? 'host' : 'participant',
      permissions: {
        canShare: session.settings.allowScreenShare,
        canChat: session.settings.allowChat,
        canVideo: !session.settings.disableVideo,
        canAudio: true,
        canRecord: false
      },
      mediaState: {
        video: false,
        audio: !session.settings.muteOnEntry,
        screenShare: false
      }
    };

    // Check if participant already exists
    const existingParticipant = session.participants.find(p => p.userId === participant.userId);
    if (existingParticipant) {
      existingParticipant.isPresent = true;
      existingParticipant.leftAt = undefined;
      await session.save();
    } else {
      await session.addParticipant(participant);
    }

    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        title: session.title,
        description: session.description,
        hostId: session.hostId,
        status: session.status,
        type: session.type,
        settings: session.settings,
        participantRole: participant.role,
        permissions: participant.permissions
      }
    });
  } catch (error) {
    console.error('Error joining session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join session'
    });
  }
});

// Update session settings (host only)
router.put('/:sessionId/settings', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { settings } = req.body;

    const session = await Session.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Check if user is host
    if (session.hostId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Only host can update session settings'
      });
    }

    session.settings = { ...session.settings, ...settings };
    await session.save();

    res.json({
      success: true,
      settings: session.settings
    });
  } catch (error) {
    console.error('Error updating session settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update session settings'
    });
  }
});

// Update participant permissions
router.put('/:sessionId/participants/:userId/permissions', authMiddleware, async (req, res) => {
  try {
    const { sessionId, userId } = req.params;
    const { permissions } = req.body;

    const session = await Session.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Check if user is host or co-host
    const userParticipant = session.participants.find(p => p.userId === req.user.id);
    if (!userParticipant || !['host', 'co-host', 'moderator'].includes(userParticipant.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    await session.updateParticipantPermissions(userId, permissions);

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

// Start session
router.post('/:sessionId/start', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Check if user is host
  if (String(session.hostId) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        error: 'Only host can start the session'
      });
    }

    await session.startSession();

    res.json({
      success: true,
      message: 'Session started',
      session: {
        sessionId: session.sessionId,
        status: session.status,
        actualStartTime: session.actualStartTime
      }
    });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start session'
    });
  }
});

// End session
router.post('/:sessionId/end', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Check if user is host
  if (String(session.hostId) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        error: 'Only host can end the session'
      });
    }

    await session.endSession();

    res.json({
      success: true,
      message: 'Session ended',
      analytics: session.analytics
    });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end session'
    });
  }
});

// Get session analytics
router.get('/:sessionId/analytics', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Check if user is host or participant
    const isParticipant = session.participants.some(p => p.userId === req.user.id);
    if (session.hostId !== req.user.id && !isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      analytics: {
        ...session.analytics,
        duration: session.actualEndTime && session.actualStartTime 
          ? Math.round((session.actualEndTime - session.actualStartTime) / 1000 / 60) 
          : null,
        participants: session.participants.map(p => ({
          userId: p.userId,
          username: p.username,
          role: p.role,
          joinedAt: p.joinedAt,
          leftAt: p.leftAt,
          duration: p.leftAt && p.joinedAt 
            ? Math.round((p.leftAt - p.joinedAt) / 1000 / 60)
            : null
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching session analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session analytics'
    });
  }
});

module.exports = router;