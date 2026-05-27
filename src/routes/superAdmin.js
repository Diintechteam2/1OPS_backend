const express = require('express');
const authController = require('../controllers/authController');
const superAdminController = require('../controllers/superAdminController');
const superAdminAuth = require('../middleware/superAdminAuth');
const router = express.Router();

// Super Admin Login (public)
router.post('/login', authController.superAdminLogin);

// Protected routes — all require superAdminAuth
router.use(superAdminAuth);

// Platform Admin management
router.post('/platform-admins', superAdminController.createPlatformAdmin);
router.get('/platform-admins', superAdminController.getPlatformAdmins);
router.delete('/platform-admins/:id', superAdminController.deactivatePlatformAdmin);
router.post('/platform-admins/:id/impersonate', superAdminController.impersonatePlatformAdmin);

// All clients overview
router.get('/clients', superAdminController.getAllClients);

// Platform-level stats
router.get('/stats', superAdminController.getPlatformStats);

module.exports = router;
