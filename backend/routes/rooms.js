const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/authMiddleware');
const mongodb = require('../config/mongodb');
const CollabRoom = require('../models/CollabRoom');

const router = express.Router();

// Use singleton pattern for Prisma client to avoid connection pool issues
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new PrismaClient({
  log: ['warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Initialize MongoDB connection for collaboration features
mongodb.connect().catch(console.error);

// Create a new room
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, isPublic = false, maxParticipants = 10 } = req.body;
    const userId = req.user.id;
    const username = req.user.username;

    if (!name) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    // Check MongoDB connection
    if (!mongodb.isReady()) {
      console.log('⚠️  MongoDB not ready, attempting to connect...');
      await mongodb.connect();
      
      if (!mongodb.isReady()) {
        return res.status(503).json({ 
          error: 'Collaboration service temporarily unavailable' 
        });
      }
    }

    // Generate unique room ID
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create room in MongoDB
    const collabRoom = new CollabRoom({
      roomId,
      name: name.trim(),
      description: description?.trim() || '',
      isPublic,
      maxParticipants,
      ownerId: userId,
      ownerUsername: username,
      participants: [{
        userId: userId,
        username: username,
        role: 'OWNER',
        joinedAt: new Date(),
        lastActive: new Date()
      }],
      whiteboardData: [],
      stickyNotes: [],
      notesData: '',
      chatMessages: [],
      files: [],
      polls: [],
      metadata: {
        totalSessions: 1,
        totalMessages: 0,
        lastActivity: new Date(),
        activeUsers: 1
      }
    });

    await collabRoom.save();

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      room: {
        id: collabRoom.roomId,
        name: collabRoom.name,
        description: collabRoom.description,
        isPublic: collabRoom.isPublic,
        maxParticipants: collabRoom.maxParticipants,
        ownerId: collabRoom.ownerId,
        owner: {
          id: collabRoom.ownerId,
          username: collabRoom.ownerUsername
        },
        participantCount: collabRoom.participants.length,
        createdAt: collabRoom.createdAt,
        updatedAt: collabRoom.updatedAt
      }
    });

  } catch (error) {
    console.error('Room creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create room',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get room by ID
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    // Check MongoDB connection
    if (!mongodb.isReady()) {
      await mongodb.connect();
      
      if (!mongodb.isReady()) {
        return res.status(503).json({ 
          error: 'Collaboration service temporarily unavailable' 
        });
      }
    }

    const room = await CollabRoom.findByRoomId(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Update room activity
    await room.updateActivity();

    res.json({
      success: true,
      room: {
        id: room.roomId,
        name: room.name,
        description: room.description,
        isPublic: room.isPublic,
        maxParticipants: room.maxParticipants,
        ownerId: room.ownerId,
        owner: {
          id: room.ownerId,
          username: room.ownerUsername
        },
        participants: room.participants.map(p => ({
          user: {
            id: p.userId,
            username: p.username
          },
          role: p.role,
          joinedAt: p.joinedAt
        })),
        participantCount: room.participants.length,
        whiteboardData: room.whiteboardData,
        stickyNotes: room.stickyNotes,
        chatMessages: room.chatMessages,
        notesData: room.notesData,
        files: room.files,
        polls: room.polls,
        settings: room.settings,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt
      }
    });

  } catch (error) {
    console.error('Room fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// Join room by ID (create if it doesn't exist) - Demo version without auth
router.post('/join-demo', async (req, res) => {
  try {
    const { roomId, username = 'Anonymous' } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    // Check MongoDB connection
    if (!mongodb.isReady()) {
      await mongodb.connect();
      
      if (!mongodb.isReady()) {
        return res.status(503).json({ 
          error: 'Collaboration service temporarily unavailable' 
        });
      }
    }

    // Find or create room
    let room = await CollabRoom.findByRoomId(roomId);
    
    if (!room) {
      // Create new room
      room = new CollabRoom({
        roomId: roomId.trim(),
        name: `Room ${roomId}`,
        description: 'Collaborative workspace',
        isPublic: true,
        maxParticipants: 50,
        ownerId: 'demo-user',
        ownerUsername: username,
        participants: [{
          userId: 'demo-user',
          username: username,
          role: 'OWNER',
          joinedAt: new Date(),
          lastActive: new Date()
        }],
        whiteboardData: [],
        stickyNotes: [],
        notesData: '',
        chatMessages: [],
        files: [],
        polls: [],
        metadata: {
          totalSessions: 1,
          totalMessages: 0,
          lastActivity: new Date(),
          activeUsers: 1
        }
      });
      await room.save();
      console.log(`🏠 Created new demo room: ${roomId}`);
    } else {
      // Add user as participant if not already
      const wasAdded = room.addParticipant('demo-user', username, 'PARTICIPANT');
      room.metadata.activeUsers = room.participants.length;
      await room.save();
    }

    res.json({
      success: true,
      roomId: room.roomId,
      message: 'Successfully joined room',
      roomData: {
        whiteboardData: room.whiteboardData,
        notesData: room.notesData,
        chatMessages: room.chatMessages,
        lastUpdated: room.updatedAt
      }
    });

  } catch (error) {
    console.error('Error joining demo room:', error);
    res.status(500).json({ 
      error: 'Failed to join room',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Join room by ID (create if it doesn't exist)
router.post('/join', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.body;
    const userId = req.user.id;
    const username = req.user.username;

    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    // Check MongoDB connection
    if (!mongodb.isReady()) {
      await mongodb.connect();
      
      if (!mongodb.isReady()) {
        return res.status(503).json({ 
          error: 'Collaboration service temporarily unavailable' 
        });
      }
    }

    // Find or create room
    let room = await CollabRoom.findByRoomId(roomId);
    
    if (!room) {
      // Create new room
      room = new CollabRoom({
        roomId: roomId.trim(),
        name: `Room ${roomId}`,
        description: 'Collaborative workspace',
        isPublic: true,
        maxParticipants: 50,
        ownerId: userId,
        ownerUsername: username,
        participants: [{
          userId: userId,
          username: username,
          role: 'OWNER',
          joinedAt: new Date(),
          lastActive: new Date()
        }],
        whiteboardData: [],
        stickyNotes: [],
        notesData: '',
        chatMessages: [],
        files: [],
        polls: [],
        metadata: {
          totalSessions: 1,
          totalMessages: 0,
          lastActivity: new Date(),
          activeUsers: 1
        }
      });
      await room.save();
      console.log(`🏠 Created new room: ${roomId}`);
    } else {
      // Add user as participant if not already
      const wasAdded = room.addParticipant(userId, username, 'PARTICIPANT');
      room.metadata.activeUsers = room.participants.length;
      await room.save();
    }

    res.json({
      success: true,
      roomId: room.roomId,
      message: 'Successfully joined room',
      roomData: {
        whiteboardData: room.whiteboardData,
        notesData: room.notesData,
        chatMessages: room.chatMessages,
        lastUpdated: room.updatedAt
      }
    });

  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({ 
      error: 'Failed to join room',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Join room by ID parameter
router.post('/:roomId/join', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const username = req.user.username;

    // Check MongoDB connection
    if (!mongodb.isReady()) {
      await mongodb.connect();
      
      if (!mongodb.isReady()) {
        return res.status(503).json({ 
          error: 'Collaboration service temporarily unavailable' 
        });
      }
    }

    const room = await CollabRoom.findByRoomId(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user is already a participant
    const existingParticipant = room.participants.find(p => p.userId === userId);

    if (existingParticipant) {
      // Update last active time for existing participant
      existingParticipant.lastActive = new Date();
      await room.save();
      return res.json({
        success: true,
        message: 'You are already in this room'
      });
    }

    // Check room capacity
    if (room.participants.length >= room.maxParticipants) {
      return res.status(400).json({ error: 'Room is at maximum capacity' });
    }

    // Add user as participant
    const wasAdded = room.addParticipant(userId, username, 'PARTICIPANT');
    room.metadata.activeUsers = room.participants.length;
    await room.save();

    res.json({
      success: true,
      message: 'Successfully joined room'
    });

  } catch (error) {
    console.error('Room join error:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Leave room
router.post('/:roomId/leave', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // Check MongoDB connection
    if (!mongodb.isReady()) {
      await mongodb.connect();
      
      if (!mongodb.isReady()) {
        return res.status(503).json({ 
          error: 'Collaboration service temporarily unavailable' 
        });
      }
    }

    const room = await CollabRoom.findByRoomId(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const participant = room.participants.find(p => p.userId === userId);

    if (!participant) {
      return res.status(404).json({ error: 'You are not a participant in this room' });
    }

    if (participant.role === 'OWNER') {
      return res.status(400).json({ error: 'Room owner cannot leave. Transfer ownership or delete the room.' });
    }

    // Remove participant
    room.removeParticipant(userId);
    room.metadata.activeUsers = room.participants.length;
    await room.save();

    res.json({
      success: true,
      message: 'Successfully left room'
    });

  } catch (error) {
    console.error('Room leave error:', error);
    res.status(500).json({ error: 'Failed to leave room' });
  }
});

// Get public rooms with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    // Check MongoDB connection
    if (!mongodb.isReady()) {
      await mongodb.connect();
      
      if (!mongodb.isReady()) {
        return res.json({
          success: true,
          rooms: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalCount: 0,
            hasNext: false,
            hasPrev: false
          }
        });
      }
    }

    // Build search query
    const searchQuery = {
      isPublic: true
    };

    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [rooms, totalCount] = await Promise.all([
      CollabRoom.find(searchQuery)
        .select('roomId name description ownerId ownerUsername participants metadata createdAt updatedAt')
        .sort({ 'metadata.lastActivity': -1 })
        .skip(skip)
        .limit(limit),
      CollabRoom.countDocuments(searchQuery)
    ]);

    const roomsWithCounts = rooms.map(room => ({
      id: room.roomId,
      name: room.name,
      description: room.description,
      isPublic: true,
      ownerId: room.ownerId,
      owner: {
        id: room.ownerId,
        username: room.ownerUsername
      },
      participantCount: room.participants.length,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt
    }));

    res.json({
      success: true,
      rooms: roomsWithCounts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Rooms fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Update room data (whiteboard, notes, etc.)
router.put('/:roomId/data', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { whiteboardData, stickyNotes, chatMessages, notesData } = req.body;
    const userId = req.user.id;

    // Check MongoDB connection
    if (!mongodb.isReady()) {
      await mongodb.connect();
      
      if (!mongodb.isReady()) {
        return res.status(503).json({ 
          error: 'Collaboration service temporarily unavailable' 
        });
      }
    }

    const room = await CollabRoom.findByRoomId(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user is a participant
    const participant = room.participants.find(p => p.userId === userId);

    if (!participant) {
      return res.status(403).json({ error: 'You are not a participant in this room' });
    }

    // Update room data
    const updateData = {};
    if (whiteboardData !== undefined) updateData.whiteboardData = whiteboardData;
    if (stickyNotes !== undefined) updateData.stickyNotes = stickyNotes;
    if (chatMessages !== undefined) updateData.chatMessages = chatMessages;
    if (notesData !== undefined) updateData.notesData = notesData;

    await CollabRoom.findOneAndUpdate(
      { roomId },
      { $set: updateData },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Room data updated successfully'
    });

  } catch (error) {
    console.error('Room data update error:', error);
    res.status(500).json({ error: 'Failed to update room data' });
  }
});

// Delete room (owner only)
router.delete('/:roomId', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // Check MongoDB connection
    if (!mongodb.isReady()) {
      await mongodb.connect();
      
      if (!mongodb.isReady()) {
        return res.status(503).json({ 
          error: 'Collaboration service temporarily unavailable' 
        });
      }
    }

    const room = await CollabRoom.findByRoomId(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.ownerId !== userId) {
      return res.status(403).json({ error: 'Only room owner can delete the room' });
    }

    // Delete the room
    await CollabRoom.deleteOne({ roomId });

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });

  } catch (error) {
    console.error('Room deletion error:', error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// Get user's rooms (owned and participated)
router.get('/user/my-rooms', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check MongoDB connection
    if (!mongodb.isReady()) {
      await mongodb.connect();
      
      if (!mongodb.isReady()) {
        return res.json({
          success: true,
          rooms: []
        });
      }
    }

    const userRooms = await CollabRoom.findUserRooms(userId);

    const rooms = userRooms.map(room => {
      const userParticipant = room.participants.find(p => p.userId === userId);
      
      return {
        id: room.roomId,
        name: room.name,
        description: room.description,
        isPublic: room.isPublic,
        ownerId: room.ownerId,
        owner: {
          id: room.ownerId,
          username: room.ownerUsername
        },
        participantCount: room.participants.length,
        userRole: userParticipant?.role || 'PARTICIPANT',
        joinedAt: userParticipant?.joinedAt || room.createdAt,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt
      };
    });

    res.json({
      success: true,
      rooms
    });

  } catch (error) {
    console.error('User rooms fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch user rooms' });
  }
});

module.exports = router;