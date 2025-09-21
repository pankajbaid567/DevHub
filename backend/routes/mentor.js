const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to get appropriate model with fallback
const getModel = () => {
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || 'gemini-1.5-flash';
  
  return { primaryModel, fallbackModel };
};

// Function to call Gemini API with fallback
const callGeminiAPI = async (prompt, context = null) => {
  const { primaryModel, fallbackModel } = getModel();
  let modelUsed = primaryModel;
  let fallbackUsed = false;

  try {
    const model = genAI.getGenerativeModel({ model: primaryModel });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return {
      text: response.text(),
      modelUsed,
      fallbackUsed
    };
  } catch (error) {
    console.error(`Error with primary model (${primaryModel}):`, error);
    
    // Try fallback model if primary fails
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      try {
        console.log(`Trying fallback model: ${fallbackModel}`);
        const fallbackModelInstance = genAI.getGenerativeModel({ model: fallbackModel });
        const result = await fallbackModelInstance.generateContent(prompt);
        const response = await result.response;
        
        return {
          text: response.text(),
          modelUsed: fallbackModel,
          fallbackUsed: true
        };
      } catch (fallbackError) {
        console.error(`Error with fallback model (${fallbackModel}):`, fallbackError);
        throw new Error('Both primary and fallback AI models are unavailable');
      }
    }
    
    throw error;
  }
};

// System prompts for different mentor topics
const getSystemPrompt = (topic) => {
  const basePrompt = `You are an expert AI programming mentor with years of experience in software development, debugging, and career guidance. You provide helpful, accurate, and practical advice. Always be encouraging and supportive while being direct and actionable.`;

  const topicPrompts = {
    general: `${basePrompt} You help with general programming questions, best practices, and development concepts. Provide clear explanations with examples when helpful.`,
    
    'code-review': `${basePrompt} You are conducting a thorough code review. Analyze the code for:
    - Code quality and readability
    - Performance optimizations
    - Security concerns
    - Best practices adherence
    - Potential bugs or edge cases
    - Maintainability improvements
    Provide specific, actionable feedback with examples of improvements.`,
    
    debugging: `${basePrompt} You are helping debug code issues. Guide the user through:
    - Identifying the root cause of the problem
    - Step-by-step debugging approaches
    - Common debugging tools and techniques
    - Prevention strategies for similar issues
    Ask clarifying questions if more information is needed.`,
    
    learning: `${basePrompt} You create personalized learning paths and recommendations. Consider:
    - Current skill level and background
    - Learning goals and interests
    - Practical project suggestions
    - Resource recommendations (books, courses, tutorials)
    - Realistic timelines and milestones
    Structure learning paths in clear phases with actionable steps.`,
    
    career: `${basePrompt} You provide career guidance for developers. Cover:
    - Career progression strategies
    - Skill development priorities
    - Industry trends and market demands
    - Interview preparation and portfolio building
    - Networking and professional development
    - Work-life balance and job satisfaction
    Give practical, actionable career advice.`,
    
    optimization: `${basePrompt} You focus on code optimization and performance improvement. Address:
    - Algorithm and data structure optimization
    - Performance bottlenecks identification
    - Memory usage optimization
    - Code efficiency improvements
    - Scalability considerations
    - Modern best practices and patterns
    Provide specific optimization techniques with before/after examples when possible.`
  };

  return topicPrompts[topic] || topicPrompts.general;
};

/**
 * POST /api/mentor/chat
 * Get AI mentor response for user query
 * Requires authentication
 */
router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const { topic, question, code, context } = req.body;
    const userId = req.user.id;

    if (!question && !code) {
      return res.status(400).json({ error: 'Question or code is required' });
    }

    // Build the prompt
    const systemPrompt = getSystemPrompt(topic || 'general');
    let userPrompt = '';

    if (code && question) {
      userPrompt = `Code for review/analysis:\n\`\`\`\n${code}\n\`\`\`\n\nQuestion: ${question}`;
    } else if (code) {
      userPrompt = `Please analyze this code:\n\`\`\`\n${code}\n\`\`\``;
    } else {
      userPrompt = question;
    }

    // Add context if provided
    if (context) {
      userPrompt += `\n\nAdditional context: ${context}`;
    }

    const fullPrompt = `${systemPrompt}\n\nUser query: ${userPrompt}`;

    // Get AI response
    const aiResponse = await callGeminiAPI(fullPrompt);

    // Store the conversation in database (optional)
    try {
      await req.prisma.mentorConversation.create({
        data: {
          userId,
          topic: topic || 'general',
          question,
          code: code || null,
          response: aiResponse.text,
          modelUsed: aiResponse.modelUsed
        }
      });
    } catch (dbError) {
      console.error('Error saving conversation:', dbError);
      // Continue without failing the request
    }

    res.json({
      response: aiResponse.text,
      topic: topic || 'general',
      modelUsed: aiResponse.modelUsed,
      fallbackUsed: aiResponse.fallbackUsed,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Mentor chat error:', error);

    // Provide helpful fallback response
    const fallbackResponse = generateFallbackResponse(req.body.topic, req.body.question, req.body.code);
    
    res.status(200).json({
      response: fallbackResponse,
      topic: req.body.topic || 'general',
      modelUsed: 'fallback',
      fallbackUsed: true,
      timestamp: new Date().toISOString(),
      note: 'AI service temporarily unavailable. This is a helpful fallback response.'
    });
  }
});

