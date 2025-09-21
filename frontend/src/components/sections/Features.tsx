import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  Brain, 
  FileText, 
  Map, 
  MessageCircle, 
  Presentation, 
  Video, 
  Calendar,
  ArrowRight 
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Users,
      title: "DevSocial",
      description: "Connect with developers worldwide in our social platform. Share projects, get feedback, and build your network.",
      color: "bg-gradient-to-r from-primary to-secondary",
      buttonText: "Join Community"
    },
    {
      icon: Brain,
      title: "AI Mentor",
      description: "Get personalized guidance from our AI mentor. Ask questions, get code reviews, and accelerate your learning.",
      color: "bg-gradient-to-r from-accent to-primary",
      buttonText: "Start Mentoring"
    },
    {
      icon: FileText,
      title: "Resume Analyzer",
      description: "Upload your resume and get AI-powered insights to improve your chances with top tech companies.",
      color: "bg-gradient-to-r from-secondary to-accent",
      buttonText: "Analyze Resume"
    },
    {
      icon: Map,
      title: "Career Roadmap",
      description: "Generate personalized career paths based on your goals, skills, and dream roles in tech.",
      color: "bg-gradient-to-r from-primary to-destructive",
      buttonText: "Create Roadmap"
    },
    {
      icon: Presentation,
      title: "CollabBoard",
      description: "Real-time collaborative whiteboard for brainstorming, system design, and project planning.",
      color: "bg-gradient-to-r from-accent to-secondary",
      buttonText: "Start Collaborating"
    },
    {
      icon: Video,
      title: "Study Rooms",
      description: "Join voice and video study sessions. Learn together, solve problems, and stay motivated.",
      color: "bg-gradient-to-r from-destructive to-primary",
      buttonText: "Join Room"
    },
    {
      icon: Calendar,
      title: "Meeting Spaces",
      description: "Schedule and host professional meetings with screen sharing, recording, and collaboration tools.",
      color: "bg-gradient-to-r from-secondary to-primary",
      buttonText: "Schedule Meeting"
    },
    {
      icon: MessageCircle,
      title: "Real-time Chat",
      description: "Instant messaging, group chats, and channels for seamless communication with your dev community.",
      color: "bg-gradient-to-r from-primary to-accent",
      buttonText: "Start Chatting"
    }
  ];

  return (
    <section className="py-24 bg-gradient-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full border border-primary/20 mb-6">
            <span className="text-sm font-medium text-primary">Everything You Need</span>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Powerful Features
            </span>
            <span className="text-foreground"> for Developers</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            From AI-powered mentoring to collaborative tools, DevHub+ provides everything 
            you need to accelerate your development journey and connect with the community.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Card 
                key={feature.title}
                className="group hover:shadow-hover transition-all duration-300 hover:-translate-y-2 border-border/50 hover:border-primary/30"
              >
                <CardContent className="p-6 space-y-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center shadow-soft`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  
                  {/* Content */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                  
                  {/* Button */}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full justify-between text-primary hover:bg-accent/20 hover:text-accent-foreground group/btn"
                  >
                    {feature.buttonText}
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <Button 
            size="lg"
            className="bg-gradient-hero text-white hover:shadow-hover transition-all duration-300"
          >
            Explore All Features
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Features;