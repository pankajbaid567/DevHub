// DevHub+ Socket.io Test Client
// Run this with: node test-socket-client.js

const { io } = require('socket.io-client');

// Connect to the server
const socket = io('http://localhost:3000', {
  forceNew: true,
  reconnection: true,
  timeout: 2000,
});

// Test user data
const testUser = {
  userId: 1,
  username: 'testuser',
  sessionId: 1
};

console.log('🚀 Starting DevHub+ Socket.io Test Client...');

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected to server with socket ID:', socket.id);
  
  // Test joining a session
  setTimeout(() => {
    console.log('\n📝 Testing: Join Session');
    socket.emit('joinSession', {
      sessionId: testUser.sessionId,
      userId: testUser.userId,
      username: testUser.username
    });
  }, 1000);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected from server:', reason);
});

// Session events
socket.on('sessionJoined', (data) => {
  console.log('✅ Session joined successfully:', data.message);
  console.log('📋 Session details:', data.session.title);
  
  // Test sending a message after joining
  setTimeout(() => {
    console.log('\n💬 Testing: Send Message');
    socket.emit('sendMessage', {
      content: 'Hello from Socket.io test client! 👋',
      sessionId: testUser.sessionId,
      userId: testUser.userId
    });
  }, 1000);
  
  // Test code update after joining
  setTimeout(() => {
    console.log('\n💻 Testing: Code Update');
    socket.emit('updateCode', {
      code: `// Test code from Socket.io client
const greeting = "Hello DevHub+!";
console.log(greeting);`,
      language: 'javascript',
      title: 'Socket.io Test Code',
      sessionId: testUser.sessionId,
      userId: testUser.userId
    });
  }, 2000);
  
  // Test typing indicator
  setTimeout(() => {
    console.log('\n⌨️  Testing: Typing Indicator');
    socket.emit('typing', {
      sessionId: testUser.sessionId,
      userId: testUser.userId,
      username: testUser.username,
      isTyping: true
    });
    
    // Stop typing after 3 seconds
    setTimeout(() => {
      socket.emit('typing', {
        sessionId: testUser.sessionId,
        userId: testUser.userId,
        username: testUser.username,
        isTyping: false
      });
    }, 3000);
  }, 3000);
});

socket.on('userJoined', (data) => {
  console.log('👋 User joined:', data.username, '|', data.message);
});

socket.on('userLeft', (data) => {
  console.log('👋 User left:', data.username, '|', data.message);
});

// Chat events
socket.on('messageReceived', (message) => {
  console.log('💬 New message received:');
  console.log('   👤 User:', message.user.username);
  console.log('   📝 Content:', message.content);
  console.log('   🕐 Time:', new Date(message.createdAt).toLocaleTimeString());
});

// Code collaboration events
socket.on('codeUpdated', (data) => {
  console.log('💻 Code updated by:', data.username);
  console.log('   📄 Title:', data.title);
  console.log('   🔤 Language:', data.language);
  console.log('   📝 Code preview:', data.code.substring(0, 50) + '...');
});

// Typing events
socket.on('userTyping', (data) => {
  if (data.isTyping) {
    console.log('⌨️  ', data.username, 'is typing...');
  } else {
    console.log('⌨️  ', data.username, 'stopped typing');
  }
});

// Error handling
socket.on('error', (error) => {
  console.error('❌ Socket error:', error.message);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🔄 Leaving session and disconnecting...');
  socket.emit('leaveSession', {
    sessionId: testUser.sessionId
  });
  
  setTimeout(() => {
    socket.disconnect();
    process.exit(0);
  }, 500);
});

console.log('💡 Press Ctrl+C to exit the test client');
console.log('⏳ Connecting to Socket.io server...\n');