const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const EncryptionService = require('../services/encryptionService');
const emailService = require('../services/emailService');
const dataManagementService = require('../services/dataManagementService');
const auditLogger = require('../services/auditLogger');
const { AppError, catchAsync } = require('../middleware/errorHandler');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Set secure cookie with token
const setTokenCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };

  res.cookie('auth-token', token, cookieOptions);
};

// Clear auth cookie
const clearTokenCookie = (res) => {
  res.clearCookie('auth-token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
};

// Register User
exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ 
    email: email.toLowerCase(),
    isActive: true 
  });
  
  if (existingUser) {
    return next(new AppError('User already exists with this email', 409, 'USER_EXISTS'));
  }

  // Create new user
  const newUser = new User({
    name,
    email: email.toLowerCase(),
    password,
    authProvider: 'local'
  });

  // Generate email verification token
  const verificationToken = newUser.createEmailVerificationToken();
  
  // Save user to database
  await newUser.save();

  // Send email verification (don't block registration if email fails)
  try {
    await emailService.sendEmailVerificationEmail(newUser.email, verificationToken, newUser.name);
  } catch (emailError) {
    console.error('Failed to send verification email:', emailError);
    // Continue with registration even if email fails
  }

  // Generate JWT token
  const token = generateToken(newUser._id);

  // Set secure cookie
  setTokenCookie(res, token);

  // Log successful registration
  console.log(`New user registered: ${newUser.email} at ${new Date().toISOString()}`);

  // Return user data (no token in response body)
  res.status(201).json({
    success: true,
    message: 'Registration successful. Please check your email to verify your account.',
    user: {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      isEmailVerified: newUser.isEmailVerified,
      createdAt: newUser.createdAt
    }
  });
});

// Login User
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Find user by email and ensure account is active
  const user = await User.findOne({ 
    email: email.toLowerCase(),
    isActive: true 
  });

  if (!user) {
    return next(new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS'));
  }

  // Check if account is locked
  if (user.isLocked) {
    return next(new AppError('Account temporarily locked due to too many failed login attempts. Please try again later.', 423, 'ACCOUNT_LOCKED'));
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    // Increment login attempts
    await user.incLoginAttempts();
    return next(new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS'));
  }

  // Reset login attempts on successful login
  if (user.loginAttempts > 0) {
    await user.resetLoginAttempts();
  }

  // Update last login time
  user.lastLoginAt = new Date();
  await user.save();

  // Generate JWT token
  const token = generateToken(user._id);

  // Set secure cookie
  setTokenCookie(res, token);

  // Log successful login
  console.log(`User logged in: ${user.email} at ${new Date().toISOString()}`);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt
    }
  });
});

// Get Current User Profile
exports.getProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.userId).select('-password');
  
  if (!user) {
    return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    }
  });
});

// Get User By Email
exports.getUserByEmail = catchAsync(async (req, res, next) => {
  const { email } = req.params;
  
  const user = await User.findOne({ email: email.toLowerCase() }).select('-password');
  
  if (!user) {
    return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
  }

  res.status(200).json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar
    }
  });
});

// Update User Profile
exports.updateProfile = catchAsync(async (req, res, next) => {
  const allowedUpdates = [
    'profile.firstName',
    'profile.lastName',
    'profile.bio',
    'profile.location',
    'profile.dateOfBirth',
    'preferences.language',
    'preferences.notifications',
    'preferences.privacy',
    'coupleInfo.relationshipStartDate',
    'coupleInfo.anniversaryDate',
    'coupleInfo.coupleTheme'
  ];

  const updates = {};
  
  // Extract nested updates safely
  Object.keys(req.body).forEach(key => {
    if (key.includes('.')) {
      if (allowedUpdates.includes(key)) {
        const [parent, child] = key.split('.');
        if (!updates[parent]) updates[parent] = {};
        updates[parent][child] = req.body[key];
      }
    } else if (allowedUpdates.some(field => field.startsWith(key))) {
      updates[key] = req.body[key];
    }
  });

  const user = await User.findByIdAndUpdate(
    req.userId,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
  }

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    }
  });
});

// Change Password
exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.userId);
  if (!user) {
    return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
  }

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return next(new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD'));
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully'
  });
});

