import { GoogleGenerativeAI } from '@google/generative-ai';

class CareerRoadmapService {
  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!this.apiKey) {
      console.warn('Gemini API key not found. Using fallback career roadmap generation.');
    }
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
  }

  async generateCareerRoadmap(formData) {
    if (!this.genAI) {
      console.log('Using fallback career roadmap generation (no Gemini API key)');
      return this.getFallbackRoadmap(formData);
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
        You are an expert career coach and tech industry advisor. Create a comprehensive, personalized career roadmap based on the user's information.

        User Information:
        - Current Role: ${formData.currentRole}
        - Target Role: ${formData.targetRole}
        - Experience Level: ${formData.experience}
        - Current Skills: ${formData.skills}
        - Preferred Timeline: ${formData.timeline}

        Generate a detailed career roadmap in JSON format with the following structure:
        {
          "timeline": "estimated timeline in months/years",
          "overview": "brief summary of the career path",
          "milestones": [
            {
              "phase": 1,
              "title": "phase title",
              "duration": "time period",
              "description": "detailed description of what to learn",
              "skills": ["skill1", "skill2", "skill3"],
              "resources": [
                {
                  "type": "course|book|project|certification",
                  "title": "resource title",
                  "platform": "where to find it",
                  "difficulty": "beginner|intermediate|advanced",
                  "estimatedTime": "time to complete"
                }
              ],
              "projects": [
                {
                  "title": "project name",
                  "description": "what to build",
                  "technologies": ["tech1", "tech2"],
                  "difficulty": "beginner|intermediate|advanced"
                }
              ]
            }
          ],
          "recommendedCourses": [
            {
              "title": "course name",
              "platform": "learning platform",
              "rating": 4.8,
              "students": "number of students",
              "duration": "course length",
              "price": "free|paid|subscription",
              "description": "what you'll learn"
            }
          ],
          "skillsGap": {
            "currentSkills": ["skill1", "skill2"],
            "missingSkills": ["skill3", "skill4"],
            "prioritySkills": ["skill5", "skill6"]
          },
          "jobMarket": {
            "demand": "high|medium|low",
            "salaryRange": "salary information",
            "growthProspects": "career growth potential",
            "keyCompanies": ["company1", "company2"]
          },
          "nextSteps": [
            "immediate action 1",
            "immediate action 2",
            "immediate action 3"
          ]
        }

        Make the roadmap practical, actionable, and tailored to the user's specific situation. 
        Focus on skills that are in high demand in the current job market.
        Include both technical and soft skills.
        Provide specific, measurable goals for each phase.
        Consider the user's experience level when setting expectations.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse JSON response
      let jsonString = text.trim();
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.substring(7, jsonString.lastIndexOf('```')).trim();
      }
      
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      throw new Error(`Career roadmap generation failed: ${error.message}`);
    }
  }

  getFallbackRoadmap(formData) {
    // Generate a basic roadmap based on common patterns
    const currentRole = formData.currentRole.toLowerCase();
    const targetRole = formData.targetRole.toLowerCase();
    const experience = formData.experience.toLowerCase();
    
    // Determine skill level based on experience
    let skillLevel = 'beginner';
    if (experience.includes('3-5') || experience.includes('5+')) {
      skillLevel = 'intermediate';
    }
    if (experience.includes('5+') && experience.includes('senior')) {
      skillLevel = 'advanced';
    }

    // Generate role-specific roadmap
    const roadmap = this.generateRoleSpecificRoadmap(targetRole, skillLevel, formData.timeline);
    
    return {
      timeline: formData.timeline || "12 months",
      overview: `A structured path from ${formData.currentRole} to ${formData.targetRole}`,
      milestones: roadmap.milestones,
      recommendedCourses: roadmap.courses,
      skillsGap: {
        currentSkills: formData.skills.split(',').map(s => s.trim()).filter(s => s),
        missingSkills: roadmap.missingSkills,
        prioritySkills: roadmap.prioritySkills
      },
      jobMarket: {
        demand: "high",
        salaryRange: "Competitive market rates",
        growthProspects: "Strong growth potential",
        keyCompanies: ["Google", "Microsoft", "Amazon", "Meta", "Netflix"]
      },
      nextSteps: [
        "Start with the first milestone immediately",
        "Set up a learning schedule",
        "Begin building your portfolio"
      ]
    };
  }

  generateRoleSpecificRoadmap(targetRole, skillLevel, timeline) {
    const roadmaps = {
      'frontend': {
        milestones: [
          {
            phase: 1,
            title: "HTML/CSS Fundamentals",
            duration: "Month 1-2",
            description: "Master the basics of web structure and styling",
            skills: ["HTML5", "CSS3", "Responsive Design", "Flexbox", "Grid"],
            resources: [
              { type: "course", title: "Complete HTML/CSS Course", platform: "FreeCodeCamp", difficulty: "beginner", estimatedTime: "40 hours" },
              { type: "project", title: "Personal Portfolio Website", difficulty: "beginner" }
            ],
            projects: [
              { title: "Landing Page", description: "Create a responsive landing page", technologies: ["HTML", "CSS"], difficulty: "beginner" }
            ]
          },
          {
            phase: 2,
            title: "JavaScript Mastery",
            duration: "Month 3-4",
            description: "Learn modern JavaScript and DOM manipulation",
            skills: ["JavaScript ES6+", "DOM Manipulation", "Async Programming", "APIs"],
            resources: [
              { type: "course", title: "JavaScript Complete Guide", platform: "Udemy", difficulty: "intermediate", estimatedTime: "50 hours" },
              { type: "project", title: "Interactive Web App", difficulty: "intermediate" }
            ],
            projects: [
              { title: "Todo App", description: "Build a task management application", technologies: ["JavaScript", "HTML", "CSS"], difficulty: "intermediate" }
            ]
          },
          {
            phase: 3,
            title: "React Development",
            duration: "Month 5-7",
            description: "Master React and modern frontend development",
            skills: ["React", "JSX", "Hooks", "State Management", "Component Design"],
            resources: [
              { type: "course", title: "React Complete Course", platform: "Coursera", difficulty: "intermediate", estimatedTime: "60 hours" },
              { type: "project", title: "Full-Stack React App", difficulty: "advanced" }
            ],
            projects: [
              { title: "E-commerce Frontend", description: "Build a shopping website frontend", technologies: ["React", "JavaScript", "CSS"], difficulty: "advanced" }
            ]
          },
          {
            phase: 4,
            title: "Advanced Frontend",
            duration: "Month 8-12",
            description: "Learn advanced concepts and build production-ready apps",
            skills: ["TypeScript", "Testing", "Performance", "Accessibility", "Deployment"],
            resources: [
              { type: "course", title: "Advanced React Patterns", platform: "Frontend Masters", difficulty: "advanced", estimatedTime: "40 hours" },
              { type: "certification", title: "React Developer Certification", provider: "Meta", difficulty: "advanced" }
            ],
            projects: [
              { title: "Production App", description: "Deploy a full-featured application", technologies: ["React", "TypeScript", "Testing"], difficulty: "advanced" }
            ]
          }
        ],
        courses: [
          { title: "Complete Web Development Bootcamp", platform: "Udemy", rating: 4.7, students: "500k+", duration: "60 hours", price: "paid", description: "Full-stack web development" },
          { title: "React - The Complete Guide", platform: "Udemy", rating: 4.6, students: "300k+", duration: "40 hours", price: "paid", description: "Modern React development" },
          { title: "JavaScript Algorithms and Data Structures", platform: "FreeCodeCamp", rating: 4.8, students: "1M+", duration: "300 hours", price: "free", description: "Algorithm and data structure mastery" }
        ],
        missingSkills: ["TypeScript", "Testing", "Performance Optimization", "Web Accessibility"],
        prioritySkills: ["React", "JavaScript", "CSS", "HTML"]
      },
      'backend': {
        milestones: [
          {
            phase: 1,
            title: "Programming Fundamentals",
            duration: "Month 1-2",
            description: "Learn core programming concepts and choose a language",
            skills: ["Python/Node.js", "Data Structures", "Algorithms", "Git"],
            resources: [
              { type: "course", title: "Python for Everybody", platform: "Coursera", difficulty: "beginner", estimatedTime: "50 hours" },
              { type: "project", title: "CLI Application", difficulty: "beginner" }
            ],
            projects: [
              { title: "Weather CLI", description: "Command-line weather application", technologies: ["Python", "APIs"], difficulty: "beginner" }
            ]
          },
          {
            phase: 2,
            title: "Web Development Basics",
            duration: "Month 3-4",
            description: "Learn web frameworks and HTTP concepts",
            skills: ["Flask/Django/Express", "HTTP", "REST APIs", "JSON"],
            resources: [
              { type: "course", title: "Web Development with Flask", platform: "Udemy", difficulty: "intermediate", estimatedTime: "45 hours" },
              { type: "project", title: "REST API", difficulty: "intermediate" }
            ],
            projects: [
              { title: "Blog API", description: "RESTful API for blog management", technologies: ["Flask", "SQLite", "Python"], difficulty: "intermediate" }
            ]
          },
          {
            phase: 3,
            title: "Database & Advanced Backend",
            duration: "Month 5-7",
            description: "Master databases and advanced backend concepts",
            skills: ["PostgreSQL", "MongoDB", "Authentication", "Security"],
            resources: [
              { type: "course", title: "Database Design", platform: "Coursera", difficulty: "intermediate", estimatedTime: "35 hours" },
              { type: "project", title: "Full-Stack Application", difficulty: "advanced" }
            ],
            projects: [
              { title: "E-commerce Backend", description: "Complete backend for online store", technologies: ["Node.js", "PostgreSQL", "JWT"], difficulty: "advanced" }
            ]
          },
          {
            phase: 4,
            title: "DevOps & Production",
            duration: "Month 8-12",
            description: "Learn deployment, monitoring, and production practices",
            skills: ["Docker", "AWS/Azure", "CI/CD", "Microservices"],
            resources: [
              { type: "course", title: "AWS Developer Associate", platform: "AWS", difficulty: "advanced", estimatedTime: "60 hours" },
              { type: "certification", title: "AWS Certified Developer", provider: "AWS", difficulty: "advanced" }
            ],
            projects: [
              { title: "Microservices Architecture", description: "Scalable microservices application", technologies: ["Docker", "Kubernetes", "AWS"], difficulty: "advanced" }
            ]
          }
        ],
        courses: [
          { title: "Complete Python Bootcamp", platform: "Udemy", rating: 4.6, students: "400k+", duration: "50 hours", price: "paid", description: "Python programming mastery" },
          { title: "Node.js Complete Guide", platform: "Udemy", rating: 4.7, students: "200k+", duration: "45 hours", price: "paid", description: "Backend development with Node.js" },
          { title: "AWS Certified Developer", platform: "AWS", rating: 4.8, students: "100k+", duration: "80 hours", price: "paid", description: "Cloud development certification" }
        ],
        missingSkills: ["Docker", "AWS", "Microservices", "System Design"],
        prioritySkills: ["Python/Node.js", "Databases", "APIs", "Cloud"]
      },
      'fullstack': {
        milestones: [
          {
            phase: 1,
            title: "Frontend Foundations",
            duration: "Month 1-3",
            description: "Learn HTML, CSS, and JavaScript fundamentals",
            skills: ["HTML5", "CSS3", "JavaScript", "Responsive Design"],
            resources: [
              { type: "course", title: "Web Development Bootcamp", platform: "Udemy", difficulty: "beginner", estimatedTime: "60 hours" },
              { type: "project", title: "Portfolio Website", difficulty: "beginner" }
            ],
            projects: [
              { title: "Personal Website", description: "Responsive portfolio site", technologies: ["HTML", "CSS", "JavaScript"], difficulty: "beginner" }
            ]
          },
          {
            phase: 2,
            title: "Backend Development",
            duration: "Month 4-6",
            description: "Learn server-side programming and databases",
            skills: ["Node.js/Python", "Express/Django", "Databases", "APIs"],
            resources: [
              { type: "course", title: "Full-Stack Development", platform: "Coursera", difficulty: "intermediate", estimatedTime: "70 hours" },
              { type: "project", title: "REST API", difficulty: "intermediate" }
            ],
            projects: [
              { title: "Task Management API", description: "Backend for task management", technologies: ["Node.js", "MongoDB", "Express"], difficulty: "intermediate" }
            ]
          },
          {
            phase: 3,
            title: "Full-Stack Integration",
            duration: "Month 7-9",
            description: "Connect frontend and backend, learn modern frameworks",
            skills: ["React", "State Management", "Authentication", "Deployment"],
            resources: [
              { type: "course", title: "MERN Stack Mastery", platform: "Udemy", difficulty: "intermediate", estimatedTime: "80 hours" },
              { type: "project", title: "Full-Stack Application", difficulty: "advanced" }
            ],
            projects: [
              { title: "Social Media App", description: "Complete social platform", technologies: ["React", "Node.js", "MongoDB"], difficulty: "advanced" }
            ]
          },
          {
            phase: 4,
            title: "Advanced Full-Stack",
            duration: "Month 10-12",
            description: "Learn advanced concepts and production practices",
            skills: ["TypeScript", "Testing", "DevOps", "Performance"],
            resources: [
              { type: "course", title: "Advanced Full-Stack", platform: "Frontend Masters", difficulty: "advanced", estimatedTime: "60 hours" },
              { type: "certification", title: "Full-Stack Developer", provider: "Meta", difficulty: "advanced" }
            ],
            projects: [
              { title: "Production App", description: "Scalable full-stack application", technologies: ["React", "Node.js", "Docker", "AWS"], difficulty: "advanced" }
            ]
          }
        ],
        courses: [
          { title: "Complete Web Development Bootcamp", platform: "Udemy", rating: 4.7, students: "500k+", duration: "60 hours", price: "paid", description: "Full-stack web development" },
          { title: "MERN Stack Development", platform: "Coursera", rating: 4.6, students: "150k+", duration: "70 hours", price: "paid", description: "Modern full-stack development" },
          { title: "Full-Stack JavaScript", platform: "FreeCodeCamp", rating: 4.8, students: "800k+", duration: "400 hours", price: "free", description: "Complete JavaScript full-stack" }
        ],
        missingSkills: ["TypeScript", "Testing", "DevOps", "System Design"],
        prioritySkills: ["JavaScript", "React", "Node.js", "Databases"]
      }
    };

    // Find the best matching roadmap
    for (const [role, roadmap] of Object.entries(roadmaps)) {
      if (targetRole.includes(role)) {
        return roadmap;
      }
    }

    // Default to full-stack if no specific match
    return roadmaps.fullstack;
  }
}

const careerRoadmapService = new CareerRoadmapService();
export default careerRoadmapService;
