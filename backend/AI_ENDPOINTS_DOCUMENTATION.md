# DevHub+ AI Endpoints Documentation

This document covers the AI-powered endpoints that integrate with Google's Gemini API to provide intelligent assistance for developers.

## 🤖 AI Endpoints Overview

All AI endpoints require authentication via JWT token. The endpoints provide intelligent responses using Google's Gemini API with contextual information from the DevHub+ database.

---

## POST /api/ai/mentor

**Description**: AI-powered coding mentor that provides guidance on programming questions and code snippets.

### Request
```http
POST /api/ai/mentor
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "question": "How do I implement authentication in Node.js?",
  "codeSnippet": "const jwt = require('jsonwebtoken');\nconst token = jwt.sign({userId: 123}, 'secret');"
}
```

### Parameters
- `question` (string, required): The programming question or problem
- `codeSnippet` (string, optional): Code snippet related to the question

### Response
```json
{
  "message": "AI mentor response generated successfully",
  "response": "Detailed AI response explaining authentication concepts and code improvements...",
  "isMockResponse": false,
  "relatedContext": {
    "questions": 2,
    "snippets": 1
  },
  "userId": 1
}
```

### Features
- Fetches related questions and code snippets from database for context
- Provides educational, detailed responses
- Contextual learning based on community knowledge
- Real AI integration with fallback to mock responses

---

## POST /api/ai/resumeReview

**Description**: AI-powered resume review service that provides structured feedback on resumes.

### Request
```http
POST /api/ai/resumeReview
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "resumeText": "John Doe\nSoftware Engineer\nEmail: john@example.com\n\nEXPERIENCE:\n- 3 years at TechCorp as Full Stack Developer\n- Built web applications using React and Node.js\n\nSKILLS:\nJavaScript, React, Node.js, SQL, Git"
}
```

### Parameters
- `resumeText` (string, required): The complete resume text to review

### Response
```json
{
  "message": "Resume review completed successfully",
  "review": "STRENGTHS:\n- Clear technical skills listed\n- Relevant experience\n\nWEAKNESSES:\n- Missing quantified achievements\n- No education section\n\nSPECIFIC SUGGESTIONS:\n- Add metrics to achievements...",
  "isMockResponse": false,
  "resumeId": 123,
  "previousReviews": 2,
  "userId": 1
}
```

### Features
- Structured feedback covering strengths, weaknesses, and suggestions
- Saves resume and feedback to database for tracking
- Considers user's previous resume reviews for context
- Industry-specific recommendations
- Formatting and keyword optimization tips

---

## POST /api/ai/skillRater

**Description**: AI-powered skill assessment and learning roadmap generator.

### Request
```http
POST /api/ai/skillRater
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "skillName": "React.js"
}
```

### Parameters
- `skillName` (string, required): The technical skill to assess and create roadmap for

### Response
```json
{
  "message": "Skill roadmap generated successfully",
  "roadmap": "SKILL OVERVIEW:\nReact.js is a popular JavaScript library...\n\nLEARNING ROADMAP:\nBeginner Level (0-3 months):\n- JSX syntax\n- Components and props...",
  "skillName": "React.js",
  "isMockResponse": false,
  "skillRatingId": 456,
  "currentRating": 1,
  "userSkillsCount": 5,
  "userId": 1
}
```

### Features
- Comprehensive learning roadmaps from beginner to advanced
- Realistic time estimates and difficulty assessments
- Recommended resources, tools, and practice projects
- Career impact analysis
- Integration with user's existing skill profile
- Automatic skill tracking in database

---

## Enhanced Existing Endpoints

The following existing AI endpoints have been enhanced with Gemini API integration:

### POST /api/ai/generate-code
Enhanced with context-aware code generation using Gemini API.

### POST /api/ai/review-code
Upgraded to provide detailed, structured code reviews with security and performance insights.

### POST /api/ai/explain-code
Improved to give educational, step-by-step code explanations.

---

## Configuration

### Environment Variables
```env
GEMINI_API_KEY=your-gemini-api-key-here
```

### Mock Responses
When `GEMINI_API_KEY` is not configured or set to `your-gemini-api-key-here`, the endpoints return mock responses with `isMockResponse: true`.

---

## Error Handling

### 400 Bad Request
```json
{
  "error": "Question is required"
}
```

### 401 Unauthorized
```json
{
  "error": "Access denied. No token provided."
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to get AI mentor response"
}
```

---

## Database Integration

The AI endpoints integrate with the following database models:
- **Questions**: For contextual mentor responses
- **Snippets**: For code-related context
- **Resumes**: For storing review history
- **SkillRatings**: For tracking user skill development

---

## Testing

### Sample cURL Commands

#### Test AI Mentor
```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "email": "test@example.com", "password": "password123"}'

# Login to get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}' | jq -r '.token')

# Test AI Mentor
curl -X POST http://localhost:3000/api/ai/mentor \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "question": "How do I handle errors in async/await?",
    "codeSnippet": "async function fetchData() {\n  const response = await fetch('/api/data');\n  return response.json();\n}"
  }'
```

#### Test Resume Review
```bash
curl -X POST http://localhost:3000/api/ai/resumeReview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "resumeText": "John Doe\nSoftware Engineer\n\nEXPERIENCE:\n- 3 years full-stack development\n- React, Node.js, PostgreSQL\n\nSKILLS:\nJavaScript, React, Node.js, SQL"
  }'
```

#### Test Skill Rater
```bash
curl -X POST http://localhost:3000/api/ai/skillRater \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "skillName": "Docker"
  }'
```

---

## Rate Limits and Best Practices

1. **API Key Management**: Secure your Gemini API key and never expose it in client-side code
2. **Response Handling**: Always check `isMockResponse` to determine if using real AI or mock data
3. **Database Context**: The system automatically fetches related content for enhanced responses
4. **Error Handling**: Implement proper error handling for network and AI service failures
5. **Caching**: Consider implementing response caching for similar queries to reduce API costs

---

## Future Enhancements

- **LangChain Integration**: Planned integration for more sophisticated context retrieval
- **Response Caching**: Cache similar queries to optimize performance and costs
- **User Preferences**: Customize AI responses based on user skill level and preferences
- **Multi-modal Support**: Support for image analysis in code screenshots and resume PDFs