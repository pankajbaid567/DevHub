import { GoogleGenerativeAI } from '@google/generative-ai';

class AIMentorService {
  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!this.apiKey) {
      console.warn('Gemini API key not found. Using fallback AI mentor responses.');
    }
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
  }

  async getMentorResponse(userMessage, conversationHistory = []) {
    if (!this.genAI) {
      console.log('Using fallback AI mentor responses (no Gemini API key)');
      return this.getFallbackResponse(userMessage);
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Build context from conversation history
      const context = conversationHistory.length > 0 
        ? `Previous conversation context:\n${conversationHistory.map(msg => `${msg.type}: ${msg.content}`).join('\n')}\n\n`
        : '';

      const prompt = `
        You are an expert AI mentor and senior software engineer with 10+ years of experience. 
        You're helping developers learn, solve problems, and advance their careers.
        
        ${context}
        
        User's question: "${userMessage}"
        
        Please provide a helpful, detailed response that includes:
        1. A clear, direct answer to their question
        2. Practical examples or code snippets when relevant
        3. Best practices and industry standards
        4. Additional resources or next steps for learning
        5. Encouragement and motivation
        
        If the question is about code, include a code example with comments.
        If it's about career advice, provide actionable steps.
        If it's about technical concepts, explain with analogies and examples.
        
        Keep your response conversational but professional, as if you're mentoring a colleague.
        Be encouraging and supportive while being technically accurate.
        
        Format your response in a way that's easy to read, with clear sections if needed.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return {
        content: text,
        codeExample: this.extractCodeExample(text),
        resources: this.extractResources(text),
        type: 'ai'
      };
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      throw new Error(`AI mentor response failed: ${error.message}`);
    }
  }

  extractCodeExample(text) {
    // Look for code blocks in the response
    const codeMatch = text.match(/```[\s\S]*?```/g);
    if (codeMatch) {
      return codeMatch[0].replace(/```\w*\n?/g, '').trim();
    }
    return null;
  }

  extractResources(text) {
    // Look for resource mentions in the response
    const resources = [];
    const resourcePatterns = [
      /(?:Check out|See|Read|Watch):\s*([^.!?]+)/gi,
      /(?:Learn more at|Visit|Go to):\s*([^.!?]+)/gi,
      /(?:Documentation|Docs):\s*([^.!?]+)/gi
    ];
    
    resourcePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const resource = match.replace(/^(?:Check out|See|Read|Watch|Learn more at|Visit|Go to|Documentation|Docs):\s*/i, '').trim();
          if (resource) {
            resources.push(resource);
          }
        });
      }
    });
    
    return resources;
  }

  getFallbackResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Code-related questions
    if (lowerMessage.includes('react') || lowerMessage.includes('component')) {
      return {
        content: `Great question about React! Let me help you with React concepts.

**Key React Principles:**
- Components are the building blocks of React applications
- Use functional components with hooks for modern React development
- State management with useState and useEffect
- Props for passing data between components

**Best Practices:**
- Keep components small and focused on a single responsibility
- Use custom hooks to extract reusable logic
- Implement proper error boundaries
- Optimize with React.memo and useMemo when needed

**Example Component:**
\`\`\`jsx
import { useState, useEffect } from 'react';

const UserProfile = ({ userId }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId).then(setUser).finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
};
\`\`\`

**Next Steps:**
- Practice building small components
- Learn about React Router for navigation
- Explore state management libraries like Redux or Zustand
- Study React patterns and anti-patterns

Keep practicing and don't hesitate to ask more specific questions!`,
        codeExample: `import { useState, useEffect } from 'react';

const UserProfile = ({ userId }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId).then(setUser).finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
};`,
        resources: ['React Documentation', 'React Patterns', 'React Hooks Guide'],
        type: 'ai'
      };
    }

    // Career advice
    if (lowerMessage.includes('career') || lowerMessage.includes('job') || lowerMessage.includes('interview')) {
      return {
        content: `Excellent question about career development! Here's my advice:

**Building Your Career:**
1. **Continuous Learning**: Stay updated with latest technologies and trends
2. **Build Projects**: Create a portfolio showcasing your skills
3. **Network**: Connect with other developers and industry professionals
4. **Contribute**: Open source contributions show your coding abilities
5. **Soft Skills**: Communication, teamwork, and problem-solving are crucial

**Interview Preparation:**
- Practice coding problems on LeetCode, HackerRank
- Study system design concepts
- Prepare behavioral questions using STAR method
- Research the company and role thoroughly
- Practice explaining your thought process out loud

**Career Growth Path:**
- Junior Developer (0-2 years): Focus on learning fundamentals
- Mid-level Developer (2-5 years): Take on more complex projects
- Senior Developer (5+ years): Lead projects and mentor others
- Staff/Principal Engineer: Architecture and technical leadership

**Key Skills to Develop:**
- Technical: Master your chosen stack, learn new technologies
- Problem-solving: Break down complex problems
- Communication: Explain technical concepts clearly
- Leadership: Guide and mentor junior developers

Remember, career growth is a marathon, not a sprint. Focus on consistent improvement and building meaningful relationships in the industry!`,
        resources: ['LeetCode', 'System Design Interview', 'Career Development Books'],
        type: 'ai'
      };
    }

    // General programming
    if (lowerMessage.includes('code') || lowerMessage.includes('programming') || lowerMessage.includes('algorithm')) {
      return {
        content: `Great programming question! Let me help you with that.

**Programming Best Practices:**
1. **Write Clean Code**: Use meaningful variable names, keep functions small
2. **Test Your Code**: Write unit tests and integration tests
3. **Version Control**: Use Git effectively with good commit messages
4. **Documentation**: Comment complex logic and maintain README files
5. **Code Review**: Have others review your code and learn from feedback

**Problem-Solving Approach:**
1. Understand the problem completely
2. Break it down into smaller parts
3. Plan your solution before coding
4. Start with a simple solution, then optimize
5. Test with different inputs and edge cases

**Common Programming Patterns:**
- DRY (Don't Repeat Yourself)
- SOLID principles
- Design patterns (Singleton, Observer, Factory)
- Clean Architecture principles

**Learning Resources:**
- Practice on coding platforms (LeetCode, CodeWars)
- Read other people's code on GitHub
- Contribute to open source projects
- Join programming communities and forums

Keep coding regularly and don't be afraid to make mistakes - that's how we learn!`,
        resources: ['Clean Code Book', 'LeetCode', 'GitHub', 'Stack Overflow'],
        type: 'ai'
      };
    }

    // Default response
    return {
      content: `That's a great question! I'm here to help you with your programming and career development journey.

**How I can help:**
- Code reviews and debugging assistance
- Career advice and interview preparation
- Learning path recommendations
- Technical concept explanations
- Project guidance and best practices

**To get the most out of our conversation:**
- Be specific about your questions
- Share code snippets when asking about code
- Mention your experience level and goals
- Ask follow-up questions for clarification

**Popular topics I can help with:**
- Frontend development (React, Vue, Angular)
- Backend development (Node.js, Python, Java)
- Database design and optimization
- System design and architecture
- Career growth and job search
- Interview preparation

What specific area would you like to explore? I'm here to help you succeed!`,
      resources: ['Programming Communities', 'Learning Platforms', 'Career Resources'],
      type: 'ai'
    };
  }

  async getQuickResponse(questionType) {
    const quickResponses = {
      'react': {
        content: "React is a powerful library for building user interfaces. Key concepts include components, state, props, and hooks. Would you like me to explain any specific React concept in detail?",
        codeExample: `// Basic React Component
import React, { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}`,
        resources: ['React Documentation', 'React Tutorial']
      },
      'api': {
        content: "API design is crucial for building scalable applications. Focus on RESTful principles, proper HTTP methods, clear endpoints, and comprehensive documentation.",
        codeExample: `// Express.js API Example
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});`,
        resources: ['REST API Design', 'API Documentation']
      },
      'database': {
        content: "Database optimization involves proper indexing, query optimization, and schema design. Use EXPLAIN plans to analyze query performance.",
        codeExample: `-- Optimized SQL Query
SELECT u.name, p.title 
FROM users u
JOIN posts p ON u.id = p.user_id
WHERE u.active = true
  AND p.created_at > '2023-01-01'
ORDER BY p.created_at DESC
LIMIT 10;`,
        resources: ['SQL Optimization', 'Database Design']
      },
      'career': {
        content: "Career growth requires continuous learning, networking, and building a strong portfolio. Focus on both technical skills and soft skills development.",
        resources: ['Career Development', 'Networking Tips']
      }
    };

    return quickResponses[questionType] || quickResponses['career'];
  }
}

const aiMentorService = new AIMentorService();
export default aiMentorService;
