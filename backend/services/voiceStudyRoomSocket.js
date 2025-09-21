const VoiceStudyRoom = require('../models/VoiceStudyRoom');

class VoiceStudyRoomSocketHandler {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // In-memory room state for active sessions
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Socket connected for voice rooms: ${socket.id}`);

      // Join voice study room
      socket.on('join-voice-room', async (data) => {
        try {
          const { roomId, userId, username, peerId } = data;
          
          const room = await VoiceStudyRoom.findOne({ roomId });
          if (!room) {
            socket.emit('voice-room-error', { message: 'Room not found' });
            return;
          }

          // Check if user is a participant
          const participant = room.participants.find(p => p.userId === userId && p.isPresent);
          if (!participant) {
            socket.emit('voice-room-error', { message: 'You are not a participant in this room' });
            return;
          }

          // Update participant with socket and peer ID
          participant.socketId = socket.id;
          participant.peerId = peerId;
          await room.save();

          // Join socket room
          await socket.join(roomId);
          socket.voiceRoomId = roomId;
          socket.userId = userId;
          socket.username = username;

          // Add to in-memory room state
          if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, {
              participants: new Map(),
              speakingUsers: new Set(),
              isRecording: false
            });
          }

          const roomState = this.rooms.get(roomId);
          roomState.participants.set(userId, {
            socketId: socket.id,
            peerId,
            username,
            role: participant.role,
            voiceState: participant.voiceState,
            permissions: participant.permissions
          });

          // Notify other participants
          socket.to(roomId).emit('voice-participant-joined', {
            userId,
            username,
            peerId,
            role: participant.role,
            voiceState: participant.voiceState
          });

          // Send current participants to new user
          const currentParticipants = Array.from(roomState.participants.entries())
            .filter(([id]) => id !== userId)
            .map(([id, data]) => ({
              userId: id,
              username: data.username,
              peerId: data.peerId,
              role: data.role,
              voiceState: data.voiceState,
              permissions: data.permissions
            }));

          socket.emit('voice-room-joined', {
            roomId,
            participants: currentParticipants,
            roomSettings: room.settings,
            userRole: participant.role,
            userPermissions: participant.permissions
          });

          console.log(`User ${username} joined voice room ${roomId}`);
        } catch (error) {
          console.error('Error joining voice room:', error);
          socket.emit('voice-room-error', { message: 'Failed to join room' });
        }
      });

      // Leave voice room
      socket.on('leave-voice-room', async (data) => {
        try {
          const { roomId, userId } = data;
          await this.handleUserLeave(roomId, userId, socket);
        } catch (error) {
          console.error('Error leaving voice room:', error);
        }
      });

      // Voice state changes (mute/unmute, deafen, etc.)
      socket.on('voice-state-change', async (data) => {
        try {
          const { roomId, userId, voiceState } = data;
          
          const room = await VoiceStudyRoom.findOne({ roomId });
          if (!room) return;

          // Update database
          await room.updateParticipantVoiceState(userId, voiceState);

          // Update in-memory state
          const roomState = this.rooms.get(roomId);
          if (roomState && roomState.participants.has(userId)) {
            const participant = roomState.participants.get(userId);
            participant.voiceState = { ...participant.voiceState, ...voiceState };

            // Handle speaking state
            if (voiceState.isSpeaking !== undefined) {
              if (voiceState.isSpeaking && !voiceState.isMuted) {
                roomState.speakingUsers.add(userId);
              } else {
                roomState.speakingUsers.delete(userId);
              }
            }
          }

          // Notify other participants
          socket.to(roomId).emit('voice-participant-state-change', {
            userId,
            voiceState
          });

        } catch (error) {
          console.error('Error handling voice state change:', error);
        }
      });

      // Force mute participant (admin/moderator only)
      socket.on('force-mute-participant', async (data) => {
        try {
          const { roomId, targetUserId, requesterId } = data;
          
          const room = await VoiceStudyRoom.findOne({ roomId });
          if (!room) return;

          const requester = room.participants.find(p => p.userId === requesterId && p.isPresent);
          if (!requester || !requester.permissions.canMuteOthers) {
            socket.emit('voice-room-error', { message: 'Insufficient permissions' });
            return;
          }

          const roomState = this.rooms.get(roomId);
          if (roomState) {
            const targetParticipant = roomState.participants.get(targetUserId);
            if (targetParticipant) {
              // Force mute in database
              await room.updateParticipantVoiceState(targetUserId, { isMuted: true });
              
              // Update in-memory state
              targetParticipant.voiceState.isMuted = true;
              roomState.speakingUsers.delete(targetUserId);

              // Send force mute to target user
              this.io.to(targetParticipant.socketId).emit('force-muted', {
                by: requester.username,
                reason: 'Muted by moderator'
              });

              // Notify all participants
              this.io.to(roomId).emit('voice-participant-state-change', {
                userId: targetUserId,
                voiceState: { isMuted: true, isSpeaking: false }
              });
            }
          }
        } catch (error) {
          console.error('Error force muting participant:', error);
        }
      });

      // Remove participant from room (admin/moderator only)
      socket.on('kick-participant', async (data) => {
        try {
          const { roomId, targetUserId, requesterId, reason } = data;
          
          const room = await VoiceStudyRoom.findOne({ roomId });
          if (!room) return;

          const requester = room.participants.find(p => p.userId === requesterId && p.isPresent);
          if (!requester || !requester.permissions.canKick) {
            socket.emit('voice-room-error', { message: 'Insufficient permissions' });
            return;
          }

          const roomState = this.rooms.get(roomId);
          if (roomState) {
            const targetParticipant = roomState.participants.get(targetUserId);
            if (targetParticipant) {
              // Notify target user
              this.io.to(targetParticipant.socketId).emit('kicked-from-room', {
                by: requester.username,
                reason: reason || 'Removed by moderator'
              });
              
              // Remove participant
              await this.handleUserLeave(roomId, targetUserId);
            }
          }
        } catch (error) {
          console.error('Error kicking participant:', error);
        }
      });

      // Voice chat message
      socket.on('voice-chat-message', async (data) => {
        try {
          const { roomId, userId, username, message, isPrivate, recipientId } = data;
          
          const room = await VoiceStudyRoom.findOne({ roomId });
          if (!room) return;

          if (!room.settings.allowTextChat) {
            socket.emit('voice-room-error', { message: 'Text chat is disabled in this room' });
            return;
          }

          const chatMessage = {
            senderId: userId,
            senderName: username,
            message,
            type: 'text',
            isPrivate: isPrivate || false,
            recipientId
          };

          // Save to database
          await room.addChatMessage(chatMessage);

          // Send to recipients
          if (isPrivate && recipientId) {
            // Private message
            const roomState = this.rooms.get(roomId);
            if (roomState) {
              const recipient = roomState.participants.get(recipientId);
              if (recipient) {
                this.io.to(recipient.socketId).emit('voice-chat-message', {
                  ...chatMessage,
                  timestamp: new Date()
                });
              }
            }
            // Also send back to sender
            socket.emit('voice-chat-message', {
              ...chatMessage,
              timestamp: new Date()
            });
          } else {
            // Public message
            this.io.to(roomId).emit('voice-chat-message', {
              ...chatMessage,
              timestamp: new Date()
            });
          }
        } catch (error) {
          console.error('Error handling voice chat message:', error);
        }
      });

      // File sharing
      socket.on('share-file', async (data) => {
        try {
          const { roomId, userId, username, fileName, fileUrl, fileType, fileSize } = data;
          
          const room = await VoiceStudyRoom.findOne({ roomId });
          if (!room || !room.settings.allowFileSharing) {
            socket.emit('voice-room-error', { message: 'File sharing is not allowed' });
            return;
          }

          const fileMessage = {
            senderId: userId,
            senderName: username,
            message: `Shared file: ${fileName}`,
            type: 'file',
            attachments: [{
              name: fileName,
              url: fileUrl,
              type: fileType,
              size: fileSize
            }]
          };

          await room.addChatMessage(fileMessage);

          this.io.to(roomId).emit('file-shared', {
            ...fileMessage,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('Error sharing file:', error);
        }
      });

      // Start recording
      socket.on('start-voice-recording', async (data) => {
        try {
          const { roomId, userId } = data;
          
          const room = await VoiceStudyRoom.findOne({ roomId });
          if (!room) return;

          const participant = room.participants.find(p => p.userId === userId && p.isPresent);
          if (!participant || !['admin', 'moderator'].includes(participant.role)) {
            socket.emit('voice-room-error', { message: 'Only admin or moderator can start recording' });
            return;
          }

          if (!room.settings.allowRecording) {
            socket.emit('voice-room-error', { message: 'Recording is not allowed in this room' });
            return;
          }

          const recordingId = `voice_rec_${Date.now()}_${roomId}`;
          await room.startRecording(userId, recordingId);

          // Update in-memory state
          const roomState = this.rooms.get(roomId);
          if (roomState) {
            roomState.isRecording = true;
          }

          // Notify all participants
          this.io.to(roomId).emit('voice-recording-started', {
            recordingId,
            startedBy: participant.username
          });
        } catch (error) {
          console.error('Error starting voice recording:', error);
        }
      });

      // Stop recording
      socket.on('stop-voice-recording', async (data) => {
        try {
          const { roomId, userId, recordingUrl } = data;
          
          const room = await VoiceStudyRoom.findOne({ roomId });
          if (!room) return;

          await room.stopRecording(recordingUrl);

          // Update in-memory state
          const roomState = this.rooms.get(roomId);
          if (roomState) {
            roomState.isRecording = false;
          }

          // Notify all participants
          this.io.to(roomId).emit('voice-recording-stopped', {
            recordingUrl,
            duration: room.recording.duration
          });
        } catch (error) {
          console.error('Error stopping voice recording:', error);
        }
      });

      // WebRTC signaling for voice
      socket.on('voice-webrtc-offer', (data) => {
        const { roomId, targetPeerId, offer } = data;
        socket.to(roomId).emit('voice-webrtc-offer', {
          fromPeerId: data.fromPeerId,
          targetPeerId,
          offer
        });
      });

      socket.on('voice-webrtc-answer', (data) => {
        const { roomId, targetPeerId, answer } = data;
        socket.to(roomId).emit('voice-webrtc-answer', {
          fromPeerId: data.fromPeerId,
          targetPeerId,
          answer
        });
      });

      socket.on('voice-webrtc-ice-candidate', (data) => {
        const { roomId, targetPeerId, candidate } = data;
        socket.to(roomId).emit('voice-webrtc-ice-candidate', {
          fromPeerId: data.fromPeerId,
          targetPeerId,
          candidate
        });
      });

      // Typing indicators for chat
      socket.on('voice-chat-typing', (data) => {
        const { roomId, userId, username, isTyping } = data;
        socket.to(roomId).emit('voice-chat-typing', {
          userId,
          username,
          isTyping
        });
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        if (socket.voiceRoomId && socket.userId) {
          await this.handleUserLeave(socket.voiceRoomId, socket.userId, socket);
        }
      });
    });
  }

  async handleUserLeave(roomId, userId, socket) {
    try {
      const roomState = this.rooms.get(roomId);
      if (roomState) {
        const participant = roomState.participants.get(userId);
        if (participant) {
          // Notify other participants
          if (socket) {
            socket.to(roomId).emit('voice-participant-left', { 
              userId,
              username: participant.username
            });
          } else {
            this.io.to(roomId).emit('voice-participant-left', { 
              userId,
              username: participant.username
            });
          }

          // Remove from speaking users
          roomState.speakingUsers.delete(userId);

          // Remove from in-memory state
          roomState.participants.delete(userId);

          // Update database
          const room = await VoiceStudyRoom.findOne({ roomId });
          if (room) {
            await room.removeParticipant(userId);
          }

          console.log(`User ${userId} left voice room ${roomId}`);
        }
      }

      if (socket) {
        socket.leave(roomId);
        socket.voiceRoomId = null;
        socket.userId = null;
      }
    } catch (error) {
      console.error('Error handling user leave:', error);
    }
  }

  // Utility method to get room state
  getRoomState(roomId) {
    return this.rooms.get(roomId);
  }

  // Utility method to get speaking users in a room
  getSpeakingUsers(roomId) {
    const roomState = this.rooms.get(roomId);
    return roomState ? Array.from(roomState.speakingUsers) : [];
  }
}

module.exports = VoiceStudyRoomSocketHandler;