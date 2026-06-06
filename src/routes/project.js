const express = require('express');
const multer = require('multer');
const projectController = require('../controllers/projectController');
const authMiddleware = require('../middleware/auth');
const clientSlugVerification = require('../middleware/clientSlugVerification');

const router = express.Router({ mergeParams: true });

// Setup multer in-memory storage for handling file uploads (max 15MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
});

// Protect all project management routes with auth and client scope middlewares
router.use(authMiddleware, clientSlugVerification);

// Core CRUD APIs
router.post('/', projectController.createProject);
router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProjectDetails);
router.put('/:id', projectController.updateProject);

// Member Assignments
router.patch('/:id/members', projectController.assignMembers);

// File Assets Management (R2 integrations)
router.post('/:id/upload', upload.single('file'), projectController.uploadAsset);
router.post('/:id/delete-asset', projectController.deleteAsset);
router.get('/:id/download', projectController.getDownloadUrl);

// Audit Logging History & Actions
router.get('/:id/logs', projectController.getProjectLogs);
router.post('/:id/audit', projectController.auditProject);

module.exports = router;
