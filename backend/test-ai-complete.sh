#!/bin/bash

# DevHub+ AI Endpoints Test Suite
# Tests all AI endpoints with proper authentication

echo "🤖 DevHub+ AI Endpoints Test Suite"
echo "===================================="
echo ""

BASE_URL="http://localhost:3000"
TEST_USER="aitest_$(date +%s)"
TEST_EMAIL="${TEST_USER}@example.com"
TEST_PASSWORD="password123"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${2}${1}${NC}"
}

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local data=$2
    local description=$3
    
    print_status "Testing: $description" $BLUE
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "$data")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_status "✅ SUCCESS (HTTP $HTTP_CODE)" $GREEN
        echo "Response preview: $(echo "$BODY" | jq -r '.message // .error // "No message"' 2>/dev/null || echo "$BODY" | head -c 100)"
        if echo "$BODY" | jq -e '.isMockResponse' >/dev/null 2>&1; then
            IS_MOCK=$(echo "$BODY" | jq -r '.isMockResponse')
            if [ "$IS_MOCK" = "true" ]; then
                print_status "⚠️  Using mock response (Gemini API key not configured)" $YELLOW
            else
                print_status "🤖 Real AI response generated" $GREEN
            fi
        fi
    else
        print_status "❌ FAILED (HTTP $HTTP_CODE)" $RED
        echo "Error: $(echo "$BODY" | jq -r '.error // "Unknown error"' 2>/dev/null || echo "$BODY")"
    fi
    echo ""
}

# Step 1: Register test user
print_status "1️⃣ Registering test user: $TEST_USER" $BLUE
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"$TEST_USER\", \"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}")

REGISTER_CODE=$(echo "$REGISTER_RESPONSE" | tail -n1)
if [ "$REGISTER_CODE" = "201" ]; then
    print_status "✅ User registered successfully" $GREEN
elif [ "$REGISTER_CODE" = "400" ]; then
    print_status "⚠️  User already exists, continuing..." $YELLOW
else
    print_status "❌ Registration failed (HTTP $REGISTER_CODE)" $RED
    exit 1
fi
echo ""

# Step 2: Login and get token
print_status "2️⃣ Logging in to get authentication token" $BLUE
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}")

LOGIN_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | head -n -1)

if [ "$LOGIN_CODE" = "200" ]; then
    TOKEN=$(echo "$LOGIN_BODY" | jq -r '.token' 2>/dev/null)
    if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
        print_status "✅ Login successful, token acquired" $GREEN
        echo "Token preview: ${TOKEN:0:50}..."
    else
        print_status "❌ Failed to extract token" $RED
        exit 1
    fi
else
    print_status "❌ Login failed (HTTP $LOGIN_CODE)" $RED
    echo "Error: $(echo "$LOGIN_BODY" | jq -r '.error // "Unknown error"')"
    exit 1
fi
echo ""

# Step 3: Test AI Mentor endpoint
test_endpoint "/api/ai/mentor" '{
    "question": "How do I handle errors in async/await functions in JavaScript?",
    "codeSnippet": "async function fetchData() {\n  const response = await fetch(\"/api/data\");\n  return response.json();\n}"
}' "AI Mentor - Async/Await Error Handling"

# Step 4: Test Resume Review endpoint
test_endpoint "/api/ai/resumeReview" '{
    "resumeText": "John Doe\nSoftware Engineer\nEmail: john.doe@example.com\nPhone: (555) 123-4567\n\nPROFESSIONAL SUMMARY:\nExperienced full-stack developer with 5 years in web development\n\nEXPERIENCE:\n• Senior Software Engineer at TechCorp (2021-2025)\n  - Developed React applications serving 100k+ users\n  - Built REST APIs using Node.js and Express\n  - Implemented CI/CD pipelines with Docker\n  - Led team of 3 junior developers\n\n• Full-Stack Developer at StartupXYZ (2019-2021)\n  - Created responsive web applications\n  - Worked with PostgreSQL databases\n  - Collaborated with design team on UX improvements\n\nSKILLS:\n• Programming: JavaScript, TypeScript, Python, Java\n• Frontend: React, Vue.js, HTML5, CSS3, Sass\n• Backend: Node.js, Express, Django, Spring Boot\n• Databases: PostgreSQL, MongoDB, Redis\n• Tools: Git, Docker, AWS, Jenkins\n\nEDUCATION:\nBachelor of Science in Computer Science\nUniversity of Technology (2015-2019)"
}' "Resume Review - Full-Stack Developer Resume"

# Step 5: Test Skill Rater endpoint
test_endpoint "/api/ai/skillRater" '{
    "skillName": "React.js"
}' "Skill Rater - React.js Learning Roadmap"

# Step 6: Test another skill
test_endpoint "/api/ai/skillRater" '{
    "skillName": "Docker"
}' "Skill Rater - Docker Learning Roadmap"

# Step 7: Test AI Mentor with different question
test_endpoint "/api/ai/mentor" '{
    "question": "What are the best practices for database design in a Node.js application?"
}' "AI Mentor - Database Design Best Practices"

# Step 8: Test enhanced code generation
test_endpoint "/api/ai/generate-code" '{
    "prompt": "Create a middleware function for Express.js that validates JWT tokens",
    "language": "javascript"
}' "Enhanced Code Generation - JWT Middleware"

# Step 9: Test enhanced code review
test_endpoint "/api/ai/review-code" '{
    "code": "function validateEmail(email) {\n  return email.includes(\"@\");\n}\n\nfunction processUser(userData) {\n  if (validateEmail(userData.email)) {\n    console.log(\"Valid email\");\n    return userData;\n  }\n  throw new Error(\"Invalid email\");\n}",
    "language": "javascript"
}' "Enhanced Code Review - Email Validation Function"

# Step 10: Test enhanced code explanation
test_endpoint "/api/ai/explain-code" '{
    "code": "const users = await User.findMany({\n  where: {\n    status: \"active\",\n    lastLogin: {\n      gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)\n    }\n  },\n  include: {\n    profile: true,\n    posts: {\n      take: 5,\n      orderBy: { createdAt: \"desc\" }\n    }\n  }\n});",
    "language": "javascript"
}' "Enhanced Code Explanation - Prisma Query"

print_status "🎉 All AI endpoint tests completed!" $GREEN
print_status "📊 Test Summary:" $BLUE
echo "• AI Mentor: Provides coding guidance with contextual database information"
echo "• Resume Review: Structured feedback on resumes with improvement suggestions"
echo "• Skill Rater: Learning roadmaps and difficulty assessments for technical skills"
echo "• Enhanced existing endpoints: Code generation, review, and explanation with Gemini AI"
echo ""
print_status "⚡ Note: If using mock responses, configure GEMINI_API_KEY in .env for real AI" $YELLOW