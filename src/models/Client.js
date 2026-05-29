const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens.'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlatformAdmin',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    plan: {
      type: String,
      enum: ['basic', 'standard', 'premium'],
      default: 'basic',
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      default: '',
    },
    officeLat: {
      type: Number,
      default: null,
    },
    officeLng: {
      type: Number,
      default: null,
    },
    officeAddress: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Client', clientSchema);
