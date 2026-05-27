const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(500).json({
      success: false,
      message: 'Auth middleware must be executed before adminOnly middleware.',
      error: 'INTERNAL_SERVER_ERROR',
    });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'hr') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Requires Admin or HR privileges.',
      error: 'FORBIDDEN',
    });
  }

  next();
};

module.exports = adminOnly;
