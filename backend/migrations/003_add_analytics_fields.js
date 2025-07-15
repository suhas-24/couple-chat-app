const mongoose = require('mongoose');

/**
 * Migration: Add analytics fields to users and chats
 * Date: 2025-01-15
 * Description: Adds analytics tracking fields for relationship insights
 */

async function up() {
  console.log('Adding analytics fields to users and chats...');
  
  // Add analytics fields to users collection
  await mongoose.connection.collection('users').updateMany(
    { analytics: { $exists: false } },
    {
      $set: {
        analytics: {
          totalMessages: 0,
          totalChats: 0,
          averageResponseTime: 0,
          mostActiveHours: [],
          lastActivityAt: new Date()
        }
      }
    }
  );
  
  // Add analytics fields to chats collection
  await mongoose.connection.collection('chats').updateMany(
    { analytics: { $exists: false } },
    {
      $set: {
        analytics: {
          totalMessages: 0,
          averageMessageLength: 0,
          responseTimeAnalysis: {},
          sentimentAnalysis: {},
          topicsDiscussed: [],
          milestones: []
        }
      }
    }
  );
  
  console.log('Analytics fields added successfully');
}

async function down() {
  console.log('Removing analytics fields from users and chats...');
  
  // Remove analytics fields from users collection
  await mongoose.connection.collection('users').updateMany(
    {},
    {
      $unset: {
        analytics: ''
      }
    }
  );
  
  // Remove analytics fields from chats collection
  await mongoose.connection.collection('chats').updateMany(
    {},
    {
      $unset: {
        analytics: ''
      }
    }
  );
  
  console.log('Analytics fields removed successfully');
}

module.exports = {
  up,
  down
};