const express = require('express');
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const resumeParser = require('../services/resumeParser');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, and TXT files are allowed'), false);
    }
  },
});

// AI Feedback Generation Function
const generateAIFeedback = async (parsedResume, jobDetails) => {
  try {
    const { companyName, jobTitle, jobDescription } = jobDetails;
    
    const prompt = `You are an expert in ATS (Applicant Tracking System) and resume analysis.
Please analyze and rate this resume and suggest how to improve it.
The rating can be low if the resume is bad.
Be thorough and detailed. Don't be afraid to point out any mistakes or areas for improvement.
If there is a lot to improve, don't hesitate to give low scores. This is to help the user to improve their resume.

Job Title: ${jobTitle || 'Not specified'}
Company: ${companyName || 'Not specified'}
Job Description: ${jobDescription || 'Not provided'}

Resume Content:
${parsedResume.originalText}

Provide the feedback using the following JSON format:
{
  "overallScore": number, // max 100
  "ATS": {
    "score": number, // rate based on ATS suitability
    "tips": [
      {
        "type": "good" | "improve",
        "tip": "string" // give 3-4 tips
      }
    ]
  },
  "toneAndStyle": {
    "score": number, // max 100
    "tips": [
      {
        "type": "good" | "improve",
        "tip": "string", // make it a short "title" for the actual explanation
        "explanation": "string" // explain in detail here
      }
    ] // give 3-4 tips
  },
  "content": {
    "score": number, // max 100
    "tips": [
      {
        "type": "good" | "improve",
        "tip": "string",
        "explanation": "string"
      }
    ]
  },
  "structure": {
    "score": number, // max 100
    "tips": [
      {
        "type": "good" | "improve",
        "tip": "string",
        "explanation": "string"
      }
    ]
  },
  "skills": {
    "score": number, // max 100
    "tips": [
      {
        "type": "good" | "improve",
        "tip": "string",
        "explanation": "string"
      }
    ]
  }
}

Return only the JSON object, without any other text or markdown formatting.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean the response and parse JSON
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanedText);
    
  } catch (error) {
    console.error('AI feedback generation error:', error);
    return null;
  }
};

/**
 * POST /api/resumes/upload
 * Upload and analyze a resume file
 */
router.post('/upload', authMiddleware, upload.single('resume'), async (req, res) => {
  try {
    const { companyName, jobTitle, jobDescription } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No resume file provided' });
    }

    // Parse the resume
    const parsedResume = await resumeParser.parseFile(
      file.buffer, 
      file.mimetype, 
      file.originalname
    );

    // Generate ATS score
    const atsScore = resumeParser.generateATSScore(parsedResume);

    // Generate AI feedback if job details provided
    let aiFeedback = null;
    if (jobTitle || jobDescription) {
      aiFeedback = await generateAIFeedback(parsedResume, {
        companyName,
        jobTitle,
        jobDescription
      });
    }

    // Save to database
    const resume = await req.prisma.resume.create({
      data: {
        title: file.originalname,
        content: parsedResume.originalText,
        parsedData: parsedResume,
        atsScore,
        aiFeedback,
        companyName: companyName || null,
        jobTitle: jobTitle || null,
        jobDescription: jobDescription || null,
        userId: req.user.id,
      }
    });

    res.status(201).json({
      message: 'Resume uploaded and analyzed successfully',
      resume: {
        id: resume.id,
        title: resume.title,
        atsScore,
        aiFeedback,
        parsedData: parsedResume,
        createdAt: resume.createdAt
      }
    });

  } catch (error) {
    console.error('Upload resume error:', error);
    res.status(500).json({ 
      error: 'Failed to upload and analyze resume',
      details: error.message 
    });
  }
});

/**
 * POST /api/resumes
 * Create a new resume entry (text-based)
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, content, companyName, jobTitle, jobDescription } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Parse the text content
    const parsedResume = resumeParser.analyzeResume(content, title);
    const atsScore = resumeParser.generateATSScore(parsedResume);

    // Generate AI feedback if job details provided
    let aiFeedback = null;
    if (jobTitle || jobDescription) {
      aiFeedback = await generateAIFeedback(parsedResume, {
        companyName,
        jobTitle,
        jobDescription
      });
    }

    const resume = await req.prisma.resume.create({
      data: {
        title,
        content,
        parsedData: parsedResume,
        atsScore,
        aiFeedback,
        companyName: companyName || null,
        jobTitle: jobTitle || null,
        jobDescription: jobDescription || null,
        userId: req.user.id,
      }
    });

    res.status(201).json({
      message: 'Resume created and analyzed successfully',
      resume: {
        id: resume.id,
        title: resume.title,
        atsScore,
        aiFeedback,
        parsedData: parsedResume,
        createdAt: resume.createdAt
      }
    });

  } catch (error) {
    console.error('Create resume error:', error);
    res.status(500).json({ error: 'Failed to create resume' });
  }
});

/**
 * GET /api/resumes
 * Get user's resumes
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const resumes = await req.prisma.resume.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        atsScore: true,
        companyName: true,
        jobTitle: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ resumes });
  } catch (error) {
    console.error('Get resumes error:', error);
    res.status(500).json({ error: 'Failed to get resumes' });
  }
});

/**
 * GET /api/resumes/:id
 * Get specific resume with full analysis
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const resume = await req.prisma.resume.findFirst({
      where: { 
        id: parseInt(id),
        userId: req.user.id 
      }
    });

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    res.json({ resume });
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({ error: 'Failed to get resume' });
  }
});

/**
 * GET /api/resumes/user/:userId
 * Get resumes by user ID (public)
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const resumes = await req.prisma.resume.findMany({
      where: { userId: parseInt(userId) },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        title: true,
        atsScore: true,
        companyName: true,
        jobTitle: true,
        createdAt: true
      }
    });

    res.json({ resumes });
  } catch (error) {
    console.error('Get user resumes error:', error);
    res.status(500).json({ error: 'Failed to get resumes' });
  }
});

/**
 * PUT /api/resumes/:id/review
 * Add review to a resume
 * Requires authentication
 */
router.put('/:id/review', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { review } = req.body;

    if (!review) {
      return res.status(400).json({ error: 'Review is required' });
    }

    const resume = await req.prisma.resume.findUnique({
      where: { id: parseInt(id) }
    });

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const updatedResume = await req.prisma.resume.update({
      where: { id: parseInt(id) },
      data: { review },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true
          }
        }
      }
    });

    res.json({
      message: 'Review added successfully',
      resume: updatedResume
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ error: 'Failed to add review' });
  }
});

module.exports = router;