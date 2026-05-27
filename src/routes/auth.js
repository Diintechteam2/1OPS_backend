const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Google OAuth Redirect
router.get('/google', (req, res, next) => {
  const origin = req.query.origin || 'client'; // 'client' or 'admin'
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: origin,
    session: false
  })(req, res, next);
});

// Google OAuth Callback
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/api/auth/login-failed', session: false }),
  authController.googleCallback
);

// Fallback login failed route
router.get('/login-failed', (req, res) => {
  res.status(401).json({
    success: false,
    message: 'Google login failed. Please try again.',
    error: 'UNAUTHORIZED'
  });
});

// Custom Email/Password Auth
router.post('/register', authController.register);
router.post('/login', authController.login);

// Mock Quick Login (for development)
router.get('/mock-login', authController.mockLogin);

// Logout
router.post('/logout', authMiddleware, authController.logout);

// Current User Details
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
