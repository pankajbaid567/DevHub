import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Users, Code2 } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-image.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/10"></div>
      
      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-left space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-primary/10 rounded-full border border-primary/20">
                <Code2 className="w-4 h-4 text-primary mr-2" />
                <span className="text-sm font-medium text-primary">Your All-in-One Developer Hub</span>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  Code
                </span>
                <span className="text-foreground"> • </span>
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  Connect
                </span>
                <span className="text-foreground"> • </span>
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  Grow
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
                Join thousands of developers in our community. Build projects, get mentored by AI, 
                enhance your skills, and connect with like-minded developers worldwide.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                asChild
                size="lg" 
                className="bg-gradient-primary text-white hover:shadow-hover transition-all duration-300 group"
              >
                <Link to="/signup">
                  Join Now
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="border-primary text-primary hover:bg-accent/20 hover:border-accent transition-all duration-300 group"
              >
                <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                Explore Features
              </Button>
              
              <Button 
                asChild
                variant="ghost" 
                size="lg"
                className="text-foreground hover:text-primary hover:bg-secondary/20 transition-all duration-300"
              >
                <Link to="/login">
                  Sign In
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 pt-8 border-t border-border">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">50K+</div>
                <div className="text-sm text-muted-foreground">Developers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">1M+</div>
                <div className="text-sm text-muted-foreground">Projects Built</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">24/7</div>
                <div className="text-sm text-muted-foreground">AI Support</div>
              </div>
            </div>
          </div>

          {/* Right Content - Hero Image */}
          <div className="relative">
            <div className="relative z-10 rounded-2xl overflow-hidden shadow-hover">
              <img 
                src={heroImage} 
                alt="Developers collaborating and coding together"
                className="w-full h-auto"
              />
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-primary rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-accent rounded-full opacity-30 animate-pulse delay-1000"></div>
            
            {/* Feature Cards */}
            <div className="absolute -left-8 top-1/2 transform -translate-y-1/2 bg-card rounded-lg p-4 shadow-soft border border-border">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Live Collaboration</span>
              </div>
            </div>
            
            <div className="absolute -right-8 top-1/4 bg-card rounded-lg p-4 shadow-soft border border-border">
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">AI Mentoring</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;