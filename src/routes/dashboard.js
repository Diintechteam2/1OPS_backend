const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');
const clientSlugVerification = require('../middleware/clientSlugVerification');
const router = express.Router({ mergeParams: true });

router.use(authMiddleware, clientSlugVerification);

router.get('/summary', dashboardController.getSummary);

module.exports = router;
