#!/usr/bin/env node

const http = require('http');

// Helper function to make HTTP requests
function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function testAIEndpoints() {
  console.log('🤖 Testing DevHub+ AI Endpoints');
  console.log('================================\n');

  let authToken = null;

  try {
    // Step 1: Register a test user
    console.log('1️⃣ Registering test user...');
    const registerResult = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      username: 'aitest',
      email: 'aitest@example.com',
      password: 'password123'
    });

    if (registerResult.status === 201 || registerResult.status === 400) {
      console.log('✅ User registered or already exists');
      
      // Step 2: Login to get token
      console.log('\n2️⃣ Logging in to get auth token...');
      const loginResult = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        email: 'aitest@example.com',
        password: 'password123'
      });

      if (loginResult.status === 200 && loginResult.data.token) {
        authToken = loginResult.data.token;
        console.log('✅ Login successful, token received');
      } else {
        throw new Error('Failed to get auth token');
      }
    } else {
      throw new Error('Failed to register user');
    }

    // Step 3: Test AI Mentor endpoint
    console.log('\n3️⃣ Testing AI Mentor endpoint...');
    const mentorResult = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/ai/mentor',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    }, {
      question: 'How do I implement authentication in Node.js?',
      codeSnippet: 'const jwt = require("jsonwebtoken");\nconst token = jwt.sign({userId: 123}, "secret");'
    });

    console.log(`Status: ${mentorResult.status}`);
    if (mentorResult.status === 200) {
      console.log('✅ AI Mentor Response:');
      console.log(`📝 Response preview: ${mentorResult.data.response.substring(0, 150)}...`);
      console.log(`🤖 Mock response: ${mentorResult.data.isMockResponse}`);
    } else {
      console.log('❌ AI Mentor failed:', mentorResult.data);
    }

    // Step 4: Test Resume Review endpoint
    console.log('\n4️⃣ Testing Resume Review endpoint...');
    const resumeResult = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/ai/resumeReview',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    }, {
      resumeText: `John Doe
Software Engineer
Email: john@example.com

EXPERIENCE:
- 3 years at TechCorp as Full Stack Developer
- Built web applications using React and Node.js
- Worked with databases and APIs

SKILLS:
JavaScript, React, Node.js, SQL, Git`
    });

    console.log(`Status: ${resumeResult.status}`);
    if (resumeResult.status === 200) {
      console.log('✅ Resume Review Response:');
      console.log(`📝 Review preview: ${resumeResult.data.review.substring(0, 150)}...`);
      console.log(`🤖 Mock response: ${resumeResult.data.isMockResponse}`);
    } else {
      console.log('❌ Resume Review failed:', resumeResult.data);
    }

    // Step 5: Test Skill Rater endpoint
    console.log('\n5️⃣ Testing Skill Rater endpoint...');
    const skillResult = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/ai/skillRater',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    }, {
      skillName: 'React.js'
    });

    console.log(`Status: ${skillResult.status}`);
    if (skillResult.status === 200) {
      console.log('✅ Skill Rater Response:');
      console.log(`📝 Roadmap preview: ${skillResult.data.roadmap.substring(0, 150)}...`);
      console.log(`🤖 Mock response: ${skillResult.data.isMockResponse}`);
      console.log(`📊 Current rating: ${skillResult.data.currentRating}`);
    } else {
      console.log('❌ Skill Rater failed:', skillResult.data);
    }

    console.log('\n🎉 All AI endpoint tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests
testAIEndpoints();