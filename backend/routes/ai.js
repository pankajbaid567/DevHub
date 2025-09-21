const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'demo-key');
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-1.5-flash';

function getModel(modelName) {
  return genAI.getGenerativeModel({ model: modelName });
}

// Helper function to call Gemini API with error handling
async function callGeminiAPI(prompt, context = '') {
  try {
    if (process.env.GEMINI_API_KEY === 'your-gemini-api-key-here' || !process.env.GEMINI_API_KEY) {
      // Return mock response when API key is not configured
      return {
        isMock: true,
        response: `Mock AI Response: This is a placeholder response for the prompt: "${prompt}". Please configure GEMINI_API_KEY in your .env file to get real AI responses.`,
        modelUsed: 'mock',
        fallbackUsed: false
      };
    }

    const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;

    // Try primary model first
    try {
      const primaryModel = getModel(GEMINI_MODEL);
      const result = await primaryModel.generateContent(fullPrompt);
      const response = await result.response;
      return {
        isMock: false,
        response: response.text(),
        modelUsed: GEMINI_MODEL,
        fallbackUsed: false
      };
    } catch (primaryErr) {
      const msg = String(primaryErr?.message || primaryErr);
      const isQuota = msg.includes('Too Many Requests') || msg.includes('quota') || primaryErr?.status === 429;

      // Attempt fallback model on quota errors or model availability issues
      if (isQuota || msg.includes('not found') || msg.includes('is not supported')) {
        try {
          const fallbackModel = getModel(GEMINI_FALLBACK_MODEL);
          const result = await fallbackModel.generateContent(fullPrompt);
          const response = await result.response;
          return {
            isMock: false,
            response: response.text(),
            modelUsed: GEMINI_FALLBACK_MODEL,
            fallbackUsed: true
          };
        } catch (fallbackErr) {
          console.error('Gemini Fallback Model Error:', fallbackErr);
          // Fall through to mock-like error message
          throw fallbackErr;
        }
      }
      // If not a quota/model issue, rethrow
      throw primaryErr;
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    return {
      isMock: true,
      response: `AI service temporarily unavailable. Error: ${error.message}`,
      modelUsed: 'error',
      fallbackUsed: false
    };
  }
}

// Helper function to fetch related context from database
async function fetchRelatedContext(type, query) {
  try {
    switch (type) {
      case 'questions':
        return await prisma.question.findMany({
          where: {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { body: { contains: query, mode: 'insensitive' } },
              { tags: { hasSome: [query] } }
            ]
          },
          take: 3,
          include: {
            user: { select: { username: true } },
            answers: { take: 1, orderBy: { createdAt: 'desc' } }
          }
        });
      
      case 'snippets':
        return await prisma.snippet.findMany({
          where: {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { code: { contains: query, mode: 'insensitive' } }
            ]
          },
          take: 3,
          include: {
            user: { select: { username: true } }
          }
        });
      
      default:
        return [];
    }
  } catch (error) {
    console.error('Database context fetch error:', error);
    return [];
  }
}

/**
 * POST /api/ai/mentor
 * AI Mentor for coding questions and guidance
 * Requires authentication
 */
router.post('/mentor', authMiddleware, async (req, res) => {
  try {
    const { question, codeSnippet } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Fetch related questions and snippets for context
    const relatedQuestions = await fetchRelatedContext('questions', question);
    const relatedSnippets = codeSnippet ? await fetchRelatedContext('snippets', codeSnippet) : [];

    // Build context from database
    let contextInfo = '';
    if (relatedQuestions.length > 0) {
      contextInfo += '\nRelated questions from the community:\n';
      relatedQuestions.forEach((q, i) => {
        contextInfo += `${i + 1}. ${q.title} (by ${q.user.username})\n`;
        if (q.answers.length > 0) {
          contextInfo += `   Answer: ${q.answers[0].content.substring(0, 100)}...\n`;
        }
      });
    }

    if (relatedSnippets.length > 0) {
      contextInfo += '\nRelated code snippets:\n';
      relatedSnippets.forEach((s, i) => {
        contextInfo += `${i + 1}. ${s.title}: ${s.description}\n`;
      });
    }

    // Prepare prompt for Gemini
    const context = `You are an expert programming mentor helping developers solve coding problems. 
Provide detailed, educational responses that help the user learn and understand concepts.
${contextInfo}`;

    let prompt = `Question: ${question}`;
    if (codeSnippet) {
      prompt += `\n\nCode Snippet:\n\`\`\`\n${codeSnippet}\n\`\`\``;
    }

  const aiResult = await callGeminiAPI(prompt, context);

    res.json({
      message: 'AI mentor response generated successfully',
      response: aiResult.response,
      isMockResponse: aiResult.isMock,
      modelUsed: aiResult.modelUsed,
      fallbackUsed: aiResult.fallbackUsed,
      relatedContext: {
        questions: relatedQuestions.length,
        snippets: relatedSnippets.length
      },
      userId: req.user.id
    });

  } catch (error) {
    console.error('AI mentor error:', error);
    res.status(500).json({ error: 'Failed to get AI mentor response' });
  }
});

