const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
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
    checkInTime: {
      type: Date,
    },
    checkOutTime: {
      type: Date,
    },
    checkInLat: {
      type: Number,
    },
    checkInLng: {
      type: Number,
    },
    checkOutLat: {
      type: Number,
    },
    checkOutLng: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'half-day', 'leave', 'wfh'],
      default: 'present',
    },
    type: {
      type: String,
      enum: ['office', 'remote', 'leave'],
      default: 'office',
    },
    totalHours: {
      type: Number,
      default: 0,
    },
    isMarked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Unique index so a user has only one attendance record per calendar date
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
