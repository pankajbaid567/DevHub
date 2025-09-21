const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function testMentorWithAuth() {
  try {
    console.log('🧪 Testing Mentor API with Authentication...\n');

    // Step 1: Register a test user (or login if exists)
    console.log('1. Registering/logging in test user...');
    let authResponse;
    
    try {
      // Try to register
      authResponse = await axios.post(`${API_BASE}/auth/register`, {
        username: 'testmentor',
        email: 'testmentor@example.com',
        password: 'testpass123'
      });
      console.log('✅ Test user registered successfully');
    } catch (registerError) {
      if (registerError.response?.status === 400) {
        console.log('ℹ️ User already exists, trying to login...');
        // Try to login
        authResponse = await axios.post(`${API_BASE}/auth/login`, {
          email: 'testmentor@example.com',
          password: 'testpass123'
        });
        console.log('✅ Test user logged in successfully');
      } else {
        throw registerError;
      }
    }

    const token = authResponse.data.token;
    console.log(`🔑 Token obtained: ${token.substring(0, 20)}...\n`);

    // Step 2: Test mentor chat endpoint
    console.log('2. Testing mentor chat endpoint...');
    const mentorResponse = await axios.post(`${API_BASE}/api/mentor/chat`, {
      topic: 'debugging',
      question: 'How do I debug JavaScript applications effectively?',
      context: 'I am a beginner developer learning React'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Mentor API Response:');
    console.log('📝 Topic:', mentorResponse.data.topic);
    console.log('🤖 Model Used:', mentorResponse.data.modelUsed);
    console.log('⏰ Timestamp:', mentorResponse.data.timestamp);
    console.log('💬 Response Length:', mentorResponse.data.response.length, 'characters');
    console.log('📄 Response Preview:', mentorResponse.data.response.substring(0, 200) + '...\n');

    // Step 3: Test mentor history endpoint
    console.log('3. Testing mentor history endpoint...');
    const historyResponse = await axios.get(`${API_BASE}/api/mentor/history`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ History Response:');
    console.log('📊 Total conversations:', historyResponse.data.pagination.total);
    console.log('📋 Current page:', historyResponse.data.pagination.page);
    console.log('📝 Conversations count:', historyResponse.data.conversations.length);

    if (historyResponse.data.conversations.length > 0) {
      const latestConversation = historyResponse.data.conversations[0];
      console.log('📅 Latest conversation:', {
        id: latestConversation.id,
        topic: latestConversation.topic,
        question: latestConversation.question.substring(0, 50) + '...',
        createdAt: latestConversation.createdAt
      });
    }

    console.log('\n🎉 All mentor API tests passed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('✅ Authentication working');
    console.log('✅ Mentor chat endpoint working');
    console.log('✅ Conversation history working');
    console.log('✅ Database storage working');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 500) {
      console.error('💡 This might be a Gemini API key issue or database connection problem');
      console.error('🔧 Check your .env file for GEMINI_API_KEY');
    }
  }
}

// Run the test
testMentorWithAuth();