const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const natural = require('natural');
const { NlpManager } = require('node-nlp');

class ResumeParser {
  constructor() {
    this.nlpManager = new NlpManager({ languages: ['en'] });
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    
    // Initialize skill keywords
    this.skillKeywords = {
      frontend: ['react', 'vue', 'angular', 'javascript', 'typescript', 'html', 'css', 'scss', 'tailwind', 'bootstrap'],
      backend: ['node', 'express', 'django', 'flask', 'spring', 'rails', 'php', 'laravel', 'asp.net'],
      database: ['mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'oracle', 'sql server'],
      cloud: ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'heroku', 'vercel', 'netlify'],
      languages: ['javascript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'swift', 'kotlin'],
      tools: ['git', 'github', 'gitlab', 'jenkins', 'webpack', 'vite', 'npm', 'yarn', 'maven']
    };
  }

  async parseFile(buffer, mimetype, filename) {
    let text = '';
    
    try {
      if (mimetype === 'application/pdf') {
        const data = await pdf(buffer);
        text = data.text;
      } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } else if (mimetype === 'text/plain') {
        text = buffer.toString();
      } else {
        throw new Error('Unsupported file format');
      }

      return this.analyzeResume(text, filename);
    } catch (error) {
      throw new Error(`Failed to parse resume: ${error.message}`);
    }
  }

  analyzeResume(text, filename) {
    const analysis = {
      originalText: text,
      filename,
      extractedInfo: this.extractBasicInfo(text),
      skills: this.extractSkills(text),
      experience: this.extractExperience(text),
      education: this.extractEducation(text),
      sections: this.identifySections(text),
      keywords: this.extractKeywords(text),
      readabilityScore: this.calculateReadability(text),
      wordCount: this.tokenizer.tokenize(text).length
    };

    return analysis;
  }

  extractBasicInfo(text) {
    const info = {
      name: null,
      email: null,
      phone: null,
      location: null,
      linkedin: null,
      github: null
    };

    // Extract email
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex);
    if (emails) info.email = emails[0];

    // Extract phone
    const phoneRegex = /(\+?[1-9]\d{1,14})|(\(\d{3}\)\s?\d{3}-?\d{4})|(\d{3}[-.]?\d{3}[-.]?\d{4})/g;
    const phones = text.match(phoneRegex);
    if (phones) info.phone = phones[0];

    // Extract LinkedIn
    const linkedinRegex = /linkedin\.com\/in\/[\w-]+/gi;
    const linkedin = text.match(linkedinRegex);
    if (linkedin) info.linkedin = linkedin[0];

    // Extract GitHub
    const githubRegex = /github\.com\/[\w-]+/gi;
    const github = text.match(githubRegex);
    if (github) info.github = github[0];

