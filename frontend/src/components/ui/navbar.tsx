import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import DevHubLogo from "@/assets/logo.svg";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: "Home", href: "/" },
    { name: "DevSocial", href: "/devsocial" },
    { name: "AI Resume", href: "/resume-analyzer" },
    { name: "Career Roadmap", href: "/career-roadmap" },
    { name: "AI Mentor", href: "/ai-mentor" },
    { name: "CollabBoard", href: "/collabboard" },
    { name: "Study Rooms", href: "/study-rooms" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="group-hover:scale-105 transition-transform duration-300">
              <img 
                src={DevHubLogo} 
                alt="DevHub+ Logo" 
                className="h-10 w-10"
              />
            </div>
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              DevHub+
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-secondary/20 hover:text-primary transition-all duration-200"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-2">
            <Button asChild variant="ghost" size="sm" className="hover:bg-secondary/20">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="bg-gradient-primary text-white hover:shadow-hover">
              <Link to="/signup">Join Now</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="p-2"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-background border-b border-border shadow-soft">
            <div className="px-4 py-4 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-secondary/20 hover:text-primary transition-all duration-200"
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 border-t border-border space-y-2">
                <Button asChild variant="ghost" size="sm" className="w-full justify-start hover:bg-secondary/20">
                  <Link to="/login" onClick={() => setIsOpen(false)}>Sign In</Link>
                </Button>
                <Button asChild size="sm" className="w-full bg-gradient-primary text-white hover:shadow-hover">
                  <Link to="/signup" onClick={() => setIsOpen(false)}>Join Now</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;