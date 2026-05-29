const mongoose = require('mongoose');

const formatDateToIST = (val) => {
  if (!val) return val;
  const d = new Date(val);
  const offset = 5.5 * 60 * 60 * 1000; // IST is UTC + 5:30
  const istDate = new Date(d.getTime() + offset);
  const isoStr = istDate.toISOString();
  return isoStr.slice(0, -1) + '+05:30';
};

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
      get: formatDateToIST
    },
    checkOutTime: {
      type: Date,
      get: formatDateToIST
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
    checkInLocationName: {
      type: String,
      default: '',
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
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

// Unique index so a user has only one attendance record per calendar date
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
