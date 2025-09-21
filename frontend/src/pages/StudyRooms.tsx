import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/sections/Footer";
import VoiceStudyRoom from "@/components/VoiceStudyRoom";
import VideoConferencing from "@/components/VideoConferencing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Video, 
  Users, 
  MessageCircle, 
  Mic,
  MicOff,
  VideoOff,
  Phone,
  Settings,
  Share2,
  Code,
  FileText,
  Clock,
  Calendar,
  Send,
  Plus,
  Search,
  Filter,
  Star,
  BookOpen,
  Target,
  Zap,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Headphones,
  Monitor,
  UserPlus,
  Crown
} from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import studyRoomService from '../services/studyRoomService';

const StudyRooms = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { roomId } = useParams();
  const navigate = useNavigate();

  // Debug function to check authentication status
  const debugAuth = () => {
    const token = localStorage.getItem('authToken');
    console.log('=== AUTH DEBUG ===');
    console.log('User object:', user);
    console.log('Token in localStorage:', token ? 'Present' : 'Not found');
    console.log('Token value:', token);
    console.log('User ID:', user?.id);
    console.log('User username:', user?.username);
    console.log('==================');
    
    toast({
      title: "Debug Info",
      description: `User: ${user ? 'Logged in' : 'Not logged in'}, Token: ${token ? 'Present' : 'Missing'}`,
    });
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [isInRoom, setIsInRoom] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [roomType, setRoomType] = useState<'voice' | 'video'>('voice');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [studyRooms, setStudyRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRoom, setNewRoom] = useState({
    name: '',
    description: '',
    subject: '',
    type: 'voice',
    maxCapacity: 10,
    isPublic: true
  });

  // Fetch study rooms from API
  const fetchStudyRooms = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      if (!user) {
        setStudyRooms([]);
        setLoading(false);
        return;
      }
      
      const response = await studyRoomService.getStudyRooms();
      setStudyRooms(response.studyRooms || []);
    } catch (error) {
      console.error('Error fetching study rooms:', error);
      
      // If it's an authentication error, show a different message
      if (error.message.includes('Access denied') || error.message.includes('401')) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view study rooms.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to load study rooms. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Load study rooms on component mount and when user changes
  useEffect(() => {
    fetchStudyRooms();
  }, [user]);

  // Handle direct room joining via URL
  useEffect(() => {
    if (roomId) {
      // Find room by ID and join directly
      const room = studyRooms.find(r => r.id.toString() === roomId);
      if (room) {
        joinRoom(room);
      } else {
        // If room not found, show error and redirect
        toast({
          title: "Room Not Found",
          description: "The requested study room could not be found.",
          variant: "destructive",
        });
        navigate('/study-rooms');
      }
    }
  }, [roomId, navigate, toast]);

  const handleCreateRoom = async () => {
    // Enhanced authentication check
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create study rooms.",
        variant: "destructive",
      });
      return;
    }

    // Check if token exists in localStorage
    const token = localStorage.getItem('authToken');
    if (!token) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create study rooms. No authentication token found.",
        variant: "destructive",
      });
      return;
    }

    if (!newRoom.name.trim()) {
      toast({
        title: "Room Name Required",
        description: "Please enter a room name.",
        variant: "destructive",
      });
      return;
    }

    if (!newRoom.subject.trim()) {
      toast({
        title: "Subject Required",
        description: "Please enter a subject for the study room.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Creating study room with data:', {
        name: newRoom.name,
        description: newRoom.description,
        subject: newRoom.subject,
        isPublic: newRoom.isPublic,
        maxCapacity: newRoom.maxCapacity,
        type: newRoom.type
      });

      const response = await studyRoomService.createStudyRoom({
        name: newRoom.name,
        description: newRoom.description,
        subject: newRoom.subject,
        isPublic: newRoom.isPublic,
        maxCapacity: newRoom.maxCapacity
      });

      const room = response.studyRoom;
      
      setCurrentRoom(room);
      setRoomType(newRoom.type as 'voice' | 'video');
      setIsInRoom(true);
      setShowCreateModal(false);
      setNewRoom({
        name: '',
        description: '',
        subject: '',
        type: 'voice',
        maxCapacity: 10,
        isPublic: true
      });

      // Refresh the study rooms list
      await fetchStudyRooms();

      toast({
        title: "Room Created",
        description: `Your ${newRoom.type} study room has been created successfully.`,
      });
    } catch (error) {
      console.error('Error creating study room:', error);
      
      // Enhanced error handling
      if (error.message.includes('Access denied') || error.message.includes('No token provided')) {
        toast({
          title: "Authentication Required",
          description: "Please log in to create study rooms. Your session may have expired.",
          variant: "destructive",
        });
      } else if (error.message.includes('401')) {
        toast({
          title: "Authentication Failed",
          description: "Please log in again. Your session has expired.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error Creating Room",
          description: error.message || "Failed to create study room. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const joinRoom = async (room: any) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to join study rooms.",
        variant: "destructive",
      });
      return;
    }

    try {
      await studyRoomService.joinStudyRoom(room.id);
      setCurrentRoom(room);
      setRoomType(room.type);
      setIsInRoom(true);
      
      // Navigate to room URL
      navigate(`/study-rooms/${room.id}`);
      
      toast({
        title: "Joined Room",
        description: `You've joined ${room.name}.`,
      });
    } catch (error) {
      console.error('Error joining study room:', error);
      toast({
        title: "Error",
        description: "Failed to join study room. Please try again.",
        variant: "destructive",
      });
    }
  };

  const leaveRoom = async () => {
    try {
      if (currentRoom) {
        await studyRoomService.leaveStudyRoom(currentRoom.id);
      }
    setIsInRoom(false);
      setCurrentRoom(null);
      
      // Navigate back to main study rooms page
      navigate('/study-rooms');
      
      toast({
        title: "Left Room",
        description: "You have successfully left the study room.",
      });
    } catch (error) {
      console.error('Error leaving study room:', error);
      toast({
        title: "Error",
        description: "Failed to leave study room. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isInRoom && currentRoom) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="h-screen pt-16">
          {roomType === 'voice' ? (
            <VoiceStudyRoom
              roomId={currentRoom.id.toString()}
              roomName={currentRoom.name}
              onLeave={leaveRoom}
              className="h-full"
            />
          ) : (
            <VideoConferencing
              roomId={currentRoom.id.toString()}
              roomName={currentRoom.name}
              onLeave={leaveRoom}
              className="h-full"
            />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main>
        {/* Hero Section */}
        <section className="py-24 bg-background">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full border border-primary/20 mb-6">
              <Video className="w-4 h-4 mr-2 text-primary" />
              <span className="text-sm font-medium text-primary">Live Study Sessions</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Join a <span className="text-primary">Study Session</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Learn together, solve problems, and study in real-time with developers worldwide.
            </p>
            
            <div className="flex justify-center gap-4">
              <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogTrigger asChild>
                  <Button 
                    size="lg" 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Session
                  </Button>
                </DialogTrigger>
                
                {/* Debug button - remove in production */}
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={debugAuth}
                  className="ml-2"
                >
                  🔍 Debug Auth
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Study Session</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input 
                      placeholder="Session name..." 
                      value={newRoom.name}
                      onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <Input 
                      placeholder="Subject (e.g., JavaScript, React, Python)..." 
                      value={newRoom.subject}
                      onChange={(e) => setNewRoom(prev => ({ ...prev, subject: e.target.value }))}
                    />
                    <Input 
                      placeholder="Description..." 
                      value={newRoom.description}
                      onChange={(e) => setNewRoom(prev => ({ ...prev, description: e.target.value }))}
                    />
                    <div className="flex space-x-2">
                      <Button
                        variant={newRoom.type === 'voice' ? 'default' : 'outline'}
                        onClick={() => setNewRoom(prev => ({ ...prev, type: 'voice' }))}
                        className="flex-1"
                      >
                        <Headphones className="w-4 h-4 mr-2" />
                        Voice Only
                      </Button>
                      <Button
                        variant={newRoom.type === 'video' ? 'default' : 'outline'}
                        onClick={() => setNewRoom(prev => ({ ...prev, type: 'video' }))}
                        className="flex-1"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Video Conference
                      </Button>
                    </div>
                    <Input 
                      placeholder="Max participants..." 
                      type="number"
                      value={newRoom.maxCapacity}
                      onChange={(e) => setNewRoom(prev => ({ ...prev, maxCapacity: parseInt(e.target.value) || 10 }))}
                    />
                    <Button 
                      className="w-full bg-primary hover:bg-primary/90"
                      onClick={handleCreateRoom}
                    >
                      Create Session
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button 
                size="lg" 
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Users className="w-4 h-4 mr-2" />
                Browse Rooms
              </Button>
            </div>
          </div>
        </section>

        {/* Room Browser */}
        <section className="py-16 bg-background">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search study rooms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-input border-border text-foreground"
                />
              </div>
              <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>

            {/* Active Rooms */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-foreground mb-6">Active Study Rooms</h2>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Loading study rooms...</p>
                </div>
              ) : studyRooms.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Study Rooms Available</h3>
                  <p className="text-muted-foreground">Be the first to create a study room!</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                {studyRooms.map((room) => (
                  <Card key={room.id} className="group hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground mb-1">{room.name}</h3>
                            <p className="text-muted-foreground text-sm">{room.subject}</p>
                        </div>
                        <Badge 
                          className={
                              room.isActive 
                              ? 'bg-destructive text-destructive-foreground' 
                              : 'bg-accent text-accent-foreground'
                          }
                        >
                            {room.isActive ? 'Live' : 'Starting Soon'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Host:</span>
                            <span className="text-foreground font-medium">{room.creator?.username || 'Unknown'}</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Participants:</span>
                          <span className="text-foreground">
                              {room._count?.participants || 0}/{room.maxCapacity}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Visibility:</span>
                            <span className="text-foreground capitalize">{room.isPublic ? 'Public' : 'Private'}</span>
                        </div>
                        
                        {room.description && (
                          <div className="text-sm text-muted-foreground">
                            {room.description}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Type:</span>
                          <Badge variant="secondary" className="text-xs">
                            {room.type === 'voice' ? (
                              <>
                                <Headphones className="w-3 h-3 mr-1" />
                                Voice Only
                              </>
                            ) : (
                              <>
                                <Video className="w-3 h-3 mr-1" />
                                Video Conference
                              </>
                            )}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                          onClick={() => joinRoom(room)}
                        >
                          {room.type === 'voice' ? (
                            <Headphones className="w-4 h-4 mr-2" />
                          ) : (
                            <Video className="w-4 h-4 mr-2" />
                          )}
                          {room.status === 'active' ? 'Join Room' : 'Join When Ready'}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              )}
            </div>

            {/* Popular Topics */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-foreground mb-6">Popular Study Topics</h2>
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  { name: "Data Structures", count: "12 rooms", icon: BookOpen },
                  { name: "System Design", count: "8 rooms", icon: Target },
                  { name: "Frontend Dev", count: "15 rooms", icon: Code },
                  { name: "Interview Prep", count: "6 rooms", icon: Zap }
                ].map((topic, index) => {
                  const IconComponent = topic.icon;
                  return (
                    <Card key={index} className="group hover:shadow-lg transition-shadow cursor-pointer">
                      <CardContent className="p-4 text-center">
                        <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mx-auto mb-3">
                          <IconComponent className="w-6 h-6 text-secondary-foreground" />
                        </div>
                        <h3 className="font-semibold text-foreground mb-1">{topic.name}</h3>
                        <p className="text-sm text-muted-foreground">{topic.count}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Quick Stats */}
            <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
              <CardContent className="p-8">
                <div className="grid md:grid-cols-3 gap-8 text-center">
                  <div>
                    <div className="text-3xl font-bold text-primary mb-2">120+</div>
                    <div className="text-muted-foreground">Active Sessions Daily</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-accent mb-2">2,500+</div>
                    <div className="text-muted-foreground">Study Hours This Week</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-destructive mb-2">85%</div>
                    <div className="text-muted-foreground">Goal Achievement Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default StudyRooms;