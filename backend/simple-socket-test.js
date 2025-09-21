// Simple Socket.io Test - just connect and test basic functionality
const { io } = require('socket.io-client');

console.log('🚀 DevHub+ Socket.io Connection Test');

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('✅ Successfully connected to Socket.io server!');
  console.log('🔌 Socket ID:', socket.id);
  
  // Test basic event
  console.log('📡 Testing basic event emission...');
  socket.emit('ping', 'Hello from test client!');
  
  // Disconnect after 2 seconds
  setTimeout(() => {
    console.log('👋 Disconnecting...');
    socket.disconnect();
    process.exit(0);
  }, 2000);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection failed:', error.message);
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason);
});

console.log('⏳ Attempting to connect to Socket.io server...');