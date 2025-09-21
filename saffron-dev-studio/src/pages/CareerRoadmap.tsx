import Navbar from "@/components/ui/navbar";
import Footer from "@/components/sections/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { 
  Map, 
  Target, 
  Lightbulb, 
  BookOpen,
  Award,
  CheckCircle,
  ArrowRight,
  Download,
  Clock,
  Users,
  TrendingUp,
  Star,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import careerRoadmapService from "@/services/careerRoadmapService";

const CareerRoadmap = () => {
  const [formData, setFormData] = useState({
    currentRole: "",
    targetRole: "",
    experience: "",
    skills: "",
    timeline: ""
  });
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [roadmapData, setRoadmapData] = useState(null);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateRoadmap = async () => {
    if (!formData.currentRole || !formData.targetRole) {
      toast({
        title: "Missing Information",
        description: "Please fill in your current role and target role.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setError("");
    setRoadmapData(null);

    try {
      const roadmap = await careerRoadmapService.generateCareerRoadmap(formData);
      setRoadmapData(roadmap);
      setShowRoadmap(true);
      
      toast({
        title: "Roadmap Generated!",
        description: "Your personalized career roadmap is ready.",
      });
    } catch (error) {
      console.error('Roadmap generation error:', error);
      setError(error.message || 'Failed to generate roadmap. Please try again.');
      
      toast({
        title: "Generation Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Use generated roadmap data or show loading/error states

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main>
        {/* Hero Section */}
        <section className="py-24 bg-background">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full border border-primary/20 mb-6">
              <Map className="w-4 h-4 mr-2 text-primary" />
              <span className="text-sm font-medium text-primary">Personalized Career Path</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Your Personalized <span className="text-primary">Career Path Awaits</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Get a roadmap tailored to your goals, skills, and dream roles in the tech industry.
            </p>
          </div>
        </section>

        {/* Career Path Generation Form */}
        <section className="py-16 bg-background">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="p-8">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl font-bold text-foreground">
                  Tell Us About Your Goals
                </CardTitle>
                <p className="text-muted-foreground">
                  We'll create a personalized roadmap based on your information
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Current Role</label>
                    <Input
                      placeholder="e.g., Frontend Developer, Student, Career Changer"
                      value={formData.currentRole}
                      onChange={(e) => handleInputChange('currentRole', e.target.value)}
                      className="bg-input border-border text-foreground focus:border-destructive"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Target Role</label>
                    <Input
                      placeholder="e.g., Senior Full-Stack Developer, DevOps Engineer"
                      value={formData.targetRole}
                      onChange={(e) => handleInputChange('targetRole', e.target.value)}
                      className="bg-input border-border text-foreground focus:border-destructive"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Years of Experience</label>
                    <Input
                      placeholder="e.g., 0-2 years, 3-5 years, 5+ years"
                      value={formData.experience}
                      onChange={(e) => handleInputChange('experience', e.target.value)}
                      className="bg-input border-border text-foreground focus:border-destructive"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Preferred Timeline</label>
                    <Input
                      placeholder="e.g., 6 months, 1 year, 2 years"
                      value={formData.timeline}
                      onChange={(e) => handleInputChange('timeline', e.target.value)}
                      className="bg-input border-border text-foreground focus:border-destructive"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Current Skills</label>
                  <Textarea
                    placeholder="List your current technical skills, programming languages, frameworks, tools, etc."
                    value={formData.skills}
                    onChange={(e) => handleInputChange('skills', e.target.value)}
                    className="min-h-[100px] bg-input border-border text-foreground"
                  />
                </div>

                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                      <AlertCircle className="w-5 h-5 text-destructive mr-2" />
                      <span className="text-destructive font-medium">{error}</span>
                    </div>
                  </div>
                )}

                <div className="text-center">
                  <Button 
                    size="lg" 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
                    onClick={handleGenerateRoadmap}
                    disabled={!formData.currentRole || !formData.targetRole || isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Your Roadmap...
                      </>
                    ) : (
                      <>
                        <Map className="w-4 h-4 mr-2" />
                        Create Your Roadmap
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Roadmap Display */}
        {showRoadmap && roadmapData && (
          <section className="py-16 bg-muted/30">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Your Personalized Career Roadmap
                </h2>
                <p className="text-muted-foreground mb-6">
                  {roadmapData.overview || "A step-by-step path to achieve your career goals"}
                </p>
                <div className="inline-flex items-center px-4 py-2 bg-accent/20 rounded-full border border-accent/30">
                  <Clock className="w-4 h-4 mr-2 text-accent" />
                  <span className="text-sm font-medium text-accent">
                    Estimated Timeline: {roadmapData.timeline}
                  </span>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-8 mb-16">
                {roadmapData.milestones.map((milestone, index) => (
                  <div key={milestone.phase} className="relative">
                    {/* Connector Line */}
                    {index < roadmapData.milestones.length - 1 && (
                      <div className="absolute left-6 top-16 w-0.5 h-16 bg-border"></div>
                    )}
                    
                    <div className="flex items-start gap-6">
                      {/* Phase Indicator */}
                      <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center font-bold text-white
                        ${milestone.status === 'in-progress' ? 'bg-accent' : 
                          milestone.status === 'completed' ? 'bg-destructive' : 'bg-muted-foreground'}
                      `}>
                        {milestone.phase}
                      </div>
                      
                      {/* Content */}
                      <Card className="flex-1 bg-secondary/20 border-secondary/30">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="text-xl font-bold text-foreground mb-1">
                                {milestone.title}
                              </h3>
                              <p className="text-muted-foreground">{milestone.duration}</p>
                              {milestone.description && (
                                <p className="text-sm text-muted-foreground mt-2">{milestone.description}</p>
                              )}
                            </div>
                            <Badge variant="outline" className="border-primary text-primary">
                              Phase {milestone.phase}
                            </Badge>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="font-semibold text-foreground mb-3">Skills to Learn</h4>
                              <div className="flex flex-wrap gap-2">
                                {milestone.skills.map((skill, skillIndex) => (
                                  <Badge key={skillIndex} variant="outline" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-semibold text-foreground mb-3">Recommended Resources</h4>
                              <div className="space-y-2">
                                {milestone.resources?.map((resource, resourceIndex) => (
                                  <div key={resourceIndex} className="flex items-center justify-between p-2 bg-background rounded">
                                    <div className="flex-1">
                                      <span className="text-sm text-foreground font-medium">{resource.title}</span>
                                      <div className="text-xs text-muted-foreground">
                                        {resource.platform} • {resource.difficulty} • {resource.estimatedTime}
                                      </div>
                                    </div>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="text-primary border-primary hover:bg-primary hover:text-primary-foreground"
                                    >
                                      View
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recommended Courses */}
              {roadmapData.recommendedCourses && roadmapData.recommendedCourses.length > 0 && (
                <div className="mb-12">
                  <h3 className="text-2xl font-bold text-foreground mb-6 text-center">
                    Recommended Learning Resources
                  </h3>
                  <div className="grid md:grid-cols-3 gap-6">
                    {roadmapData.recommendedCourses.map((course, index) => (
                      <Card key={index} className="group hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <div className="mb-4">
                            <h4 className="font-semibold text-foreground mb-2">{course.title}</h4>
                            <p className="text-sm text-muted-foreground mb-3">{course.description}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <Star className="w-4 h-4 fill-accent text-accent mr-1" />
                                {course.rating}
                              </div>
                              <div className="flex items-center">
                                <Users className="w-4 h-4 mr-1" />
                                {course.students}
                              </div>
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {course.duration}
                              </div>
                            </div>
                            <div className="mt-2">
                              <Badge variant="outline" className="text-xs">
                                {course.platform} • {course.price}
                              </Badge>
                            </div>
                          </div>
                          <Button 
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                          >
                            <BookOpen className="w-4 h-4 mr-2" />
                            Start Learning
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress Tracker */}
              <Card className="mb-12">
                <CardHeader>
                  <CardTitle className="flex items-center text-foreground">
                    <TrendingUp className="w-5 h-5 mr-2 text-primary" />
                    Your Progress Tracker
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-foreground">Overall Progress</span>
                      <span className="text-foreground font-medium">16%</span>
                    </div>
                    <Progress value={16} className="h-3" />
                    <div className="grid md:grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-primary mb-1">1</div>
                        <div className="text-sm text-muted-foreground">Phases Completed</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-accent mb-1">3</div>
                        <div className="text-sm text-muted-foreground">Skills Learning</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-destructive mb-1">10</div>
                        <div className="text-sm text-muted-foreground">Months Remaining</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Save/Download Actions */}
              <div className="text-center">
                <Button 
                  size="lg"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground mr-4"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Roadmap
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Save to Profile
                </Button>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CareerRoadmap;