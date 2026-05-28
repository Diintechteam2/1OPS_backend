const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Client = require('../models/Client');
const SuperAdmin = require('../models/SuperAdmin');
const PlatformAdmin = require('../models/PlatformAdmin');
const sendResponse = require('../utils/sendResponse');

// Generate JWT for a regular User (employee/admin/hr)
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
      clientId: user.clientId || null,
      type: 'user',
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Generate JWT for SuperAdmin
const generateSuperAdminToken = (superAdmin) => {
  return jwt.sign(
    { id: superAdmin._id, email: superAdmin.email, type: 'superadmin' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Generate JWT for PlatformAdmin
const generatePlatformAdminToken = (platformAdmin) => {
  return jwt.sign(
    { id: platformAdmin._id, email: platformAdmin.email, type: 'platformadmin' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Google OAuth callback endpoint (Disabled)
exports.googleCallback = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Google login is disabled.',
    error: 'FORBIDDEN'
  });
};

// Get list of active clients (public)
exports.getActiveClients = async (req, res, next) => {
  try {
    const clients = await Client.find({ isActive: true }, 'slug companyName');
    return sendResponse(res, 200, true, 'Active clients fetched successfully', clients);
  } catch (error) {
    next(error);
  }
};

// Get current user profile
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('clientId', 'slug companyName');
    return sendResponse(res, 200, true, 'User profile fetched successfully', user);
  } catch (error) {
    next(error);
  }
};

// Logout (handled client-side, but API confirms invalidation)
exports.logout = (req, res) => {
  return sendResponse(res, 200, true, 'Logged out successfully. Please clear token from storage.');
};

// Developer Mock Login for instant local testing without Google Credentials
exports.mockLogin = async (req, res, next) => {
  try {
    const { role = 'employee', redirect } = req.query;
    const clientSlugParam = req.params.clientSlug || req.query.clientSlug;
    
    if (!['employee', 'admin', 'hr'].includes(role)) {
      return sendResponse(res, 400, false, 'Invalid mock role. Choose employee, admin, or hr.');
    }

    const email = `mock.${role}@example.com`;
    const name = `Mock ${role.charAt(0).toUpperCase() + role.slice(1)}`;

    const targetClient = clientSlugParam
      ? await Client.findOne({ slug: clientSlugParam.toLowerCase().trim() })
      : await Client.findOne({ slug: '1ops' });
    const clientId = targetClient ? targetClient._id : null;

    let user = await User.findOne({ email, clientId });
    if (!user) {
      user = await User.create({
        name,
        email,
        role,
        clientId,
        approvalStatus: 'approved',
        isActive: true,
        department: role === 'employee' ? 'Engineering' : 'HR',
        designation: role.toUpperCase(),
        joiningDate: new Date(),
      });
    } else {
      let updated = false;
      if (user.approvalStatus !== 'approved' || !user.isActive) {
        user.approvalStatus = 'approved';
        user.isActive = true;
        updated = true;
      }
      if (!user.clientId && clientId) {
        user.clientId = clientId;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    }

    const token = generateToken(user);
    const clientSlug = targetClient ? targetClient.slug : '';
    const companyName = targetClient ? targetClient.companyName : '';

    if (redirect === 'true') {
      const redirectBase = (role === 'admin' || role === 'hr')
        ? `${process.env.ADMIN_URL || 'http://localhost:3000'}/client`
        : (process.env.CLIENT_URL || 'http://localhost:3000');
      return res.redirect(`${redirectBase}/login?token=${token}&clientSlug=${clientSlug}&companyName=${companyName}`);
    }

    return sendResponse(res, 200, true, 'Developer login successful', {
      token,
      clientSlug,
      companyName,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        employeeId: user.employeeId,
        profileImageUrl: user.profileImageUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Custom Email/Password Registration (Disabled)
exports.register = async (req, res, next) => {
  return res.status(403).json({
    success: false,
    message: 'Self-registration is disabled. Please contact your administrator.',
    error: 'FORBIDDEN'
  });
};

// Custom Email/Password Login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const clientSlug = req.params.clientSlug || req.body.clientSlug;

    if (!email || !password) {
      return sendResponse(res, 400, false, 'Email and password are required.');
    }

    let resolvedClientId = null;
    if (clientSlug) {
      const client = await Client.findOne({ slug: clientSlug.toLowerCase().trim(), isActive: true });
      if (client) {
        resolvedClientId = client._id;
      }
    }

    const user = await User.findOne({ email: email.toLowerCase().trim(), clientId: resolvedClientId }).populate('clientId', 'slug companyName isActive');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        error: 'UNAUTHORIZED'
      });
    }

    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'This account was registered using Google. Please log in with Google.',
        error: 'UNAUTHORIZED'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        error: 'UNAUTHORIZED'
      });
    }

    if (user.approvalStatus === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your registration request is pending HR/Admin approval. Please try again later.',
        error: 'FORBIDDEN'
      });
    }

    if (user.approvalStatus === 'rejected' || !user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive or has been rejected. Please contact HR.',
        error: 'FORBIDDEN'
      });
    }

    const token = generateToken(user);
    const finalClientSlug = user.clientId ? user.clientId.slug : null;
    const companyName = user.clientId ? user.clientId.companyName : null;

    return sendResponse(res, 200, true, 'Login successful', {
      token,
      clientSlug: finalClientSlug,
      companyName,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        clientId: user.clientId ? user.clientId._id : null,
        employeeId: user.employeeId,
        profileImageUrl: user.profileImageUrl,
      }
    });
  } catch (error) {
    next(error);
  }
};