    // Extract name (simple heuristic - first line or before email)
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (firstLine.length < 50 && !firstLine.includes('@')) {
        info.name = firstLine;
      }
    }

    return info;
  }

  extractSkills(text) {
    const lowerText = text.toLowerCase();
    const foundSkills = {
      frontend: [],
      backend: [],
      database: [],
      cloud: [],
      languages: [],
      tools: [],
      other: []
    };

    // Check for each category of skills
    Object.keys(this.skillKeywords).forEach(category => {
      this.skillKeywords[category].forEach(skill => {
        if (lowerText.includes(skill.toLowerCase())) {
          foundSkills[category].push(skill);
        }
      });
    });

    // Extract additional skills from common sections
    const skillsSections = this.extractSkillsSections(text);
    if (skillsSections.length > 0) {
      foundSkills.other = skillsSections;
    }

    return foundSkills;
  }

  extractSkillsSections(text) {
    const skillsRegex = /(?:skills?|technologies?|technical skills?)[:\-\s]*([\s\S]*?)(?:\n\s*\n|$)/gi;
    const matches = text.match(skillsRegex);
    const skills = [];

    if (matches) {
      matches.forEach(match => {
        const skillText = match.replace(/(?:skills?|technologies?|technical skills?)[:\-\s]*/gi, '');
        const extractedSkills = skillText.split(/[,\n•\-\|]/)
          .map(skill => skill.trim())
          .filter(skill => skill.length > 1 && skill.length < 30);
        skills.push(...extractedSkills);
      });
    }

    return [...new Set(skills)]; // Remove duplicates
  }

  extractExperience(text) {
    const experiences = [];
    const experienceRegex = /(?:experience|work experience|employment|professional experience)[:\-\s]*([\s\S]*?)(?:education|skills|projects|$)/gi;
    const matches = text.match(experienceRegex);

    if (matches) {
      matches.forEach(match => {
        const lines = match.split('\n').filter(line => line.trim());
        let currentExperience = null;

        lines.forEach(line => {
          const trimmedLine = line.trim();
          
          // Look for job titles and companies
          if (trimmedLine.length > 10 && trimmedLine.length < 100) {
            // Simple heuristic to identify job entries
            if (trimmedLine.includes('|') || trimmedLine.includes('•') || trimmedLine.includes('-')) {
              if (currentExperience) {
                experiences.push(currentExperience);
              }
              currentExperience = {
                title: trimmedLine,
                description: []
              };
            } else if (currentExperience) {
              currentExperience.description.push(trimmedLine);
            }
          }
        });

        if (currentExperience) {
          experiences.push(currentExperience);
        }
      });
    }

    return experiences;
  }

  extractEducation(text) {
    const education = [];
    const educationRegex = /(?:education|academic|qualification)[:\-\s]*([\s\S]*?)(?:experience|skills|projects|$)/gi;
    const matches = text.match(educationRegex);

    if (matches) {
      matches.forEach(match => {
        const lines = match.split('\n').filter(line => line.trim());
        lines.forEach(line => {
          const trimmedLine = line.trim();
          if (trimmedLine.length > 10 && trimmedLine.length < 150) {
            education.push(trimmedLine);
          }
        });
      });
    }

    return education;
  }

  identifySections(text) {
    const sections = [];
    const commonSections = [
      'summary', 'objective', 'experience', 'education', 'skills', 
      'projects', 'certifications', 'achievements', 'awards', 'publications'
    ];

    const lines = text.split('\n');
    lines.forEach((line, index) => {
      const trimmedLine = line.trim().toLowerCase();
      commonSections.forEach(section => {
        if (trimmedLine.includes(section) && trimmedLine.length < 50) {
          sections.push({
            section: section,
            lineNumber: index,
            text: line.trim()
          });
        }
      });
    });

    return sections;
  }

  extractKeywords(text) {
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const stopWords = natural.stopwords;
    
    const filteredTokens = tokens.filter(token => 
      !stopWords.includes(token) && 
      token.length > 2 && 
      isNaN(token)
    );

    const frequency = {};
    filteredTokens.forEach(token => {
      const stemmed = this.stemmer.stem(token);
      frequency[stemmed] = (frequency[stemmed] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));
  }

  calculateReadability(text) {
    const sentences = text.split(/[.!?]+/).length;
    const words = this.tokenizer.tokenize(text).length;
    const avgWordsPerSentence = words / sentences;
    
    // Simple readability score (0-100, higher is better)
    let score = 100;
    if (avgWordsPerSentence > 20) score -= 20;
    if (avgWordsPerSentence > 30) score -= 20;
    if (words < 100) score -= 30;
    if (words > 1000) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  generateATSScore(analysis) {
    let score = 0;
    
    // Basic info completeness (30 points)
    if (analysis.extractedInfo.email) score += 10;
    if (analysis.extractedInfo.phone) score += 10;
    if (analysis.extractedInfo.name) score += 10;
    
    // Skills presence (25 points)
    const totalSkills = Object.values(analysis.skills).flat().length;
    score += Math.min(25, totalSkills * 2);
    
    // Experience section (20 points)
    score += Math.min(20, analysis.experience.length * 5);
    
    // Education section (10 points)
    score += Math.min(10, analysis.education.length * 3);
    
    // Section organization (15 points)
    score += Math.min(15, analysis.sections.length * 3);
    
    return Math.min(100, score);
  }
}

module.exports = new ResumeParser();