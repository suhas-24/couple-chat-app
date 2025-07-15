const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { authLimiter, passwordResetLimiter, emailVerificationLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validation');

const router = express.Router();

// Apply auth rate limiter to all auth routes
router.use(authLimiter);

// Validation middleware for signup
const signupValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

// Validation middleware for login
const loginValidation = [
  body('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Please provide a valid email address'),
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
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

// Validation middleware for password reset request
const requestPasswordResetValidation = [
  body('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Please provide a valid email address')
];

// Validation middleware for password reset
const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// Validation middleware for email verification
const verifyEmailValidation = [
  body('token')
    .notEmpty()
    .withMessage('Verification token is required')
];

// Public routes (no authentication required)
// POST /api/auth/signup - Register a new user
router.post('/signup', validate.signup, authController.signup);

// POST /api/auth/login - Login user
router.post('/login', validate.login, authController.login);

// POST /api/auth/google - Google OAuth login
router.post('/google', validate.googleAuth, authController.googleLogin);

// POST /api/auth/request-password-reset - Request password reset
router.post('/request-password-reset', passwordResetLimiter, requestPasswordResetValidation, authController.requestPasswordReset);

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', passwordResetLimiter, resetPasswordValidation, authController.resetPassword);

// POST /api/auth/verify-email - Verify email with token
router.post('/verify-email', emailVerificationLimiter, verifyEmailValidation, authController.verifyEmail);

// Protected routes (authentication required)
// GET /api/auth/me - Get current user profile (changed from /profile to /me)
router.get('/me', authMiddleware, authController.getProfile);

// GET /api/auth/user-by-email/:email - Find user by email (protected)
router.get('/user-by-email/:email', authMiddleware, authController.getUserByEmail);

// PUT /api/auth/profile - Update user profile
router.put('/profile', authMiddleware, validate.updateProfile, authController.updateProfile);

// PUT /api/auth/change-password - Change user password
router.put('/change-password', authMiddleware, changePasswordValidation, authController.changePassword);

// POST /api/auth/logout - Logout user (optional, mainly for logging purposes)
router.post('/logout', authMiddleware, authController.logout);

// POST /api/auth/resend-verification - Resend email verification
router.post('/resend-verification', authMiddleware, emailVerificationLimiter, authController.resendEmailVerification);

// DELETE /api/auth/account - Delete user account
router.delete('/account', authMiddleware, deleteAccountValidation, authController.deleteAccount);

// Privacy and Data Management Routes

// GET /api/auth/privacy-settings - Get user privacy settings
router.get('/privacy-settings', authMiddleware, authController.getPrivacySettings);

// PUT /api/auth/privacy-settings - Update user privacy settings
router.put('/privacy-settings', authMiddleware, [
  body('allowAnalytics').optional().isBoolean().withMessage('allowAnalytics must be a boolean'),
  body('allowAIFeatures').optional().isBoolean().withMessage('allowAIFeatures must be a boolean'),
  body('showOnlineStatus').optional().isBoolean().withMessage('showOnlineStatus must be a boolean'),
  body('allowDataCollection').optional().isBoolean().withMessage('allowDataCollection must be a boolean'),
  body('allowPersonalization').optional().isBoolean().withMessage('allowPersonalization must be a boolean'),
  body('shareUsageData').optional().isBoolean().withMessage('shareUsageData must be a boolean')
], authController.updatePrivacySettings);

// GET /api/auth/export-data - Export user data (GDPR compliance)
router.get('/export-data', authMiddleware, authController.exportUserData);

// POST /api/auth/delete-data-gdpr - Complete data deletion (GDPR compliance)
router.post('/delete-data-gdpr', authMiddleware, [
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('keepAnonymized').optional().isBoolean().withMessage('keepAnonymized must be a boolean'),
  body('reason').optional().isString().withMessage('reason must be a string')
], authController.deleteUserDataGDPR);

// GET /api/auth/deletion-status/:deletionId - Get data deletion status
router.get('/deletion-status/:deletionId', authMiddleware, authController.getDeletionStatus);

// PUT /api/auth/session-timeout - Update session timeout settings
router.put('/session-timeout', authMiddleware, [
  body('timeoutMinutes').isInt({ min: 5, max: 1440 }).withMessage('Timeout must be between 5 and 1440 minutes')
], authController.updateSessionTimeout);

// GET /api/auth/security-events - Get user security events
router.get('/security-events', authMiddleware, authController.getSecurityEvents);

// POST /api/auth/revoke-all-sessions - Revoke all user sessions
router.post('/revoke-all-sessions', authMiddleware, authController.revokeAllSessions);

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