// === SUPER ADMIN LOGIN ===
exports.superAdminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendResponse(res, 400, false, 'Email and password are required.');
    }

    const superAdmin = await SuperAdmin.findOne({ email: email.toLowerCase().trim() });
    if (!superAdmin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.', error: 'UNAUTHORIZED' });
    }

    const isMatch = await bcrypt.compare(password, superAdmin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.', error: 'UNAUTHORIZED' });
    }

    if (!superAdmin.isActive) {
      return res.status(403).json({ success: false, message: 'Super Admin account is inactive.', error: 'FORBIDDEN' });
    }

    const token = generateSuperAdminToken(superAdmin);
    return sendResponse(res, 200, true, 'Super Admin login successful', {
      token,
      superAdmin: { id: superAdmin._id, name: superAdmin.name, email: superAdmin.email }
    });
  } catch (error) {
    next(error);
  }
};

// === PLATFORM ADMIN LOGIN ===
exports.platformAdminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendResponse(res, 400, false, 'Email and password are required.');
    }

    const platformAdmin = await PlatformAdmin.findOne({ email: email.toLowerCase().trim() });
    if (!platformAdmin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.', error: 'UNAUTHORIZED' });
    }

    const isMatch = await bcrypt.compare(password, platformAdmin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.', error: 'UNAUTHORIZED' });
    }

    if (!platformAdmin.isActive) {
      return res.status(403).json({ success: false, message: 'Platform Admin account is inactive.', error: 'FORBIDDEN' });
    }

    const token = generatePlatformAdminToken(platformAdmin);
    return sendResponse(res, 200, true, 'Platform Admin login successful', {
      token,
      platformAdmin: { id: platformAdmin._id, name: platformAdmin.name, email: platformAdmin.email }
    });
  } catch (error) {
    next(error);
  }
};

// Get system metadata constants (public)
exports.getMetadata = (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'System metadata fetched successfully',
    data: {
      roles: ['employee', 'hr', 'admin'],
      departments: ['Engineering', 'HR', 'Sales', 'Design', 'Operations'],
      designations: {
        'Engineering': [
          'Full Stack Developer',
          'App Developer',
          'AI/ML Developer',
          'UI/UX Designer',
          'DevOps Engineer',
          'Frontend Developer',
          'Backend Developer',
          'QA Engineer'
        ],
        'HR': [
          'HR Manager',
          'HR Generalist',
          'Talent Acquisition Specialist',
          'HR Analyst',
          'HR Operations Specialist'
        ],
        'Sales': [
          'Sales Manager',
          'Sales Executive',
          'Business Development Executive',
          'Digital Marketing Specialist',
          'SEO Analyst'
        ],
        'Design': [
          'UI/UX Designer',
          'Product Designer',
          'Graphic Designer',
          'Motion Designer',
          '3D Artist'
        ],
        'Operations': [
          'Operations Manager',
          'Operations Associate',
          'Project Manager',
          'Business Analyst',
          'System Administrator'
        ]
      }
    }
  });
};
