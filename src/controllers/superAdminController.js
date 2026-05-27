const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');
const PlatformAdmin = require('../models/PlatformAdmin');
const Client = require('../models/Client');
const User = require('../models/User');
const sendResponse = require('../utils/sendResponse');

// === CREATE PLATFORM ADMIN (by SuperAdmin) ===
exports.createPlatformAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return sendResponse(res, 400, false, 'Name, email, and password are required.');
    }

    const existing = await PlatformAdmin.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return sendResponse(res, 409, false, 'Platform Admin with this email already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const platformAdmin = await PlatformAdmin.create({
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      createdBy: req.superAdmin._id,
      isActive: true,
    });

    return sendResponse(res, 201, true, 'Platform Admin created successfully.', {
      id: platformAdmin._id,
      name: platformAdmin.name,
      email: platformAdmin.email,
      isActive: platformAdmin.isActive,
      createdAt: platformAdmin.createdAt,
    });
  } catch (error) {
    next(error);
  }
};

// === LIST ALL PLATFORM ADMINS ===
exports.getPlatformAdmins = async (req, res, next) => {
  try {
    const admins = await PlatformAdmin.find().select('-password').sort({ createdAt: -1 });
    return sendResponse(res, 200, true, 'Platform admins fetched successfully.', admins);
  } catch (error) {
    next(error);
  }
};

// === DEACTIVATE PLATFORM ADMIN ===
exports.deactivatePlatformAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin = await PlatformAdmin.findById(id);
    if (!admin) {
      return sendResponse(res, 404, false, 'Platform Admin not found.');
    }

    admin.isActive = false;
    await admin.save();
    return sendResponse(res, 200, true, 'Platform Admin deactivated successfully.');
  } catch (error) {
    next(error);
  }
};

// === LIST ALL CLIENTS (across all platform admins) ===
exports.getAllClients = async (req, res, next) => {
  try {
    const clients = await Client.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    return sendResponse(res, 200, true, 'All clients fetched successfully.', clients);
  } catch (error) {
    next(error);
  }
};

// === PLATFORM-LEVEL STATS ===
exports.getPlatformStats = async (req, res, next) => {
  try {
    const totalClients = await Client.countDocuments();
    const activeClients = await Client.countDocuments({ isActive: true });
    const totalPlatformAdmins = await PlatformAdmin.countDocuments();
    const totalUsers = await User.countDocuments();

    return sendResponse(res, 200, true, 'Platform stats fetched.', {
      totalClients,
      activeClients,
      totalPlatformAdmins,
      totalUsers,
    });
  } catch (error) {
    next(error);
  }
};

// === IMPERSONATE PLATFORM ADMIN ===
exports.impersonatePlatformAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const platformAdmin = await PlatformAdmin.findById(id);
    if (!platformAdmin) {
      return sendResponse(res, 404, false, 'Platform Admin not found.');
    }

    if (!platformAdmin.isActive) {
      return sendResponse(res, 403, false, 'Platform Admin account is inactive.');
    }

    const token = jwt.sign(
      { id: platformAdmin._id, email: platformAdmin.email, type: 'platformadmin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return sendResponse(res, 200, true, 'Impersonation successful.', { token });
  } catch (error) {
    next(error);
  }
};
