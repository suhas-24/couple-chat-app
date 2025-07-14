const Message = require('../models/Message');
const Chat = require('../models/Chat');
const mongoose = require('mongoose');

class BatchProcessor {
  constructor() {
    this.defaultBatchSize = 1000;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Process messages in batches with transaction support
   * @param {Array} messages - Array of message data
   * @param {string} chatId - Chat ID
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processBatch(messages, chatId, options = {}) {
    const {
      batchSize = this.defaultBatchSize,
      enableRollback = true,
      progressCallback = null,
      metadata = {}
    } = options;

    const session = enableRollback ? await mongoose.startSession() : null;
    const results = {
      totalMessages: messages.length,
      processedMessages: 0,
      importedMessages: 0,
      skippedMessages: 0,
      errors: [],
      batches: [],
      rollbackInfo: null
    };

    try {
      if (session && enableRollback) {
        session.startTransaction();
      }

      // Process messages in batches
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(messages.length / batchSize);

        try {
          const batchResult = await this.processSingleBatch(
            batch, 
            chatId, 
            session,
            {
              batchNumber,
              totalBatches,
              metadata
            }
          );

          results.batches.push(batchResult);
          results.processedMessages += batch.length;
          results.importedMessages += batchResult.imported;
          results.skippedMessages += batchResult.skipped;
          results.errors.push(...batchResult.errors);

          // Report progress
          if (progressCallback) {
            progressCallback({
              processed: results.processedMessages,
              imported: results.importedMessages,
              skipped: results.skippedMessages,
              errors: results.errors.length,
              total: messages.length,
              percentage: Math.round((results.processedMessages / messages.length) * 100),
              currentBatch: batchNumber,
              totalBatches,
              batchResult
            });
          }

        } catch (batchError) {
          console.error(`Batch ${batchNumber} failed:`, batchError);
          
          const errorInfo = {
            batch: batchNumber,
            error: batchError.message,
            messagesInBatch: batch.length,
            timestamp: new Date()
          };

          results.errors.push(errorInfo);
          results.skippedMessages += batch.length;

          // Decide whether to continue or rollback
          if (enableRollback && this.shouldRollback(batchError)) {
            throw new Error(`Critical error in batch ${batchNumber}: ${batchError.message}`);
          }
        }
      }

      // Commit transaction if using rollback
      if (session && enableRollback) {
        await session.commitTransaction();
      }

      // Update chat with import information
      await this.updateChatImportInfo(chatId, results, metadata, session);

      results.success = true;
      return results;

    } catch (error) {
      console.error('Batch processing failed:', error);

      // Rollback transaction if enabled
      if (session && enableRollback) {
        try {
          await session.abortTransaction();
          results.rollbackInfo = {
            performed: true,
            reason: error.message,
            timestamp: new Date()
          };
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
          results.rollbackInfo = {
            performed: false,
            error: rollbackError.message,
            timestamp: new Date()
          };
        }
      }

      results.success = false;
      results.error = error.message;
      return results;

    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  /**
   * Process a single batch of messages
   * @param {Array} batch - Batch of messages
   * @param {string} chatId - Chat ID
   * @param {Object} session - MongoDB session
   * @param {Object} batchInfo - Batch information
   * @returns {Promise<Object>} Batch result
   */
  async processSingleBatch(batch, chatId, session, batchInfo) {
    const { batchNumber, totalBatches, metadata } = batchInfo;
    const result = {
      batchNumber,
      totalBatches,
      imported: 0,
      skipped: 0,
      errors: [],
      startTime: Date.now()
    };

    try {
      // Prepare bulk operations
      const bulkOps = batch.map(messageData => ({
        insertOne: {
          document: {
            chat: chatId,
            sender: messageData.sender,
            content: {
              text: messageData.text,
              type: 'text'
            },
            metadata: {
              importedFrom: {
                source: messageData.source || 'csv',
                originalTimestamp: messageData.timestamp,
                originalText: messageData.originalText,
                wasTranslated: messageData.wasTranslated,
                batchNumber,
                importId: metadata.importId
              }
            },
            createdAt: messageData.timestamp,
            readBy: messageData.readBy || []
          }
        }
      }));

      // Execute bulk write with session if available
      const writeOptions = session ? { session } : {};
      const writeResult = await Message.bulkWrite(bulkOps, writeOptions);

      result.imported = writeResult.insertedCount || 0;
      result.skipped = batch.length - result.imported;

    } catch (error) {
      console.error(`Error in batch ${batchNumber}:`, error);
      result.errors.push({
        message: error.message,
        code: error.code,
        timestamp: new Date()
      });
      result.skipped = batch.length;
    }

    result.endTime = Date.now();
    result.processingTime = result.endTime - result.startTime;

    return result;
  }

  /**
   * Determine if an error should trigger a rollback
   * @param {Error} error - The error that occurred
   * @returns {boolean} Whether to rollback
   */
  shouldRollback(error) {
    // Rollback on critical database errors
    const criticalErrors = [
      'MongoNetworkError',
      'MongoTimeoutError',
      'MongoWriteConcernError'
    ];

    return criticalErrors.some(errorType => 
      error.name === errorType || error.message.includes(errorType)
    );
  }

  /**
   * Update chat with import information
   * @param {string} chatId - Chat ID
   * @param {Object} results - Processing results
   * @param {Object} metadata - Import metadata
   * @param {Object} session - MongoDB session
   */
  async updateChatImportInfo(chatId, results, metadata, session) {
    try {
      const importInfo = {
        importId: metadata.importId || new mongoose.Types.ObjectId(),
        fileName: metadata.fileName,
        importedAt: new Date(),
        messageCount: results.importedMessages,
        totalProcessed: results.processedMessages,
        skippedCount: results.skippedMessages,
        errorCount: results.errors.length,
        format: metadata.format,
        dateRange: metadata.dateRange,
        processingStats: {
          totalBatches: results.batches.length,
          successfulBatches: results.batches.filter(b => b.errors.length === 0).length,
          failedBatches: results.batches.filter(b => b.errors.length > 0).length,
          totalProcessingTime: results.batches.reduce((sum, b) => sum + b.processingTime, 0),
          averageBatchTime: results.batches.length > 0 
            ? results.batches.reduce((sum, b) => sum + b.processingTime, 0) / results.batches.length 
            : 0
        },
        rollbackInfo: results.rollbackInfo
      };

      const updateOptions = session ? { session } : {};
      await Chat.findByIdAndUpdate(
        chatId,
        { $push: { csvImports: importInfo } },
        updateOptions
      );

    } catch (error) {
      console.error('Failed to update chat import info:', error);
      // Don't throw here as the main import might have succeeded
    }
  }

  /**
   * Retry a failed operation with exponential backoff
   * @param {Function} operation - Operation to retry
   * @param {number} maxRetries - Maximum number of retries
   * @param {number} baseDelay - Base delay in milliseconds
   * @returns {Promise<any>} Operation result
   */
  async retryOperation(operation, maxRetries = this.maxRetries, baseDelay = this.retryDelay) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`Retry attempt ${attempt} failed, retrying in ${delay}ms...`);
      }
    }

    throw lastError;
  }

  /**
   * Rollback a specific import by import ID
   * @param {string} chatId - Chat ID
   * @param {string} importId - Import ID to rollback
   * @returns {Promise<Object>} Rollback result
   */
  async rollbackImport(chatId, importId) {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();

      // Find messages from this import
      const messagesToDelete = await Message.find({
        chat: chatId,
        'metadata.importedFrom.importId': importId
      }).session(session);

      if (messagesToDelete.length === 0) {
        throw new Error('No messages found for the specified import ID');
      }

      // Delete messages
      const deleteResult = await Message.deleteMany({
        chat: chatId,
        'metadata.importedFrom.importId': importId
      }).session(session);

      // Remove import info from chat
      await Chat.findByIdAndUpdate(
        chatId,
        { 
          $pull: { 
            csvImports: { importId: importId } 
          } 
        },
        { session }
      );

      await session.commitTransaction();

      return {
        success: true,
        deletedMessages: deleteResult.deletedCount,
        importId,
        rolledBackAt: new Date()
      };

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get import statistics for a chat
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Import statistics
   */
  async getImportStats(chatId) {
    try {
      const chat = await Chat.findById(chatId).select('csvImports');
      
      if (!chat || !chat.csvImports) {
        return {
          totalImports: 0,
          totalMessages: 0,
          imports: []
        };
      }

      const stats = {
        totalImports: chat.csvImports.length,
        totalMessages: chat.csvImports.reduce((sum, imp) => sum + imp.messageCount, 0),
        successfulImports: chat.csvImports.filter(imp => !imp.rollbackInfo?.performed).length,
        rolledBackImports: chat.csvImports.filter(imp => imp.rollbackInfo?.performed).length,
        imports: chat.csvImports.map(imp => ({
          importId: imp.importId,
          fileName: imp.fileName,
          importedAt: imp.importedAt,
          messageCount: imp.messageCount,
          format: imp.format,
          wasRolledBack: imp.rollbackInfo?.performed || false,
          processingStats: imp.processingStats
        }))
      };

      return stats;

    } catch (error) {
      console.error('Failed to get import stats:', error);
      throw error;
    }
  }
}

module.exports = new BatchProcessor();