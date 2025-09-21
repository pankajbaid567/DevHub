import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/ui/navbar';
import Footer from '@/components/sections/Footer';
import CollabBoardCanvas from '@/components/CollabBoardCanvas';
import CollabBoardList from '@/components/CollabBoardList';
import CollabBoardChat from '@/components/CollabBoardChat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Plus, 
  Users, 
  Settings, 
  Share2, 
  Save, 
  Download,
  MessageCircle,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Grid,
  Layers,
  Palette,
  MousePointer,
  Square,
  Circle,
  Type,
  Image,
  Eraser,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Move,
  Copy,
  Trash2,
  Lock,
  Globe,
  Crown,
  Edit3,
  Eye,
  UserPlus,
  MoreHorizontal
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import collabBoardService from '@/services/collabBoardService';

interface Board {
  id: number;
  name: string;
  description?: string;
  isPublic: boolean;
  boardData: any;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: number;
    fullName: string;
    username: string;
  };
  collaborators: Array<{
    id: number;
    role: string;
    user: {
      id: number;
      fullName: string;
      username: string;
    };
  }>;
  _count: {
    collaborators: number;
  };
}

const CollabBoard = () => {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [boardData, setBoardData] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newBoard, setNewBoard] = useState({
    name: '',
    description: '',
    isPublic: false
  });

  useEffect(() => {
    if (boardId && boardId !== 'new') {
      loadBoard();
    } else {
      setLoading(false);
    }
  }, [boardId]);

  const loadBoard = async () => {
    try {
      setLoading(true);
      const response = await collabBoardService.getBoard(boardId!);
      setCurrentBoard(response.board);
      setBoardData(Array.isArray(response.board.boardData) ? response.board.boardData : []);
      setCollaborators(response.board.collaborators || []);
    } catch (error) {
      console.error('Failed to load board:', error);
      toast({
        title: "Error",
        description: "Failed to load board. Please try again.",
        variant: "destructive",
      });
      navigate('/collabboard');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async () => {
    if (!newBoard.name.trim()) {
      toast({
        title: "Error",
        description: "Board name is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await collabBoardService.createBoard(newBoard);
      setShowCreateModal(false);
      setNewBoard({ name: '', description: '', isPublic: false });
      
      toast({
        title: "Board Created",
        description: "Your collaborative board has been created successfully.",
      });
      
      navigate(`/collabboard/${response.board.id}`);
    } catch (error) {
      console.error('Failed to create board:', error);
      toast({
        title: "Error",
        description: "Failed to create board. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBoardUpdate = (data: any[]) => {
    setBoardData(data);
  };

  const handleSave = async () => {
    if (!currentBoard) return;

    try {
      await collabBoardService.updateBoard(currentBoard.id, {
        boardData: boardData,
        name: currentBoard.name,
        description: currentBoard.description
      });
      
      toast({
        title: "Board Saved",
        description: "Your changes have been saved successfully.",
      });
    } catch (error) {
      console.error('Failed to save board:', error);
      toast({
        title: "Save Error",
        description: "Failed to save board. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !user) return;

    const message = {
      id: Date.now(),
      userId: user.id,
      username: user.username,
      content: newMessage,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const toggleVoiceChat = () => {
    setIsVoiceEnabled(!isVoiceEnabled);
    // Implement WebRTC voice chat logic here
  };

  const toggleVideoChat = () => {
    setIsVideoEnabled(!isVideoEnabled);
    // Implement WebRTC video chat logic here
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="py-16">
          <div className="max-w-md mx-auto px-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
                <p className="text-muted-foreground mb-6">
                  Please log in to access collaborative boards.
                </p>
                <div className="space-y-3">
                  <Button asChild className="w-full">
                    <a href="/login">Sign In</a>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <a href="/signup">Create Account</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading board...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Show board list if no specific board is selected
  if (!boardId || boardId === 'new') {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <CollabBoardList
              onBoardSelect={(board) => navigate(`/collabboard/${board.id}`)}
              onCreateBoard={() => setShowCreateModal(true)}
            />
          </div>
        </main>
        <Footer />

        {/* Create Board Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Create New Board</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Board Name *</label>
                  <Input
                    placeholder="Enter board name"
                    value={newBoard.name}
                    onChange={(e) => setNewBoard(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Enter board description"
                    value={newBoard.description}
                    onChange={(e) => setNewBoard(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={newBoard.isPublic}
                    onChange={(e) => setNewBoard(prev => ({ ...prev, isPublic: e.target.checked }))}
                  />
                  <label htmlFor="isPublic" className="text-sm">
                    Make this board public
                  </label>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateBoard}>
                    Create Board
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // Show specific board
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="h-screen pt-16 flex">
        <div className="flex-1">
          <CollabBoardCanvas
            boardId={boardId}
            boardData={boardData}
            collaborators={collaborators}
            onBoardUpdate={handleBoardUpdate}
            onSave={handleSave}
            onToggleChat={() => setShowChat(!showChat)}
            className="h-full"
          />
        </div>
        
        {/* Chat Sidebar */}
        {showChat && (
          <CollabBoardChat
            boardId={boardId}
            collaborators={collaborators}
            isOpen={showChat}
            onClose={() => setShowChat(false)}
            className="h-full"
          />
        )}
      </main>


      {/* Settings Sidebar */}
      {showSettings && (
        <div className="fixed right-0 top-16 bottom-0 w-80 bg-background border-l border-border z-40">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Board Settings</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(false)}
                >
                  ×
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Board Info */}
              <div>
                <h4 className="font-medium mb-3">Board Information</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={currentBoard?.name || ''}
                      onChange={(e) => setCurrentBoard(prev => prev ? { ...prev, name: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={currentBoard?.description || ''}
                      onChange={(e) => setCurrentBoard(prev => prev ? { ...prev, description: e.target.value } : null)}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={currentBoard?.isPublic || false}
                      onChange={(e) => setCurrentBoard(prev => prev ? { ...prev, isPublic: e.target.checked } : null)}
                    />
                    <label className="text-sm">Public board</label>
                  </div>
                </div>
              </div>

              {/* Collaborators */}
              <div>
                <h4 className="font-medium mb-3">Collaborators</h4>
                <div className="space-y-2">
                  {collaborators.map(collab => (
                    <div key={collab.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex items-center space-x-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {collab.user.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{collab.user.username}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {collab.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollabBoard;