#!/bin/bash

echo "🤖 Testing DevHub+ AI Endpoints"
echo "================================"
echo ""

# Test without authentication first (should fail)
echo "1️⃣ Testing AI Mentor without auth (should fail):"
curl -s -X POST http://localhost:3000/api/ai/mentor \
  -H "Content-Type: application/json" \
  -d '{"question": "How do I use async/await in JavaScript?"}' | head -c 200
echo ""
echo ""

# Register user
echo "2️⃣ Registering test user:"
REGISTER_RESULT=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "aitest", "email": "aitest@example.com", "password": "password123"}')
echo "$REGISTER_RESULT" | head -c 200
echo ""
echo ""

# Login and get token
echo "3️⃣ Getting auth token:"
LOGIN_RESULT=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "aitest@example.com", "password": "password123"}')
echo "$LOGIN_RESULT" | head -c 300
TOKEN=$(echo "$LOGIN_RESULT" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo ""
echo "Token: ${TOKEN:0:50}..."
echo ""

if [ -n "$TOKEN" ]; then
  echo "4️⃣ Testing AI Mentor with auth:"
  curl -s -X POST http://localhost:3000/api/ai/mentor \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"question": "How do I implement authentication in Node.js?", "codeSnippet": "const jwt = require(\"jsonwebtoken\");"}' | head -c 500
  echo ""
  echo ""
  
  echo "5️⃣ Testing Resume Review:"
  curl -s -X POST http://localhost:3000/api/ai/resumeReview \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"resumeText": "John Doe\nSoftware Engineer\nEmail: john@example.com\n\nEXPERIENCE:\n- 3 years at TechCorp\n- Built web applications\n\nSKILLS:\nJavaScript, React, Node.js"}' | head -c 500
  echo ""
  echo ""
  
  echo "6️⃣ Testing Skill Rater:"
  curl -s -X POST http://localhost:3000/api/ai/skillRater \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"skillName": "React.js"}' | head -c 500
  echo ""
else
  echo "❌ Failed to get auth token"
fi

echo ""
echo "🎉 AI endpoint testing completed!"