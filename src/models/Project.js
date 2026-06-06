const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    projectType: {
      type: String,
      enum: ['website', 'app'],
      required: true,
    },
    legalEntity: {
      type: String,
      default: 'Diin Technologies Pvt. Ltd',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    businessEmail: {
      type: String,
      trim: true,
      default: '',
    },
    quickLinks: [
      {
        label: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    logins: {
      frontendHost: { type: String, default: '' },
      frontendUrl: { type: String, default: '' },
      backendHost: { type: String, default: '' },
      backendUrl: { type: String, default: '' },
      databaseType: { type: String, default: '' },
      databaseEmail: { type: String, default: '' },
      databaseDetails: { type: String, default: '' },
      domainRegistrar: { type: String, default: '' },
      domainCloudflare: { type: String, default: '' },
      projectAdminId: { type: String, default: '' },
      projectAdminPass: { type: String, default: '' },
      gmailAccount: { type: String, default: '' },
      gmailPassword: { type: String, default: '' },
    },
    paymentGateways: [
      {
        gatewayName: { type: String, required: true },
        environment: { type: String, enum: ['test', 'production'], required: true },
        details: { type: String, default: '' },
      },
    ],
    marketing: {
      type: Map,
      of: String,
      default: {},
    },
    githubUsername: {
      type: String,
      trim: true,
      default: '',
    },
    envContent: {
      type: String, // Encrypted .env variables text
      default: '',
    },
    files: [
      {
        key: { type: String, required: true }, // R2 Object Key
        originalName: { type: String, required: true },
        category: {
          type: String,
          enum: ['logo', 'business_card', 'proposal', 'banner', 'mou', 'pem', 'firebase_json'],
          required: true,
        },
        size: { type: Number, required: true },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    auditStatus: {
      type: String,
      enum: ['pending', 'clean', 'issues_found'],
      default: 'pending',
    },
    audits: [
      {
        auditedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        auditedAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ['clean', 'issues_found'],
          required: true,
        },
        description: {
          type: String,
          default: '',
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Project', projectSchema);
