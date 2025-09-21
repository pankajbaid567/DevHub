const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const mongodb = require('./config/mongodb');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const questionRoutes = require('./routes/questions');
const answerRoutes = require('./routes/answers');
const snippetRoutes = require('./routes/snippets');
// const resumeRoutes = require('./routes/resumes'); // DEPRECATED
const skillRoutes = require('./routes/skills');
const sessionRoutes = require('./routes/sessions');
const messageRoutes = require('./routes/messages');
// const aiRoutes = require('./routes/ai'); // DEPRECATED
// const mentorRoutes = require('./routes/mentor'); // DEPRECATED
const recordingsRoutes = require('./routes/recordings');
const studyRoomsRoutes = require('./routes/studyRooms');
const boardsRoutes = require('./routes/boards');
const socialRoutes = require('./routes/social');
const profileRoutes = require('./routes/profile');
const notificationRoutes = require('./routes/notifications');
const postsRoutes = require('./routes/posts');
const roomRoutes = require('./routes/rooms');
const statsRoutes = require('./routes/stats');
const videoSessionRoutes = require('./routes/videoSessions');
const VideoSessionSocketHandler = require('./services/videoSessionSocket');
const voiceStudyRoomsRoutes = require('./routes/voiceStudyRooms');
const VoiceStudyRoomSocketHandler = require('./services/voiceStudyRoomSocket');
const WebRTCSocketHandler = require('./services/webrtcSocket');

const app = express();
const server = http.createServer(app);

