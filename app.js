require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');
const errorHandler = require('./src/middleware/errorHandler');
const configureGoogleOAuth = require('./src/config/google');

// Route file imports
const authRoutes = require('./src/routes/auth');
const superAdminRoutes = require('./src/routes/superAdmin');
const platformAdminRoutes = require('./src/routes/platformAdmin');

// Client-scoped routes (require :clientSlug in URL)
const attendanceRoutes = require('./src/routes/attendance');
const leaveRoutes = require('./src/routes/leave');
const wfhRoutes = require('./src/routes/wfh');
const correctionRoutes = require('./src/routes/correction');
const feedbackRoutes = require('./src/routes/feedback');
const workReportRoutes = require('./src/routes/workReport');
const policyRoutes = require('./src/routes/policy');
const dashboardRoutes = require('./src/routes/dashboard');
const clientRoutes = require('./src/routes/client');
const taskRoutes = require('./src/routes/task');

const app = express();

// Initialize Google Passport strategy
configureGoogleOAuth();

const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
const adminUrl = process.env.ADMIN_URL || 'http://localhost:3001';

app.use(cors({
  origin: [clientUrl, adminUrl],
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));
app.use(passport.initialize());

// === Public Auth Routes ===
app.use('/api/auth', authRoutes.flatRouter);
app.use('/api/:clientSlug/auth', authRoutes.scopedRouter);

// === Super Admin Routes ===
app.use('/api/superadmin', superAdminRoutes);

// === Platform Admin Routes ===
app.use('/api/admin', platformAdminRoutes);

// === Client-Scoped Routes (all require /:clientSlug in URL) ===
app.use('/api/:clientSlug/attendance', attendanceRoutes);
app.use('/api/:clientSlug/leave', leaveRoutes);
app.use('/api/:clientSlug/wfh', wfhRoutes);
app.use('/api/:clientSlug/correction', correctionRoutes);
app.use('/api/:clientSlug/feedback', feedbackRoutes);
app.use('/api/:clientSlug/work-report', workReportRoutes);
app.use('/api/:clientSlug/policy', policyRoutes);
app.use('/api/:clientSlug/dashboard', dashboardRoutes);
app.use('/api/:clientSlug/client', clientRoutes);
app.use('/api/:clientSlug/tasks', taskRoutes);

// Fallback error routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Requested API endpoint does not exist on server.',
    error: 'NOT_FOUND'
  });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
