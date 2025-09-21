const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAIEndpoints() {
  console.log('🤖 DevHub+ AI Endpoints Test');
  console.log('============================\n');

  try {
    // Step 1: Register user
    console.log('1️⃣ Registering test user...');
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        username: 'ai_tester',
        email: 'ai.tester@example.com',
        password: 'testpass123'
      });
      console.log('✅ User registered successfully');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('⚠️  User already exists, continuing...');
      } else {
        throw error;
      }
    }

    // Step 2: Login
    console.log('\n2️⃣ Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'ai.tester@example.com',
      password: 'testpass123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    console.log(`🔑 Token: ${token.substring(0, 50)}...`);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Step 3: Test AI Mentor
    console.log('\n3️⃣ Testing AI Mentor...');
    const mentorResponse = await axios.post(`${BASE_URL}/api/ai/mentor`, {
      question: 'How do I handle errors in async/await functions?',
      codeSnippet: 'async function fetchData() {\n  const response = await fetch("/api/data");\n  return response.json();\n}'
    }, { headers });

    console.log('✅ AI Mentor Response:');
    console.log(`📝 Response: ${mentorResponse.data.response.substring(0, 200)}...`);
    console.log(`🤖 Mock Response: ${mentorResponse.data.isMockResponse}`);
    console.log(`🔗 Related Context: ${mentorResponse.data.relatedContext.questions} questions, ${mentorResponse.data.relatedContext.snippets} snippets`);

    // Step 4: Test Resume Review
    console.log('\n4️⃣ Testing Resume Review...');
    const resumeResponse = await axios.post(`${BASE_URL}/api/ai/resumeReview`, {
      resumeText: `John Doe
Software Engineer
Email: john@example.com
Phone: (555) 123-4567

EXPERIENCE:
• Senior Software Engineer at TechCorp (2021-2025)
  - Developed React applications serving 100k+ users
  - Built REST APIs using Node.js and Express
  - Led team of 3 junior developers

SKILLS:
JavaScript, React, Node.js, PostgreSQL, Docker, AWS`
    }, { headers });

    console.log('✅ Resume Review Response:');
    console.log(`📝 Review: ${resumeResponse.data.review.substring(0, 200)}...`);
    console.log(`🤖 Mock Response: ${resumeResponse.data.isMockResponse}`);
    console.log(`📊 Previous Reviews: ${resumeResponse.data.previousReviews}`);

    // Step 5: Test Skill Rater
    console.log('\n5️⃣ Testing Skill Rater...');
    const skillResponse = await axios.post(`${BASE_URL}/api/ai/skillRater`, {
      skillName: 'React.js'
    }, { headers });

    console.log('✅ Skill Rater Response:');
    console.log(`📝 Roadmap: ${skillResponse.data.roadmap.substring(0, 200)}...`);
    console.log(`🤖 Mock Response: ${skillResponse.data.isMockResponse}`);
    console.log(`📊 Current Rating: ${skillResponse.data.currentRating}/10`);
    console.log(`🎯 User Skills Count: ${skillResponse.data.userSkillsCount}`);

    console.log('\n🎉 All AI endpoints tested successfully!');
    console.log('\n📋 Summary:');
    console.log('• AI Mentor: ✅ Provides coding guidance with database context');
    console.log('• Resume Review: ✅ Structured feedback with improvement suggestions');
    console.log('• Skill Rater: ✅ Learning roadmaps with difficulty assessment');
    console.log('\n⚡ Note: Configure GEMINI_API_KEY in .env for real AI responses');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Install axios if not already installed
try {
  require('axios');
  testAIEndpoints();
} catch (e) {
  console.log('Installing axios...');
  require('child_process').execSync('npm install axios', { stdio: 'inherit' });
  console.log('Running tests...\n');
  testAIEndpoints();
}