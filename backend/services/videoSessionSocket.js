const Session = require('../models/Session');

class VideoSessionSocketHandler {
  constructor(io) {
    this.io = io;
    this.sessions = new Map(); // In-memory session state
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`);

      // Join video session
      socket.on('join-video-session', async (data) => {
        try {
          const { sessionId, userId, username, peerId } = data;
          
          const session = await Session.findOne({ sessionId });
          if (!session) {
            socket.emit('error', { message: 'Session not found' });
            return;
          }
          console.log('[VideoSocket] join-video-session request', { sessionId, userId, username, peerId, sessionHostId: session.hostId, types: { incomingUserIdType: typeof userId, sessionHostIdType: typeof session.hostId } });

          // Update participant with socket and peer ID
          const participant = session.participants.find(p => p.userId === userId);
          if (participant) {
            participant.socketId = socket.id;
            participant.peerId = peerId;
            participant.isPresent = true;
            await session.save();
          }

          // Join socket room
          await socket.join(sessionId);

          // Add to in-memory session state
          if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, {
              participants: new Map(),
              screenSharer: null,
              isRecording: false
            });
          }

          const sessionState = this.sessions.get(sessionId);
          sessionState.participants.set(userId, {
            socketId: socket.id,
            peerId,
            username,
            role: participant?.role || 'participant',
            mediaState: participant?.mediaState || { video: false, audio: false, screenShare: false }
          });

          // Notify other participants
          socket.to(sessionId).emit('participant-joined', {
            userId,
            username,
            peerId,
            role: participant?.role || 'participant'
          });

          // Send current participants to new user
          const currentParticipants = Array.from(sessionState.participants.entries())
            .filter(([id]) => id !== userId)
            .map(([id, data]) => ({
              userId: id,
              username: data.username,
              peerId: data.peerId,
              role: data.role,
              mediaState: data.mediaState
            }));

          socket.emit('current-participants', currentParticipants);

          console.log(`User ${username} joined video session ${sessionId}`);
        } catch (error) {
          console.error('Error joining video session:', error);
          socket.emit('error', { message: 'Failed to join session' });
        }
      });

      // Leave video session
      socket.on('leave-video-session', async (data) => {
        try {
          const { sessionId, userId } = data;
          await this.handleUserLeave(sessionId, userId, socket);
        } catch (error) {
          console.error('Error leaving video session:', error);
        }
      });

      // Handle media state changes
      socket.on('media-state-change', async (data) => {
        try {
          const { sessionId, userId, mediaType, enabled } = data;
          
          const sessionState = this.sessions.get(sessionId);
          if (sessionState && sessionState.participants.has(userId)) {
            const participant = sessionState.participants.get(userId);
            participant.mediaState[mediaType] = enabled;

            // Update database
            const session = await Session.findOne({ sessionId });
            if (session) {
              const dbParticipant = session.participants.find(p => p.userId === userId);
              if (dbParticipant) {
                dbParticipant.mediaState[mediaType] = enabled;
                await session.save();
              }
            }

            // Notify other participants
            socket.to(sessionId).emit('participant-media-change', {
              userId,
              mediaType,
              enabled
            });
          }
        } catch (error) {
          console.error('Error handling media state change:', error);
        }
      });

      // Handle screen sharing
      socket.on('start-screen-share', async (data) => {
        try {
          const { sessionId, userId, peerId } = data;
          
          const sessionState = this.sessions.get(sessionId);
          if (sessionState) {
            // Only one person can share screen at a time
            if (sessionState.screenSharer && sessionState.screenSharer !== userId) {
              socket.emit('error', { message: 'Someone else is already sharing screen' });
              return;
            }

            sessionState.screenSharer = userId;
            
            // Update analytics
            const session = await Session.findOne({ sessionId });
            if (session) {
              session.analytics.screenShares += 1;
              await session.save();
            }

            // Notify all participants
            this.io.to(sessionId).emit('screen-share-started', {
              userId,
              peerId
            });
          }
        } catch (error) {
          console.error('Error starting screen share:', error);
        }
      });

      socket.on('stop-screen-share', async (data) => {
        try {
          const { sessionId, userId } = data;
          
          const sessionState = this.sessions.get(sessionId);
          if (sessionState && sessionState.screenSharer === userId) {
            sessionState.screenSharer = null;

            // Notify all participants
            this.io.to(sessionId).emit('screen-share-stopped', { userId });
          }
        } catch (error) {
          console.error('Error stopping screen share:', error);
        }
      });

      // Handle chat messages
      socket.on('video-chat-message', async (data) => {
        try {
          const { sessionId, userId, username, message, isPrivate, recipientId } = data;
          
          console.log(`[Chat] Message from ${username} (${userId}) in session ${sessionId}: ${message}`);
          
          const chatMessage = {
            senderId: userId,
            senderName: username,
            message,
            isPrivate: isPrivate || false,
            recipientId,
            timestamp: new Date()
          };

          // Save to database
          const session = await Session.findOne({ sessionId });
          if (session) {
            await session.addChatMessage(chatMessage);
            console.log(`[Chat] Message saved to database for session ${sessionId}`);
          }

          // Send to recipients
          if (isPrivate && recipientId) {
            // Private message
            const sessionState = this.sessions.get(sessionId);
            if (sessionState) {
              const recipient = sessionState.participants.get(recipientId);
              if (recipient) {
                this.io.to(recipient.socketId).emit('video-chat-message', chatMessage);
                console.log(`[Chat] Private message sent to ${recipientId}`);
              }
            }
            // Also send back to sender
            socket.emit('video-chat-message', chatMessage);
            console.log(`[Chat] Private message sent back to sender`);
          } else {
            // Public message - broadcast to all participants in session
            const sessionState = this.sessions.get(sessionId);
            if (sessionState) {
              sessionState.participants.forEach((participant, participantId) => {
                this.io.to(participant.socketId).emit('video-chat-message', chatMessage);
              });
              console.log(`[Chat] Public message broadcast to ${sessionState.participants.size} participants`);
            }
          }
        } catch (error) {
          console.error('Error handling chat message:', error);
        }
      });

      // Handle recording
      socket.on('start-recording', async (data) => {
        try {
          const { sessionId, userId } = data;
          
          const session = await Session.findOne({ sessionId });
          if (!session) {
            socket.emit('error', { message: 'Session not found' });
            return;
          }

          // Check permissions
          const participant = session.participants.find(p => p.userId === userId);
          if (!participant || !participant.permissions.canRecord) {
            socket.emit('error', { message: 'No permission to record' });
            return;
          }

          session.recording.isRecording = true;
          session.recording.startedAt = new Date();
          session.recording.recordedBy = userId;
          session.recording.recordingId = `rec_${Date.now()}`;
          await session.save();

          // Notify all participants
          this.io.to(sessionId).emit('recording-started', {
            recordingId: session.recording.recordingId,
            startedBy: participant.username
          });
        } catch (error) {
          console.error('Error starting recording:', error);
        }
      });

      socket.on('stop-recording', async (data) => {
        try {
          const { sessionId, userId } = data;
          
          const session = await Session.findOne({ sessionId });
          if (!session || !session.recording.isRecording) {
            socket.emit('error', { message: 'No active recording' });
            return;
          }

          session.recording.isRecording = false;
          session.recording.endedAt = new Date();
          await session.save();

          // Notify all participants
          this.io.to(sessionId).emit('recording-stopped', {
            recordingId: session.recording.recordingId
          });
        } catch (error) {
          console.error('Error stopping recording:', error);
        }
      });

      // Handle participant management
      socket.on('mute-participant', async (data) => {
        try {
          const { sessionId, targetUserId, requesterId } = data;
          
          const session = await Session.findOne({ sessionId });
          if (!session) return;

          const requester = session.participants.find(p => p.userId === requesterId);
          if (!requester || !['host', 'co-host', 'moderator'].includes(requester.role)) {
            socket.emit('error', { message: 'Insufficient permissions' });
            return;
          }

          const sessionState = this.sessions.get(sessionId);
          if (sessionState) {
            const targetParticipant = sessionState.participants.get(targetUserId);
            if (targetParticipant) {
              // Send mute command to target participant
              this.io.to(targetParticipant.socketId).emit('force-mute', {
                by: requester.username
              });
            }
          }
        } catch (error) {
          console.error('Error muting participant:', error);
        }
      });

      socket.on('remove-participant', async (data) => {
        try {
          const { sessionId, targetUserId, requesterId } = data;
          
          const session = await Session.findOne({ sessionId });
          if (!session) return;

          const requester = session.participants.find(p => p.userId === requesterId);
          if (!requester || !['host', 'co-host'].includes(requester.role)) {
            socket.emit('error', { message: 'Insufficient permissions' });
            return;
          }

          const sessionState = this.sessions.get(sessionId);
          if (sessionState) {
            const targetParticipant = sessionState.participants.get(targetUserId);
            if (targetParticipant) {
              // Remove participant
              this.io.to(targetParticipant.socketId).emit('removed-from-session', {
                by: requester.username
              });
              
              await this.handleUserLeave(sessionId, targetUserId);
            }
          }
        } catch (error) {
          console.error('Error removing participant:', error);
        }
      });

      // Handle WebRTC signaling
      socket.on('webrtc-offer', (data) => {
        const { sessionId, targetPeerId, offer, fromPeerId } = data;
        console.log(`[WebRTC] Offer from ${fromPeerId} to ${targetPeerId} in session ${sessionId}`);
        console.log(`[WebRTC] Offer type: ${offer?.type}, SDP length: ${offer?.sdp?.length || 0}`);
        
        // Find the target participant and send offer to them specifically
        const sessionState = this.sessions.get(sessionId);
        if (sessionState) {
          console.log(`[WebRTC] Session found with ${sessionState.participants.size} participants`);
          
          // Extract userId from targetPeerId (e.g., "peer_8" -> "8")
          const targetUserId = targetPeerId.replace('peer_', '');
          console.log(`[WebRTC] Looking for target user ID: ${targetUserId}`);
          
          const targetParticipant = sessionState.participants.get(targetUserId);
          if (targetParticipant) {
            console.log(`[WebRTC] Target participant found: ${targetParticipant.username} (${targetParticipant.socketId})`);
            this.io.to(targetParticipant.socketId).emit('webrtc-offer', {
              fromPeerId,
              targetPeerId,
              offer
            });
            console.log(`[WebRTC] Offer sent successfully to ${targetPeerId}`);
          } else {
            console.error(`[WebRTC] Target participant ${targetPeerId} (userId: ${targetUserId}) not found in session ${sessionId}`);
            console.error(`[WebRTC] Available participants:`, Array.from(sessionState.participants.keys()));
          }
        } else {
          console.error(`[WebRTC] Session ${sessionId} not found`);
          console.error(`[WebRTC] Available sessions:`, Array.from(this.sessions.keys()));
        }
      });

      socket.on('webrtc-answer', (data) => {
        const { sessionId, targetPeerId, answer, fromPeerId } = data;
        console.log(`[WebRTC] Answer from ${fromPeerId} to ${targetPeerId} in session ${sessionId}`);
        console.log(`[WebRTC] Answer type: ${answer?.type}, SDP length: ${answer?.sdp?.length || 0}`);
        
        // Find the target participant and send answer to them specifically
        const sessionState = this.sessions.get(sessionId);
        if (sessionState) {
          // Extract userId from targetPeerId (e.g., "peer_8" -> "8")
          const targetUserId = targetPeerId.replace('peer_', '');
          console.log(`[WebRTC] Looking for target user ID: ${targetUserId}`);
          
          const targetParticipant = sessionState.participants.get(targetUserId);
          if (targetParticipant) {
            console.log(`[WebRTC] Target participant found: ${targetParticipant.username} (${targetParticipant.socketId})`);
            this.io.to(targetParticipant.socketId).emit('webrtc-answer', {
              fromPeerId,
              targetPeerId,
              answer
            });
            console.log(`[WebRTC] Answer sent successfully to ${targetPeerId}`);
          } else {
            console.error(`[WebRTC] Target participant ${targetPeerId} (userId: ${targetUserId}) not found in session ${sessionId}`);
            console.error(`[WebRTC] Available participants:`, Array.from(sessionState.participants.keys()));
          }
        } else {
          console.error(`[WebRTC] Session ${sessionId} not found`);
          console.error(`[WebRTC] Available sessions:`, Array.from(this.sessions.keys()));
        }
      });

      socket.on('webrtc-ice-candidate', (data) => {
        const { sessionId, targetPeerId, candidate, fromPeerId } = data;
        console.log(`[WebRTC] ICE candidate from ${fromPeerId} to ${targetPeerId} in session ${sessionId}`);
        console.log(`[WebRTC] ICE candidate:`, candidate?.candidate?.substring(0, 50) + '...');
        
        // Find the target participant and send ICE candidate to them specifically
        const sessionState = this.sessions.get(sessionId);
        if (sessionState) {
          // Extract userId from targetPeerId (e.g., "peer_8" -> "8")
          const targetUserId = targetPeerId.replace('peer_', '');
          console.log(`[WebRTC] Looking for target user ID: ${targetUserId}`);
          
          const targetParticipant = sessionState.participants.get(targetUserId);
          if (targetParticipant) {
            console.log(`[WebRTC] Target participant found: ${targetParticipant.username} (${targetParticipant.socketId})`);
            this.io.to(targetParticipant.socketId).emit('webrtc-ice-candidate', {
              fromPeerId,
              targetPeerId,
              candidate
            });
            console.log(`[WebRTC] ICE candidate sent successfully to ${targetPeerId}`);
          } else {
            console.error(`[WebRTC] Target participant ${targetPeerId} (userId: ${targetUserId}) not found in session ${sessionId}`);
            console.error(`[WebRTC] Available participants:`, Array.from(sessionState.participants.keys()));
          }
        } else {
          console.error(`[WebRTC] Session ${sessionId} not found`);
          console.error(`[WebRTC] Available sessions:`, Array.from(this.sessions.keys()));
        }
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        try {
          // Find which session this socket was in
          for (const [sessionId, sessionState] of this.sessions.entries()) {
            for (const [userId, participantData] of sessionState.participants.entries()) {
              if (participantData.socketId === socket.id) {
                await this.handleUserLeave(sessionId, userId, socket);
                break;
              }
            }
          }
        } catch (error) {
          console.error('Error handling disconnect:', error);
        }
      });
    });
  }

  async handleUserLeave(sessionId, userId, socket) {
    try {
      const sessionState = this.sessions.get(sessionId);
      if (sessionState) {
        const participant = sessionState.participants.get(userId);
        if (participant) {
          // Notify other participants
          if (socket) {
            socket.to(sessionId).emit('participant-left', { userId });
          } else {
            this.io.to(sessionId).emit('participant-left', { userId });
          }

          // If this user was screen sharing, stop it
          if (sessionState.screenSharer === userId) {
            sessionState.screenSharer = null;
            this.io.to(sessionId).emit('screen-share-stopped', { userId });
          }

          // Remove from in-memory state
          sessionState.participants.delete(userId);

          // Update database
          const session = await Session.findOne({ sessionId });
          if (session) {
            await session.removeParticipant(userId);
          }

          console.log(`User ${userId} left video session ${sessionId}`);
        }
      }

      if (socket) {
        socket.leave(sessionId);
      }
    } catch (error) {
      console.error('Error handling user leave:', error);
    }
  }
}

module.exports = VideoSessionSocketHandler;