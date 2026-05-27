const express = require('express');
const authController = require('../controllers/authController');
const platformAdminController = require('../controllers/platformAdminController');
const platformAdminAuth = require('../middleware/platformAdminAuth');
const router = express.Router();

// Platform Admin Login (public)
router.post('/login', authController.platformAdminLogin);

// Protected routes — all require platformAdminAuth
router.use(platformAdminAuth);

// Client management
router.post('/clients', platformAdminController.createClient);
router.get('/clients', platformAdminController.getMyClients);
router.get('/clients/:id', platformAdminController.getClientById);
router.patch('/clients/:id/toggle-status', platformAdminController.toggleClientStatus);
router.post('/clients/:id/impersonate', platformAdminController.impersonateClient);

// Stats
router.get('/stats', platformAdminController.getPlatformAdminStats);

module.exports = router;