// Logout (Client-side implementation recommended)
exports.logout = catchAsync(async (req, res, next) => {
  // Clear the auth cookie
  clearTokenCookie(res);
  
  console.log(`User ${req.userId} logged out at ${new Date()}`);
  
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Delete Account
exports.deleteAccount = catchAsync(async (req, res, next) => {
  const { password } = req.body;

  const user = await User.findById(req.userId);
  if (!user) {
    return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
  }

  // For Google OAuth users, skip password verification
  if (user.authProvider === 'local') {
    if (!password) {
      return next(new AppError('Password is required to delete account', 400, 'PASSWORD_REQUIRED'));
    }

    // Verify password before deletion
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return next(new AppError('Password is incorrect', 400, 'INVALID_PASSWORD'));
    }
  }

  // Store user info for email before deletion
  const userEmail = user.email;
  const userName = user.name;

  // Complete data cleanup - this would need to be expanded based on your data models
  // For now, we'll implement the user cleanup and prepare for related data cleanup
  
  // 1. Delete or anonymize user chats and messages
  // Note: This would require Chat and Message models to be implemented
  // const Chat = require('../models/Chat');
  // const Message = require('../models/Message');
  // await Chat.deleteMany({ participants: user._id });
  // await Message.deleteMany({ sender: user._id });

  // 2. Clean up any uploaded files
  // This would involve deleting files from storage service
  
  // 3. Remove user from any analytics data
  // This would clean up ChatAnalytics collections
  
  // 4. Clear any cached data
  // This would clear Redis cache if implemented

  // 5. Soft delete user account with complete anonymization
  user.isActive = false;
  user.email = `deleted_${Date.now()}_${crypto.randomBytes(8).toString('hex')}@deleted.local`;
  user.name = 'Deleted User';
  user.password = undefined;
  user.googleId = undefined;
  user.avatar = null;
  
  // Clear all personal information
  user.profile = {
    firstName: undefined,
    lastName: undefined,
    bio: undefined,
    location: undefined,
    dateOfBirth: undefined
  };
  
  // Clear preferences and couple info
  user.preferences = {
    language: 'en',
    notifications: { email: false, push: false },
    privacy: { showOnlineStatus: false, allowAnalytics: false }
  };
  
  user.coupleInfo = {
    relationshipStartDate: undefined,
    anniversaryDate: undefined,
    coupleTheme: 'classic'
  };
  
  // Clear security tokens
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  user.refreshTokens = [];
  
  await user.save({ validateBeforeSave: false });

  // Clear auth cookie
  clearTokenCookie(res);

  // Send account deletion confirmation email (don't block response if email fails)
  try {
    await emailService.sendAccountDeletionEmail(userEmail, userName);
  } catch (emailError) {
    console.error('Failed to send account deletion email:', emailError);
    // Continue with deletion even if email fails
  }

  console.log(`Account deleted for user: ${userEmail} at ${new Date().toISOString()}`);

  res.status(200).json({
    success: true,
    message: 'Account and all associated data have been permanently deleted',
    timestamp: new Date().toISOString()
  });
});

// Google OAuth Login
exports.googleLogin = async (req, res) => {
  console.log('Google login attempt received');
  try {
    const { credential } = req.body;
    console.log('Credential received:', credential ? 'Yes' : 'No');

    if (!credential) {
      return res.status(400).json({
        success: false,
        error: 'Google credential is required',
        code: 'MISSING_CREDENTIAL',
        timestamp: new Date().toISOString()
      });
    }

    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture } = payload;

    // Check if user exists
    let user = await User.findOne({ 
      $or: [
        { email: email.toLowerCase(), isActive: true },
        { googleId }
      ]
    });

    if (!user) {
      // Create new user with Google account
      user = new User({
        name,
        email: email.toLowerCase(),
        googleId,
        avatar: picture,
        authProvider: 'google',
        isEmailVerified: true, // Google accounts are pre-verified
        lastLoginAt: new Date()
      });

      await user.save();
      console.log(`New Google user registered: ${user.email} at ${new Date().toISOString()}`);
    } else {
      // Update existing user with Google info if needed
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
        user.isEmailVerified = true;
        if (!user.avatar && picture) {
          user.avatar = picture;
        }
      }
      user.lastLoginAt = new Date();
      await user.save();
      console.log(`Google user logged in: ${user.email} at ${new Date().toISOString()}`);
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Set secure cookie
    setTokenCookie(res, token);

    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to authenticate with Google',
      code: 'GOOGLE_AUTH_ERROR',
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Request Password Reset
exports.requestPasswordReset = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    const { email } = req.body;

    const user = await User.findOne({ 
      email: email.toLowerCase(),
      isActive: true 
    });

    // Always return success to prevent email enumeration
    const successResponse = {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
      timestamp: new Date().toISOString()
    };

    if (!user) {
      return res.status(200).json(successResponse);
    }

    // Don't allow password reset for Google OAuth users
    if (user.authProvider === 'google') {
      return res.status(200).json(successResponse);
    }

    // Generate password reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(user.email, resetToken, user.name);
      console.log(`Password reset requested for: ${user.email} at ${new Date().toISOString()}`);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Clear the reset token if email fails
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      
      return res.status(500).json({
        success: false,
        error: 'Failed to send password reset email. Please try again later.',
        code: 'EMAIL_SEND_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json(successResponse);

  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error processing password reset request',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    const { token, newPassword } = req.body;

    // Hash the token to compare with stored version
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
      isActive: true
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Password reset token is invalid or has expired',
        code: 'INVALID_TOKEN',
        timestamp: new Date().toISOString()
      });
    }

    // Set new password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    
    // Reset login attempts if any
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    await user.save();

    console.log(`Password reset completed for: ${user.email} at ${new Date().toISOString()}`);

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error resetting password',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Verify Email
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification token is required',
        code: 'MISSING_TOKEN',
        timestamp: new Date().toISOString()
      });
    }

    // Hash the token to compare with stored version
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid verification token
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
      isActive: true
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Email verification token is invalid or has expired',
        code: 'INVALID_TOKEN',
        timestamp: new Date().toISOString()
      });
    }

    // Verify email
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    console.log(`Email verified for: ${user.email} at ${new Date().toISOString()}`);

    res.status(200).json({
      success: true,
      message: 'Email has been verified successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error verifying email',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Resend Email Verification
exports.resendEmailVerification = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email is already verified',
        code: 'ALREADY_VERIFIED',
        timestamp: new Date().toISOString()
      });
    }

    // Generate new verification token
    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Send verification email
    try {
      await emailService.sendEmailVerificationEmail(user.email, verificationToken, user.name);
      console.log(`Email verification resent to: ${user.email} at ${new Date().toISOString()}`);
    } catch (emailError) {
      console.error('Failed to resend verification email:', emailError);
      return res.status(500).json({
        success: false,
        error: 'Failed to send verification email. Please try again later.',
        code: 'EMAIL_SEND_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification email has been sent. Please check your inbox.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Resend email verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error resending verification email',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get Privacy Settings
exports.getPrivacySettings = catchAsync(async (req, res, next) => {
  const result = await dataManagementService.getPrivacySettings(req.userId);
  
  // Log privacy settings access
  await auditLogger.logPrivacyEvent({
    userId: req.userId,
    action: 'privacy_settings_viewed',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(200).json({
    success: true,
    data: result.privacySettings
  });
});

// Update Privacy Settings
exports.updatePrivacySettings = catchAsync(async (req, res, next) => {
  const result = await dataManagementService.updatePrivacySettings(req.userId, req.body);
  
  // Log privacy settings change
  await auditLogger.logPrivacyEvent({
    userId: req.userId,
    action: 'privacy_settings_updated',
    changes: req.body,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(200).json({
    success: true,
    message: 'Privacy settings updated successfully',
    data: result.privacySettings
  });
});

// Export User Data (GDPR compliance)
exports.exportUserData = catchAsync(async (req, res, next) => {
  const { format = 'json', includeMessages = true, includeAnalytics = false } = req.query;
  
  const result = await dataManagementService.exportUserData(req.userId, {
    format,
    includeMessages: includeMessages === 'true',
    includeAnalytics: includeAnalytics === 'true',
    encryptExport: true
  });

  // Log data export
  await auditLogger.logPrivacyEvent({
    userId: req.userId,
    action: 'data_exported',
    metadata: {
      format,
      includeMessages,
      includeAnalytics,
      exportId: result.exportId
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(200).json({
    success: true,
    message: 'Data export completed successfully',
    exportId: result.exportId,
    exportedAt: result.exportedAt,
    data: result.data
  });
});

// Delete User Data (Enhanced GDPR compliance)
exports.deleteUserDataGDPR = catchAsync(async (req, res, next) => {
  const { password, keepAnonymized = false, reason = 'user_request' } = req.body;

  const user = await User.findById(req.userId);
  if (!user) {
    return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
  }

  // For local auth users, verify password
  if (user.authProvider === 'local') {
    if (!password) {
      return next(new AppError('Password is required to delete account', 400, 'PASSWORD_REQUIRED'));
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Log failed deletion attempt
      await auditLogger.logSecurityEvent({
        userId: req.userId,
        action: 'failed_account_deletion',
        severity: 'medium',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: 'Invalid password provided for account deletion'
      });
      
      return next(new AppError('Password is incorrect', 400, 'INVALID_PASSWORD'));
    }
  }

  // Perform comprehensive data deletion
  const deletionResult = await dataManagementService.deleteUserData(req.userId, {
    immediate: true,
    keepAnonymized: keepAnonymized === 'true',
    reason,
    requestedBy: req.userId
  });

  // Log successful data deletion
  await auditLogger.logPrivacyEvent({
    userId: req.userId,
    action: 'complete_data_deletion',
    metadata: {
      deletionId: deletionResult.deletionId,
      keepAnonymized,
      reason,
      summary: deletionResult.summary
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Clear auth cookie
  clearTokenCookie(res);

  res.status(200).json({
    success: true,
    message: 'All user data has been permanently deleted',
    deletionId: deletionResult.deletionId,
    deletedAt: deletionResult.deletedAt,
    summary: deletionResult.summary
  });
});

// Get Data Deletion Status
exports.getDeletionStatus = catchAsync(async (req, res, next) => {
  const { deletionId } = req.params;
  
  const status = dataManagementService.getDeletionStatus(deletionId);
  
  if (!status.found) {
    return next(new AppError('Deletion record not found', 404, 'DELETION_NOT_FOUND'));
  }

  res.status(200).json({
    success: true,
    data: status
  });
});

// Session Timeout Configuration
exports.updateSessionTimeout = catchAsync(async (req, res, next) => {
  const { timeoutMinutes } = req.body;
  
  if (!timeoutMinutes || timeoutMinutes < 5 || timeoutMinutes > 1440) {
    return next(new AppError('Timeout must be between 5 and 1440 minutes', 400, 'INVALID_TIMEOUT'));
  }

  const user = await User.findByIdAndUpdate(
    req.userId,
    { 
      $set: { 
        'preferences.security.sessionTimeoutMinutes': timeoutMinutes,
        'preferences.security.sessionTimeoutUpdatedAt': new Date()
      }
    },
    { new: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
  }

  // Log session timeout change
  await auditLogger.logSecurityEvent({
    userId: req.userId,
    action: 'session_timeout_updated',
    severity: 'low',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    details: `Session timeout changed to ${timeoutMinutes} minutes`
  });

  res.status(200).json({
    success: true,
    message: 'Session timeout updated successfully',
    sessionTimeoutMinutes: timeoutMinutes
  });
});

// Get Security Events for User
exports.getSecurityEvents = catchAsync(async (req, res, next) => {
  const { limit = 50, startDate, endDate } = req.query;
  
  const events = await auditLogger.searchLogs({
    userId: req.userId,
    type: 'security',
    startDate,
    endDate,
    limit: parseInt(limit)
  });

  res.status(200).json({
    success: true,
    data: {
      events,
      total: events.length
    }
  });
});

// Revoke All Sessions (Security feature)
exports.revokeAllSessions = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.userId);
  
  if (!user) {
    return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
  }

  // Clear all refresh tokens
  user.refreshTokens = [];
  user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all existing JWTs
  await user.save();

  // Log session revocation
  await auditLogger.logSecurityEvent({
    userId: req.userId,
    action: 'all_sessions_revoked',
    severity: 'medium',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    details: 'User revoked all active sessions'
  });

  // Clear current session cookie
  clearTokenCookie(res);

  res.status(200).json({
    success: true,
    message: 'All sessions have been revoked. Please log in again.'
  });
});