/**
 * POST /api/ai/resumeReview
 * AI-powered resume review and feedback
 * Requires authentication
 */
router.post('/resumeReview', authMiddleware, async (req, res) => {
  try {
    const { resumeText } = req.body;

    if (!resumeText) {
      return res.status(400).json({ error: 'Resume text is required' });
    }

    // Check if user has existing resumes for additional context
    const userResumes = await prisma.resume.findMany({
      where: { userId: req.user.id },
      take: 2,
      orderBy: { createdAt: 'desc' }
    });

    let contextInfo = '';
    if (userResumes.length > 0) {
      contextInfo = `\nUser's previous resume feedback history: ${userResumes.length} resumes reviewed.`;
    }

    const context = `You are an expert resume reviewer and career counselor. 
Provide detailed, constructive feedback on resumes with specific suggestions for improvement.
Focus on: content quality, formatting, keywords, achievements quantification, and industry standards.
Return your response in a structured format covering strengths, weaknesses, and specific suggestions.
${contextInfo}`;

    const prompt = `Please review this resume and provide detailed feedback:

${resumeText}

Please structure your response as:
1. STRENGTHS: What works well in this resume
2. WEAKNESSES: Areas that need improvement  
3. SPECIFIC SUGGESTIONS: Actionable recommendations
4. FORMATTING TIPS: Visual and structural improvements
5. KEYWORD OPTIMIZATION: Industry-specific terms to include
6. OVERALL RATING: Score out of 10 with justification`;

  const aiResult = await callGeminiAPI(prompt, context);

    // Save the review to database if using real AI
    let savedReview = null;
    if (!aiResult.isMock) {
      try {
        savedReview = await prisma.resume.create({
          data: {
            userId: req.user.id,
            fileUrl: 'text-resume-' + Date.now(), // Placeholder for text resume
            review: aiResult.response
          }
        });
      } catch (dbError) {
        console.error('Failed to save resume review:', dbError);
      }
    }

    res.json({
      message: 'Resume review completed successfully',
      review: aiResult.response,
      isMockResponse: aiResult.isMock,
      modelUsed: aiResult.modelUsed,
      fallbackUsed: aiResult.fallbackUsed,
      resumeId: savedReview?.id,
      previousReviews: userResumes.length,
      userId: req.user.id
    });

  } catch (error) {
    console.error('Resume review error:', error);
    res.status(500).json({ error: 'Failed to review resume' });
  }
});

/**
 * POST /api/ai/skillRater
 * AI-powered skill assessment and learning roadmap
 * Requires authentication
 */
router.post('/skillRater', authMiddleware, async (req, res) => {
  try {
    const { skillName } = req.body;

    if (!skillName) {
      return res.status(400).json({ error: 'Skill name is required' });
    }

    // Check user's existing skill ratings for context
    const userSkills = await prisma.skillRating.findMany({
      where: { userId: req.user.id },
      orderBy: { rating: 'desc' }
    });

    let contextInfo = '';
    if (userSkills.length > 0) {
      contextInfo = `\nUser's current skill profile: `;
      userSkills.slice(0, 5).forEach(skill => {
        contextInfo += `${skill.skillName} (${skill.rating}/10), `;
      });
    }

    const context = `You are an expert technical skill assessor and learning path designer.
Create comprehensive learning roadmaps for technical skills with realistic timelines and resources.
Consider different skill levels (beginner, intermediate, advanced) and provide structured learning paths.
${contextInfo}`;

    const prompt = `Create a detailed learning roadmap for the skill: "${skillName}"

Please structure your response as:
1. SKILL OVERVIEW: Brief description and importance in the industry
2. LEARNING ROADMAP: Step-by-step path from beginner to advanced
   - Beginner Level (0-3 months): Fundamentals to learn
   - Intermediate Level (3-8 months): Practical applications  
   - Advanced Level (8-12+ months): Expert-level concepts
3. RESOURCES: Recommended books, courses, tools, and practice platforms
4. DIFFICULTY ASSESSMENT: 
   - Learning difficulty (1-10 scale)
   - Time to proficiency estimate
   - Prerequisites needed
5. CAREER IMPACT: How this skill affects job prospects and salary
6. PRACTICAL PROJECTS: 3-5 project ideas to build while learning
7. CERTIFICATION PATHS: Relevant certifications or credentials`;

  const aiResult = await callGeminiAPI(prompt, context);

    // Save skill interest to database
    let skillRating = null;
    try {
      // Check if skill already exists for user
      const existingSkill = await prisma.skillRating.findFirst({
        where: {
          userId: req.user.id,
          skillName: { equals: skillName, mode: 'insensitive' }
        }
      });

      if (!existingSkill) {
        skillRating = await prisma.skillRating.create({
          data: {
            userId: req.user.id,
            skillName: skillName,
            rating: 1 // Starting rating for new skills
          }
        });
      } else {
        skillRating = existingSkill;
      }
    } catch (dbError) {
      console.error('Failed to save skill rating:', dbError);
    }

    res.json({
      message: 'Skill roadmap generated successfully',
      roadmap: aiResult.response,
      skillName: skillName,
      isMockResponse: aiResult.isMock,
      modelUsed: aiResult.modelUsed,
      fallbackUsed: aiResult.fallbackUsed,
      skillRatingId: skillRating?.id,
      currentRating: skillRating?.rating || 1,
      userSkillsCount: userSkills.length,
      userId: req.user.id
    });

  } catch (error) {
    console.error('Skill rater error:', error);
    res.status(500).json({ error: 'Failed to generate skill roadmap' });
  }
});

