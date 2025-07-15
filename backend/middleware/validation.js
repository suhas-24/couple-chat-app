const Joi = require('joi');
const { validateRequest } = require('./errorHandler');

// Common validation patterns
const patterns = {
  objectId: /^[0-9a-fA-F]{24}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
};

// Custom Joi validators
const customJoi = Joi.extend({
  type: 'objectId',
  base: Joi.string(),
  messages: {
    'objectId.invalid': 'Invalid ObjectId format',
  },
  validate(value, helpers) {
    if (!patterns.objectId.test(value)) {
      return { value, errors: helpers.error('objectId.invalid') };
    }
  },
});

// Auth validation schemas
const authSchemas = {
  signup: Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 50 characters',
        'any.required': 'Name is required',
      }),
    email: Joi.string()
      .email()
      .lowercase()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
      }),
    password: Joi.string()
      .min(8)
      .pattern(patterns.password)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        'any.required': 'Password is required',
      }),
  }),

  login: Joi.object({
    email: Joi.string()
      .email()
      .lowercase()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required',
      }),
  }),

  googleAuth: Joi.object({
    credential: Joi.string()
      .required()
      .messages({
        'any.required': 'Google credential is required',
      }),
  }),

  updateProfile: Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 50 characters',
      }),
    bio: Joi.string()
      .max(500)
      .allow('')
      .messages({
        'string.max': 'Bio cannot exceed 500 characters',
      }),
    location: Joi.string()
      .max(100)
      .allow('')
      .messages({
        'string.max': 'Location cannot exceed 100 characters',
      }),
    dateOfBirth: Joi.date()
      .max('now')
      .messages({
        'date.max': 'Date of birth cannot be in the future',
      }),
  }),
};

// Chat validation schemas
const chatSchemas = {
  createChat: Joi.object({
    partnerId: customJoi.objectId()
      .messages({
        'any.required': 'Partner ID is required when partner email is not provided',
      }),
    partnerEmail: Joi.string()
      .email()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Partner email is required when partner ID is not provided',
      }),
    chatName: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .messages({
        'string.min': 'Chat name cannot be empty',
        'string.max': 'Chat name cannot exceed 100 characters',
      }),
  }).xor('partnerId', 'partnerEmail'),

  sendMessage: Joi.object({
    chatId: customJoi.objectId()
      .required()
      .messages({
        'any.required': 'Chat ID is required',
      }),
    text: Joi.string()
      .trim()
      .min(1)
      .max(5000)
      .required()
      .messages({
        'string.min': 'Message cannot be empty',
        'string.max': 'Message cannot exceed 5000 characters',
        'any.required': 'Message text is required',
      }),
    type: Joi.string()
      .valid('text', 'emoji', 'image', 'voice', 'love-note')
      .default('text')
      .messages({
        'any.only': 'Invalid message type',
      }),
  }),

  addReaction: Joi.object({
    emoji: Joi.string()
      .required()
      .messages({
        'any.required': 'Emoji is required',
      }),
  }),

  updateChatMetadata: Joi.object({
    chatName: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .messages({
        'string.min': 'Chat name cannot be empty',
        'string.max': 'Chat name cannot exceed 100 characters',
      }),
    anniversaryDate: Joi.date()
      .messages({
        'date.base': 'Invalid anniversary date',
      }),
    relationshipStartDate: Joi.date()
      .messages({
        'date.base': 'Invalid relationship start date',
      }),
    theme: Joi.string()
      .valid('classic', 'modern', 'playful', 'romantic')
      .messages({
        'any.only': 'Invalid theme. Must be one of: classic, modern, playful, romantic',
      }),
  }),
};

// Analytics validation schemas
const analyticsSchemas = {
  getChatStats: Joi.object({
    startDate: Joi.date()
      .iso()
      .messages({
        'date.format': 'Start date must be in ISO format',
      }),
    endDate: Joi.date()
      .iso()
      .min(Joi.ref('startDate'))
      .messages({
        'date.format': 'End date must be in ISO format',
        'date.min': 'End date must be after start date',
      }),
    includeWordAnalysis: Joi.string()
      .valid('true', 'false')
      .default('true'),
    includeActivityPatterns: Joi.string()
      .valid('true', 'false')
      .default('true'),
    includeMilestones: Joi.string()
      .valid('true', 'false')
      .default('true'),
  }),

  getWordCloud: Joi.object({
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(50)
      .messages({
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100',
      }),
    startDate: Joi.date()
      .iso()
      .messages({
        'date.format': 'Start date must be in ISO format',
      }),
    endDate: Joi.date()
      .iso()
      .min(Joi.ref('startDate'))
      .messages({
        'date.format': 'End date must be in ISO format',
        'date.min': 'End date must be after start date',
      }),
  }),

  getTimeline: Joi.object({
    startDate: Joi.date()
      .iso()
      .messages({
        'date.format': 'Start date must be in ISO format',
      }),
    endDate: Joi.date()
      .iso()
      .min(Joi.ref('startDate'))
      .messages({
        'date.format': 'End date must be in ISO format',
        'date.min': 'End date must be after start date',
      }),
    groupBy: Joi.string()
      .valid('hour', 'day', 'week', 'month')
      .default('day')
      .messages({
        'any.only': 'Group by must be one of: hour, day, week, month',
      }),
  }),
};

