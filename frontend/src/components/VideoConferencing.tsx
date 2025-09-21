import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import webrtcService from '@/services/webrtcService';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  Share, 
  MessageCircle, 
  Smile,
  Grid3X3,
  Grid,
  Volume2,
  VolumeX
} from 'lucide-react';

interface Participant {
  id: string;
  username: string;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isHost: boolean;
  joinedAt: Date;
  stream?: MediaStream;
  isSpeaking?: boolean;
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: string;
}

interface EmojiReaction {
  id: string;
  userId: string;
  username: string;
  emoji: string;
  timestamp: string;
}

interface VideoConferencingProps {
  roomId: string;
  roomName?: string;
  onLeave: () => void;
  className?: string;
}

const VideoConferencing: React.FC<VideoConferencingProps> = ({ roomId, roomName, onLeave, className }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'speaker'>('grid');
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [emojiReactions, setEmojiReactions] = useState<EmojiReaction[]>([]);
  
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const emojis = ['😀', '😍', '👍', '👎', '❤️', '🎉', '🔥', '👏', '😂', '😮', '😢', '😡'];

  useEffect(() => {
    initializeVideoRoom();
    return () => {
      webrtcService.leaveRoom();
    };
  }, []);

  // Handle video stream updates when participants change
  useEffect(() => {
    participants.forEach(participant => {
      if (participant.stream && participant.id !== user?.id) {
        const videoElement = remoteVideoRefs.current.get(participant.id);
        if (videoElement && !videoElement.srcObject) {
          videoElement.srcObject = participant.stream;
          videoElement.play().catch(e => console.log('Video play error:', e));
          console.log('Set video stream for participant:', participant.id);
        }
      }
    });
  }, [participants, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  useEffect(() => {
    emojiReactions.forEach(reaction => {
      const timeout = setTimeout(() => {
        setEmojiReactions(prev => prev.filter(r => r.id !== reaction.id));
      }, 3000);
      emojiTimeoutRef.current.set(reaction.id, timeout);
    });

    return () => {
      emojiTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      emojiTimeoutRef.current.clear();
    };
  }, [emojiReactions]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeVideoRoom = async () => {
    try {
      setIsLoading(true);
      console.log('🎥 Initializing video room with Google Meet-style architecture...');
      console.log('👤 User ID:', user?.id);
      console.log('🏠 Room ID:', roomId);
      
      // Initialize WebRTC service with Google Meet-style configuration
      webrtcService.initialize(user?.id || 'anonymous', roomId, {
        onRemoteStream: handleRemoteStream,
        onUserJoined: handleUserJoined,
        onUserLeft: handleUserLeft,
        onMessage: handleMessage,
        onEmojiReaction: handleEmojiReaction
      });

      // Wait a moment for the WebRTC service to initialize
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get video and audio stream with Google Meet-style constraints
      const stream = await webrtcService.getUserMedia({ 
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        }, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('✅ Got media stream:', stream);
      console.log('📹 Video tracks:', stream.getVideoTracks());
      console.log('🎤 Audio tracks:', stream.getAudioTracks());
      
      // Verify stream tracks
      if (stream.getVideoTracks().length > 0) {
        const videoTrack = stream.getVideoTracks()[0];
        console.log('📹 Video track enabled:', videoTrack.enabled);
        console.log('📹 Video track settings:', videoTrack.getSettings());
      }
      
      if (stream.getAudioTracks().length > 0) {
        const audioTrack = stream.getAudioTracks()[0];
        console.log('🎤 Audio track enabled:', audioTrack.enabled);
        console.log('🎤 Audio track settings:', audioTrack.getSettings());
      }
      
      // Set up local video element with retry mechanism
      const setupLocalVideo = (attempts = 0) => {
        if (localVideoRef.current) {
          console.log('📹 Setting local video element srcObject (attempt', attempts + 1, ')');
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(e => console.log('Local video play error:', e));
          console.log('✅ Set local video stream');
          console.log('📹 Local video element:', localVideoRef.current);
          console.log('📹 Local video srcObject:', localVideoRef.current.srcObject);
          console.log('📹 Local video readyState:', localVideoRef.current.readyState);
        } else if (attempts < 5) {
          console.log('❌ Local video ref not found, retrying in 100ms (attempt', attempts + 1, ')');
          setTimeout(() => setupLocalVideo(attempts + 1), 100);
        } else {
          console.log('❌ Local video ref not found after 5 attempts');
        }
      };
      
      setupLocalVideo();

      setIsConnected(true);
      setIsLoading(false);
      
      // Add current user to participants
      const currentUserParticipant: Participant = {
        id: user?.id || 'current-user',
        username: user?.username || 'You',
        isMuted: false,
        isVideoEnabled: true,
        isHost: true,
        joinedAt: new Date(),
        stream: stream
      };
      setParticipants([currentUserParticipant]);
      console.log('👥 Added current user to participants:', currentUserParticipant);
      
      console.log('✅ Video room initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing video room:', error);
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to initialize video room. Please check your camera and microphone permissions.",
        variant: "destructive",
      });
    }
  };

  const handleRemoteStream = (userId: string, stream: MediaStream) => {
    console.log('📺 Received remote stream from:', userId);
    console.log('📺 Remote stream tracks:', stream.getTracks());
    console.log('📹 Remote video tracks:', stream.getVideoTracks());
    console.log('🎤 Remote audio tracks:', stream.getAudioTracks());
    
    // Verify remote stream tracks
    if (stream.getVideoTracks().length > 0) {
      const videoTrack = stream.getVideoTracks()[0];
      console.log('📹 Remote video track enabled:', videoTrack.enabled);
      console.log('📹 Remote video track settings:', videoTrack.getSettings());
    }
    
    if (stream.getAudioTracks().length > 0) {
      const audioTrack = stream.getAudioTracks()[0];
      console.log('🎤 Remote audio track enabled:', audioTrack.enabled);
      console.log('🎤 Remote audio track settings:', audioTrack.getSettings());
    }
    
    // Update participant with stream
    setParticipants(prev => {
      const updated = prev.map(p => 
        p.id === userId ? { ...p, stream } : p
      );
      console.log('👥 Updated participants with remote stream:', updated);
      return updated;
    });

    // Set up video element for remote stream with multiple attempts
    const setVideoStream = (attempts = 0) => {
      const videoElement = remoteVideoRefs.current.get(userId);
      if (videoElement) {
        console.log('📹 Setting remote video element srcObject for user:', userId, '(attempt', attempts + 1, ')');
        videoElement.srcObject = stream;
        videoElement.play().catch(e => console.log('Remote video play error:', e));
        console.log('✅ Set remote video element srcObject for user:', userId);
        console.log('📹 Remote video element:', videoElement);
        console.log('📹 Remote video srcObject:', videoElement.srcObject);
        console.log('📹 Remote video readyState:', videoElement.readyState);
      } else if (attempts < 10) {
        console.log(`❌ Remote video element not found for user ${userId}, retrying in 50ms (attempt ${attempts + 1})`);
        setTimeout(() => setVideoStream(attempts + 1), 50);
      } else {
        console.log('❌ Remote video element not found after 10 attempts for user:', userId);
      }
    };
    
    setVideoStream();
  };

  const handleUserJoined = (userId: string, username: string) => {
    const newParticipant: Participant = {
      id: userId,
      username: username,
      isMuted: false,
      isVideoEnabled: true,
      isHost: false,
      joinedAt: new Date()
    };
    
    setParticipants(prev => [...prev, newParticipant]);
    toast({
      title: "User Joined",
      description: `${username} joined the video call.`,
    });
  };

  const handleUserLeft = (userId: string) => {
    const participant = participants.find(p => p.id === userId);
    if (participant) {
      setParticipants(prev => prev.filter(p => p.id !== userId));
      toast({
        title: "User Left",
        description: `${participant.username} left the video call.`,
      });
    }
  };

  const handleMessage = (data: any) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      userId: data.userId,
      username: data.username || 'Anonymous',
      message: data.message,
      timestamp: data.timestamp
    };
    setChatMessages(prev => [...prev, message]);
  };

  const handleEmojiReaction = (data: any) => {
    const reaction: EmojiReaction = {
      id: Date.now().toString(),
      userId: data.userId,
      username: data.username || 'Anonymous',
      emoji: data.emoji,
      timestamp: data.timestamp
    };
    setEmojiReactions(prev => [...prev, reaction]);
  };

  const toggleMute = async () => {
    try {
      await webrtcService.toggleAudio();
      setIsMuted(!isMuted);
      
      toast({
        title: isMuted ? "Microphone Enabled" : "Microphone Disabled",
        description: isMuted ? "Your microphone is now on" : "Your microphone is now off",
      });
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  const toggleVideo = async () => {
    try {
      console.log('Toggling video, current state:', isVideoEnabled);
      await webrtcService.toggleVideo();
      setIsVideoEnabled(!isVideoEnabled);
      
      // Check if local video is working
      if (localVideoRef.current) {
        console.log('Local video element:', localVideoRef.current);
        console.log('Local video srcObject:', localVideoRef.current.srcObject);
        if (localVideoRef.current.srcObject) {
          const stream = localVideoRef.current.srcObject as MediaStream;
          console.log('Local video stream tracks:', stream.getTracks());
          console.log('Video track enabled:', stream.getVideoTracks()[0]?.enabled);
        }
      }
      
      toast({
        title: isVideoEnabled ? "Camera Disabled" : "Camera Enabled",
        description: isVideoEnabled ? "Your video is now off" : "Your video is now on",
      });
    } catch (error) {
      console.error('Error toggling video:', error);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        await webrtcService.getScreenShare();
        setIsScreenSharing(true);
        toast({
          title: "Screen Sharing Started",
          description: "You are now sharing your screen.",
        });
      } else {
        webrtcService.stopScreenShare();
        setIsScreenSharing(false);
        toast({
          title: "Screen Sharing Stopped",
          description: "You are no longer sharing your screen.",
        });
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      toast({
        title: "Error",
        description: "Failed to toggle screen sharing. Please try again.",
        variant: "destructive",
      });
    }
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      webrtcService.sendMessage(newMessage);
      setNewMessage('');
    }
  };

  const sendEmojiReaction = (emoji: string) => {
    webrtcService.sendEmojiReaction(emoji);
  };

  const leaveRoom = () => {
    webrtcService.leaveRoom();
    onLeave();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing video call...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen bg-background ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">{roomName || 'Video Conference'}</h1>
          <Badge variant="secondary" className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>{participants.length} participants</span>
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'grid' ? 'speaker' : 'grid')}>
            {viewMode === 'grid' ? <Grid3X3 className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowChat(!showChat)}>
            <MessageCircle className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={leaveRoom}>
            <PhoneOff className="w-4 h-4 mr-2" />
            Leave
          </Button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 relative">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full">
            {/* Local Video */}
            <Card className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                controls={false}
                className="w-full h-full object-cover"
                style={{ backgroundColor: '#000' }}
              />
              <div className="absolute bottom-2 left-2 flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs">
                  You
                </Badge>
                {isMuted && <MicOff className="w-4 h-4 text-red-500" />}
                {!isVideoEnabled && <VideoOff className="w-4 h-4 text-red-500" />}
              </div>
            </Card>

            {/* Remote Videos */}
            {participants.map(participant => (
              <Card key={participant.id} className="relative bg-black rounded-lg overflow-hidden">
                {participant.stream ? (
                  <video
                    ref={el => el && remoteVideoRefs.current.set(participant.id, el)}
                    autoPlay
                    playsInline
                    controls={false}
                    className="w-full h-full object-cover"
                    style={{ backgroundColor: '#000' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.username}`} />
                      <AvatarFallback>
                        {participant.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">
                    {participant.username}
                  </Badge>
                  {participant.isMuted && <MicOff className="w-4 h-4 text-red-500" />}
                  {!participant.isVideoEnabled && <VideoOff className="w-4 h-4 text-red-500" />}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground">Speaker view not implemented yet</p>
            </div>
          </div>
        )}

        {/* Emoji Reactions */}
        {emojiReactions.map(reaction => (
          <div
            key={reaction.id}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl animate-bounce"
          >
            {reaction.emoji}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center space-x-4 p-4 border-t">
        <Button
          variant={isMuted ? "destructive" : "outline"}
          size="lg"
          onClick={toggleMute}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>
        <Button
          variant={!isVideoEnabled ? "destructive" : "outline"}
          size="lg"
          onClick={toggleVideo}
        >
          {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </Button>
        <Button
          variant={isScreenSharing ? "default" : "outline"}
          size="lg"
          onClick={toggleScreenShare}
        >
          <Share className="w-5 h-5" />
        </Button>
        <div className="flex space-x-2">
          {emojis.slice(0, 6).map(emoji => (
            <Button
              key={emoji}
              variant="outline"
              size="sm"
              onClick={() => sendEmojiReaction(emoji)}
            >
              {emoji}
            </Button>
          ))}
        </div>
      </div>

      {/* Chat Sidebar */}
      {showChat && (
        <div className="absolute right-0 top-0 h-full w-80 bg-background border-l flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Chat</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {chatMessages.map(message => (
              <div key={message.id} className="flex flex-col space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{message.username}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm">{message.message}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <Button onClick={sendMessage}>Send</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoConferencing;