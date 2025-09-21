import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Mic, 
  MicOff, 
  Users, 
  Volume2, 
  VolumeX,
  Phone,
  PhoneOff,
  Settings,
  MessageCircle,
  Send,
  UserPlus,
  Crown,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import webrtcService from '@/services/webrtcService';
import { useToast } from '@/hooks/use-toast';

interface VoiceStudyRoomProps {
  roomId: string;
  roomName: string;
  onLeave: () => void;
  className?: string;
}

interface Participant {
  id: string;
  username: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isHost: boolean;
  joinedAt: Date;
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  type?: 'system' | 'user';
}

const VoiceStudyRoom: React.FC<VoiceStudyRoomProps> = ({
  roomId,
  roomName,
  onLeave,
  className = ''
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'excellent'>('good');
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const remoteAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    initializeVoiceRoom();
    return () => {
      stopAudioAnalysis();
      // Clean up all remote audio elements
      if (remoteAudioRefs.current) {
        remoteAudioRefs.current.forEach((audioElement, userId) => {
          audioElement.pause();
          audioElement.srcObject = null;
          if (document.body.contains(audioElement)) {
            document.body.removeChild(audioElement);
          }
        });
        remoteAudioRefs.current.clear();
      }
      webrtcService.leaveRoom();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Update current user's speaking status in participants list
  useEffect(() => {
    setParticipants(prev => prev.map(p => 
      p.id === (user?.id || 'current-user') 
        ? { ...p, isSpeaking: isSpeaking }
        : p
    ));
  }, [isSpeaking, user?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Audio level detection for speaking indicators
  const setupAudioAnalysis = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkAudioLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Calculate average volume
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          const threshold = 30; // Adjust this value to change sensitivity
          
          const speaking = average > threshold && !isMuted;
          setIsSpeaking(speaking);
          
          // Notify other participants about speaking status
          if (speaking !== isSpeaking) {
            webrtcService.socket?.emit('speaking', { isSpeaking: speaking });
          }
          
          animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
        }
      };
      
      checkAudioLevel();
    } catch (error) {
      console.error('Error setting up audio analysis:', error);
    }
  };

  const stopAudioAnalysis = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  };

  const initializeVoiceRoom = async () => {
    try {
      setIsLoading(true);
      
      // Initialize WebRTC service for audio-only
      webrtcService.initialize(user?.id || 'anonymous', roomId, {
        onRemoteStream: handleRemoteStream,
        onUserJoined: handleUserJoined,
        onUserLeft: handleUserLeft,
        onMessage: handleMessage,
        onEmojiReaction: handleEmojiReaction,
        onUserSpeaking: handleUserSpeaking
      });

      // Get audio-only stream
      const stream = await webrtcService.getUserMedia({ 
        video: false, 
        audio: true 
      });
      
      if (audioRef.current) {
        audioRef.current.srcObject = stream;
      }

      // Setup audio analysis for speaking detection
      setupAudioAnalysis(stream);

      setIsConnected(true);
      setIsLoading(false);
      
      // Add current user to participants
      const currentUserParticipant: Participant = {
        id: user?.id || 'current-user',
        username: user?.username || 'You',
        isMuted: false,
        isSpeaking: isSpeaking,
        isHost: true, // First user is host
        joinedAt: new Date()
      };
      
      setParticipants([currentUserParticipant]);
      
      // Add welcome message
      setChatMessages(prev => [...prev, {
        id: 'welcome',
        userId: 'system',
        username: 'System',
        message: `Welcome to ${roomName}! You can now start discussing with other participants.`,
        timestamp: new Date(),
        type: 'system'
      }]);

      toast({
        title: "Connected to Voice Study Room",
        description: "You can now start speaking with other participants.",
      });

    } catch (error) {
      console.error('Error initializing voice room:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to the voice study room. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleRemoteStream = (userId: string, stream: MediaStream) => {
    console.log('Received remote audio stream from:', userId);
    
    // Create audio element for remote stream
    const audioElement = document.createElement('audio');
    audioElement.srcObject = stream;
    audioElement.autoplay = true;
    audioElement.volume = 1.0;
    audioElement.id = `remote-audio-${userId}`;
    
    // Add to container or play directly
    document.body.appendChild(audioElement);
    
    // Store reference for cleanup
    if (!remoteAudioRefs.current) {
      remoteAudioRefs.current = new Map();
    }
    remoteAudioRefs.current.set(userId, audioElement);
    
    console.log('Remote audio stream playing for user:', userId);
  };

  const handleUserJoined = (userId: string, username: string) => {
    const newParticipant: Participant = {
      id: userId,
      username: username,
      isMuted: false,
      isSpeaking: false,
      isHost: userId === user?.id, // First user is host
      joinedAt: new Date()
    };

    setParticipants(prev => {
      // Check if participant already exists
      const existingIndex = prev.findIndex(p => p.id === userId);
      if (existingIndex >= 0) {
        // Update existing participant
        const updated = [...prev];
        updated[existingIndex] = newParticipant;
        return updated;
      } else {
        // Add new participant
        return [...prev, newParticipant];
      }
    });
    
    setChatMessages(prev => [...prev, {
      id: `join-${userId}`,
      userId: 'system',
      username: 'System',
      message: `${username} joined the room`,
      timestamp: new Date(),
      type: 'system'
    }]);

    toast({
      title: "New Participant",
      description: `${username} joined the voice study room.`,
    });
  };

  const handleUserLeft = (userId: string) => {
    const participant = participants.find(p => p.id === userId);
    if (participant) {
      setParticipants(prev => prev.filter(p => p.id !== userId));
      
      // Clean up remote audio element
      if (remoteAudioRefs.current.has(userId)) {
        const audioElement = remoteAudioRefs.current.get(userId);
        if (audioElement) {
          audioElement.pause();
          audioElement.srcObject = null;
          document.body.removeChild(audioElement);
        }
        remoteAudioRefs.current.delete(userId);
      }
      
      setChatMessages(prev => [...prev, {
        id: `leave-${userId}`,
        userId: 'system',
        username: 'System',
        message: `${participant.username} left the room`,
        timestamp: new Date(),
        type: 'system'
      }]);
    }
  };

  const handleMessage = (data: any) => {
    setChatMessages(prev => [...prev, {
      id: `msg-${Date.now()}`,
      userId: data.userId,
      username: data.username || 'Unknown',
      message: data.message,
      timestamp: new Date(data.timestamp),
      type: 'user'
    }]);
  };

  const handleEmojiReaction = (data: any) => {
    // Handle emoji reactions in voice room
    console.log('Emoji reaction:', data);
  };

  const handleUserSpeaking = (data: any) => {
    setParticipants(prev => prev.map(p => 
      p.id === data.userId 
        ? { ...p, isSpeaking: data.isSpeaking }
        : p
    ));
  };

  const toggleMute = async () => {
    try {
      await webrtcService.toggleAudio();
      setIsMuted(!isMuted);
      
      toast({
        title: isMuted ? "Microphone Enabled" : "Microphone Muted",
        description: isMuted ? "You can now speak" : "You are muted",
      });
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    webrtcService.sendMessage(newMessage.trim());
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const leaveRoom = async () => {
    try {
      await webrtcService.leaveRoom();
      onLeave();
      
      toast({
        title: "Left Voice Study Room",
        description: "You have successfully left the room.",
      });
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Connecting to Voice Study Room</h3>
            <p className="text-muted-foreground">Please wait while we connect you...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`flex h-full ${className}`}>
      {/* Main Voice Room */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{roomName}</h2>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm text-muted-foreground">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <Badge variant="secondary">
                  <Users className="w-4 h-4 mr-1" />
                  {participants.length} participants
                </Badge>
                <Badge variant="outline">
                  <Volume2 className="w-4 h-4 mr-1" />
                  Voice Only
                </Badge>
              </div>
            </div>
            <Button variant="outline" onClick={leaveRoom}>
              <PhoneOff className="w-4 h-4 mr-2" />
              Leave Room
            </Button>
          </div>
        </div>

        {/* Participants Grid */}
        <div className="flex-1 p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {participants.map(participant => (
              <Card key={participant.id} className="relative">
                <CardContent className="p-4 text-center">
                  <div className="relative mb-3">
                    <Avatar className={`w-16 h-16 mx-auto transition-all duration-300 ${
                      participant.isSpeaking ? 'ring-4 ring-green-400 ring-opacity-75' : ''
                    }`}>
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.username}`} />
                      <AvatarFallback>
                        {participant.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {participant.isHost && (
                      <Crown className="w-5 h-5 text-yellow-500 absolute -top-1 -right-1" />
                    )}
                    {participant.isSpeaking && (
                      <div className="absolute inset-0 rounded-full border-2 border-green-500 animate-pulse" />
                    )}
                    {participant.isSpeaking && (
                      <div className="absolute -inset-2 rounded-full bg-green-400 bg-opacity-20 animate-ping" />
                    )}
                  </div>
                  <h4 className="font-medium text-sm truncate">{participant.username}</h4>
                  <div className="flex items-center justify-center space-x-1 mt-1">
                    {participant.isMuted ? (
                      <MicOff className="w-4 h-4 text-red-500" />
                    ) : (
                      <Mic className="w-4 h-4 text-green-500" />
                    )}
                    {participant.isSpeaking && (
                      <Volume2 className="w-4 h-4 text-green-500 animate-pulse" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Voice Controls */}
        <div className="p-6 border-t border-border">
          <div className="flex items-center justify-center space-x-4">
            <Button
              size="lg"
              variant={isMuted ? "destructive" : "default"}
              onClick={toggleMute}
              className="rounded-full w-16 h-16"
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {isMuted ? 'You are muted' : 'You are speaking'}
              </p>
              <p className="text-xs text-muted-foreground">
                Click to {isMuted ? 'unmute' : 'mute'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className="w-80 border-l border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold flex items-center">
            <MessageCircle className="w-5 h-5 mr-2" />
            Chat
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chatMessages.map(message => (
            <div key={message.id} className="flex space-x-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${message.username}`} />
                <AvatarFallback>
                  {message.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-foreground">
                    {message.username}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                  {message.type === 'system' && (
                    <Badge variant="outline" className="text-xs">System</Badge>
                  )}
                </div>
                <div className={`text-sm ${
                  message.type === 'system' 
                    ? 'text-muted-foreground italic' 
                    : 'text-foreground'
                }`}>
                  {message.message}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex space-x-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={!newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden audio element for local stream */}
      <audio ref={audioRef} autoPlay muted />
    </div>
  );
};

export default VoiceStudyRoom;
