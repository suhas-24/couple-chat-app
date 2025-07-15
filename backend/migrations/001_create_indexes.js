const mongoose = require('mongoose');

/**
 * Migration: Create initial database indexes
 * Date: 2025-01-15
 * Description: Creates performance indexes for users, chats, and messages collections
 */

async function up() {
  console.log('Creating initial database indexes...');
  
  // Users collection indexes
  await mongoose.connection.collection('users').createIndex({ email: 1 }, { unique: true });
  await mongoose.connection.collection('users').createIndex({ googleId: 1 }, { sparse: true });
  await mongoose.connection.collection('users').createIndex({ createdAt: 1 });
  await mongoose.connection.collection('users').createIndex({ isActive: 1 });
  
  // Chats collection indexes
  await mongoose.connection.collection('chats').createIndex({ participants: 1 });
  await mongoose.connection.collection('chats').createIndex({ createdAt: 1 });
  await mongoose.connection.collection('chats').createIndex({ updatedAt: 1 });
  await mongoose.connection.collection('chats').createIndex({ 'participants': 1, 'updatedAt': -1 });
  
  // Messages collection indexes
  await mongoose.connection.collection('messages').createIndex({ chatId: 1 });
  await mongoose.connection.collection('messages').createIndex({ senderId: 1 });
  await mongoose.connection.collection('messages').createIndex({ timestamp: -1 });
  await mongoose.connection.collection('messages').createIndex({ chatId: 1, timestamp: -1 });
  await mongoose.connection.collection('messages').createIndex({ isAIMessage: 1 });
  
  // Relationships collection indexes
  await mongoose.connection.collection('relationships').createIndex({ participants: 1 });
  await mongoose.connection.collection('relationships').createIndex({ createdAt: 1 });
  await mongoose.connection.collection('relationships').createIndex({ status: 1 });
  
  console.log('Initial database indexes created successfully');
}

async function down() {
  console.log('Dropping initial database indexes...');
  
  // Drop indexes (keeping only _id index)
  await mongoose.connection.collection('users').dropIndexes();
  await mongoose.connection.collection('chats').dropIndexes();
  await mongoose.connection.collection('messages').dropIndexes();
  await mongoose.connection.collection('relationships').dropIndexes();
  
  console.log('Initial database indexes dropped successfully');
}

module.exports = {
  up,
  down
};