const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from cookie first, then fallback to Authorization header
    let token = req.cookies['auth-token'];
    
    if (!token) {
      const authHeader = req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN',
        timestamp: new Date().toISOString()
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database and ensure account is active
    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Token is not valid - user not found or account deactivated.',
        code: 'INVALID_USER',
        timestamp: new Date().toISOString()
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        error: 'Account is temporarily locked. Please try again later.',
        code: 'ACCOUNT_LOCKED',
        timestamp: new Date().toISOString()
      });
    }

    // Clean expired refresh tokens periodically
    if (user.refreshTokens && user.refreshTokens.length > 0) {
      const now = new Date();
      const expiredTokens = user.refreshTokens.filter(rt => rt.expiresAt <= now);
      if (expiredTokens.length > 0) {
        user.cleanExpiredTokens().catch(err => 
          console.error('Error cleaning expired tokens:', err)
        );
      }
    }

    // Add user to request object
    req.user = user;
    req.userId = user._id;
    
    // Add request metadata for security logging
    req.userAgent = req.get('User-Agent') || 'Unknown';
    req.ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
    
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token is not valid.',
        code: 'INVALID_TOKEN',
        timestamp: new Date().toISOString()
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token has expired. Please log in again.',
        code: 'TOKEN_EXPIRED',
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error in authentication.',
      code: 'AUTH_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = authMiddleware;
