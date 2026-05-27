const express = require('express');
const feedbackController = require('../controllers/feedbackController');
const authMiddleware = require('../middleware/auth');
const clientSlugVerification = require('../middleware/clientSlugVerification');
const router = express.Router({ mergeParams: true });

router.use(authMiddleware, clientSlugVerification);

router.post('/submit', feedbackController.submitFeedback);
router.get('/my-feedbacks', feedbackController.getMyFeedbacks);

module.exports = router;
