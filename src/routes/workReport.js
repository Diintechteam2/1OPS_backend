const express = require('express');
const workReportController = require('../controllers/workReportController');
const authMiddleware = require('../middleware/auth');
const clientSlugVerification = require('../middleware/clientSlugVerification');
const router = express.Router({ mergeParams: true });

router.use(authMiddleware, clientSlugVerification);

router.post('/submit', workReportController.submitReport);
router.get('/my-reports', workReportController.getMyReports);
router.get('/today', workReportController.checkTodayReportStatus);
router.get('/:id', workReportController.getReportById);
router.put('/:id', workReportController.updateReport);

module.exports = router;
