const mongoose = require('mongoose');

class MongoDBConnection {
  constructor() {
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) {
      return;
    }

    try {
      const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/devhub-collab';
      
      // Multiple connection strategies for reliability
      const connectionStrategies = [
        // Strategy 1: Atlas optimized connection
        { 
          name: 'Atlas Optimized', 
          uri: MONGODB_URI, 
          options: {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            retryWrites: true,
            w: 'majority'
          } 
        },
        
        // Strategy 2: Simple connection (for local MongoDB)
        { 
          name: 'Simple', 
          uri: MONGODB_URI.replace('mongodb+srv://', 'mongodb://').split('?')[0], 
          options: {
            serverSelectionTimeoutMS: 5000
          } 
        },
        
        // Strategy 3: Fallback local connection
        { 
          name: 'Local Fallback', 
          uri: 'mongodb://localhost:27017/devhub-collab', 
          options: {
            serverSelectionTimeoutMS: 3000
          } 
        }
      ];

      for (const strategy of connectionStrategies) {
        try {
          console.log(`🔄 Trying ${strategy.name} MongoDB connection...`);
          await mongoose.connect(strategy.uri, {
            ...strategy.options,
            bufferCommands: false,
          });
          
          console.log('✅ Connected to MongoDB:', mongoose.connection.host);
          this.isConnected = true;
          return;
        } catch (error) {
          console.error(`❌ ${strategy.name} connection failed:`, error.message);
        }
      }

      // Fallback to local if all strategies fail
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 All strategies failed. Trying local MongoDB...');
        try {
          await mongoose.connect('mongodb://localhost:27017/devhub-collab');
          console.log('✅ Connected to local MongoDB');
          this.isConnected = true;
        } catch (localError) {
          console.error('❌ Local MongoDB connection failed:', localError.message);
          console.log('⚠️  Running without MongoDB - collaboration features limited');
        }
      }

    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      console.log('⚠️  Running without MongoDB - collaboration features limited');
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('📴 Disconnected from MongoDB');
    }
  }

  isReady() {
    return mongoose.connection.readyState === 1;
  }
}

// Export singleton instance
module.exports = new MongoDBConnection();