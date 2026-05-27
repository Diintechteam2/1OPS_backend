const express = require('express');
const correctionController = require('../controllers/correctionController');
const authMiddleware = require('../middleware/auth');
const clientSlugVerification = require('../middleware/clientSlugVerification');
const router = express.Router({ mergeParams: true });

router.use(authMiddleware, clientSlugVerification);

router.post('/request', correctionController.requestCorrection);
router.get('/my-requests', correctionController.getMyRequests);

module.exports = router;
