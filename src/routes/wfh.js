const express = require('express');
const wfhController = require('../controllers/wfhController');
const authMiddleware = require('../middleware/auth');
const clientSlugVerification = require('../middleware/clientSlugVerification');
const router = express.Router({ mergeParams: true });

router.use(authMiddleware, clientSlugVerification);

router.post('/request', wfhController.requestWfh);
router.get('/my-requests', wfhController.getMyRequests);
router.delete('/:id', wfhController.cancelWfh);

module.exports = router;
