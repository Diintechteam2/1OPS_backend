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

// Google OAuth callback endpoint
exports.googleCallback = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=AUTH_FAILED`);
    }

    // Populate clientId to get company name and slug
    await req.user.populate('clientId', 'slug companyName');
    const clientSlug = req.user.clientId ? req.user.clientId.slug : '';
    const companyName = req.user.clientId ? req.user.clientId.companyName : '';

    const token = generateToken(req.user);
    
    // Check if the OAuth state specifies admin panel or employee web app
    const state = req.query.state || 'client';
    const redirectBase = state === 'admin'
      ? `${process.env.ADMIN_URL || 'http://localhost:3000'}/client`
      : (process.env.CLIENT_URL || 'http://localhost:3000');

    return res.redirect(`${redirectBase}/login?token=${token}&clientSlug=${clientSlug}&companyName=${companyName}`);
  } catch (error) {
    console.error('Google Callback Error:', error);
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=SERVER_ERROR`);
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
    
    if (!['employee', 'admin', 'hr'].includes(role)) {
      return sendResponse(res, 400, false, 'Invalid mock role. Choose employee, admin, or hr.');
    }

    const email = `mock.${role}@example.com`;
    const name = `Mock ${role.charAt(0).toUpperCase() + role.slice(1)}`;

    const defaultClient = await Client.findOne({ slug: '1ops' });
    const clientId = defaultClient ? defaultClient._id : null;

    let user = await User.findOne({ email });
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
    const clientSlug = defaultClient ? defaultClient.slug : '';
    const companyName = defaultClient ? defaultClient.companyName : '';

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

// Custom Email/Password Registration (Signup)
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, department, designation, phone, clientSlug } = req.body;

    if (!name || !email || !password || !role) {
      return sendResponse(res, 400, false, 'Name, email, password and role are required.');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return sendResponse(res, 409, false, 'Email is already registered.');
    }

    // Resolve clientId from slug
    let resolvedClientId = null;
    if (clientSlug) {
      const client = await Client.findOne({ slug: clientSlug.toLowerCase().trim(), isActive: true });
      if (!client) {
        return sendResponse(res, 404, false, `No active client found with slug: "${clientSlug}". Please verify your company code.`);
      }
      resolvedClientId = client._id;
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      department: department || '',
      designation: designation || '',
      phone: phone || '',
      clientId: resolvedClientId,
      approvalStatus: 'pending',
      isActive: false,
      joiningDate: new Date(),
    });

    return sendResponse(res, 201, true, 'Registration submitted successfully. Please wait for HR/Admin approval.', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
      }
    });
  } catch (error) {
    next(error);
  }
};

// Custom Email/Password Login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendResponse(res, 400, false, 'Email and password are required.');
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).populate('clientId', 'slug companyName isActive');
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
    const clientSlug = user.clientId ? user.clientId.slug : null;
    const companyName = user.clientId ? user.clientId.companyName : null;

    return sendResponse(res, 200, true, 'Login successful', {
      token,
      clientSlug,
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
