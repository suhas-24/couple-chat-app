const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Database Seeder for Couple Chat App
 * Creates sample data for development and testing
 */

class DatabaseSeeder {
  constructor() {
    this.users = [];
    this.chats = [];
    this.messages = [];
    this.relationships = [];
  }

  async connect() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    await mongoose.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }

  async clearDatabase() {
    console.log('Clearing existing data...');
    
    await mongoose.connection.collection('users').deleteMany({});
    await mongoose.connection.collection('chats').deleteMany({});
    await mongoose.connection.collection('messages').deleteMany({});
    await mongoose.connection.collection('relationships').deleteMany({});
    
    console.log('Database cleared successfully');
  }

  async seedUsers() {
    console.log('Seeding users...');
    
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const users = [
      {
        _id: new mongoose.Types.ObjectId(),
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: hashedPassword,
        profilePicture: null,
        isActive: true,
        isEmailVerified: true,
        preferences: {
          theme: 'romantic',
          notifications: true,
          language: 'en'
        },
        analytics: {
          totalMessages: 0,
          totalChats: 0,
          averageResponseTime: 0,
          mostActiveHours: [],
          lastActivityAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new mongoose.Types.ObjectId(),
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        password: hashedPassword,
        profilePicture: null,
        isActive: true,
        isEmailVerified: true,
        preferences: {
          theme: 'romantic',
          notifications: true,
          language: 'en'
        },
        analytics: {
          totalMessages: 0,
          totalChats: 0,
          averageResponseTime: 0,
          mostActiveHours: [],
          lastActivityAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new mongoose.Types.ObjectId(),
        firstName: 'Alex',
        lastName: 'Johnson',
        email: 'alex@example.com',
        password: hashedPassword,
        profilePicture: null,
        isActive: true,
        isEmailVerified: true,
        preferences: {
          theme: 'romantic',
          notifications: true,
          language: 'en'
        },
        analytics: {
          totalMessages: 0,
          totalChats: 0,
          averageResponseTime: 0,
          mostActiveHours: [],
          lastActivityAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    await mongoose.connection.collection('users').insertMany(users);
    this.users = users;
    
    console.log(`${users.length} users seeded successfully`);
  }

  async seedChats() {
    console.log('Seeding chats...');
    
    const chats = [
      {
        _id: new mongoose.Types.ObjectId(),
        participants: [this.users[0]._id, this.users[1]._id],
        type: 'couple',
        title: 'John & Jane',
        isActive: true,
        analytics: {
          totalMessages: 0,
          averageMessageLength: 0,
          responseTimeAnalysis: {},
          sentimentAnalysis: {},
          topicsDiscussed: [],
          milestones: []
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new mongoose.Types.ObjectId(),
        participants: [this.users[0]._id, this.users[2]._id],
        type: 'couple',
        title: 'John & Alex',
        isActive: true,
        analytics: {
          totalMessages: 0,
          averageMessageLength: 0,
          responseTimeAnalysis: {},
          sentimentAnalysis: {},
          topicsDiscussed: [],
          milestones: []
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    await mongoose.connection.collection('chats').insertMany(chats);
    this.chats = chats;
    
    console.log(`${chats.length} chats seeded successfully`);
  }

  async seedMessages() {
    console.log('Seeding messages...');
    
    const messages = [
      {
        _id: new mongoose.Types.ObjectId(),
        chatId: this.chats[0]._id,
        senderId: this.users[0]._id,
        content: 'Hey beautiful! How was your day?',
        messageType: 'text',
        isAIMessage: false,
        isEncrypted: false,
        encryptionVersion: '1.0',
        timestamp: new Date(Date.now() - 3600000),
        readBy: [this.users[0]._id],
        reactions: [],
        metadata: {
          sentiment: 'positive',
          topics: ['greeting', 'care']
        }
      },
      {
        _id: new mongoose.Types.ObjectId(),
        chatId: this.chats[0]._id,
        senderId: this.users[1]._id,
        content: 'It was great! Just finished work and thinking about you ❤️',
        messageType: 'text',
        isAIMessage: false,
        isEncrypted: false,
        encryptionVersion: '1.0',
        timestamp: new Date(Date.now() - 3300000),
        readBy: [this.users[1]._id],
        reactions: [
          {
            userId: this.users[0]._id,
            type: 'heart',
            timestamp: new Date(Date.now() - 3200000)
          }
        ],
        metadata: {
          sentiment: 'love',
          topics: ['work', 'love']
        }
      },
      {
        _id: new mongoose.Types.ObjectId(),
        chatId: this.chats[0]._id,
        senderId: this.users[0]._id,
        content: 'I love you too! Want to grab dinner tonight?',
        messageType: 'text',
        isAIMessage: false,
        isEncrypted: false,
        encryptionVersion: '1.0',
        timestamp: new Date(Date.now() - 3000000),
        readBy: [this.users[0]._id, this.users[1]._id],
        reactions: [],
        metadata: {
          sentiment: 'love',
          topics: ['love', 'plans']
        }
      },
      {
        _id: new mongoose.Types.ObjectId(),
        chatId: this.chats[0]._id,
        senderId: this.users[1]._id,
        content: 'Absolutely! That new Italian place?',
        messageType: 'text',
        isAIMessage: false,
        isEncrypted: false,
        encryptionVersion: '1.0',
        timestamp: new Date(Date.now() - 2700000),
        readBy: [this.users[1]._id],
        reactions: [],
        metadata: {
          sentiment: 'excitement',
          topics: ['plans', 'food']
        }
      },
      {
        _id: new mongoose.Types.ObjectId(),
        chatId: this.chats[0]._id,
        senderId: 'ai',
        content: 'It sounds like you two are planning a lovely evening! Italian cuisine is perfect for romantic dinners. Consider sharing a dessert to make it extra special! 🍰',
        messageType: 'text',
        isAIMessage: true,
        isEncrypted: false,
        encryptionVersion: '1.0',
        timestamp: new Date(Date.now() - 2400000),
        readBy: [],
        reactions: [],
        metadata: {
          sentiment: 'helpful',
          topics: ['relationship_advice', 'food']
        }
      }
    ];
    
    await mongoose.connection.collection('messages').insertMany(messages);
    this.messages = messages;
    
    console.log(`${messages.length} messages seeded successfully`);
  }

  async seedRelationships() {
    console.log('Seeding relationships...');
    
    const relationships = [
      {
        _id: new mongoose.Types.ObjectId(),
        participants: [this.users[0]._id, this.users[1]._id],
        relationshipType: 'couple',
        status: 'active',
        startDate: new Date(Date.now() - 86400000 * 365), // 1 year ago
        milestones: [
          {
            type: 'anniversary',
            date: new Date(Date.now() - 86400000 * 365),
            description: 'Started dating',
            isCompleted: true
          },
          {
            type: 'first_message',
            date: new Date(Date.now() - 86400000 * 30),
            description: 'First message on Couple Chat',
            isCompleted: true
          }
        ],
        preferences: {
          anniversaryReminders: true,
          milestoneTracking: true,
          aiSuggestions: true
        },
        analytics: {
          totalMessages: 0,
          averageResponseTime: 0,
          relationshipScore: 85,
          communicationPatterns: {},
          sentimentTrends: {}
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    await mongoose.connection.collection('relationships').insertMany(relationships);
    this.relationships = relationships;
    
    console.log(`${relationships.length} relationships seeded successfully`);
  }

  async updateAnalytics() {
    console.log('Updating analytics...');
    
    // Update user analytics
    await mongoose.connection.collection('users').updateOne(
      { _id: this.users[0]._id },
      {
        $set: {
          'analytics.totalMessages': 3,
          'analytics.totalChats': 2,
          'analytics.averageResponseTime': 300,
          'analytics.mostActiveHours': [19, 20, 21],
          'analytics.lastActivityAt': new Date()
        }
      }
    );
    
    await mongoose.connection.collection('users').updateOne(
      { _id: this.users[1]._id },
      {
        $set: {
          'analytics.totalMessages': 2,
          'analytics.totalChats': 1,
          'analytics.averageResponseTime': 180,
          'analytics.mostActiveHours': [18, 19, 20],
          'analytics.lastActivityAt': new Date()
        }
      }
    );
    
    // Update chat analytics
    await mongoose.connection.collection('chats').updateOne(
      { _id: this.chats[0]._id },
      {
        $set: {
          'analytics.totalMessages': 5,
          'analytics.averageMessageLength': 45,
          'analytics.responseTimeAnalysis': {
            average: 240,
            median: 180,
            fastest: 60,
            slowest: 600
          },
          'analytics.sentimentAnalysis': {
            positive: 0.8,
            negative: 0.1,
            neutral: 0.1
          },
          'analytics.topicsDiscussed': ['love', 'plans', 'work', 'food'],
          'analytics.milestones': [
            {
              type: 'first_message',
              date: new Date(Date.now() - 86400000 * 30),
              achieved: true
            }
          ]
        }
      }
    );
    
    console.log('Analytics updated successfully');
  }

  async seed() {
    try {
      await this.connect();
      await this.clearDatabase();
      await this.seedUsers();
      await this.seedChats();
      await this.seedMessages();
      await this.seedRelationships();
      await this.updateAnalytics();
      
      console.log('Database seeding completed successfully!');
      console.log(`
Summary:
- ${this.users.length} users created
- ${this.chats.length} chats created
- ${this.messages.length} messages created
- ${this.relationships.length} relationships created

Test accounts:
- john@example.com / password123
- jane@example.com / password123
- alex@example.com / password123
      `);
      
    } catch (error) {
      console.error('Seeding failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

module.exports = DatabaseSeeder;