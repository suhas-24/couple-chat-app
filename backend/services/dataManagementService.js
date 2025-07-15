const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const fs = require('fs').promises;
const path = require('path');
const encryptionService = require('./encryptionService');

/**
 * Data Management Service
 * Handles user data deletion, export, and privacy controls
 */
class DataManagementService {
  constructor() {
    this.deletionQueue = new Map();
    this.exportQueue = new Map();
  }

  /**
   * Complete user data deletion (GDPR compliance)
   * @param {string} userId - User ID to delete data for
   * @param {Object} options - Deletion options
   * @returns {Promise<Object>} Deletion result
   */
  async deleteUserData(userId, options = {}) {
    const {
      immediate = false,
      keepAnonymized = false,
      reason = 'user_request',
      requestedBy = userId
    } = options;

    try {
      // Start deletion process
      const deletionId = encryptionService.generateSecureToken(16);
      const deletionRecord = {
        deletionId,
        userId,
        requestedBy,
        reason,
        startedAt: new Date(),
        status: 'in_progress',
        immediate,
        keepAnonymized,
        steps: [],
        errors: []
      };

      this.deletionQueue.set(deletionId, deletionRecord);

      // Get user data before deletion
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Step 1: Delete or anonymize messages
      await this.handleUserMessages(userId, keepAnonymized, deletionRecord);

      // Step 2: Handle chats
      await this.handleUserChats(userId, keepAnonymized, deletionRecord);

      // Step 3: Delete uploaded files
      await this.deleteUserFiles(userId, deletionRecord);

      // Step 4: Delete user account
      await this.deleteUserAccount(userId, deletionRecord);

      // Step 5: Clean up any remaining references
      await this.cleanupUserReferences(userId, deletionRecord);

      // Mark deletion as complete
      deletionRecord.status = 'completed';
      deletionRecord.completedAt = new Date();

      // Log the deletion for audit purposes
      await this.logDataDeletion(deletionRecord);

      return {
        success: true,
        deletionId,
        deletedAt: deletionRecord.completedAt,
        steps: deletionRecord.steps,
        summary: this.generateDeletionSummary(deletionRecord)
      };

    } catch (error) {
      console.error('Data deletion error:', error);
      
      // Update deletion record with error
      if (this.deletionQueue.has(deletionId)) {
        const record = this.deletionQueue.get(deletionId);
        record.status = 'failed';
        record.error = error.message;
        record.failedAt = new Date();
      }

      throw new Error(`Data deletion failed: ${error.message}`);
    }
  }

