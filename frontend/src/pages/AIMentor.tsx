import Navbar from "@/components/ui/navbar";
import Footer from "@/components/sections/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { 
  Brain, 
  Send, 
  Code, 
  MessageCircle, 
  Lightbulb,
  BookOpen,
  Star,
  CheckCircle,
  Clock,
  Users,
  Award,
  FileText,
  Zap,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import aiMentorService from "@/services/aiMentorService";

const AIMentor = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: "Hello! I'm your AI mentor. I'm here to help you with coding questions, career advice, and technical guidance. What would you like to learn about today?",
      timestamp: new Date()
    }
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: newMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setNewMessage("");
    setIsTyping(true);
    setError("");

    try {
      const response = await aiMentorService.getMentorResponse(newMessage, messages);
      
      const aiResponse = {
        id: messages.length + 2,
        type: 'ai',
        content: response.content,
        timestamp: new Date(),
        codeExample: response.codeExample,
        resources: response.resources
      };
      
      setMessages(prev => [...prev, aiResponse]);
      
      toast({
        title: "Response Generated",
        description: "Your AI mentor has provided a detailed response.",
      });
    } catch (error) {
      console.error('AI mentor error:', error);
      setError(error.message || 'Failed to get mentor response');
      
      toast({
        title: "Error",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const quickQuestions = [
    "Explain React hooks",
    "Best practices for API design",
    "How to optimize database queries?",
    "Career advice for junior developers",
    "Code review my function",
    "System design patterns"
  ];

  const learningPaths = [
    {
      title: "Frontend Development Path",
      progress: 65,
      nextTopic: "Advanced React Patterns",
      duration: "3 months",
      difficulty: "Intermediate"
    },
    {
      title: "Backend Engineering Path", 
      progress: 30,
      nextTopic: "Database Design",
      duration: "4 months",
      difficulty: "Beginner"
    },
    {
      title: "DevOps Engineering Path",
      progress: 0,
      nextTopic: "Docker Fundamentals",
      duration: "6 months", 
      difficulty: "Advanced"
    }
  ];

  const testimonials = [
    {
      name: "Alex Chen",
      role: "Software Engineer at Meta",
      rating: 5,
      comment: "The AI mentor helped me crack my coding interviews with detailed explanations and practice problems!"
    },
    {
      name: "Sarah Kim",
      role: "Full Stack Developer",
      rating: 5,
      comment: "Amazing code reviews and career guidance. It's like having a senior developer always available!"
    },
    {
      name: "Mike Rodriguez",
      role: "DevOps Engineer",
      rating: 5,
      comment: "The personalized learning recommendations accelerated my career growth significantly."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main>
        {/* Hero Section */}
        <section className="py-24 bg-background">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full border border-primary/20 mb-6">
              <Brain className="w-4 h-4 mr-2 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered Mentorship</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Get Personalized <span className="text-primary">Mentorship</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Ask questions, receive code reviews, and accelerate your learning with AI-powered guidance.
            </p>
            
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Brain className="w-4 h-4 mr-2" />
              Start Mentoring
            </Button>
          </div>
        </section>

        {/* Chat Interface */}
        <section className="py-16 bg-background">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Chat Area */}
              <div className="lg:col-span-2">
                <Card className="h-[600px] flex flex-col">
                  <CardHeader className="border-b">
                    <CardTitle className="flex items-center text-foreground">
                      <MessageCircle className="w-5 h-5 mr-2 text-primary" />
                      AI Mentor Chat
                      <Badge className="ml-auto bg-destructive text-destructive-foreground">
                        Online
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  
                  {/* Messages */}
                  <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    {error && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
                        <div className="flex items-center">
                          <AlertCircle className="w-4 h-4 text-destructive mr-2" />
                          <span className="text-destructive text-sm">{error}</span>
                        </div>
                      </div>
                    )}
                    
                    {messages.map((message) => (
                      <div 
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
                          <Avatar className="w-8 h-8">
                            {message.type === 'ai' ? (
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                <Brain className="w-4 h-4" />
                              </AvatarFallback>
                            ) : (
                              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" />
                            )}
                          </Avatar>
                          
                          <div className={`rounded-lg p-3 ${
                            message.type === 'user' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-secondary/20 text-foreground border border-secondary/30'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            
                            {message.codeExample && (
                              <div className="mt-3 p-3 bg-muted rounded-md">
                                <div className="flex items-center mb-2">
                                  <Code className="w-4 h-4 mr-1 text-primary" />
                                  <span className="text-xs font-medium text-muted-foreground">Code Example</span>
                                </div>
                                <pre className="text-xs overflow-x-auto">
                                  <code className="text-foreground">{message.codeExample}</code>
                                </pre>
                              </div>
                            )}

                            {message.resources && message.resources.length > 0 && (
                              <div className="mt-3 p-3 bg-accent/10 rounded-md">
                                <div className="flex items-center mb-2">
                                  <BookOpen className="w-4 h-4 mr-1 text-accent" />
                                  <span className="text-xs font-medium text-muted-foreground">Resources</span>
                                </div>
                                <ul className="text-xs space-y-1">
                                  {message.resources.map((resource, index) => (
                                    <li key={index} className="text-accent">• {resource}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="flex gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              <Brain className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="bg-secondary/20 rounded-lg p-3 border border-secondary/30">
                            <div className="flex items-center space-x-2">
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                              <span className="text-sm text-muted-foreground">AI mentor is thinking...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  
                  {/* Input Area */}
                  <div className="border-t p-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ask me anything about coding, career advice, or tech concepts..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1 bg-input border-border text-foreground"
                      />
                      <Button 
                        onClick={handleSendMessage}
                        className="bg-primary hover:bg-primary/90"
                        disabled={!newMessage.trim() || isTyping}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* Quick Questions */}
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-2">Quick questions:</p>
                      <div className="flex flex-wrap gap-2">
                        {quickQuestions.map((question, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => setNewMessage(question)}
                            className="text-xs"
                          >
                            {question}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
              
              {/* Sidebar */}
              <div className="space-y-6">
                {/* Learning Paths */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-foreground">
                      <BookOpen className="w-5 h-5 mr-2 text-accent" />
                      Your Learning Paths
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {learningPaths.map((path, index) => (
                      <div key={index} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-sm text-foreground">{path.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {path.difficulty}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Next: {path.nextTopic}
                        </p>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-muted-foreground">Progress</span>
                          <span className="text-xs font-medium text-foreground">{path.progress}%</span>
                        </div>
                        <div className="w-full bg-border rounded-full h-1">
                          <div 
                            className="bg-accent h-1 rounded-full" 
                            style={{ width: `${path.progress}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {path.duration}
                          </span>
                          <Button size="sm" variant="outline" className="text-xs h-6">
                            Continue
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-foreground">
                      <Zap className="w-5 h-5 mr-2 text-destructive" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start text-sm h-9">
                      <FileText className="w-4 h-4 mr-2" />
                      Review My Code
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-sm h-9">
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Get Project Ideas
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-sm h-9">
                      <Award className="w-4 h-4 mr-2" />
                      Interview Prep
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-sm h-9">
                      <Users className="w-4 h-4 mr-2" />
                      Career Guidance
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Learning Resources */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Recommended Learning Resources
              </h2>
              <p className="text-muted-foreground">
                Curated courses and materials based on your learning progress
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="group hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mr-4">
                      <Code className="w-6 h-6 text-accent-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Advanced React Patterns</h3>
                      <p className="text-sm text-muted-foreground">Interactive course</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Learn advanced React concepts including render props, higher-order components, and custom hooks.
                  </p>
                  <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Start Course
                  </Button>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-destructive rounded-lg flex items-center justify-center mr-4">
                      <Brain className="w-6 h-6 text-destructive-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">System Design Fundamentals</h3>
                      <p className="text-sm text-muted-foreground">Deep dive series</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Master system design concepts essential for senior engineering roles and technical interviews.
                  </p>
                  <Button className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Explore Topics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* User Reviews */}
        <section className="py-16 bg-background">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                What Developers Say
              </h2>
              <p className="text-muted-foreground">
                Join thousands of developers accelerating their careers
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-destructive text-destructive" />
                      ))}
                    </div>
                    <p className="text-foreground mb-4 italic">"{testimonial.comment}"</p>
                    <div>
                      <p className="font-semibold text-foreground">{testimonial.name}</p>
                      <p className="text-muted-foreground text-sm">{testimonial.role}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AIMentor;