// AI validation schemas
const aiSchemas = {
  askAboutChatHistory: Joi.object({
    question: Joi.string()
      .trim()
      .min(1)
      .max(500)
      .required()
      .messages({
        'string.min': 'Question cannot be empty',
        'string.max': 'Question cannot exceed 500 characters',
        'any.required': 'Question is required',
      }),
  }),

  getWordFrequency: Joi.object({
    word: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .required()
      .messages({
        'string.min': 'Word cannot be empty',
        'string.max': 'Word cannot exceed 100 characters',
        'any.required': 'Word is required',
      }),
  }),

  getMessagesByDate: Joi.object({
    date: Joi.date()
      .iso()
      .required()
      .messages({
        'date.format': 'Date must be in ISO format (YYYY-MM-DD)',
        'any.required': 'Date is required',
      }),
  }),

  getDateIdeas: Joi.object({
    location: Joi.string()
      .trim()
      .max(100)
      .default('local')
      .messages({
        'string.max': 'Location cannot exceed 100 characters',
      }),
  }),

  getMemorySummary: Joi.object({
    timeframe: Joi.string()
      .valid('last week', 'last month', 'last year')
      .default('last month')
      .messages({
        'any.only': 'Timeframe must be one of: last week, last month, last year',
      }),
  }),
};

// File upload validation schemas
const fileSchemas = {
  csvUpload: Joi.object({
    chatId: customJoi.objectId()
      .required()
      .messages({
        'any.required': 'Chat ID is required',
      }),
  }),
};

// Parameter validation schemas
const paramSchemas = {
  chatId: Joi.object({
    chatId: customJoi.objectId()
      .required()
      .messages({
        'any.required': 'Chat ID is required',
      }),
  }),

  messageId: Joi.object({
    messageId: customJoi.objectId()
      .required()
      .messages({
        'any.required': 'Message ID is required',
      }),
  }),

  userId: Joi.object({
    userId: customJoi.objectId()
      .required()
      .messages({
        'any.required': 'User ID is required',
      }),
  }),
};

// Query validation schemas
const querySchemas = {
  pagination: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages({
        'number.min': 'Page must be at least 1',
      }),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(50)
      .messages({
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100',
      }),
  }),
};

// Validation middleware factories
const validate = {
  // Auth validations
  signup: validateRequest(authSchemas.signup),
  login: validateRequest(authSchemas.login),
  googleAuth: validateRequest(authSchemas.googleAuth),
  updateProfile: validateRequest(authSchemas.updateProfile),

  // Chat validations
  createChat: validateRequest(chatSchemas.createChat),
  sendMessage: validateRequest(chatSchemas.sendMessage),
  addReaction: validateRequest(chatSchemas.addReaction),
  updateChatMetadata: validateRequest(chatSchemas.updateChatMetadata),

  // Analytics validations
  getChatStats: validateRequest(analyticsSchemas.getChatStats, 'query'),
  getWordCloud: validateRequest(analyticsSchemas.getWordCloud, 'query'),
  getTimeline: validateRequest(analyticsSchemas.getTimeline, 'query'),

  // AI validations
  askAboutChatHistory: validateRequest(aiSchemas.askAboutChatHistory),
  getWordFrequency: validateRequest(aiSchemas.getWordFrequency, 'query'),
  getMessagesByDate: validateRequest(aiSchemas.getMessagesByDate, 'query'),
  getDateIdeas: validateRequest(aiSchemas.getDateIdeas, 'query'),
  getMemorySummary: validateRequest(aiSchemas.getMemorySummary, 'query'),

  // File upload validations
  csvUpload: validateRequest(fileSchemas.csvUpload),

  // Parameter validations
  chatId: validateRequest(paramSchemas.chatId, 'params'),
  messageId: validateRequest(paramSchemas.messageId, 'params'),
  userId: validateRequest(paramSchemas.userId, 'params'),

  // Query validations
  pagination: validateRequest(querySchemas.pagination, 'query'),
};

module.exports = {
  validate,
  patterns,
  customJoi,
};