  /**
   * Handle user messages during deletion
   * @param {string} userId - User ID
   * @param {boolean} keepAnonymized - Whether to keep anonymized data
   * @param {Object} deletionRecord - Deletion record
   */
  async handleUserMessages(userId, keepAnonymized, deletionRecord) {
    try {
      const messages = await Message.find({ sender: userId });
      
      if (keepAnonymized) {
        // Anonymize messages instead of deleting
        const anonymizedCount = await Message.updateMany(
          { sender: userId },
          {
            $set: {
              'content.text': '[Message from deleted user]',
              'content.encryptedText': null,
              'metadata.isAnonymized': true,
              'metadata.anonymizedAt': new Date()
            }
          }
        );

        deletionRecord.steps.push({
          step: 'anonymize_messages',
          count: anonymizedCount.modifiedCount,
          completedAt: new Date()
        });
      } else {
        // Completely delete messages
        const deleteResult = await Message.deleteMany({ sender: userId });
        
        deletionRecord.steps.push({
          step: 'delete_messages',
          count: deleteResult.deletedCount,
          completedAt: new Date()
        });
      }

      // Remove user from message reactions and read receipts
      await Message.updateMany(
        { 'metadata.reactions.user': userId },
        { $pull: { 'metadata.reactions': { user: userId } } }
      );

      await Message.updateMany(
        { 'readBy.user': userId },
        { $pull: { readBy: { user: userId } } }
      );

      deletionRecord.steps.push({
        step: 'cleanup_message_references',
        completedAt: new Date()
      });

    } catch (error) {
      deletionRecord.errors.push({
        step: 'handle_messages',
        error: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Handle user chats during deletion
   * @param {string} userId - User ID
   * @param {boolean} keepAnonymized - Whether to keep anonymized data
   * @param {Object} deletionRecord - Deletion record
   */
  async handleUserChats(userId, keepAnonymized, deletionRecord) {
    try {
      const chats = await Chat.find({ participants: userId });
      
      for (const chat of chats) {
        if (chat.participants.length === 1) {
          // Single-user chat, delete entirely
          await Chat.findByIdAndDelete(chat._id);
        } else {
          // Multi-user chat, remove user from participants
          await Chat.findByIdAndUpdate(chat._id, {
            $pull: { participants: userId },
            $push: {
              'metadata.removedParticipants': {
                userId: userId,
                removedAt: new Date(),
                reason: 'account_deletion'
              }
            }
          });
        }
      }

      deletionRecord.steps.push({
        step: 'handle_chats',
        count: chats.length,
        completedAt: new Date()
      });

    } catch (error) {
      deletionRecord.errors.push({
        step: 'handle_chats',
        error: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Delete user uploaded files
   * @param {string} userId - User ID
   * @param {Object} deletionRecord - Deletion record
   */
  async deleteUserFiles(userId, deletionRecord) {
    try {
      const uploadsDir = path.join(__dirname, '../uploads');
      let deletedFiles = 0;

      try {
        const files = await fs.readdir(uploadsDir);
        
        // Find files that belong to this user (based on naming convention or metadata)
        for (const file of files) {
          if (file.includes(userId)) {
            const filePath = path.join(uploadsDir, file);
            try {
              await fs.unlink(filePath);
              deletedFiles++;
            } catch (fileError) {
              console.warn(`Failed to delete file ${file}:`, fileError.message);
            }
          }
        }
      } catch (dirError) {
        // Uploads directory might not exist, which is fine
        console.warn('Uploads directory not accessible:', dirError.message);
      }

      deletionRecord.steps.push({
        step: 'delete_files',
        count: deletedFiles,
        completedAt: new Date()
      });

    } catch (error) {
      deletionRecord.errors.push({
        step: 'delete_files',
        error: error.message,
        timestamp: new Date()
      });
      // Don't throw error for file deletion failures
    }
  }

  /**
   * Delete user account
   * @param {string} userId - User ID
   * @param {Object} deletionRecord - Deletion record
   */
  async deleteUserAccount(userId, deletionRecord) {
    try {
      const deleteResult = await User.findByIdAndDelete(userId);
      
      if (!deleteResult) {
        throw new Error('User account not found for deletion');
      }

      deletionRecord.steps.push({
        step: 'delete_user_account',
        completedAt: new Date()
      });

    } catch (error) {
      deletionRecord.errors.push({
        step: 'delete_user_account',
        error: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Clean up any remaining user references
   * @param {string} userId - User ID
   * @param {Object} deletionRecord - Deletion record
   */
  async cleanupUserReferences(userId, deletionRecord) {
    try {
      // This would include cleaning up any other collections that might reference the user
      // For example: analytics data, logs, etc.
      
      // Placeholder for additional cleanup operations
      deletionRecord.steps.push({
        step: 'cleanup_references',
        completedAt: new Date()
      });

    } catch (error) {
      deletionRecord.errors.push({
        step: 'cleanup_references',
        error: error.message,
        timestamp: new Date()
      });
      // Don't throw error for reference cleanup failures
    }
  }

  /**
   * Export user data (GDPR compliance)
   * @param {string} userId - User ID
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export result
   */
  async exportUserData(userId, options = {}) {
    const {
      format = 'json',
      includeMessages = true,
      includeAnalytics = false,
      encryptExport = true
    } = options;

    try {
      const exportId = encryptionService.generateSecureToken(16);
      const exportRecord = {
        exportId,
        userId,
        format,
        startedAt: new Date(),
        status: 'in_progress'
      };

      this.exportQueue.set(exportId, exportRecord);

      // Get user data
      const user = await User.findById(userId).select('-password');
      if (!user) {
        throw new Error('User not found');
      }

      const exportData = {
        user: user.toObject(),
        exportInfo: {
          exportId,
          exportedAt: new Date(),
          format,
          version: '1.0'
        }
      };

      // Include messages if requested
      if (includeMessages) {
        const messages = await Message.find({ sender: userId })
          .populate('chat', 'chatName participants')
          .select('-content.encryptedText'); // Don't export encrypted versions

        // Decrypt messages for export
        const decryptedMessages = messages.map(msg => {
          const messageObj = msg.toObject();
          messageObj.content.text = msg.getDecryptedText();
          return messageObj;
        });

        exportData.messages = decryptedMessages;
      }

      // Include chats
      const chats = await Chat.find({ participants: userId })
        .populate('participants', 'name email');
      exportData.chats = chats;

      // Include analytics if requested
      if (includeAnalytics) {
        // This would include analytics data
        exportData.analytics = {
          note: 'Analytics data would be included here'
        };
      }

      // Encrypt export if requested
      let finalExportData;
      if (encryptExport) {
        const exportJson = JSON.stringify(exportData, null, 2);
        const encrypted = encryptionService.encrypt(exportJson);
        finalExportData = {
          encrypted: true,
          data: encrypted,
          decryptionNote: 'This data is encrypted. Use the provided decryption key to access your data.'
        };
      } else {
        finalExportData = exportData;
      }

      exportRecord.status = 'completed';
      exportRecord.completedAt = new Date();

      return {
        success: true,
        exportId,
        data: finalExportData,
        exportedAt: exportRecord.completedAt
      };

    } catch (error) {
      console.error('Data export error:', error);
      throw new Error(`Data export failed: ${error.message}`);
    }
  }

  /**
   * Update user privacy settings
   * @param {string} userId - User ID
   * @param {Object} privacySettings - Privacy settings
   * @returns {Promise<Object>} Updated settings
   */
  async updatePrivacySettings(userId, privacySettings) {
    try {
      const allowedSettings = [
        'allowAnalytics',
        'allowAIFeatures',
        'showOnlineStatus',
        'allowDataCollection',
        'allowPersonalization',
        'shareUsageData'
      ];

      // Filter only allowed settings
      const filteredSettings = {};
      Object.keys(privacySettings).forEach(key => {
        if (allowedSettings.includes(key)) {
          filteredSettings[`preferences.privacy.${key}`] = privacySettings[key];
        }
      });

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: filteredSettings },
        { new: true, select: 'preferences.privacy' }
      );

      if (!updatedUser) {
        throw new Error('User not found');
      }

      // Log privacy settings change
      await this.logPrivacyChange(userId, privacySettings);

      return {
        success: true,
        privacySettings: updatedUser.preferences.privacy
      };

    } catch (error) {
      console.error('Privacy settings update error:', error);
      throw new Error(`Failed to update privacy settings: ${error.message}`);
    }
  }

  /**
   * Get user's current privacy settings
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Privacy settings
   */
  async getPrivacySettings(userId) {
    try {
      const user = await User.findById(userId).select('preferences.privacy');
      
      if (!user) {
        throw new Error('User not found');
      }

      return {
        success: true,
        privacySettings: user.preferences.privacy || {}
      };

    } catch (error) {
      console.error('Get privacy settings error:', error);
      throw new Error(`Failed to get privacy settings: ${error.message}`);
    }
  }

  /**
   * Log data deletion for audit purposes
   * @param {Object} deletionRecord - Deletion record
   */
  async logDataDeletion(deletionRecord) {
    try {
      // In a production environment, this would log to a secure audit system
      console.log('Data deletion completed:', {
        deletionId: deletionRecord.deletionId,
        userId: deletionRecord.userId,
        completedAt: deletionRecord.completedAt,
        steps: deletionRecord.steps.length,
        errors: deletionRecord.errors.length
      });

      // Could also write to a secure log file or external audit system
    } catch (error) {
      console.error('Failed to log data deletion:', error);
    }
  }

  /**
   * Log privacy settings changes
   * @param {string} userId - User ID
   * @param {Object} changes - Privacy changes
   */
  async logPrivacyChange(userId, changes) {
    try {
      // In a production environment, this would log to a secure audit system
      console.log('Privacy settings changed:', {
        userId,
        changes,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to log privacy change:', error);
    }
  }

  /**
   * Generate deletion summary
   * @param {Object} deletionRecord - Deletion record
   * @returns {Object} Summary
   */
  generateDeletionSummary(deletionRecord) {
    const summary = {
      totalSteps: deletionRecord.steps.length,
      errors: deletionRecord.errors.length,
      duration: deletionRecord.completedAt - deletionRecord.startedAt
    };

    deletionRecord.steps.forEach(step => {
      if (step.count !== undefined) {
        summary[step.step] = step.count;
      }
    });

    return summary;
  }

  /**
   * Get deletion status
   * @param {string} deletionId - Deletion ID
   * @returns {Object} Deletion status
   */
  getDeletionStatus(deletionId) {
    const record = this.deletionQueue.get(deletionId);
    
    if (!record) {
      return { found: false };
    }

    return {
      found: true,
      status: record.status,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      steps: record.steps.length,
      errors: record.errors.length
    };
  }

  /**
   * Clean up old deletion records
   */
  cleanupOldRecords() {
    const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    for (const [deletionId, record] of this.deletionQueue.entries()) {
      if (record.completedAt && record.completedAt < cutoffTime) {
        this.deletionQueue.delete(deletionId);
      }
    }

    for (const [exportId, record] of this.exportQueue.entries()) {
      if (record.completedAt && record.completedAt < cutoffTime) {
        this.exportQueue.delete(exportId);
      }
    }
  }
}

// Export singleton instance
module.exports = new DataManagementService();