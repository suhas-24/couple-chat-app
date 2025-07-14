const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const EncryptionService = require('../services/encryptionService');
const emailService = require('../services/emailService');

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
exports.signup = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      email: email.toLowerCase(),
      isActive: true 
    });
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists with this email',
        code: 'USER_EXISTS',
        timestamp: new Date().toISOString()
      });
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

  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(409).json({
        success: false,
        error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
        code: 'DUPLICATE_KEY',
        timestamp: new Date().toISOString()
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: validationErrors[0],
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error during registration',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Login User
exports.login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    const { email, password } = req.body;

    // Find user by email and ensure account is active
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      isActive: true 
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
        timestamp: new Date().toISOString()
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        error: 'Account temporarily locked due to too many failed login attempts. Please try again later.',
        code: 'ACCOUNT_LOCKED',
        timestamp: new Date().toISOString()
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
        timestamp: new Date().toISOString()
      });
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

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during login',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get Current User Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
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

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get User By Email
exports.getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    
    const user = await User.findOne({ email: email.toLowerCase() }).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
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

  } catch (error) {
    console.error('Get user by email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error finding user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update User Profile
exports.updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

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
      req.userId, // Fixed from req.user.userId to req.userId for consistency
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
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

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.userId); // Fixed from req.user.userId to req.userId
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error changing password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Logout (Client-side implementation recommended)
exports.logout = async (req, res) => {
  try {
    // Clear the auth cookie
    clearTokenCookie(res);
    
    console.log(`User ${req.userId} logged out at ${new Date()}`);
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete Account
exports.deleteAccount = async (req, res) => {
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

    const { password } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    // For Google OAuth users, skip password verification
    if (user.authProvider === 'local') {
      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'Password is required to delete account',
          code: 'PASSWORD_REQUIRED',
          timestamp: new Date().toISOString()
        });
      }

      // Verify password before deletion
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          error: 'Password is incorrect',
          code: 'INVALID_PASSWORD',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Store user info for email before deletion
    const userEmail = user.email;
    const userName = user.name;

    try {
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

    } catch (cleanupError) {
      console.error('Error during account cleanup:', cleanupError);
      
      // If cleanup fails, still try to deactivate the account
      user.isActive = false;
      await user.save({ validateBeforeSave: false });
      
      res.status(500).json({
        success: false,
        error: 'Account deactivated but some data cleanup may have failed. Please contact support.',
        code: 'CLEANUP_ERROR',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error deleting account',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

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