/**
 * POST /api/ai/generate-code
 * Generate code using AI (enhanced with Gemini)
 * Requires authentication
 */
router.post('/generate-code', authMiddleware, async (req, res) => {
  try {
    const { prompt, language = 'javascript' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const context = `You are an expert ${language} developer. Generate clean, well-commented, production-ready code.
Include error handling, follow best practices, and add explanatory comments.`;

    const fullPrompt = `Generate ${language} code for: ${prompt}

Requirements:
- Follow ${language} best practices and conventions
- Include error handling where appropriate
- Add clear comments explaining the logic
- Make the code production-ready and efficient`;

  const aiResult = await callGeminiAPI(fullPrompt, context);

    res.json({
      message: 'Code generated successfully',
      code: aiResult.response,
      language,
      prompt,
      isMockResponse: aiResult.isMock,
      modelUsed: aiResult.modelUsed,
      fallbackUsed: aiResult.fallbackUsed
    });
  } catch (error) {
    console.error('Generate code error:', error);
    res.status(500).json({ error: 'Failed to generate code' });
  }
});

/**
 * POST /api/ai/review-code
 * Review code using AI (enhanced with Gemini)
 * Requires authentication
 */
router.post('/review-code', authMiddleware, async (req, res) => {
  try {
    const { code, language = 'javascript' } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const context = `You are an expert code reviewer. Provide detailed, constructive feedback on code quality,
performance, security, maintainability, and best practices. Structure your response clearly.`;

    const prompt = `Review this ${language} code and provide detailed feedback:

\`\`\`${language}
${code}
\`\`\`

Please provide feedback in this structure:
1. OVERALL ASSESSMENT: Brief summary and rating (1-10)
2. STRENGTHS: What's done well
3. ISSUES: Problems or concerns found
4. SUGGESTIONS: Specific improvements to make
5. BEST PRACTICES: Recommendations for following ${language} conventions
6. SECURITY: Any security considerations
7. PERFORMANCE: Optimization opportunities`;

  const aiResult = await callGeminiAPI(prompt, context);

    res.json({
      message: 'Code reviewed successfully',
      review: aiResult.response,
      language,
      isMockResponse: aiResult.isMock,
      modelUsed: aiResult.modelUsed,
      fallbackUsed: aiResult.fallbackUsed
    });
  } catch (error) {
    console.error('Review code error:', error);
    res.status(500).json({ error: 'Failed to review code' });
  }
});

/**
 * POST /api/ai/explain-code
 * Explain code using AI (enhanced with Gemini)
 * Requires authentication
 */
router.post('/explain-code', authMiddleware, async (req, res) => {
  try {
    const { code, language = 'javascript' } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const context = `You are an expert programming instructor. Explain code in a clear, educational way
that helps developers understand concepts, patterns, and implementation details.`;

    const prompt = `Explain this ${language} code in detail:

\`\`\`${language}
${code}
\`\`\`

Please structure your explanation as:
1. PURPOSE: What this code does overall
2. BREAKDOWN: Line-by-line or section-by-section explanation
3. CONCEPTS: Programming concepts and patterns used
4. FLOW: How the code executes step by step
5. DEPENDENCIES: External libraries or APIs used
6. USE CASES: When and why you'd use this pattern`;

  const aiResult = await callGeminiAPI(prompt, context);

    res.json({
      message: 'Code explained successfully',
      explanation: aiResult.response,
      language,
      isMockResponse: aiResult.isMock,
      modelUsed: aiResult.modelUsed,
      fallbackUsed: aiResult.fallbackUsed
    });
  } catch (error) {
    console.error('Explain code error:', error);
    res.status(500).json({ error: 'Failed to explain code' });
  }
});

module.exports = router;