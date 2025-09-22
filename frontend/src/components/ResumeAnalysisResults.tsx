import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, 
  Target, 
  CheckCircle, 
  AlertTriangle,
  Download,
  Brain,
  BookOpen,
  Award,
  Users,
  Lightbulb,
  FileText,
  BarChart3,
  Star,
  ArrowRight,
  ExternalLink
} from "lucide-react";

interface AnalysisResult {
  overallScore: number;
  sections: {
    strengths: string[];
    weaknesses: string[];
    missingElements: string[];
    keywordOptimization: string[];
    suggestedKeywords: string[];
  };
  detailedFeedback: {
    summary: string;
    contactInfo: string;
    experience: string;
    education: string;
    skills: string;
    achievements: string;
    formatting: string;
  };
  recommendations: Array<{
    category: string;
    suggestion: string;
    priority: 'High' | 'Medium' | 'Low';
  }>;
  atsCompatibility: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
  skillsGapAnalysis: {
    currentSkills: string[];
    missingSkills: string[];
    learningPath: string[];
  };
}

interface ResumeAnalysisResultsProps {
  analysisResult: AnalysisResult;
  fileName: string;
  onGenerateReport?: () => void;
  onAnalyzeAnother?: () => void;
}

const ResumeAnalysisResults: React.FC<ResumeAnalysisResultsProps> = ({
  analysisResult,
  fileName,
  onGenerateReport,
  onAnalyzeAnother
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100 border-green-200';
    if (score >= 60) return 'bg-yellow-100 border-yellow-200';
    return 'bg-red-100 border-red-200';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Brain className="w-6 h-6 text-primary" />
          <h2 className="text-3xl font-bold text-foreground">Analysis Complete</h2>
        </div>
        <p className="text-muted-foreground">
          Comprehensive analysis of <span className="font-medium">{fileName}</span>
        </p>
        
        {/* Analysis Mode Indicator */}
        {import.meta.env.VITE_GEMINI_API_KEY ? (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium border border-green-200">
            <Brain className="w-4 h-4" />
            AI-Powered Analysis (Gemini)
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium border border-yellow-200">
            <FileText className="w-4 h-4" />
            Basic Analysis Mode
          </div>
        )}
      </div>

      {/* Overall Score Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className={`${getScoreBg(analysisResult.overallScore)} border-2`}>
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-white rounded-full flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <h3 className={`text-3xl font-bold mb-2 ${getScoreColor(analysisResult.overallScore)}`}>
              {analysisResult.overallScore}/100
            </h3>
            <p className="font-medium text-foreground">Overall Resume Score</p>
            <Progress 
              value={analysisResult.overallScore} 
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>

        <Card className={`${getScoreBg(analysisResult.atsCompatibility.score)} border-2`}>
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-white rounded-full flex items-center justify-center">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <h3 className={`text-3xl font-bold mb-2 ${getScoreColor(analysisResult.atsCompatibility.score)}`}>
              {analysisResult.atsCompatibility.score}/100
            </h3>
            <p className="font-medium text-foreground">ATS Compatibility</p>
            <Progress 
              value={analysisResult.atsCompatibility.score} 
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>

        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-3xl font-bold mb-2 text-primary">
              {analysisResult.sections.keywordOptimization.length}
            </h3>
            <p className="font-medium text-foreground">Keywords Found</p>
            <div className="mt-3 flex flex-wrap gap-1 justify-center">
              {analysisResult.sections.keywordOptimization.slice(0, 3).map((keyword, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
              {analysisResult.sections.keywordOptimization.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{analysisResult.sections.keywordOptimization.length - 3}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Feedback</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="skills">Skills Analysis</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Strengths */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-green-600">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {analysisResult.sections.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Areas for Improvement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-orange-600">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {analysisResult.sections.weaknesses.map((weakness, index) => (
                    <li key={index} className="flex items-start">
                      <AlertTriangle className="w-4 h-4 text-orange-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{weakness}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Keywords Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2 text-primary" />
                Keyword Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2 text-green-600">Keywords Found</h4>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.sections.keywordOptimization.map((keyword, index) => (
                    <Badge key={index} variant="default" className="bg-green-100 text-green-800">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2 text-blue-600">Suggested Keywords to Add</h4>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.sections.suggestedKeywords.map((keyword, index) => (
                    <Badge key={index} variant="outline" className="border-blue-300 text-blue-700">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detailed Feedback Tab */}
        <TabsContent value="detailed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground leading-relaxed">{analysisResult.detailedFeedback.summary}</p>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            {Object.entries(analysisResult.detailedFeedback)
              .filter(([key]) => key !== 'summary')
              .map(([section, feedback]) => (
                <Card key={section}>
                  <CardHeader>
                    <CardTitle className="capitalize text-lg">
                      {section.replace(/([A-Z])/g, ' $1').trim()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground leading-relaxed">{feedback}</p>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          <div className="grid gap-4">
            {analysisResult.recommendations.map((rec, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                      <h3 className="font-semibold text-foreground">{rec.category}</h3>
                    </div>
                    <Badge className={getPriorityColor(rec.priority)} variant="outline">
                      {rec.priority} Priority
                    </Badge>
                  </div>
                  <p className="text-foreground leading-relaxed">{rec.suggestion}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ATS Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-primary" />
                ATS Optimization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2 text-red-600">Issues Found</h4>
                <ul className="space-y-2">
                  {analysisResult.atsCompatibility.issues.map((issue, index) => (
                    <li key={index} className="flex items-start">
                      <AlertTriangle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2 text-blue-600">Suggestions</h4>
                <ul className="space-y-2">
                  {analysisResult.atsCompatibility.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills Analysis Tab */}
        <TabsContent value="skills" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-green-600">
                  <Award className="w-5 h-5 mr-2" />
                  Current Skills Identified
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.skillsGapAnalysis.currentSkills.map((skill, index) => (
                    <Badge key={index} variant="default" className="bg-green-100 text-green-800">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-orange-600">
                  <Target className="w-5 h-5 mr-2" />
                  Skills to Develop
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.skillsGapAnalysis.missingSkills.map((skill, index) => (
                    <Badge key={index} variant="outline" className="border-orange-300 text-orange-700">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-primary" />
                Recommended Learning Path
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysisResult.skillsGapAnalysis.learningPath.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <ArrowRight className="w-4 h-4 text-primary mr-3" />
                    <span className="text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button 
          size="lg" 
          className="bg-primary hover:bg-primary/90"
          onClick={onGenerateReport}
        >
          <Download className="w-4 h-4 mr-2" />
          Download Full Report
        </Button>
        <Button 
          size="lg" 
          variant="outline"
          onClick={onAnalyzeAnother}
        >
          <FileText className="w-4 h-4 mr-2" />
          Analyze Another Resume
        </Button>
      </div>
    </div>
  );
};

export default ResumeAnalysisResults;
