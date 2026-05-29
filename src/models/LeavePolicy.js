const mongoose = require('mongoose');

const leavePolicySchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
    },
    leaveType: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    allowedDays: {
      type: Number,
      required: true,
    },
    isPaid: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index so leaveType is unique per client
leavePolicySchema.index({ clientId: 1, leaveType: 1 }, { unique: true });

module.exports = mongoose.model('LeavePolicy', leavePolicySchema);
