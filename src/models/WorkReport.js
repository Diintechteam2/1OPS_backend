const mongoose = require('mongoose');

const workReportSchema = new mongoose.Schema(
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
      type: String, // 'YYYY-MM-DD'
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    priority: {
      type: Number, // 1 = Low, 2 = Medium, 3 = High
      default: 2,
    },
    attachments: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// One report per user per day
workReportSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('WorkReport', workReportSchema);
