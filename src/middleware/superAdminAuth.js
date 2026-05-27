const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');

/**
 * superAdminAuth middleware
 * Verifies that the request comes from a valid, active SuperAdmin
 * using a dedicated JWT token with type: 'superadmin'
 */
const superAdminAuth = async (req, res, next) => {
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

    if (decoded.type !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super Admin privileges required.',
        error: 'FORBIDDEN',
      });
    }

    const superAdmin = await SuperAdmin.findById(decoded.id);
    if (!superAdmin || !superAdmin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Super Admin account not found or inactive.',
        error: 'UNAUTHORIZED',
      });
    }

    req.superAdmin = superAdmin;
    next();
  } catch (error) {
    console.error('superAdminAuth error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Token is invalid or expired.',
      error: 'UNAUTHORIZED',
    });
  }
};

module.exports = superAdminAuth;
