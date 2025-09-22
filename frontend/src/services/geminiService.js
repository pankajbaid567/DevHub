import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  constructor() {
    // You'll need to set this in your environment variables
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    console.log('Gemini API Key Status:', this.apiKey ? 'Found' : 'Not found');
    console.log('Environment variables:', {
      VITE_GEMINI_API_KEY: this.apiKey ? 'Set' : 'Not set',
      VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL ? 'Set' : 'Not set'
    });
    
    if (!this.apiKey) {
      console.warn('⚠️ Gemini API key not found. Using fallback analysis mode.');
      console.warn('To enable real AI analysis, set VITE_GEMINI_API_KEY in your environment variables.');
      console.warn('Get your free API key from: https://makersuite.google.com/app/apikey');
    } else {
      console.log('✅ Gemini API key found. Real AI analysis enabled.');
    }
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
  }

  async analyzeResume(resumeText, targetRole = '', additionalComments = '') {
    if (!this.genAI) {
      console.log('🔄 Using fallback analysis mode (no Gemini API key)');
      console.log('📝 Resume text length:', resumeText.length);
      console.log('🎯 Target role:', targetRole);
      return this.getFallbackAnalysis(resumeText, targetRole, additionalComments);
    }

    try {
      console.log('🤖 Using Gemini AI for real analysis...');
      console.log('📝 Resume text length:', resumeText.length);
      console.log('🎯 Target role:', targetRole);
      console.log('💬 Additional comments:', additionalComments);
      
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
        You are an expert resume reviewer and career advisor. Please analyze the following resume and provide comprehensive feedback.

        RESUME TEXT:
        ${resumeText}

        TARGET ROLE: ${targetRole || 'General Software Development'}
        ADDITIONAL CONTEXT: ${additionalComments || 'None provided'}

        Please provide a detailed analysis in the following JSON format:
        {
          "overallScore": [number between 1-100],
          "sections": {
            "strengths": [array of 3-5 key strengths],
            "weaknesses": [array of 3-5 areas for improvement],
            "missingElements": [array of 3-5 missing important elements],
            "keywordOptimization": [array of 5-10 relevant keywords found],
            "suggestedKeywords": [array of 5-10 keywords to add]
          },
          "detailedFeedback": {
            "summary": "Brief 2-3 sentence overall assessment",
            "contactInfo": "Feedback on contact information section",
            "experience": "Detailed feedback on work experience",
            "education": "Feedback on education section",
            "skills": "Feedback on technical and soft skills",
            "achievements": "Feedback on quantifiable achievements",
            "formatting": "Feedback on resume structure and formatting"
          },
          "recommendations": [
            {
              "category": "Technical Skills",
              "suggestion": "Specific actionable recommendation",
              "priority": "High/Medium/Low"
            }
          ],
          "atsCompatibility": {
            "score": [number between 1-100],
            "issues": [array of ATS-related issues],
            "suggestions": [array of ATS optimization suggestions]
          },
          "skillsGapAnalysis": {
            "currentSkills": [array of identified skills],
            "missingSkills": [array of skills to develop],
            "learningPath": [array of suggested learning resources]
          }
        }

        Please ensure the response is valid JSON and provide specific, actionable feedback.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      console.log('📄 Raw Gemini response received');
      console.log('📏 Response length:', text.length);

      // Clean up the response text to extract JSON
      text = text.replace(/```json\s*/, '').replace(/```\s*$/, '').trim();
      
      try {
        const analysis = JSON.parse(text);
        console.log('✅ Successfully parsed Gemini response');
        console.log('📊 Analysis score:', analysis.overallScore);
        return analysis;
      } catch (parseError) {
        console.error('❌ Error parsing Gemini response:', parseError);
        console.log('📄 Raw response:', text.substring(0, 500) + '...');
        
        // Return a fallback structure if parsing fails
        console.log('🔄 Falling back to enhanced analysis...');
        return this.getFallbackAnalysis(resumeText, targetRole, additionalComments);
      }

    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw new Error(`Resume analysis failed: ${error.message}`);
    }
  }

  getFallbackAnalysis(resumeText, targetRole = '', additionalComments = '') {
    // Enhanced keyword extraction as fallback
    const commonTechKeywords = [
      'React', 'JavaScript', 'TypeScript', 'Node.js', 'Python', 'Java', 'C++', 'C#',
      'AWS', 'Docker', 'Kubernetes', 'MongoDB', 'PostgreSQL', 'MySQL', 'Git',
      'HTML', 'CSS', 'REST API', 'GraphQL', 'Redux', 'Express', 'Vue.js', 'Angular',
      'Firebase', 'Azure', 'GCP', 'Linux', 'Agile', 'Scrum', 'CI/CD', 'Jenkins',
      'Machine Learning', 'AI', 'Data Science', 'TensorFlow', 'PyTorch'
    ];

    const foundKeywords = commonTechKeywords.filter(keyword =>
      resumeText.toLowerCase().includes(keyword.toLowerCase())
    );

    // Analyze resume sections
    const hasSummary = /summary|profile|objective/i.test(resumeText);
    const hasExperience = /experience|employment|work history/i.test(resumeText);
    const hasEducation = /education|academic|university|college/i.test(resumeText);
    const hasSkills = /skills|technical|proficiencies/i.test(resumeText);
    const hasProjects = /projects|portfolio/i.test(resumeText);

    // Calculate basic score based on content
    let score = 50; // Base score
    if (hasSummary) score += 10;
    if (hasExperience) score += 15;
    if (hasEducation) score += 10;
    if (hasSkills) score += 10;
    if (hasProjects) score += 5;
    if (foundKeywords.length > 5) score += 10;
    if (foundKeywords.length > 10) score += 5;

    // Generate role-specific suggestions
    const roleSpecificSuggestions = this.getRoleSpecificSuggestions(targetRole);
    const roleSpecificKeywords = this.getRoleSpecificKeywords(targetRole);

    return {
      overallScore: Math.min(score, 100),
      sections: {
        strengths: [
          hasSummary ? "Professional summary present" : "Consider adding a professional summary",
          hasExperience ? "Work experience section included" : "Add work experience section",
          hasEducation ? "Education background listed" : "Include education section",
          hasSkills ? "Technical skills section present" : "Add technical skills section",
          foundKeywords.length > 5 ? "Good technical keyword coverage" : "Increase technical keywords"
        ].filter(s => !s.includes("Consider") && !s.includes("Add")),
        weaknesses: [
          !hasSummary ? "Missing professional summary" : null,
          !hasExperience ? "No work experience section" : null,
          !hasSkills ? "No technical skills section" : null,
          foundKeywords.length < 5 ? "Limited technical keywords" : null,
          !hasProjects ? "No project portfolio" : null
        ].filter(Boolean),
        missingElements: [
          !hasSummary ? "Professional summary" : null,
          !hasProjects ? "Project descriptions" : null,
          "Quantifiable achievements",
          "Relevant certifications",
          "Contact information optimization"
        ].filter(Boolean),
        keywordOptimization: foundKeywords.slice(0, 10),
        suggestedKeywords: roleSpecificKeywords.filter(k => !foundKeywords.includes(k)).slice(0, 8)
      },
      detailedFeedback: {
        summary: `Your resume shows ${foundKeywords.length > 5 ? 'good' : 'basic'} technical foundation. ${foundKeywords.length > 10 ? 'Strong keyword coverage detected.' : 'Consider adding more technical keywords.'} ${targetRole ? `For a ${targetRole} role, focus on relevant technologies and achievements.` : ''}`,
        contactInfo: "Ensure contact information is complete and professional.",
        experience: hasExperience ? "Work experience section present. Add quantifiable achievements and specific project details." : "Missing work experience section. Include relevant professional experience.",
        education: hasEducation ? "Education section adequate. Consider adding relevant coursework or projects." : "Add education section with relevant academic background.",
        skills: hasSkills ? "Technical skills listed. Organize by category and include proficiency levels." : "Add comprehensive technical skills section.",
        achievements: "Include specific, measurable accomplishments with numbers and percentages.",
        formatting: "Ensure consistent formatting, proper use of bullet points, and clear section headers."
      },
      recommendations: [
        {
          category: "Content",
          suggestion: "Add quantifiable achievements with specific metrics (e.g., 'Improved performance by 30%', 'Led team of 5 developers')",
          priority: "High"
        },
        {
          category: "Technical Skills",
          suggestion: `Include more ${targetRole ? 'role-specific' : 'trending'} technologies: ${roleSpecificKeywords.slice(0, 3).join(', ')}`,
          priority: "High"
        },
        {
          category: "Structure",
          suggestion: "Ensure consistent formatting and proper use of bullet points throughout",
          priority: "Medium"
        },
        {
          category: "ATS Optimization",
          suggestion: "Use standard section headers and include industry-specific keywords",
          priority: "Medium"
        }
      ],
      atsCompatibility: {
        score: Math.min(score + 10, 100),
        issues: [
          foundKeywords.length < 5 ? "Low keyword density" : null,
          !hasSummary ? "Missing professional summary" : null,
          "May need standard section headers"
        ].filter(Boolean),
        suggestions: [
          "Include more industry-specific keywords",
          "Use standard resume section titles",
          "Avoid complex formatting that ATS can't parse",
          "Ensure consistent formatting throughout"
        ]
      },
      skillsGapAnalysis: {
        currentSkills: foundKeywords,
        missingSkills: roleSpecificKeywords.filter(k => !foundKeywords.includes(k)).slice(0, 5),
        learningPath: [
          "Complete relevant certification courses",
          "Practice with modern development tools",
          "Build portfolio projects",
          "Stay updated with industry trends"
        ]
      }
    };
  }

  getRoleSpecificKeywords(targetRole) {
    const roleKeywords = {
      'frontend': ['React', 'Vue.js', 'Angular', 'JavaScript', 'TypeScript', 'CSS', 'HTML', 'SASS', 'Webpack'],
      'backend': ['Node.js', 'Python', 'Java', 'Express', 'Django', 'Spring', 'REST API', 'GraphQL', 'Microservices'],
      'fullstack': ['React', 'Node.js', 'MongoDB', 'PostgreSQL', 'AWS', 'Docker', 'JavaScript', 'TypeScript'],
      'devops': ['Docker', 'Kubernetes', 'AWS', 'Jenkins', 'CI/CD', 'Linux', 'Terraform', 'Ansible'],
      'data': ['Python', 'R', 'SQL', 'Machine Learning', 'TensorFlow', 'Pandas', 'NumPy', 'Jupyter'],
      'mobile': ['React Native', 'Flutter', 'iOS', 'Android', 'Swift', 'Kotlin', 'Xamarin']
    };

    const role = targetRole.toLowerCase();
    for (const [key, keywords] of Object.entries(roleKeywords)) {
      if (role.includes(key)) {
        return keywords;
      }
    }
    return ['JavaScript', 'Python', 'AWS', 'Docker', 'Git', 'Agile', 'REST API', 'Database'];
  }

  getRoleSpecificSuggestions(targetRole) {
    const suggestions = {
      'frontend': 'Focus on modern JavaScript frameworks, responsive design, and user experience',
      'backend': 'Emphasize API development, database design, and system architecture',
      'fullstack': 'Highlight both frontend and backend technologies with full-stack projects',
      'devops': 'Showcase cloud platforms, containerization, and automation tools',
      'data': 'Include data analysis tools, machine learning frameworks, and statistical methods',
      'mobile': 'Demonstrate cross-platform development and mobile-specific technologies'
    };

    const role = targetRole.toLowerCase();
    for (const [key, suggestion] of Object.entries(suggestions)) {
      if (role.includes(key)) {
        return suggestion;
      }
    }
    return 'Focus on relevant technical skills and quantifiable achievements';
  }

  async generateImprovementSuggestions(analysisResult, targetRole) {
    if (!this.genAI) {
      return this.getFallbackSuggestions();
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
        Based on this resume analysis for a ${targetRole} position, provide specific, actionable improvement suggestions:

        ANALYSIS RESULT:
        ${JSON.stringify(analysisResult, null, 2)}

        Please provide 5-7 specific, actionable suggestions in this format:
        [
          {
            "title": "Specific suggestion title",
            "description": "Detailed explanation of what to do",
            "category": "Technical Skills|Experience|Formatting|Content|ATS",
            "priority": "High|Medium|Low",
            "impact": "Expected improvement or benefit"
          }
        ]

        Focus on practical, implementable suggestions that will have the biggest impact on resume effectiveness.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      text = text.replace(/```json\s*/, '').replace(/```\s*$/, '').trim();
      
      try {
        return JSON.parse(text);
      } catch (parseError) {
        return this.getFallbackSuggestions();
      }

    } catch (error) {
      console.error('Error generating suggestions:', error);
      return this.getFallbackSuggestions();
    }
  }

  getFallbackSuggestions() {
    return [
      {
        title: "Add Quantifiable Achievements",
        description: "Replace generic job descriptions with specific, measurable accomplishments. Include numbers, percentages, and metrics wherever possible.",
        category: "Content",
        priority: "High",
        impact: "Significantly increases credibility and demonstrates real value"
      },
      {
        title: "Optimize for ATS Keywords",
        description: "Research job postings for your target role and ensure your resume includes relevant technical keywords and skills.",
        category: "ATS",
        priority: "High",
        impact: "Improves chances of passing initial automated screening"
      },
      {
        title: "Strengthen Technical Skills Section",
        description: "Organize technical skills by category (languages, frameworks, tools) and consider adding proficiency levels.",
        category: "Technical Skills",
        priority: "Medium",
        impact: "Makes technical capabilities clearer to recruiters"
      },
      {
        title: "Improve Professional Summary",
        description: "Add a compelling 2-3 line summary at the top highlighting your key value proposition and years of experience.",
        category: "Content",
        priority: "Medium",
        impact: "Creates strong first impression and summarizes your value"
      },
      {
        title: "Enhance Project Descriptions",
        description: "Include 1-2 key projects with technologies used, your role, and specific outcomes achieved.",
        category: "Experience",
        priority: "Medium",
        impact: "Demonstrates practical application of technical skills"
      }
    ];
  }
}

export default new GeminiService();
