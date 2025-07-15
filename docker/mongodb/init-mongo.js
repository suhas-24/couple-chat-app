// MongoDB initialization script for Couple Chat App
// This script creates the application database and initial collections

db = db.getSiblingDB('couple-chat');

// Create collections with indexes
db.createCollection('users');
db.createCollection('chats');
db.createCollection('messages');
db.createCollection('relationships');

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ googleId: 1 }, { sparse: true });
db.users.createIndex({ createdAt: 1 });

db.chats.createIndex({ participants: 1 });
db.chats.createIndex({ createdAt: 1 });
db.chats.createIndex({ updatedAt: 1 });

db.messages.createIndex({ chatId: 1 });
db.messages.createIndex({ senderId: 1 });
db.messages.createIndex({ timestamp: -1 });
db.messages.createIndex({ chatId: 1, timestamp: -1 });

db.relationships.createIndex({ participants: 1 });
db.relationships.createIndex({ createdAt: 1 });

// Create application user (if using authentication)
if (typeof process.env.MONGO_APP_USERNAME !== 'undefined') {
    db.createUser({
        user: process.env.MONGO_APP_USERNAME,
        pwd: process.env.MONGO_APP_PASSWORD,
        roles: [
            {
                role: 'readWrite',
                db: 'couple-chat'
            }
        ]
    });
}

print('Couple Chat App database initialized successfully!');