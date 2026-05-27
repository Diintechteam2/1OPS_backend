const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Client = require('../models/Client');
const SuperAdmin = require('../models/SuperAdmin');
const PlatformAdmin = require('../models/PlatformAdmin');

// === SEED 1OPS CLIENT ===
const seed1OpsClient = async (platformAdminId) => {
  let client = await Client.findOne({ slug: '1ops' });
  if (!client) {
    client = await Client.create({
      companyName: '1OPS',
      slug: '1ops',
      contactEmail: 'admin@1ops.com',
      address: 'India',
      plan: 'premium',
      createdBy: platformAdminId || null,
      isActive: true,
    });
    console.log('Seeded default client: 1ops');
  } else if (!client.createdBy && platformAdminId) {
    client.createdBy = platformAdminId;
    await client.save();
    console.log('Updated default client 1ops to be managed by platformadmin');
  }
  return client;
};

// === SEED SUPER ADMIN ===
const seedSuperAdmin = async () => {
  const email = 'superadmin@1ops.com';
  let existing = await SuperAdmin.findOne({ email });
  if (!existing) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('superadmin123', salt);
    await SuperAdmin.create({
      name: 'Platform Super Admin',
      email,
      password: hashedPassword,
      isActive: true,
    });
    console.log(`Seeded SuperAdmin: ${email}`);
  }
};

// === SEED PLATFORM ADMIN ===
const seedPlatformAdmin = async () => {
  const email = 'platformadmin@1ops.com';
  let superAdmin = await SuperAdmin.findOne({ email: 'superadmin@1ops.com' });
  let existing = await PlatformAdmin.findOne({ email });
  if (!existing && superAdmin) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('platformadmin123', salt);
    existing = await PlatformAdmin.create({
      name: 'Platform Admin',
      email,
      password: hashedPassword,
      createdBy: superAdmin._id,
      isActive: true,
    });
    console.log(`Seeded PlatformAdmin: ${email}`);
  }
  return existing;
};

// === SEED DEFAULT USERS (employee, admin, hr) FOR 1OPS CLIENT ===
const seedDefaultUsers = async (clientId) => {
  try {
    const defaultUsers = [
      {
        email: 'employee@example.com',
        name: 'Test Employee',
        role: 'employee',
        department: 'Engineering',
        designation: 'Software Engineer',
      },
      {
        email: 'admin@example.com',
        name: 'System Admin',
        role: 'admin',
        department: 'IT Operations',
        designation: 'System Administrator',
      },
      {
        email: 'hr@example.com',
        name: 'HR Manager',
        role: 'hr',
        department: 'Human Resources',
        designation: 'HR Specialist',
      },
    ];

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt);

    for (const u of defaultUsers) {
      let user = await User.findOne({ email: u.email });
      if (!user) {
        user = await User.create({
          ...u,
          password: hashedPassword,
          clientId,
          approvalStatus: 'approved',
          isActive: true,
          joiningDate: new Date(),
        });
        console.log(`Seeded default user: ${u.email}`);
      } else if (!user.password || user.approvalStatus !== 'approved' || !user.isActive || !user.clientId) {
        user.password = hashedPassword;
        user.approvalStatus = 'approved';
        user.isActive = true;
        user.clientId = clientId;
        await user.save();
        console.log(`Updated default user credentials: ${u.email}`);
      }
    }
  } catch (error) {
    console.error('Error seeding default users:', error);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Run seeding in order
    await seedSuperAdmin();
    const platformAdmin = await seedPlatformAdmin();
    const client = await seed1OpsClient(platformAdmin?._id);
    await seedDefaultUsers(client._id);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
