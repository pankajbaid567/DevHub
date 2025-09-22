import Navbar from "@/components/ui/navbar";
import Footer from "@/components/sections/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileUpload from "@/components/FileUpload";
import ResumeAnalysisResults from "@/components/ResumeAnalysisResults";
import { useState } from "react";
import { 
  Brain, 
  Star,
  AlertCircle,
  Loader2,
  Settings,
  FileText,
  Upload,
  Type
} from "lucide-react";
import pdfParser from "@/services/pdfParser";
import geminiService from "@/services/geminiService";
import { useToast } from "@/hooks/use-toast";

const ResumeAnalyzer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [comments, setComments] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisStage, setAnalysisStage] = useState("");
  const [error, setError] = useState("");
  const [manualText, setManualText] = useState("");
  const [activeTab, setActiveTab] = useState("upload");
  const { toast } = useToast();

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setError("");
    
    // Automatically start analysis when file is selected
    if (selectedFile) {
      await handleAnalyze(selectedFile);
    }
  };

  const handleAnalyze = async (fileToAnalyze?: File) => {
    const targetFile = fileToAnalyze || file;
    
    // Check if we have either a file or manual text
    if (!targetFile && !manualText.trim()) {
      toast({
        title: "No content provided",
        description: "Please upload a resume file or enter text manually.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setAnalysisResult(null);

    try {
      let textToAnalyze = "";

      if (targetFile) {
        // Step 1: Extract text from PDF
        setAnalysisStage("Extracting text from your resume...");
        
        try {
          const extractedData = await pdfParser.extractTextFromFile(targetFile);
          
          if (!extractedData.text || extractedData.text.trim().length < 100) {
            throw new Error("Unable to extract sufficient text from the resume. Please ensure the PDF contains text and is not just images, or try manual text entry.");
          }
          
          textToAnalyze = extractedData.text;
        } catch (pdfError) {
          console.error('PDF parsing failed:', pdfError);
          
          // If PDF parsing fails, suggest using manual text input
          setError(`PDF parsing failed: ${pdfError.message}. Please try using the "Manual Text" tab to paste your resume content directly.`);
          setActiveTab('manual'); // Switch to manual text tab
          throw new Error(`PDF parsing failed: ${pdfError.message}. Please use the "Manual Text" tab to paste your resume content directly.`);
        }
      } else {
        // Use manual text input
        setAnalysisStage("Processing your text...");
        textToAnalyze = manualText.trim();
        
        if (textToAnalyze.length < 100) {
          throw new Error("Please provide more detailed resume text (at least 100 characters).");
        }
      }

      // Step 2: Analyze with Gemini AI
      setAnalysisStage("Analyzing resume with AI...");
      const analysis = await geminiService.analyzeResume(
        textToAnalyze,
        targetRole,
        comments
      );

      setAnalysisResult(analysis);
      
      toast({
        title: "Analysis Complete!",
        description: "Your resume has been analyzed successfully.",
      });

    } catch (error) {
      console.error('Analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      setError(errorMessage);
      
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisStage("");
    }
  };

  const handleGenerateReport = () => {
    if (!analysisResult) return;
    
    // Create a simple text report
    const reportContent = `
RESUME ANALYSIS REPORT
Generated on: ${new Date().toLocaleDateString()}
File: ${file?.name}

OVERALL SCORE: ${analysisResult.overallScore}/100
ATS COMPATIBILITY: ${analysisResult.atsCompatibility.score}/100

SUMMARY:
${analysisResult.detailedFeedback.summary}

STRENGTHS:
${analysisResult.sections.strengths.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}

AREAS FOR IMPROVEMENT:
${analysisResult.sections.weaknesses.map((w: string, i: number) => `${i + 1}. ${w}`).join('\n')}

KEYWORD OPTIMIZATION:
Found Keywords: ${analysisResult.sections.keywordOptimization.join(', ')}
Suggested Keywords: ${analysisResult.sections.suggestedKeywords.join(', ')}

DETAILED FEEDBACK:
${Object.entries(analysisResult.detailedFeedback)
  .filter(([key]) => key !== 'summary')
  .map(([section, feedback]) => `${section.toUpperCase()}: ${feedback}`)
  .join('\n\n')}

RECOMMENDATIONS:
${analysisResult.recommendations.map((r: any, i: number) => 
  `${i + 1}. [${r.priority}] ${r.category}: ${r.suggestion}`
).join('\n')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume-analysis-${file?.name?.replace('.pdf', '')}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Report Downloaded",
      description: "Your analysis report has been downloaded successfully.",
    });
  };

  const handleAnalyzeAnother = () => {
    setFile(null);
    setAnalysisResult(null);
    setError("");
    setTargetRole("");
    setComments("");
  };

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Software Engineer",
      rating: 5,
      comment: "The AI insights helped me land my dream job at Google!"
    },
    {
      name: "Mike Chen",
      role: "Full Stack Developer", 
      rating: 5,
      comment: "Incredible feedback that actually made a difference in my interviews."
    },
    {
      name: "Emma Davis",
      role: "Frontend Developer",
      rating: 5,
      comment: "Best resume analyzer I've used. The suggestions were spot on!"
    }
  ];

  // Show analysis results if available
  if (analysisResult) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ResumeAnalysisResults
              analysisResult={analysisResult}
              fileName={file?.name || 'Resume'}
              onGenerateReport={handleGenerateReport}
              onAnalyzeAnother={handleAnalyzeAnother}
            />
          </div>
        </main>
        <Footer />
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
              <Brain className="w-4 h-4 mr-2 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered Analysis</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Get AI-powered <span className="text-primary">Resume Insights</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Upload your resume and get personalized feedback using Google's Gemini AI to boost your chances with top tech companies.
            </p>

            {/* API Key Notice */}
            {!import.meta.env.VITE_GEMINI_API_KEY && (
              <Alert className="max-w-2xl mx-auto mb-8">
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  <strong>Note:</strong> For enhanced AI analysis, set your <code>VITE_GEMINI_API_KEY</code> environment variable. 
                  Get your free API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline text-primary">Google AI Studio</a>.
                  <br />
                  <em>The analyzer will work with basic analysis even without the API key.</em>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </section>

        {/* Upload Form Section */}
        <section className="py-16 bg-background">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="p-8">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl font-bold text-foreground">
                  Analyze Your Resume
                </CardTitle>
                <p className="text-muted-foreground">
                  Upload a PDF or enter your resume text manually
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Tabs for Upload vs Manual Input */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload" className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload PDF
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="flex items-center gap-2">
                      <Type className="w-4 h-4" />
                      Manual Text
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="space-y-6">
                    <div className="text-center">
                      <FileText className="w-12 h-12 text-primary mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Upload PDF Resume</h3>
                      <p className="text-muted-foreground mb-4">
                        Supported formats: PDF (Max 5MB)
                      </p>
                    </div>
                    
                    <FileUpload
                      onFileSelect={handleFileSelect}
                      acceptedTypes={['.pdf']}
                      maxSize={5 * 1024 * 1024}
                      disabled={isAnalyzing}
                    />
                  </TabsContent>

                  <TabsContent value="manual" className="space-y-6">
                    <div className="text-center">
                      <Type className="w-12 h-12 text-primary mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Enter Resume Text</h3>
                      <p className="text-muted-foreground mb-4">
                        Paste your resume content directly (at least 100 characters)
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Resume Text
                      </label>
                      <Textarea
                        placeholder="Paste your resume content here... Include your name, contact info, experience, education, skills, etc."
                        value={manualText}
                        onChange={(e) => setManualText(e.target.value)}
                        className="min-h-[300px] bg-input border-border text-foreground placeholder:text-muted-foreground"
                        disabled={isAnalyzing}
                      />
                      <p className="text-xs text-muted-foreground">
                        Character count: {manualText.length} (minimum 100 required)
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Target Role */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Target Role (Optional)
                  </label>
                  <Textarea
                    placeholder="e.g., Senior Frontend Developer, Full Stack Engineer, Data Scientist..."
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="min-h-[60px] bg-input border-border text-foreground placeholder:text-muted-foreground"
                    disabled={isAnalyzing}
                  />
                </div>

                {/* Additional Comments */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Additional Comments (Optional)
                  </label>
                  <Textarea
                    placeholder="Tell us about your experience level, specific areas you'd like feedback on, or any other context..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="min-h-[100px] bg-input border-border text-foreground placeholder:text-muted-foreground"
                    disabled={isAnalyzing}
                  />
                </div>

                {/* Analysis Status */}
                {isAnalyzing && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-6 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                      <h3 className="font-semibold text-blue-800 mb-2">Analyzing Your Resume</h3>
                      <p className="text-blue-600">{analysisStage}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Error Display */}
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {error}
                      {error.includes('PDF parsing failed') && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800 font-medium mb-1">💡 Quick Fix:</p>
                          <p className="text-sm text-blue-700">
                            Switch to the "Manual Text" tab above and paste your resume content directly. 
                            This works for any resume format and is often more reliable than PDF parsing.
                          </p>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Analyze Button */}
                {((file && activeTab === 'upload') || (manualText.trim() && activeTab === 'manual')) && !isAnalyzing && !analysisResult && (
                  <div className="text-center">
                    <Button 
                      size="lg" 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
                      onClick={() => handleAnalyze()}
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      {activeTab === 'upload' ? 'Analyze Resume' : 'Analyze Text'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>


        {/* Feedback Section */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                What Our Users Say
              </h2>
              <p className="text-muted-foreground">
                Join thousands of developers who've improved their resumes
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

export default ResumeAnalyzer;