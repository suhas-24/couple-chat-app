const mongoose = require('mongoose');

/**
 * Migration: Add encryption fields to messages
 * Date: 2025-01-15
 * Description: Adds encryption metadata fields to existing messages
 */

async function up() {
  console.log('Adding encryption fields to messages...');
  
  // Add encryption fields to messages collection
  await mongoose.connection.collection('messages').updateMany(
    { encryptedContent: { $exists: false } },
    {
      $set: {
        isEncrypted: false,
        encryptedContent: null,
        encryptionVersion: '1.0'
      }
    }
  );
  
  console.log('Encryption fields added to messages successfully');
}

async function down() {
  console.log('Removing encryption fields from messages...');
  
  // Remove encryption fields from messages collection
  await mongoose.connection.collection('messages').updateMany(
    {},
    {
      $unset: {
        isEncrypted: '',
        encryptedContent: '',
        encryptionVersion: ''
      }
    }
  );
  
  console.log('Encryption fields removed from messages successfully');
}

module.exports = {
  up,
  down
};