const express = require('express');
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/auth');
const clientSlugVerification = require('../middleware/clientSlugVerification');
const router = express.Router({ mergeParams: true });

// Protect all notification routes
router.use(authMiddleware, clientSlugVerification);

router.get('/', notificationController.getNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);
router.post('/fcm-token', notificationController.saveFcmToken);

module.exports = router;
