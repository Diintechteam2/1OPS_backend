const express = require('express');
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/auth');
const adminOnlyMiddleware = require('../middleware/adminOnly');
const clientSlugVerification = require('../middleware/clientSlugVerification');
const router = express.Router({ mergeParams: true });

// All task routes require authentication and client slug verification
router.use(authMiddleware, clientSlugVerification);

// Employee routes
router.get('/', taskController.getMyTasks);
router.patch('/:id/status', taskController.updateTaskStatus);

// HR/Admin routes
router.post('/assign', adminOnlyMiddleware, taskController.createTask);
router.get('/client-tasks', adminOnlyMiddleware, taskController.getAllTasks);
router.delete('/:id', adminOnlyMiddleware, taskController.deleteTask);

module.exports = router;
