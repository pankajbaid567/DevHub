import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Send, 
  Users, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  Settings,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  type?: 'text' | 'system';
}

interface CollabBoardChatProps {
  boardId: string;
  collaborators: any[];
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const CollabBoardChat: React.FC<CollabBoardChatProps> = ({
  boardId,
  collaborators,
  isOpen,
  onClose,
  className = ''
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Load chat history for this board
      loadChatHistory();
    }
  }, [isOpen, boardId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    try {
      // In a real implementation, this would fetch from the backend
      // For now, we'll simulate some initial messages
      const initialMessages: ChatMessage[] = [
        {
          id: '1',
          userId: 'system',
          username: 'System',
          content: 'Welcome to the collaborative board! Start drawing and chatting with your team.',
          timestamp: new Date(Date.now() - 60000),
          type: 'system'
        }
      ];
      setMessages(initialMessages);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      userId: user.id,
      username: user.username,
      content: newMessage.trim(),
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // In a real implementation, this would send to the backend
    // and broadcast to other collaborators via WebSocket
    try {
      // Simulate sending to backend
      console.log('Sending message:', message);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleVoiceChat = () => {
    setIsVoiceEnabled(!isVoiceEnabled);
    // Implement WebRTC voice chat logic here
    console.log('Voice chat toggled:', !isVoiceEnabled);
  };

  const toggleVideoChat = () => {
    setIsVideoEnabled(!isVideoEnabled);
    // Implement WebRTC video chat logic here
    console.log('Video chat toggled:', !isVideoEnabled);
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className={`w-80 bg-background border-l border-border flex flex-col h-full ${className}`}>
      {/* Chat Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Chat</h3>
            <Badge variant="secondary" className="text-xs">
              {collaborators.length + 1}
            </Badge>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleVoiceChat}
              className={isVoiceEnabled ? 'text-green-500' : ''}
            >
              {isVoiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleVideoChat}
              className={isVideoEnabled ? 'text-blue-500' : ''}
            >
              {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Collaborators List */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center space-x-2 mb-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Online</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {collaborators.map(collaborator => (
            <div key={collaborator.id} className="flex items-center space-x-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${collaborator.username}`} />
                <AvatarFallback className="text-xs">
                  {collaborator.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{collaborator.username}</span>
            </div>
          ))}
          {user && (
            <div className="flex items-center space-x-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
                <AvatarFallback className="text-xs">
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{user.username} (You)</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(message => (
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
                  {formatTime(message.timestamp)}
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
                {message.content}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
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
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default CollabBoardChat;
