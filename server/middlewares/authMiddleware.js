const jwt = require('jsonwebtoken');
const db = require('../config/db');
const logger = require('../utils/logger');
const { secretKey } = require('../config/auth');

const validateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      logger.warn(`Authentication failed: No token provided`, {
        requestId: req.requestId,
        path: req.path
      });
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      logger.warn(`Authentication failed: Invalid token format`, {
        requestId: req.requestId,
        path: req.path
      });
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token format.'
      });
    }

    try {
      logger.info('Verifying token:', {
        token: token.substring(0, 20) + '...',
        secretKey: secretKey ? 'present' : 'missing'
      });
      
      const decoded = jwt.verify(token, secretKey);
      logger.info('Token verified successfully:', {
        decoded: {
          user_id: decoded.user_id,
          user_email: decoded.user_email
        }
      });
      
      req.user = decoded;
      next();
    } catch (error) {
      logger.warn(`Authentication failed: Invalid token`, {
        requestId: req.requestId,
        error: error.message,
        path: req.path,
        token: token.substring(0, 20) + '...'
      });
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token.'
      });
    }
  } catch (error) {
    logger.error(`Authentication error`, {
      requestId: req.requestId,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      path: req.path
    });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.'
    });
  }
};

const validateUser = async (req, res, next) => {
  try {
    const { user_id } = req.params;
    
    if (!user_id) {
      logger.warn(`User validation failed: No user ID provided`, {
        requestId: req.requestId,
        path: req.path
      });
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    if (req.user.user_id !== parseInt(user_id)) {
      logger.warn(`User validation failed: Unauthorized access attempt`, {
        requestId: req.requestId,
        requestedUserId: user_id,
        authenticatedUserId: req.user.user_id,
        path: req.path
      });
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own data.'
      });
    }

    logger.debug(`User validation successful`, {
      requestId: req.requestId,
      userId: user_id,
      path: req.path
    });
    next();
  } catch (error) {
    logger.error(`User validation error: ${error.message}`, {
      requestId: req.requestId,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      path: req.path
    });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during user validation.'
    });
  }
};

module.exports = {
  validateToken,
  validateUser
};
