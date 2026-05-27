const express = require('express');
const policyController = require('../controllers/policyController');
const authMiddleware = require('../middleware/auth');
const clientSlugVerification = require('../middleware/clientSlugVerification');
const router = express.Router({ mergeParams: true });

router.use(authMiddleware, clientSlugVerification);

router.get('/list', policyController.getActivePolicies);
router.get('/:id', policyController.getPolicyDetail);

module.exports = router;
