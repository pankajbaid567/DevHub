import io from 'socket.io-client';

class WebRTCService {
  constructor() {
    this.socket = null;
    this.peerConnections = new Map();
    this.localStream = null;
    this.remoteStreams = new Map();
    this.isVideoEnabled = true;
    this.isAudioEnabled = true;
    this.isScreenSharing = false;
    this.roomId = null;
    this.userId = null;
    this.onRemoteStream = null;
    this.onUserJoined = null;
    this.onUserLeft = null;
    this.onMessage = null;
    this.onEmojiReaction = null;
    this.onUserSpeaking = null;
    
    // Google Meet-style configuration
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ];
    
    this.mediaConstraints = {
      video: {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 }
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000
      }
    };
  }

  // Initialize WebRTC service with Google Meet-style architecture
  initialize(userId, roomId, callbacks = {}) {
    console.log('🚀 Initializing WebRTC service with Google Meet architecture...');
    console.log('User ID:', userId);
    console.log('Room ID:', roomId);
    
    this.userId = userId;
    this.roomId = roomId;
    this.onRemoteStream = callbacks.onRemoteStream;
    this.onUserJoined = callbacks.onUserJoined;
    this.onUserLeft = callbacks.onUserLeft;
    this.onMessage = callbacks.onMessage;
    this.onEmojiReaction = callbacks.onEmojiReaction;
    this.onUserSpeaking = callbacks.onUserSpeaking;

    // Connect to Socket.IO server with Google Meet-style configuration
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    console.log('🔗 Connecting to backend:', backendUrl);
    
    this.socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
      forceNew: true
    });

    this.setupSocketListeners();
  }

  // Setup Socket.IO event listeners
  setupSocketListeners() {
    this.socket.on('connect', () => {
      console.log('🔗 Connected to signaling server');
      this.socket.emit('join-room', { 
        roomId: this.roomId, 
        userId: this.userId,
        username: 'User' // You can pass actual username here
      });
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from signaling server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });

    this.socket.on('user-joined', async (data) => {
      console.log('👤 User joined:', data.userId);
      console.log('📊 Current peer connections:', this.peerConnections.size);
      if (this.onUserJoined) {
        this.onUserJoined(data.userId, data.username);
      }
      console.log('🔗 Creating peer connection for user:', data.userId);
      await this.createPeerConnection(data.userId, true);
    });

    this.socket.on('user-left', (data) => {
      console.log('👋 User left:', data.userId);
      this.closePeerConnection(data.userId);
      if (this.onUserLeft) {
        this.onUserLeft(data.userId);
      }
    });

    this.socket.on('offer', async (data) => {
      console.log('📨 Received offer from:', data.userId);
      await this.handleOffer(data.userId, data.offer);
    });

    this.socket.on('answer', async (data) => {
      console.log('📨 Received answer from:', data.userId);
      await this.handleAnswer(data.userId, data.answer);
    });

    this.socket.on('ice-candidate', async (data) => {
      console.log('🧊 Received ICE candidate from:', data.userId);
      await this.handleIceCandidate(data.userId, data.candidate);
    });

    this.socket.on('message', (data) => {
      console.log('💬 Received message:', data);
      if (this.onMessage) {
        this.onMessage(data);
      }
    });

    this.socket.on('emoji-reaction', (data) => {
      console.log('😀 Received emoji reaction:', data);
      if (this.onEmojiReaction) {
        this.onEmojiReaction(data);
      }
    });

    this.socket.on('user-speaking', (data) => {
      console.log('🎤 User speaking:', data.userId, data.isSpeaking);
      if (this.onUserSpeaking) {
        this.onUserSpeaking(data);
      }
    });

    this.socket.on('user-stopped-screen-share', (data) => {
      console.log('🖥️ User stopped screen share:', data.userId);
    });
  }

  // Create peer connection with Google Meet-style configuration
  async createPeerConnection(userId, isInitiator) {
    try {
      console.log(`🔗 Creating peer connection with ${userId}, initiator: ${isInitiator}`);
      console.log('📊 Current peer connections before:', this.peerConnections.size);
      
      const configuration = {
        iceServers: this.iceServers,
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceTransportPolicy: 'all'
      };

      console.log('⚙️ Peer connection configuration:', configuration);
      const peerConnection = new RTCPeerConnection(configuration);
      console.log('✅ Peer connection created successfully');
      
      // Add local stream to peer connection
      if (this.localStream) {
        console.log('📹 Adding local stream to peer connection');
        console.log('📹 Local stream tracks:', this.localStream.getTracks());
        this.localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, this.localStream);
          console.log(`✅ Added ${track.kind} track:`, track.getSettings());
        });
      } else {
        console.log('❌ No local stream available to add to peer connection');
      }

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('📺 Received remote stream from:', userId);
        console.log('Remote stream tracks:', event.streams[0]?.getTracks());
        
        const [remoteStream] = event.streams;
        this.remoteStreams.set(userId, remoteStream);
        
        if (this.onRemoteStream) {
          this.onRemoteStream(userId, remoteStream);
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 Sending ICE candidate to:', userId);
          this.socket.emit('ice-candidate', {
            roomId: this.roomId,
            targetUserId: userId,
            candidate: event.candidate
          });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log(`🔗 Connection state with ${userId}:`, peerConnection.connectionState);
        if (peerConnection.connectionState === 'failed') {
          console.log('❌ Connection failed, attempting to restart...');
          this.restartPeerConnection(userId);
        }
      };

      // Handle ICE connection state changes
      peerConnection.oniceconnectionstatechange = () => {
        console.log(`🧊 ICE connection state with ${userId}:`, peerConnection.iceConnectionState);
      };

      this.peerConnections.set(userId, peerConnection);

      if (isInitiator) {
        await this.createOffer(userId);
      }

      return peerConnection;
    } catch (error) {
      console.error('❌ Error creating peer connection:', error);
      throw error;
    }
  }

  // Create and send offer
  async createOffer(userId) {
    try {
      const peerConnection = this.peerConnections.get(userId);
      if (!peerConnection) {
        console.error('❌ No peer connection found for user:', userId);
        return;
      }

      console.log('📤 Creating offer for:', userId);
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });

      await peerConnection.setLocalDescription(offer);
      
      this.socket.emit('offer', {
        roomId: this.roomId,
        targetUserId: userId,
        offer: offer
      });
      
      console.log('📤 Offer sent to:', userId);
    } catch (error) {
      console.error('❌ Error creating offer:', error);
    }
  }

  // Handle incoming offer
  async handleOffer(userId, offer) {
    try {
      console.log('📥 Handling offer from:', userId);
      
      let peerConnection = this.peerConnections.get(userId);
      if (!peerConnection) {
        peerConnection = await this.createPeerConnection(userId, false);
      }

      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      this.socket.emit('answer', {
        roomId: this.roomId,
        targetUserId: userId,
        answer: answer
      });
      
      console.log('📤 Answer sent to:', userId);
    } catch (error) {
      console.error('❌ Error handling offer:', error);
    }
  }

  // Handle incoming answer
  async handleAnswer(userId, answer) {
    try {
      console.log('📥 Handling answer from:', userId);
      const peerConnection = this.peerConnections.get(userId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(answer);
        console.log('✅ Answer processed for:', userId);
      }
    } catch (error) {
      console.error('❌ Error handling answer:', error);
    }
  }

  // Handle ICE candidate
  async handleIceCandidate(userId, candidate) {
    try {
      console.log('🧊 Handling ICE candidate from:', userId);
      const peerConnection = this.peerConnections.get(userId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(candidate);
        console.log('✅ ICE candidate added for:', userId);
      }
    } catch (error) {
      console.error('❌ Error handling ICE candidate:', error);
    }
  }

  // Restart peer connection (Google Meet-style recovery)
  async restartPeerConnection(userId) {
    try {
      console.log('🔄 Restarting peer connection with:', userId);
      this.closePeerConnection(userId);
      await this.createPeerConnection(userId, true);
    } catch (error) {
      console.error('❌ Error restarting peer connection:', error);
    }
  }

  // Close peer connection
  closePeerConnection(userId) {
    const peerConnection = this.peerConnections.get(userId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(userId);
      this.remoteStreams.delete(userId);
      console.log('🔒 Closed peer connection with:', userId);
    }
  }

  // Get user media with Google Meet-style constraints
  async getUserMedia(constraints = {}) {
    try {
      console.log('🎥 Requesting media with constraints:', constraints);
      
      const mediaConstraints = {
        video: constraints.video || this.mediaConstraints.video,
        audio: constraints.audio || this.mediaConstraints.audio
      };

      console.log('📋 Final media constraints:', mediaConstraints);
      this.localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      console.log('✅ Got local stream:', this.localStream);
      console.log('📹 Video tracks:', this.localStream.getVideoTracks());
      console.log('🎤 Audio tracks:', this.localStream.getAudioTracks());
      
      // Verify stream is working
      if (this.localStream.getVideoTracks().length > 0) {
        console.log('✅ Video track is available and enabled:', this.localStream.getVideoTracks()[0].enabled);
      }
      if (this.localStream.getAudioTracks().length > 0) {
        console.log('✅ Audio track is available and enabled:', this.localStream.getAudioTracks()[0].enabled);
      }
      
      // Set up audio analysis for speaking detection
      this.setupAudioAnalysis();
      
      return this.localStream;
    } catch (error) {
      console.error('❌ Error accessing media devices:', error);
      console.error('❌ Error details:', error.message);
      
      // Fallback to basic constraints
      try {
        console.log('🔄 Trying fallback constraints...');
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        console.log('✅ Got fallback stream:', this.localStream);
        return this.localStream;
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  // Setup audio analysis for speaking detection
  setupAudioAnalysis() {
    if (!this.localStream) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(this.localStream);
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      microphone.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const threshold = 30;
        const speaking = average > threshold && this.isAudioEnabled;
        
        if (speaking !== this.isSpeaking) {
          this.isSpeaking = speaking;
          this.socket.emit('speaking', { 
            roomId: this.roomId,
            isSpeaking: speaking 
          });
        }
        
        if (this.isAudioEnabled) {
          requestAnimationFrame(checkAudioLevel);
        }
      };
      
      checkAudioLevel();
    } catch (error) {
      console.error('❌ Error setting up audio analysis:', error);
    }
  }

  // Get screen share stream
  async getScreenShare() {
    try {
      console.log('🖥️ Requesting screen share...');
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor'
        },
        audio: true
      });
      
      console.log('✅ Got screen share stream:', screenStream);
      this.isScreenSharing = true;
      
      // Replace video track in all peer connections
      this.peerConnections.forEach((peerConnection, userId) => {
        const videoTrack = screenStream.getVideoTracks()[0];
        if (videoTrack) {
          const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
            console.log('🔄 Replaced video track for:', userId);
          }
        }
      });
      
      return screenStream;
    } catch (error) {
      console.error('❌ Error getting screen share:', error);
      throw error;
    }
  }

  // Stop screen share
  stopScreenShare() {
    console.log('🛑 Stopping screen share...');
    this.isScreenSharing = false;
    
    // Restore original video track
    if (this.localStream) {
      this.peerConnections.forEach((peerConnection, userId) => {
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
            console.log('🔄 Restored video track for:', userId);
          }
        }
      });
    }
  }

  // Toggle video
  async toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.isVideoEnabled = videoTrack.enabled;
        
        this.socket.emit('toggle-video', {
          roomId: this.roomId,
          enabled: this.isVideoEnabled
        });
        
        console.log('📹 Video toggled:', this.isVideoEnabled);
      }
    }
  }

  // Toggle audio
  async toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.isAudioEnabled = audioTrack.enabled;
        
        this.socket.emit('toggle-audio', {
          roomId: this.roomId,
          enabled: this.isAudioEnabled
        });
        
        console.log('🎤 Audio toggled:', this.isAudioEnabled);
      }
    }
  }

  // Send message
  sendMessage(message) {
    this.socket.emit('message', {
      roomId: this.roomId,
      userId: this.userId,
      message: message,
      timestamp: new Date().toISOString()
    });
  }

  // Send emoji reaction
  sendEmojiReaction(emoji) {
    this.socket.emit('emoji-reaction', {
      roomId: this.roomId,
      userId: this.userId,
      emoji: emoji,
      timestamp: new Date().toISOString()
    });
  }

  // Leave room
  leaveRoom() {
    console.log('🚪 Leaving room...');
    
    // Close all peer connections
    this.peerConnections.forEach((peerConnection, userId) => {
      this.closePeerConnection(userId);
    });
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Disconnect socket
    if (this.socket) {
      this.socket.emit('leave-room', { roomId: this.roomId, userId: this.userId });
      this.socket.disconnect();
    }
    
    console.log('✅ Left room successfully');
  }
}

export default new WebRTCService();