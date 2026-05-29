const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Client = require('../models/Client');
const User = require('../models/User');
const sendResponse = require('../utils/sendResponse');

// === CREATE CLIENT (by PlatformAdmin) ===
exports.createClient = async (req, res, next) => {
  try {
    const { companyName, slug, contactEmail, address, plan, adminEmail, adminPassword, officeLat, officeLng, officeAddress } = req.body;

    if (!companyName || !slug || !adminEmail || !adminPassword) {
      return sendResponse(res, 400, false, 'Company name, URL slug, admin email, and admin password are required.');
    }

    const slugNormalized = slug.toLowerCase().trim();

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slugNormalized)) {
      return sendResponse(res, 400, false, 'Slug can only contain lowercase letters, numbers, and hyphens.');
    }

    const existing = await Client.findOne({ slug: slugNormalized });
    if (existing) {
      return sendResponse(res, 409, false, `Client with slug "${slugNormalized}" already exists.`);
    }

    const client = await Client.create({
      companyName,
      slug: slugNormalized,
      contactEmail: contactEmail || '',
      address: address || '',
      plan: plan || 'basic',
      createdBy: req.platformAdmin._id,
      isActive: true,
      officeLat: officeLat !== undefined ? parseFloat(officeLat) : null,
      officeLng: officeLng !== undefined ? parseFloat(officeLng) : null,
      officeAddress: officeAddress || '',
    });

    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      await User.create({
        name: `${companyName} Admin`,
        email: adminEmail.toLowerCase().trim(),
        password: hashedPassword,
        role: 'admin',
        clientId: client._id,
        approvalStatus: 'approved',
        isActive: true,
        department: 'IT Operations',
        designation: 'System Administrator'
      });
    } catch (err) {
      // Rollback client creation if admin user creation fails (e.g. duplicate email index check)
      await Client.findByIdAndDelete(client._id);
      return sendResponse(res, 400, false, err.message || 'Failed to create client admin user.');
    }

    return sendResponse(res, 201, true, 'Client created successfully with admin account.', client);
  } catch (error) {
    next(error);
  }
};

// === LIST MY CLIENTS (clients created by this PlatformAdmin) ===
exports.getMyClients = async (req, res, next) => {
  try {
    const clients = await Client.find({ createdBy: req.platformAdmin._id }).sort({ createdAt: -1 });
    return sendResponse(res, 200, true, 'Clients fetched successfully.', clients);
  } catch (error) {
    next(error);
  }
};

// === GET CLIENT DETAILS ===
exports.getClientById = async (req, res, next) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, createdBy: req.platformAdmin._id });
    if (!client) {
      return sendResponse(res, 404, false, 'Client not found.');
    }

    // Get employee count for this client
    const employeeCount = await User.countDocuments({ clientId: client._id });

    // Get admin email
    const adminUser = await User.findOne({ clientId: client._id, role: 'admin' });
    const adminEmail = adminUser ? adminUser.email : '';

    return sendResponse(res, 200, true, 'Client details fetched.', { 
      ...client.toObject(), 
      employeeCount,
      adminEmail 
    });
  } catch (error) {
    next(error);
  }
};

// === DEACTIVATE / ACTIVATE CLIENT ===
exports.toggleClientStatus = async (req, res, next) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, createdBy: req.platformAdmin._id });
    if (!client) {
      return sendResponse(res, 404, false, 'Client not found.');
    }

    client.isActive = !client.isActive;
    await client.save();

    const status = client.isActive ? 'activated' : 'deactivated';
    return sendResponse(res, 200, true, `Client ${status} successfully.`, { isActive: client.isActive });
  } catch (error) {
    next(error);
  }
};

