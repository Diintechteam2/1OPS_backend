const jwt = require('jsonwebtoken');
const PlatformAdmin = require('../models/PlatformAdmin');

/**
 * platformAdminAuth middleware
 * Verifies that the request comes from a valid, active PlatformAdmin
 * using a dedicated JWT token with type: 'platformadmin'
 */
const platformAdminAuth = async (req, res, next) => {
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'platformadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Platform Admin privileges required.',
        error: 'FORBIDDEN',
      });
    }

    const platformAdmin = await PlatformAdmin.findById(decoded.id);
    if (!platformAdmin || !platformAdmin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Platform Admin account not found or inactive.',
        error: 'UNAUTHORIZED',
      });
    }

    req.platformAdmin = platformAdmin;
    next();
  } catch (error) {
    console.error('platformAdminAuth error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Token is invalid or expired.',
      error: 'UNAUTHORIZED',
    });
  }
};

module.exports = platformAdminAuth;