/**
 * GET /api/mentor/history
 * Get user's mentor conversation history
 * Requires authentication
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const conversations = await req.prisma.mentorConversation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit),
      select: {
        id: true,
        topic: true,
        question: true,
        response: true,
        createdAt: true,
        modelUsed: true
      }
    });

    const total = await req.prisma.mentorConversation.count({
      where: { userId }
    });

    res.json({
      conversations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get mentor history error:', error);
    res.status(500).json({ error: 'Failed to get conversation history' });
  }
});

/**
 * DELETE /api/mentor/history/:id
 * Delete a specific conversation
 * Requires authentication
 */
router.delete('/history/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await req.prisma.mentorConversation.findFirst({
      where: {
        id: parseInt(id),
        userId
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    await req.prisma.mentorConversation.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Conversation deleted successfully' });

  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Generate fallback response when AI is unavailable
const generateFallbackResponse = (topic, question, code) => {
  const fallbackResponses = {
    general: "I'm currently experiencing technical difficulties, but I'd be happy to help! For general programming questions, I recommend:\n\n1. Check the official documentation\n2. Search Stack Overflow for similar issues\n3. Break down the problem into smaller parts\n4. Try explaining the problem to someone else (rubber duck debugging)\n\nIf you can rephrase your question or try again later, I'll be able to provide more detailed assistance.",

    'code-review': code 
      ? "I'm temporarily unable to provide a detailed code review, but here are some general best practices to check:\n\n✅ **Code Quality:**\n- Use descriptive variable and function names\n- Keep functions small and focused\n- Add comments for complex logic\n\n✅ **Performance:**\n- Avoid unnecessary loops and operations\n- Use appropriate data structures\n- Handle errors gracefully\n\n✅ **Security:**\n- Sanitize user inputs\n- Use secure authentication methods\n- Keep dependencies updated\n\nPlease try again later for a more detailed analysis!"
      : "I'd love to review your code! Please share the code snippet you'd like me to analyze, and I'll provide detailed feedback on structure, performance, and best practices.",

    debugging: "For debugging issues, try these systematic approaches:\n\n🔍 **Investigation Steps:**\n1. Read error messages carefully\n2. Check browser console/logs\n3. Use console.log() or debugger statements\n4. Test with minimal examples\n5. Check data types and API responses\n\n🛠️ **Tools to Use:**\n- Browser Developer Tools\n- Debugger statements\n- Network tab for API calls\n- Console for variable inspection\n\nIf you share the specific error message and relevant code, I can provide more targeted help when I'm back online!",

    learning: "Here's a general learning roadmap for developers:\n\n📚 **Foundation (Weeks 1-4):**\n- Master core programming concepts\n- Practice problem-solving daily\n- Build small projects\n\n🚀 **Intermediate (Weeks 5-12):**\n- Learn frameworks and libraries\n- Understand databases and APIs\n- Contribute to open source\n\n💼 **Advanced (Ongoing):**\n- System design principles\n- DevOps and deployment\n- Leadership and communication\n\nWhat specific technology or area would you like to focus on? I'll provide a more detailed path when I'm back online!",

    career: "Here's career advice for developers:\n\n💡 **Technical Growth:**\n- Stay current with industry trends\n- Build a strong portfolio\n- Contribute to open source projects\n- Write technical blogs/articles\n\n🤝 **Professional Development:**\n- Network with other developers\n- Attend conferences and meetups\n- Find mentors and mentees\n- Practice communication skills\n\n📈 **Career Strategy:**\n- Set clear goals and timelines\n- Get feedback regularly\n- Consider different career paths\n- Balance learning with delivery\n\nI'd love to provide more personalized advice when I'm back online!",

    optimization: "Here are key optimization strategies:\n\n⚡ **Performance:**\n- Profile before optimizing\n- Use efficient algorithms and data structures\n- Minimize DOM manipulations\n- Implement caching strategies\n\n📝 **Code Quality:**\n- Follow consistent coding standards\n- Remove dead code and unused imports\n- Use proper error handling\n- Write maintainable, readable code\n\n🔧 **Best Practices:**\n- Use modern language features appropriately\n- Implement proper testing\n- Consider scalability from the start\n- Document your optimizations\n\nShare your specific code for detailed optimization suggestions when I'm back online!"
  };

  return fallbackResponses[topic] || fallbackResponses.general;
};

module.exports = router;