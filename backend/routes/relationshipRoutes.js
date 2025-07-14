const express = require('express');
const { body, param, query } = require('express-validator');
const relationshipController = require('../controllers/relationshipController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Validation middleware
const goalValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('category')
    .isIn(['communication', 'intimacy', 'activities', 'personal_growth', 'future_planning', 'health', 'other'])
    .withMessage('Invalid category'),
  body('targetDate')
    .isISO8601()
    .withMessage('Invalid target date'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high')
];

const moodValidation = [
  body('mood')
    .isIn(['very_happy', 'happy', 'neutral', 'sad', 'very_sad', 'excited', 'anxious', 'frustrated', 'loved', 'romantic'])
    .withMessage('Invalid mood'),
  body('intensity')
    .isInt({ min: 1, max: 5 })
    .withMessage('Intensity must be between 1 and 5'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
];

const eventValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('type')
    .isIn(['anniversary', 'date', 'milestone', 'birthday', 'holiday', 'vacation', 'achievement', 'other'])
    .withMessage('Invalid event type'),
  body('date')
    .isISO8601()
    .withMessage('Invalid date'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Location must be less than 200 characters')
];

const chatIdValidation = [
  param('chatId')
    .isMongoId()
    .withMessage('Invalid chat ID')
];

// Goals Routes
router.post('/:chatId/goals', 
  chatIdValidation,
  goalValidation,
  relationshipController.createGoal
);

router.get('/:chatId/goals', 
  chatIdValidation,
  relationshipController.getGoals
);

router.put('/goals/:goalId', 
  param('goalId').isMongoId().withMessage('Invalid goal ID'),
  relationshipController.updateGoal
);

// Mood Tracking Routes
router.post('/:chatId/mood', 
  chatIdValidation,
  moodValidation,
  relationshipController.createMoodEntry
);

router.get('/:chatId/mood', 
  chatIdValidation,
  relationshipController.getMoodEntries
);

// Events Routes
router.post('/:chatId/events', 
  chatIdValidation,
  eventValidation,
  relationshipController.createEvent
);

router.get('/:chatId/events', 
  chatIdValidation,
  relationshipController.getEvents
);

router.post('/events/:eventId/memories', 
  param('eventId').isMongoId().withMessage('Invalid event ID'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Memory content must be between 1 and 1000 characters'),
  relationshipController.addEventMemory
);

// Insights Routes
router.get('/:chatId/insights', 
  chatIdValidation,
  query('type')
    .optional()
    .isIn(['weekly_summary', 'monthly_summary', 'compatibility_analysis', 'communication_patterns', 'mood_trends', 'goal_progress'])
    .withMessage('Invalid insight type'),
  query('timeframeDays')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Timeframe must be between 1 and 365 days'),
  relationshipController.generateInsights
);

module.exports = router;