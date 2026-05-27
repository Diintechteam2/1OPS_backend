const express = require('express');
const clientController = require('../controllers/clientController');
const authMiddleware = require('../middleware/auth');
const adminOnlyMiddleware = require('../middleware/adminOnly');
const clientSlugVerification = require('../middleware/clientSlugVerification');
const router = express.Router({ mergeParams: true });

router.use(authMiddleware, clientSlugVerification, adminOnlyMiddleware);

// Employee Management
router.get('/employees', clientController.getEmployees);
router.get('/employees/:id', clientController.getEmployeeById);
router.put('/employees/:id', clientController.updateEmployee);
router.delete('/employees/:id', clientController.deactivateEmployee);

// Attendance Management
router.get('/attendance', clientController.getAllAttendance);
router.get('/attendance/report', clientController.getAttendanceReport);
router.put('/attendance/:id', clientController.correctAttendance);

// Leave Management
router.get('/leaves', clientController.getAllLeaves);
router.put('/leaves/:id/approve', clientController.approveLeave);
router.put('/leaves/:id/reject', clientController.rejectLeave);

// WFH Management
router.get('/wfh', clientController.getAllWfh);
router.put('/wfh/:id/approve', clientController.approveWfh);
router.put('/wfh/:id/reject', clientController.rejectWfh);

// Correction Management
router.get('/corrections', clientController.getAllCorrections);
router.put('/corrections/:id/approve', clientController.approveCorrection);
router.put('/corrections/:id/reject', clientController.rejectCorrection);

// Feedback Management
router.get('/feedbacks', clientController.getAllFeedbacks);
router.put('/feedbacks/:id/reply', clientController.replyFeedback);
router.put('/feedbacks/:id/resolve', clientController.resolveFeedback);

// Work Reports
router.get('/work-reports', clientController.getAllWorkReports);

// Policy Management
router.get('/policy', clientController.getPolicies);
router.post('/policy', clientController.createPolicy);
router.put('/policy/:id', clientController.updatePolicy);
router.delete('/policy/:id', clientController.deletePolicy);

// Admin Dashboard Summary Stats
router.get('/dashboard', clientController.getAdminStats);

// Pending Registrations Approvals
router.get('/registrations', clientController.getPendingRegistrations);
router.put('/registrations/:id/approve', clientController.approveRegistration);
router.put('/registrations/:id/reject', clientController.rejectRegistration);

module.exports = router;
