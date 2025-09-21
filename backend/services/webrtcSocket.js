// Using Prisma for database operations instead of Mongoose

class WebRTCSocketHandler {
  constructor(io, prisma) {
    this.io = io;
    this.prisma = prisma;
    this.rooms = new Map(); // In-memory room state for active sessions
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`WebRTC Socket connected: ${socket.id}`);

      // Join room for WebRTC signaling
      socket.on('join-room', async (data) => {
        try {
          const { roomId, userId, username } = data;
          console.log(`User ${userId} (${username}) joining room ${roomId}`);
          
          const room = await this.prisma.studyRoom.findUnique({ 
            where: { id: parseInt(roomId) },
            include: { participants: true }
          });
          if (!room) {
            console.log('Room not found:', roomId);
            socket.emit('room-error', { message: 'Room not found' });
            return;
          }

          console.log('Room found:', room.name);
          console.log('Room participants:', room.participants);

          // Check if user is a participant
          const participant = room.participants.find(p => p.userId === parseInt(userId) && p.isPresent);
          if (!participant) {
            console.log('User not found in participants:', userId);
            socket.emit('room-error', { message: 'You are not a participant in this room' });
            return;
          }

          console.log('Participant found:', participant);

          // Update participant with socket ID in database
          await this.prisma.studyRoomParticipant.update({
            where: { id: participant.id },
            data: { socketId: socket.id }
          });

          // Join socket room
          await socket.join(roomId);
          socket.roomId = roomId;
          socket.userId = userId;
          socket.username = username;

          // Add to in-memory room state
          if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, {
              participants: new Map(),
              isActive: true,
              createdAt: new Date()
            });
          }

          const roomState = this.rooms.get(roomId);
          roomState.participants.set(userId, {
            socketId: socket.id,
            username: username,
            isConnected: true,
            isMuted: false,
            isVideoEnabled: true,
            isScreenSharing: false,
            joinedAt: new Date()
          });

          // Notify other participants
          socket.to(roomId).emit('user-joined', {
            userId: userId,
            username: username,
            participantCount: roomState.participants.size
          });

          // Send current participants to new user
          const participants = Array.from(roomState.participants.values());
          socket.emit('room-participants', participants);

          console.log(`User ${username} joined room ${roomId}`);

        } catch (error) {
          console.error('Error joining room:', error);
          socket.emit('room-error', { message: 'Failed to join room' });
        }
      });

      // Handle WebRTC signaling
      socket.on('offer', (data) => {
        const { targetUserId, offer } = data;
        socket.to(socket.roomId).emit('offer', {
          userId: socket.userId,
          targetUserId: targetUserId,
          offer: offer
        });
      });

      socket.on('answer', (data) => {
        const { targetUserId, answer } = data;
        socket.to(socket.roomId).emit('answer', {
          userId: socket.userId,
          targetUserId: targetUserId,
          answer: answer
        });
      });

      socket.on('ice-candidate', (data) => {
        const { targetUserId, candidate } = data;
        socket.to(socket.roomId).emit('ice-candidate', {
          userId: socket.userId,
          targetUserId: targetUserId,
          candidate: candidate
        });
      });

      // Handle media state changes
      socket.on('toggle-audio', (data) => {
        const { enabled } = data;
        const roomState = this.rooms.get(socket.roomId);
        if (roomState && roomState.participants.has(socket.userId)) {
          roomState.participants.get(socket.userId).isMuted = !enabled;
        }
        
        socket.to(socket.roomId).emit('user-toggled-audio', {
          userId: socket.userId,
          enabled: enabled
        });
      });

      socket.on('toggle-video', (data) => {
        const { enabled } = data;
        const roomState = this.rooms.get(socket.roomId);
        if (roomState && roomState.participants.has(socket.userId)) {
          roomState.participants.get(socket.userId).isVideoEnabled = enabled;
        }
        
        socket.to(socket.roomId).emit('user-toggled-video', {
          userId: socket.userId,
          enabled: enabled
        });
      });

      socket.on('start-screen-share', () => {
        const roomState = this.rooms.get(socket.roomId);
        if (roomState && roomState.participants.has(socket.userId)) {
          roomState.participants.get(socket.userId).isScreenSharing = true;
        }
        
        socket.to(socket.roomId).emit('user-started-screen-share', {
          userId: socket.userId
        });
      });

      socket.on('stop-screen-share', () => {
        const roomState = this.rooms.get(socket.roomId);
        if (roomState && roomState.participants.has(socket.userId)) {
          roomState.participants.get(socket.userId).isScreenSharing = false;
        }
        
        socket.to(socket.roomId).emit('user-stopped-screen-share', {
          userId: socket.userId
        });
      });

      // Handle chat messages
      socket.on('message', (data) => {
        const { message } = data;
        socket.to(socket.roomId).emit('message', {
          userId: socket.userId,
          username: socket.username,
          message: message,
          timestamp: new Date()
        });
      });

      // Handle emoji reactions
      socket.on('emoji-reaction', (data) => {
        const { emoji } = data;
        socket.to(socket.roomId).emit('emoji-reaction', {
          userId: socket.userId,
          username: socket.username,
          emoji: emoji,
          timestamp: new Date()
        });
      });

      // Handle speaking detection
      socket.on('speaking', (data) => {
        const { isSpeaking } = data;
        const roomState = this.rooms.get(socket.roomId);
        if (roomState && roomState.participants.has(socket.userId)) {
          roomState.participants.get(socket.userId).isSpeaking = isSpeaking;
        }
        
        socket.to(socket.roomId).emit('user-speaking', {
          userId: socket.userId,
          isSpeaking: isSpeaking
        });
      });

      // Handle room settings
      socket.on('update-room-settings', async (data) => {
        try {
          const { settings } = data;
          const room = await this.prisma.studyRoom.findUnique({ 
            where: { id: parseInt(socket.roomId) } 
          });
          
          if (room && room.createdBy === socket.userId) {
            // Only room creator can update settings
            Object.assign(room, settings);
            await room.save();
            
            socket.to(socket.roomId).emit('room-settings-updated', {
              settings: settings,
              updatedBy: socket.userId
            });
          }
        } catch (error) {
          console.error('Error updating room settings:', error);
        }
      });

      // Handle participant management
      socket.on('mute-participant', (data) => {
        const { targetUserId } = data;
        const roomState = this.rooms.get(socket.roomId);
        
        if (roomState && roomState.participants.has(targetUserId)) {
          roomState.participants.get(targetUserId).isMuted = true;
        }
        
        socket.to(socket.roomId).emit('participant-muted', {
          targetUserId: targetUserId,
          mutedBy: socket.userId
        });
      });

      socket.on('remove-participant', async (data) => {
        try {
          const { targetUserId } = data;
          const room = await this.prisma.studyRoom.findUnique({ 
            where: { id: parseInt(socket.roomId) } 
          });
          
          if (room && room.createdBy === socket.userId) {
            // Only room creator can remove participants
            room.participants = room.participants.filter(p => p.userId !== targetUserId);
            await room.save();
            
            // Remove from in-memory state
            const roomState = this.rooms.get(socket.roomId);
            if (roomState) {
              roomState.participants.delete(targetUserId);
            }
            
            socket.to(socket.roomId).emit('participant-removed', {
              targetUserId: targetUserId,
              removedBy: socket.userId
            });
          }
        } catch (error) {
          console.error('Error removing participant:', error);
        }
      });

      // Handle room recording
      socket.on('start-recording', async (data) => {
        try {
          const room = await this.prisma.studyRoom.findUnique({ 
            where: { id: parseInt(socket.roomId) } 
          });
          
          if (room && room.createdBy === socket.userId) {
            room.isRecording = true;
            await room.save();
            
            socket.to(socket.roomId).emit('recording-started', {
              startedBy: socket.userId
            });
          }
        } catch (error) {
          console.error('Error starting recording:', error);
        }
      });

      socket.on('stop-recording', async (data) => {
        try {
          const room = await this.prisma.studyRoom.findUnique({ 
            where: { id: parseInt(socket.roomId) } 
          });
          
          if (room && room.createdBy === socket.userId) {
            room.isRecording = false;
            await room.save();
            
            socket.to(socket.roomId).emit('recording-stopped', {
              stoppedBy: socket.userId
            });
          }
        } catch (error) {
          console.error('Error stopping recording:', error);
        }
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        try {
          if (socket.roomId && socket.userId) {
            const roomState = this.rooms.get(socket.roomId);
            if (roomState && roomState.participants.has(socket.userId)) {
              roomState.participants.get(socket.userId).isConnected = false;
            }
            
            // Notify other participants
            socket.to(socket.roomId).emit('user-left', {
              userId: socket.userId,
              username: socket.username,
              participantCount: roomState ? roomState.participants.size - 1 : 0
            });
            
            // Clean up if room is empty
            if (roomState && roomState.participants.size <= 1) {
              this.rooms.delete(socket.roomId);
            }
            
            console.log(`User ${socket.username} left room ${socket.roomId}`);
          }
        } catch (error) {
          console.error('Error handling disconnect:', error);
        }
      });
    });
  }

  // Get room statistics
  getRoomStats(roomId) {
    const roomState = this.rooms.get(roomId);
    if (!roomState) return null;
    
    return {
      participantCount: roomState.participants.size,
      isActive: roomState.isActive,
      createdAt: roomState.createdAt,
      participants: Array.from(roomState.participants.values())
    };
  }

  // Get all active rooms
  getAllActiveRooms() {
    const activeRooms = [];
    for (const [roomId, roomState] of this.rooms) {
      activeRooms.push({
        roomId: roomId,
        participantCount: roomState.participants.size,
        isActive: roomState.isActive,
        createdAt: roomState.createdAt
      });
    }
    return activeRooms;
  }
}

module.exports = WebRTCSocketHandler;
