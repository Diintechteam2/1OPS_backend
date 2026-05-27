const mongoose = require('mongoose');

const correctionRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
    },
    date: {
      type: Date,
      required: true,
    },
    correctionType: {
      type: String,
      enum: ['missed_checkin', 'missed_checkout', 'wrong_time'],
      required: true,
    },
    requestedCheckIn: {
      type: Date,
    },
    requestedCheckOut: {
      type: Date,
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    adminComment: {
      type: String,
      default: '',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CorrectionRequest', correctionRequestSchema);
