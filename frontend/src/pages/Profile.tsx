import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/ui/navbar';
import Footer from '@/components/sections/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Mail, 
  Calendar, 
  MapPin, 
  Github, 
  Linkedin, 
  Twitter,
  Edit3,
  Save,
  X,
  Camera,
  Settings,
  Shield,
  Award,
  BookOpen,
  Code,
  Users,
  Star,
  TrendingUp,
  Activity
} from 'lucide-react';

const Profile = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    bio: '',
    location: '',
    github: '',
    linkedin: '',
    twitter: '',
    website: '',
    skills: [] as string[],
    interests: [] as string[]
  });

  // Initialize form data when user data is available
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        email: user.email || '',
        bio: user.bio || '',
        location: '',
        github: '',
        linkedin: '',
        twitter: '',
        website: '',
        skills: [],
        interests: []
      });
    }
  }, [user]);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Please log in to view your profile.
              </AlertDescription>
            </Alert>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Here you would typically make an API call to update the user profile
      // For now, we'll just simulate the update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original user data
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        email: user.email || '',
        bio: user.bio || '',
        location: '',
        github: '',
        linkedin: '',
        twitter: '',
        website: '',
        skills: [],
        interests: []
      });
    }
    setIsEditing(false);
  };

  const mockStats = {
    resumeAnalyses: 12,
    studySessions: 45,
    collabProjects: 8,
    aiMentorSessions: 23,
    totalHours: 156,
    achievements: 5
  };

  const mockRecentActivity = [
    { type: 'resume', title: 'Resume Analysis Complete', time: '2 hours ago', icon: Award },
    { type: 'study', title: 'Joined Study Room: React Advanced', time: '1 day ago', icon: BookOpen },
    { type: 'collab', title: 'Created CollabBoard: E-commerce Project', time: '3 days ago', icon: Code },
    { type: 'mentor', title: 'AI Mentor Session: Career Advice', time: '1 week ago', icon: Users }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user?.profilePicture} alt={user?.username} />
                  <AvatarFallback className="text-2xl">
                    {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    {user?.fullName || user?.username}
                  </h1>
                  <p className="text-muted-foreground">@{user?.username}</p>
                  <p className="text-sm text-muted-foreground">
                    Member since {new Date(user?.createdAt || '').toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex space-x-2">
                    <Button onClick={handleSave} disabled={isLoading} className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      {isLoading ? 'Saving...' : 'Save'}
                    </Button>
                    <Button variant="outline" onClick={handleCancel} className="flex items-center gap-2">
                      <X className="w-4 h-4" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Profile Info */}
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Profile Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="fullName">Full Name</Label>
                          {isEditing ? (
                            <Input
                              id="fullName"
                              value={formData.fullName}
                              onChange={(e) => handleInputChange('fullName', e.target.value)}
                              placeholder="Enter your full name"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground mt-1">
                              {user?.fullName || 'Not provided'}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {user?.email}
                          </p>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="bio">Bio</Label>
                        {isEditing ? (
                          <Textarea
                            id="bio"
                            value={formData.bio}
                            onChange={(e) => handleInputChange('bio', e.target.value)}
                            placeholder="Tell us about yourself..."
                            className="min-h-[100px]"
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground mt-1">
                            {user?.bio || 'No bio provided'}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="location">Location</Label>
                          {isEditing ? (
                            <Input
                              id="location"
                              value={formData.location}
                              onChange={(e) => handleInputChange('location', e.target.value)}
                              placeholder="City, Country"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground mt-1">
                              {formData.location || 'Not specified'}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="website">Website</Label>
                          {isEditing ? (
                            <Input
                              id="website"
                              value={formData.website}
                              onChange={(e) => handleInputChange('website', e.target.value)}
                              placeholder="https://yourwebsite.com"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground mt-1">
                              {formData.website || 'Not provided'}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Social Links */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Social Links
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="github" className="flex items-center gap-2">
                            <Github className="w-4 h-4" />
                            GitHub
                          </Label>
                          {isEditing ? (
                            <Input
                              id="github"
                              value={formData.github}
                              onChange={(e) => handleInputChange('github', e.target.value)}
                              placeholder="https://github.com/username"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground mt-1">
                              {formData.github || 'Not connected'}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="linkedin" className="flex items-center gap-2">
                            <Linkedin className="w-4 h-4" />
                            LinkedIn
                          </Label>
                          {isEditing ? (
                            <Input
                              id="linkedin"
                              value={formData.linkedin}
                              onChange={(e) => handleInputChange('linkedin', e.target.value)}
                              placeholder="https://linkedin.com/in/username"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground mt-1">
                              {formData.linkedin || 'Not connected'}
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="twitter" className="flex items-center gap-2">
                          <Twitter className="w-4 h-4" />
                          Twitter
                        </Label>
                        {isEditing ? (
                          <Input
                            id="twitter"
                            value={formData.twitter}
                            onChange={(e) => handleInputChange('twitter', e.target.value)}
                            placeholder="https://twitter.com/username"
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground mt-1">
                            {formData.twitter || 'Not connected'}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Stats Sidebar */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Your Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{mockStats.resumeAnalyses}</div>
                          <div className="text-xs text-muted-foreground">Resume Analyses</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{mockStats.studySessions}</div>
                          <div className="text-xs text-muted-foreground">Study Sessions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{mockStats.collabProjects}</div>
                          <div className="text-xs text-muted-foreground">Collab Projects</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{mockStats.aiMentorSessions}</div>
                          <div className="text-xs text-muted-foreground">AI Sessions</div>
                        </div>
                      </div>
                      <Separator />
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary">{mockStats.totalHours}</div>
                        <div className="text-sm text-muted-foreground">Total Learning Hours</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5" />
                        Recent Achievements
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                          <Star className="w-4 h-4 text-yellow-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">First Resume Analysis</div>
                          <div className="text-xs text-muted-foreground">2 days ago</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">Study Room Regular</div>
                          <div className="text-xs text-muted-foreground">1 week ago</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Code className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">Collaboration Master</div>
                          <div className="text-xs text-muted-foreground">2 weeks ago</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockRecentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 rounded-lg border">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <activity.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{activity.title}</div>
                          <div className="text-sm text-muted-foreground">{activity.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Account Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-4">Security</h3>
                    <div className="space-y-3">
                      <Button variant="outline" className="w-full justify-start">
                        Change Password
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        Two-Factor Authentication
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-medium mb-4">Notifications</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Email notifications</span>
                        <Button variant="outline" size="sm">Enable</Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Study room updates</span>
                        <Button variant="outline" size="sm">Enable</Button>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-medium mb-4 text-red-600">Danger Zone</h3>
                    <Button 
                      variant="destructive" 
                      onClick={logout}
                      className="w-full justify-start"
                    >
                      Sign Out
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements" className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { title: 'First Steps', description: 'Complete your first resume analysis', icon: Award, earned: true },
                  { title: 'Study Buddy', description: 'Join 10 study sessions', icon: BookOpen, earned: true },
                  { title: 'Collaborator', description: 'Create 5 collab boards', icon: Code, earned: false },
                  { title: 'AI Enthusiast', description: 'Have 20 AI mentor sessions', icon: Users, earned: false },
                  { title: 'Resume Expert', description: 'Analyze 25 resumes', icon: TrendingUp, earned: false },
                  { title: 'Community Leader', description: 'Help 50 community members', icon: Star, earned: false }
                ].map((achievement, index) => (
                  <Card key={index} className={achievement.earned ? 'border-green-200 bg-green-50' : ''}>
                    <CardContent className="p-6 text-center">
                      <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                        achievement.earned ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <achievement.icon className={`w-8 h-8 ${
                          achievement.earned ? 'text-green-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <h3 className="font-medium mb-2">{achievement.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{achievement.description}</p>
                      {achievement.earned ? (
                        <Badge className="bg-green-100 text-green-800">Earned</Badge>
                      ) : (
                        <Badge variant="outline">Locked</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Profile;
