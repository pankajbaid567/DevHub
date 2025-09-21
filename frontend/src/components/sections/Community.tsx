import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, Quote, Github, Linkedin, Users, ArrowRight } from "lucide-react";

const Community = () => {
  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Full Stack Developer",
      company: "TechCorp",
      avatar: "/placeholder.svg",
      rating: 5,
      quote: "DevHub+ transformed my career! The AI mentor helped me land my dream job at a FAANG company. The community is incredibly supportive.",
      skills: ["React", "Node.js", "Python"],
      github: "@sarahchen",
      linkedin: "sarah-chen-dev"
    },
    {
      name: "Marcus Rodriguez",
      role: "Software Engineer",
      company: "StartupXYZ",
      avatar: "/placeholder.svg",
      rating: 5,
      quote: "The collaborative tools are amazing. I've built 3 projects with people I met here. The resume analyzer gave me actionable feedback that actually worked!",
      skills: ["JavaScript", "Go", "Docker"],
      github: "@marcus-dev",
      linkedin: "marcus-rodriguez"
    },
    {
      name: "Priya Patel",
      role: "Frontend Developer",
      company: "DesignHub",
      avatar: "/placeholder.svg",
      rating: 5,
      quote: "As a self-taught developer, the career roadmap feature was a game-changer. It gave me a clear path and the confidence to switch careers.",
      skills: ["Vue.js", "TypeScript", "CSS"],
      github: "@priya-codes",
      linkedin: "priya-patel-dev"
    },
    {
      name: "Alex Kim",
      role: "DevOps Engineer",
      company: "CloudNine",
      avatar: "/placeholder.svg",
      rating: 5,
      quote: "The study rooms feature is brilliant! I've learned more in 6 months here than in 2 years of studying alone. The community really cares about helping each other.",
      skills: ["AWS", "Kubernetes", "Terraform"],
      github: "@alexkim",
      linkedin: "alex-kim-devops"
    }
  ];

  const communityStats = [
    { label: "Active Developers", value: "50,000+", icon: Users },
    { label: "Projects Completed", value: "1M+", icon: Github },
    { label: "Success Stories", value: "25,000+", icon: Star },
    { label: "Study Sessions", value: "100K+", icon: Quote }
  ];

  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-destructive/10 rounded-full border border-destructive/20 mb-6">
            <Users className="w-4 h-4 text-destructive mr-2" />
            <span className="text-sm font-medium text-destructive">Join Our Community</span>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="text-foreground">Loved by </span>
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Developers Worldwide
            </span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Join thousands of developers who have accelerated their careers, 
            built amazing projects, and found their dream jobs through our platform.
          </p>
        </div>

        {/* Community Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {communityStats.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <div key={stat.label} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-primary rounded-full mb-3">
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* Testimonials */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={testimonial.name}
              className="group hover:shadow-hover transition-all duration-300 hover:-translate-y-1 border-border/50 hover:border-destructive/30"
            >
              <CardContent className="p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                      <AvatarFallback className="bg-gradient-primary text-white">
                        {testimonial.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold text-foreground">{testimonial.name}</h4>
                      <p className="text-sm text-muted-foreground">{testimonial.role} at {testimonial.company}</p>
                    </div>
                  </div>
                  
                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                    ))}
                  </div>
                </div>

                {/* Quote */}
                <div className="relative">
                  <Quote className="absolute -top-2 -left-1 w-6 h-6 text-destructive/20" />
                  <p className="text-foreground leading-relaxed pl-6 italic">
                    "{testimonial.quote}"
                  </p>
                </div>

                {/* Skills & Links */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex flex-wrap gap-2">
                    {testimonial.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="p-2">
                      <Github className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="p-2">
                      <Linkedin className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-card rounded-2xl p-12 border border-border/50">
          <h3 className="text-3xl font-bold mb-4">
            <span className="text-foreground">Ready to Join </span>
            <span className="bg-gradient-primary bg-clip-text text-transparent">Our Community?</span>
          </h3>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start your journey today and connect with thousands of developers 
            who are building the future of technology together.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="bg-gradient-primary text-white hover:shadow-hover transition-all duration-300 group"
            >
              Join Community
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              className="border-destructive text-destructive hover:bg-destructive/10 hover:border-destructive transition-all duration-300"
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Community;