// Use singleton pattern for Prisma client to avoid connection pool issues
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new PrismaClient({
  log: ['warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:5173", // Vite default port
      "https://dev-hub-jvce-7aaa3dmqn-pankaj-baids-projects.vercel.app", // Old frontend URL
      "https://dev-hub-jvce-9zftlgudk-pankaj-baids-projects.vercel.app", // Previous frontend URL
      "https://dev-hub-jvce-5tqp3gau0-pankaj-baids-projects.vercel.app", // Previous frontend URL
      "https://dev-hub-jvce.vercel.app" // Latest Vercel frontend URL
    ],
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
// CORS configuration
const allowedOrigins = [
  'http://localhost:3000', 
  'http://localhost:5173', 
  'http://localhost:5174', 
  'http://localhost:8080',
  'https://dev-hub-jvce-7aaa3dmqn-pankaj-baids-projects.vercel.app', // Old frontend URL
  'https://dev-hub-jvce-9zftlgudk-pankaj-baids-projects.vercel.app', // Previous frontend URL
  'https://dev-hub-jvce-5tqp3gau0-pankaj-baids-projects.vercel.app', // Previous frontend URL
  'https://dev-hub-jvce.vercel.app' // Latest Vercel frontend URL
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve static files
app.use(express.static('public'));

// Make Prisma available to routes
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Basic routes
app.get('/', (req, res) => {
  res.json({ message: 'DevHub+ Backend API is running!' });
});

app.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is healthy' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api/snippets', snippetRoutes);
// app.use('/api/resumes', resumeRoutes); // DEPRECATED: Resume analysis moved to frontend
app.use('/api/skills', skillRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/messages', messageRoutes);
// app.use('/api/ai', aiRoutes); // DEPRECATED: AI analysis moved to frontend
// app.use('/api/mentor', mentorRoutes); // DEPRECATED: AI mentor moved to frontend
app.use('/api/recordings', recordingsRoutes);
app.use('/api/study-rooms', studyRoomsRoutes);
app.use('/api/boards', boardsRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/video-sessions', videoSessionRoutes);
app.use('/api/voice-study-rooms', voiceStudyRoomsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler - must be last
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);
  
  // Join a session room
  socket.on('joinSession', async (data) => {
    try {
      const { sessionId, userId, username } = data;
      
      if (!sessionId || !userId || !username) {
        socket.emit('error', { message: 'sessionId, userId, and username are required' });
        return;
      }

      // Verify session exists
      const session = await prisma.session.findUnique({
        where: { id: parseInt(sessionId) },
        include: {
          hostUser: {
            select: { id: true, username: true, reputation: true }
          }
        }
      });

      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      // Join the session room
      socket.join(`session_${sessionId}`);
      socket.sessionId = sessionId;
      socket.userId = userId;
      socket.username = username;

      // Notify others in the room
      socket.to(`session_${sessionId}`).emit('userJoined', {
        userId,
        username,
        message: `${username} joined the session`,
        timestamp: new Date().toISOString()
      });

      // Send session info to the user
      socket.emit('sessionJoined', {
        session,
        message: `Successfully joined "${session.title}"`
      });

      // Get current participants for WebRTC
      const roomSockets = await io.in(`session_${sessionId}`).fetchSockets();
      const participants = roomSockets.map(s => ({
        id: s.userId,
        username: s.username,
        socketId: s.id
      }));

      // Send current participants list
      socket.emit('participantsList', participants);

      console.log(`User ${username} (${userId}) joined session ${sessionId}`);
    } catch (error) {
      console.error('Join session error:', error);
      socket.emit('error', { message: 'Failed to join session' });
    }
  });

  // Leave a session room
  socket.on('leaveSession', (data) => {
    try {
      const { sessionId } = data;
      if (sessionId && socket.username) {
        socket.to(`session_${sessionId}`).emit('userLeft', {
          userId: socket.userId,
          username: socket.username,
          message: `${socket.username} left the session`,
          timestamp: new Date().toISOString()
        });
        socket.leave(`session_${sessionId}`);
        console.log(`User ${socket.username} left session ${sessionId}`);
      }
    } catch (error) {
      console.error('Leave session error:', error);
    }
  });

  // Handle chat messages
  socket.on('sendMessage', async (data) => {
    try {
      const { content, sessionId, userId } = data;

      if (!content || !sessionId || !userId) {
        socket.emit('error', { message: 'content, sessionId, and userId are required' });
        return;
      }

      // Verify session exists
      const session = await prisma.session.findUnique({
        where: { id: parseInt(sessionId) }
      });

      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      // Save message to database
      const message = await prisma.message.create({
        data: {
          content,
          sessionId: parseInt(sessionId),
          userId: parseInt(userId)
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              reputation: true
            }
          }
        }
      });

      // Broadcast message to all users in the session room
      io.to(`session_${sessionId}`).emit('messageReceived', {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        user: message.user,
        sessionId: parseInt(sessionId)
      });

      console.log(`Message sent in session ${sessionId} by user ${userId}`);
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle code updates (real-time code collaboration)
  socket.on('updateCode', async (data) => {
    try {
      const { code, language, sessionId, userId, title } = data;

      if (!sessionId || !userId) {
        socket.emit('error', { message: 'sessionId and userId are required' });
        return;
      }

      // Verify session exists
      const session = await prisma.session.findUnique({
        where: { id: parseInt(sessionId) }
      });

      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      // Broadcast code update to all users in the session room (except sender)
      socket.to(`session_${sessionId}`).emit('codeUpdated', {
        code,
        language,
        title,
        userId: parseInt(userId),
        username: socket.username,
        sessionId: parseInt(sessionId),
        timestamp: new Date().toISOString()
      });

      console.log(`Code updated in session ${sessionId} by user ${userId}`);
    } catch (error) {
      console.error('Update code error:', error);
      socket.emit('error', { message: 'Failed to update code' });
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    try {
      const { sessionId, userId, username, isTyping } = data;
      
      if (sessionId) {
        socket.to(`session_${sessionId}`).emit('userTyping', {
          userId,
          username,
          isTyping,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Typing indicator error:', error);
    }
  });

  // Handle screen sharing events
  socket.on('shareScreen', (data) => {
    try {
      const { sessionId, userId, username, isSharing } = data;
      
      if (sessionId) {
        socket.to(`session_${sessionId}`).emit('screenShared', {
          userId,
          username,
          isSharing,
          timestamp: new Date().toISOString()
        });
        console.log(`User ${username} ${isSharing ? 'started' : 'stopped'} screen sharing in session ${sessionId}`);
      }
    } catch (error) {
      console.error('Screen share error:', error);
    }
  });

  // Handle voice chat events
  socket.on('voiceChat', (data) => {
    try {
      const { sessionId, userId, username, isSpeaking } = data;
      
      if (sessionId) {
        socket.to(`session_${sessionId}`).emit('voiceActivity', {
          userId,
          username,
          isSpeaking,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Voice chat error:', error);
    }
  });

  // Handle user presence updates
  socket.on('updatePresence', (data) => {
    try {
      const { sessionId, userId, username, status } = data;
      
      if (sessionId) {
        socket.to(`session_${sessionId}`).emit('presenceUpdated', {
          userId,
          username,
          status, // 'online', 'away', 'busy'
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Presence update error:', error);
    }
  });

  // WebRTC Signaling Events
  socket.on('webrtc-offer', (data) => {
    try {
      const { sessionId, targetUserId, offer } = data;
      
      if (sessionId && targetUserId && offer) {
        // Send offer to specific user
        socket.to(`session_${sessionId}`).emit('webrtc-offer', {
          fromUserId: socket.userId,
          fromUsername: socket.username,
          offer,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('WebRTC offer error:', error);
    }
  });

  socket.on('webrtc-answer', (data) => {
    try {
      const { sessionId, targetUserId, answer } = data;
      
      if (sessionId && targetUserId && answer) {
        // Send answer to specific user
        socket.to(`session_${sessionId}`).emit('webrtc-answer', {
          fromUserId: socket.userId,
          fromUsername: socket.username,
          answer,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('WebRTC answer error:', error);
    }
  });

  socket.on('webrtc-ice-candidate', (data) => {
    try {
      const { sessionId, targetUserId, candidate } = data;
      
      if (sessionId && candidate) {
        // Broadcast ICE candidate to session room
        socket.to(`session_${sessionId}`).emit('webrtc-ice-candidate', {
          fromUserId: socket.userId,
          fromUsername: socket.username,
          candidate,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('WebRTC ICE candidate error:', error);
    }
  });

  socket.on('start-recording', async (data) => {
    try {
      const { sessionId } = data;
      
      if (sessionId && socket.sessionId === sessionId) {
        // Update session recording status
        await prisma.session.update({
          where: { id: parseInt(sessionId) },
          data: { isRecording: true }
        });

        // Notify all participants
        io.to(`session_${sessionId}`).emit('recording-started', {
          sessionId,
          startedBy: socket.username,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Start recording error:', error);
    }
  });

  socket.on('stop-recording', async (data) => {
    try {
      const { sessionId } = data;
      
      if (sessionId && socket.sessionId === sessionId) {
        // Update session recording status
        await prisma.session.update({
          where: { id: parseInt(sessionId) },
          data: { isRecording: false }
        });

        // Notify all participants
        io.to(`session_${sessionId}`).emit('recording-stopped', {
          sessionId,
          stoppedBy: socket.username,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Stop recording error:', error);
    }
  });

  // Study Room Events
  socket.on('joinStudyRoom', async (data) => {
    try {
      const { studyRoomId, userId, username } = data;
      
      if (!studyRoomId || !userId || !username) {
        socket.emit('error', { message: 'studyRoomId, userId, and username are required' });
        return;
      }

      // Verify user is participant
      const participant = await prisma.studyRoomParticipant.findFirst({
        where: {
          studyRoomId: parseInt(studyRoomId),
          userId: parseInt(userId)
        },
        include: {
          studyRoom: true
        }
      });

      if (!participant) {
        socket.emit('error', { message: 'You are not a member of this study room' });
        return;
      }

      // Join the study room
      socket.join(`study_room_${studyRoomId}`);
      socket.studyRoomId = studyRoomId;

      // Notify others
      socket.to(`study_room_${studyRoomId}`).emit('userJoinedRoom', {
        userId,
        username,
        message: `${username} joined the study room`,
        timestamp: new Date().toISOString()
      });

      // Send room info
      socket.emit('studyRoomJoined', {
        studyRoom: participant.studyRoom,
        message: `Joined ${participant.studyRoom.name}`
      });

    } catch (error) {
      console.error('Join study room error:', error);
      socket.emit('error', { message: 'Failed to join study room' });
    }
  });

  // Collaborative Board Events
  socket.on('joinBoard', async (data) => {
    try {
      const { boardId, userId } = data;
      
      if (!boardId || !userId) {
        socket.emit('error', { message: 'boardId and userId are required' });
        return;
      }

      // Verify user has access to board
      const board = await prisma.collaborativeBoard.findFirst({
        where: {
          id: parseInt(boardId),
          OR: [
            { createdBy: parseInt(userId) },
            { collaborators: { some: { userId: parseInt(userId) } } },
            { isPublic: true }
          ]
        }
      });

      if (!board) {
        socket.emit('error', { message: 'Board not found or access denied' });
        return;
      }

      // Join the board room
      socket.join(`board_${boardId}`);
      socket.boardId = boardId;

      // Notify others
      socket.to(`board_${boardId}`).emit('userJoinedBoard', {
        userId,
        username: socket.username,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Join board error:', error);
      socket.emit('error', { message: 'Failed to join board' });
    }
  });

  socket.on('boardUpdate', (data) => {
    try {
      const { boardId, boardData, action } = data;
      
      if (socket.boardId === boardId) {
        // Broadcast board updates to other collaborators
        socket.to(`board_${boardId}`).emit('boardUpdated', {
          boardData,
          action,
          updatedBy: socket.userId,
          username: socket.username,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Board update error:', error);
    }
  });

  // CollabBoard Integration - Room Collaboration Events
  socket.on('join-room', async (data) => {
    try {
      const { roomId, username } = data;
      socket.roomId = roomId;
      socket.username = username;
      
      // Join the room
      socket.join(`room_${roomId}`);
      
      // Get room info and notify others
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: {
          participants: {
            include: { user: { select: { id: true, username: true } } }
          }
        }
      });

      if (room) {
        // Notify others in the room
        socket.to(`room_${roomId}`).emit('user-joined', {
          username,
          message: `${username} joined the room`,
          timestamp: new Date().toISOString()
        });

        // Send room data to the joining user
        socket.emit('room-data', {
          roomId,
          roomName: room.name,
          whiteboardData: JSON.parse(room.whiteboardData || '[]'),
          stickyNotes: JSON.parse(room.stickyNotes || '[]'),
          participants: room.participants.map(p => p.user.username)
        });
      }
    } catch (error) {
      console.error('Join room error:', error);
    }
  });

  // Whiteboard drawing events
  socket.on('drawing', (data) => {
    if (socket.roomId) {
      socket.to(`room_${socket.roomId}`).emit('drawing', {
        ...data,
        username: socket.username
      });
    }
  });

  socket.on('clear-whiteboard', () => {
    if (socket.roomId) {
      socket.to(`room_${socket.roomId}`).emit('clear-whiteboard');
    }
  });

  // Sticky notes events
  socket.on('sticky-note-add', (data) => {
    if (socket.roomId) {
      socket.to(`room_${socket.roomId}`).emit('sticky-note-add', {
        ...data,
        username: socket.username
      });
    }
  });

  socket.on('sticky-note-update', (data) => {
    if (socket.roomId) {
      socket.to(`room_${socket.roomId}`).emit('sticky-note-update', data);
    }
  });

  socket.on('sticky-note-delete', (data) => {
    if (socket.roomId) {
      socket.to(`room_${socket.roomId}`).emit('sticky-note-delete', data);
    }
  });

  // Chat events
  socket.on('chat-message', (data) => {
    if (socket.roomId) {
      socket.to(`room_${socket.roomId}`).emit('chat-message', {
        ...data,
        username: socket.username,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('user-typing', (data) => {
    if (socket.roomId) {
      socket.to(`room_${socket.roomId}`).emit('user-typing', {
        username: socket.username
      });
    }
  });

  socket.on('user-stopped-typing', (data) => {
    if (socket.roomId) {
      socket.to(`room_${socket.roomId}`).emit('user-stopped-typing', {
        username: socket.username
      });
    }
  });

  // Cursor tracking
  socket.on('cursor-move', (data) => {
    if (socket.roomId) {
      socket.to(`room_${socket.roomId}`).emit('cursor-move', {
        ...data,
        username: socket.username
      });
    }
  });

  // Polls events
  socket.on('poll-create', (data) => {
    if (socket.roomId) {
      socket.to(`room_${socket.roomId}`).emit('poll-create', {
        ...data,
        createdBy: socket.username
      });
    }
  });

  socket.on('poll-vote', (data) => {
    if (socket.roomId) {
      socket.to(`room_${socket.roomId}`).emit('poll-vote', {
        ...data,
        votedBy: socket.username
      });
    }
  });

  // File sharing events
  socket.on('file-share', (data) => {
    if (socket.roomId) {
      socket.to(`room_${socket.roomId}`).emit('file-share', {
        ...data,
        sharedBy: socket.username
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    
    // Notify session room if user was in a session
    if (socket.sessionId && socket.username) {
      socket.to(`session_${socket.sessionId}`).emit('userLeft', {
        userId: socket.userId,
        username: socket.username,
        message: `${socket.username} disconnected`,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle connection errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Initialize video session socket handler
new VideoSessionSocketHandler(io);

// Initialize voice study room socket handler
new VoiceStudyRoomSocketHandler(io);

// Initialize WebRTC socket handler for video conferencing
new WebRTCSocketHandler(io, prisma);

// Initialize MongoDB connection for collaboration features
mongodb.connect().catch(console.error);

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  await mongodb.disconnect();
});

server.listen(PORT, async () => {
  console.log(`🚀 DevHub+ Server running on port ${PORT}`);
  console.log(`📊 PostgreSQL: Connected (Prisma)`);
  console.log(`🍃 MongoDB: ${mongodb.isReady() ? 'Connected' : 'Connecting...'} (Collaboration)`);
  console.log(`🤝 Collaboration features: Enhanced with real-time whiteboard, chat, and file sharing`);
});

module.exports = app;