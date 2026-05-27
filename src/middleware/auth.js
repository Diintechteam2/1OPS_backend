const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization denied. No token provided.',
        error: 'UNAUTHORIZED',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authorization denied. Token is empty.',
        error: 'UNAUTHORIZED',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Reject tokens that belong to superadmin or platformadmin — they use separate auth middlewares
    if (decoded.type && decoded.type !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Invalid token type for this endpoint.',
        error: 'FORBIDDEN',
      });
    }

    // Support either decoded.userId or decoded.id
    const userId = decoded.userId || decoded.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists.',
        error: 'UNAUTHORIZED',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated.',
        error: 'FORBIDDEN',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Token is invalid or expired.',
      error: 'UNAUTHORIZED',
    });
  }
};

module.exports = auth;
