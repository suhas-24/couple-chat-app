/**
 * Models index file
 * Exports all models from a single entry point for easier imports
 */

const User = require('./User');
const Chat = require('./Chat');
const Message = require('./Message');

module.exports = {
  User,
  Chat,
  Message
};
