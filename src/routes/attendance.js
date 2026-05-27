const express = require('express');
const attendanceController = require('../controllers/attendanceController');
const authMiddleware = require('../middleware/auth');
const clientSlugVerification = require('../middleware/clientSlugVerification');
const router = express.Router({ mergeParams: true });

// Both auth and client slug must be verified
router.use(authMiddleware, clientSlugVerification);

router.post('/mark-in', attendanceController.markIn);
router.put('/mark-out', attendanceController.markOut);
router.get('/today', attendanceController.getTodayAttendance);
router.get('/history', attendanceController.getHistory);
router.get('/stats', attendanceController.getStats);

module.exports = router;
