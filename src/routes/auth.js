const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

const flatRouter = express.Router();
const scopedRouter = express.Router({ mergeParams: true });

// === Flat Auth Routes (mounted on /api/auth) ===

// Google OAuth Callback (Disabled)
flatRouter.get('/google/callback', (req, res) => {
  res.status(403).json({
    success: false,
    message: 'Google login is disabled.',
    error: 'FORBIDDEN'
  });
});

// Fallback login failed route
flatRouter.get('/login-failed', (req, res) => {
  res.status(401).json({
    success: false,
    message: 'Google login failed. Please try again.',
    error: 'UNAUTHORIZED'
  });
});


// Get active clients list (public)
flatRouter.get('/clients', authController.getActiveClients);

// Get system metadata constants (public)
flatRouter.get('/metadata', authController.getMetadata);


// === Scoped Auth Routes (mounted on /api/:clientSlug/auth) ===

// Google OAuth Redirect (Disabled)
scopedRouter.get('/google', (req, res) => {
  res.status(403).json({
    success: false,
    message: 'Google login is disabled.',
    error: 'FORBIDDEN'
  });
});

// Custom Email/Password Auth
scopedRouter.post('/register', authController.register);
scopedRouter.post('/login', authController.login);

// Mock Quick Login (for development)
scopedRouter.get('/mock-login', authController.mockLogin);

// Logout
scopedRouter.post('/logout', authMiddleware, authController.logout);

// Current User Details
scopedRouter.get('/me', authMiddleware, authController.getMe);

module.exports = {
  flatRouter,
  scopedRouter
};
