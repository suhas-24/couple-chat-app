const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Validation middleware for signup
const signupValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('username')
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),
  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Location must be less than 100 characters')
];

// Validation middleware for login
const loginValidation = [
  body('identifier')
    .notEmpty()
    .withMessage('Email or username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Validation middleware for profile update
const updateProfileValidation = [
  body('profile.firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('profile.lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('profile.bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
  body('profile.location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Location must be less than 100 characters'),
  body('profile.dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),
  body('preferences.language')
    .optional()
    .isIn(['en', 'tanglish', 'ta'])
    .withMessage('Language must be one of: en, tanglish, ta'),
  body('coupleInfo.relationshipStartDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid relationship start date'),
  body('coupleInfo.anniversaryDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid anniversary date'),
  body('coupleInfo.coupleTheme')
    .optional()
    .isIn(['hearts', 'flowers', 'sunset', 'stars', 'ocean'])
    .withMessage('Couple theme must be one of: hearts, flowers, sunset, stars, ocean')
];

// Validation middleware for password change
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// Validation middleware for account deletion
const deleteAccountValidation = [
  body('password')
    .notEmpty()
    .withMessage('Password is required to delete account')
];

// Public routes (no authentication required)
// POST /api/auth/signup - Register a new user
router.post('/signup', signupValidation, authController.signup);

// POST /api/auth/login - Login user
router.post('/login', loginValidation, authController.login);

// Protected routes (authentication required)
// GET /api/auth/profile - Get current user profile
router.get('/profile', authMiddleware, authController.getProfile);

// PUT /api/auth/profile - Update user profile
router.put('/profile', authMiddleware, updateProfileValidation, authController.updateProfile);

// PUT /api/auth/change-password - Change user password
router.put('/change-password', authMiddleware, changePasswordValidation, authController.changePassword);

// POST /api/auth/logout - Logout user (optional, mainly for logging purposes)
router.post('/logout', authMiddleware, authController.logout);

// DELETE /api/auth/account - Delete user account
router.delete('/account', authMiddleware, deleteAccountValidation, authController.deleteAccount);

// Health check for auth routes
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth routes are working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

// Created with Comet Assistant