// === PLATFORM ADMIN STATS ===
exports.getPlatformAdminStats = async (req, res, next) => {
  try {
    const totalClients = await Client.countDocuments({ createdBy: req.platformAdmin._id });
    const activeClients = await Client.countDocuments({ createdBy: req.platformAdmin._id, isActive: true });

    // Get all client IDs managed by this admin
    const myClients = await Client.find({ createdBy: req.platformAdmin._id }).select('_id');
    const clientIds = myClients.map(c => c._id);
    const totalUsers = await User.countDocuments({ clientId: { $in: clientIds } });

    return sendResponse(res, 200, true, 'Platform admin stats fetched.', {
      totalClients,
      activeClients,
      totalUsers,
    });
  } catch (error) {
    next(error);
  }
};

// === IMPERSONATE CLIENT (by PlatformAdmin) ===
exports.impersonateClient = async (req, res, next) => {
  try {
    const { id } = req.params;

    const client = await Client.findOne({ _id: id, createdBy: req.platformAdmin._id });
    if (!client) {
      return sendResponse(res, 404, false, 'Client not found or not managed by you.');
    }

    if (!client.isActive) {
      return sendResponse(res, 403, false, 'Client company is suspended.');
    }

    const user = await User.findOne({
      clientId: client._id,
      role: { $in: ['admin', 'hr'] },
      isActive: true,
      approvalStatus: 'approved'
    });

    if (!user) {
      return sendResponse(res, 404, false, 'No active admin or HR user found for this client company. Please onboard/approve a user first.');
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        clientId: user.clientId || null,
        type: 'user',
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return sendResponse(res, 200, true, 'Impersonation successful.', {
      token,
      clientSlug: client.slug,
      companyName: client.companyName
    });
  } catch (error) {
    next(error);
  }
};

// === UPDATE CLIENT (by PlatformAdmin) ===
exports.updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { companyName, slug, contactEmail, address, plan, adminEmail, adminPassword, officeLat, officeLng, officeAddress } = req.body;

    const client = await Client.findOne({ _id: id, createdBy: req.platformAdmin._id });
    if (!client) {
      return sendResponse(res, 404, false, 'Client not found.');
    }

    if (companyName) client.companyName = companyName;
    if (contactEmail !== undefined) client.contactEmail = contactEmail;
    if (address !== undefined) client.address = address;
    if (plan !== undefined) client.plan = plan;
    if (officeLat !== undefined) client.officeLat = officeLat !== null ? parseFloat(officeLat) : null;
    if (officeLng !== undefined) client.officeLng = officeLng !== null ? parseFloat(officeLng) : null;
    if (officeAddress !== undefined) client.officeAddress = officeAddress;

    if (slug) {
      const slugNormalized = slug.toLowerCase().trim();
      if (!/^[a-z0-9-]+$/.test(slugNormalized)) {
        return sendResponse(res, 400, false, 'Slug can only contain lowercase letters, numbers, and hyphens.');
      }
      const existing = await Client.findOne({ slug: slugNormalized, _id: { $ne: id } });
      if (existing) {
        return sendResponse(res, 409, false, `Client with slug "${slugNormalized}" already exists.`);
      }
      client.slug = slugNormalized;
    }

    await client.save();

    // Update or create the Admin user
    const adminUser = await User.findOne({ clientId: client._id, role: 'admin' });
    if (adminUser) {
      if (adminEmail) {
        adminUser.email = adminEmail.toLowerCase().trim();
      }
      if (adminPassword) {
        const salt = await bcrypt.genSalt(10);
        adminUser.password = await bcrypt.hash(adminPassword, salt);
      }
      await adminUser.save();
    } else if (adminEmail && adminPassword) {
      // Fallback for legacy database records
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      await User.create({
        name: `${client.companyName} Admin`,
        email: adminEmail.toLowerCase().trim(),
        password: hashedPassword,
        role: 'admin',
        clientId: client._id,
        approvalStatus: 'approved',
        isActive: true,
        department: 'IT Operations',
        designation: 'System Administrator'
      });
    }

    return sendResponse(res, 200, true, 'Client updated successfully.', client);
  } catch (error) {
    next(error);
  }
};
