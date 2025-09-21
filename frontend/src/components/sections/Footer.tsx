import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Code2, 
  Github, 
  Twitter, 
  Linkedin, 
  MessageSquare, 
  Mail,
  ArrowUp
} from "lucide-react";

const Footer = () => {
  const footerSections = [
    {
      title: "Platform",
      links: [
        { name: "DevSocial", href: "/devsocial" },
        { name: "AI Mentor", href: "/ai-mentor" },
        { name: "Resume Analyzer", href: "/resume-analyzer" },
        { name: "Career Roadmap", href: "/career-roadmap" }
      ]
    },
    {
      title: "Tools",
      links: [
        { name: "CollabBoard", href: "/collabboard" },
        { name: "Study Rooms", href: "/study-rooms" },
        { name: "Meeting Spaces", href: "/meetings" },
        { name: "Real-time Chat", href: "/chat" }
      ]
    },
    {
      title: "Community",
      links: [
        { name: "Join Community", href: "/community" },
        { name: "Success Stories", href: "/stories" },
        { name: "Events", href: "/events" },
        { name: "Newsletter", href: "/newsletter" }
      ]
    },
    {
      title: "Support",
      links: [
        { name: "Help Center", href: "/help" },
        { name: "Contact Us", href: "/contact" },
        { name: "Documentation", href: "/docs" },
        { name: "API", href: "/api" }
      ]
    }
  ];

  const socialLinks = [
    { icon: Github, href: "https://github.com/devhubplus", label: "GitHub" },
    { icon: Twitter, href: "https://twitter.com/devhubplus", label: "Twitter" },
    { icon: Linkedin, href: "https://linkedin.com/company/devhubplus", label: "LinkedIn" },
    { icon: MessageSquare, href: "https://discord.gg/devhubplus", label: "Discord" },
    { icon: Mail, href: "mailto:hello@devhubplus.com", label: "Email" }
  ];

  return (
    <footer className="bg-gradient-to-b from-background to-muted/30 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-16">
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Brand Section */}
            <div className="lg:col-span-1 space-y-6">
              <Link to="/" className="flex items-center space-x-2 group">
                <div className="p-2 bg-gradient-primary rounded-lg shadow-soft group-hover:shadow-hover transition-all duration-300">
                  <Code2 className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  DevHub+
                </span>
              </Link>
              
              <p className="text-muted-foreground leading-relaxed">
                Empowering developers worldwide with AI-powered tools, 
                collaborative spaces, and a supportive community.
              </p>
              
              {/* Newsletter Signup */}
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">Stay Updated</h4>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                  <Button size="sm" className="bg-gradient-primary text-white hover:shadow-soft">
                    Subscribe
                  </Button>
                </div>
              </div>
            </div>

            {/* Links Sections */}
            {footerSections.map((section) => (
              <div key={section.title} className="space-y-4">
                <h4 className="font-semibold text-foreground">{section.title}</h4>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.name}>
                      <Link
                        to={link.href}
                        className="text-muted-foreground hover:text-primary transition-colors duration-200"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="py-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Copyright */}
            <div className="text-center md:text-left">
              <p className="text-muted-foreground text-sm">
                © 2024 DevHub+. All rights reserved. Built with ❤️ for developers.
              </p>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => {
                const IconComponent = social.icon;
                return (
                  <Button
                    key={social.label}
                    variant="ghost"
                    size="sm"
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
                    asChild
                  >
                    <a 
                      href={social.href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      aria-label={social.label}
                    >
                      <IconComponent className="w-5 h-5" />
                    </a>
                  </Button>
                );
              })}
            </div>

            {/* Back to Top */}
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <ArrowUp className="w-5 h-5" />
            </Button>
          </div>

          {/* Legal Links */}
          <div className="flex justify-center md:justify-start gap-6 mt-6 pt-6 border-t border-border">
            <Link to="/privacy" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <Link to="/cookies" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;