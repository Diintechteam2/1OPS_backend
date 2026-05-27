const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const WFHRequest = require('../models/WFHRequest');
const { getTodayString } = require('../utils/dateHelpers');
const sendResponse = require('../utils/sendResponse');

// Check in with GPS
exports.markIn = async (req, res, next) => {
  try {
    const { checkInLat, checkInLng, type = 'office' } = req.body;
    const todayStr = getTodayString();
    
    // Check if attendance already marked
    let attendance = await Attendance.findOne({ userId: req.user._id, clientId: req.clientId, date: todayStr });
    if (attendance) {
      return sendResponse(res, 400, false, 'Already clocked in for today.');
    }

    // Check if user is on approved leave today
    const now = new Date();
    const approvedLeave = await Leave.findOne({
      userId: req.user._id,
      clientId: req.clientId,
      status: 'approved',
      fromDate: { $lte: now },
      toDate: { $gte: now }
    });

    if (approvedLeave) {
      return sendResponse(res, 400, false, `Cannot check in. You have an approved leave (${approvedLeave.leaveType}) for today.`);
    }

    // Check if user has an approved WFH request today
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const approvedWfh = await WFHRequest.findOne({
      userId: req.user._id,
      clientId: req.clientId,
      status: 'approved',
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    // Resolve attendance type and status
    let resolvedType = type;
    let resolvedStatus = 'present';

    if (approvedWfh) {
      resolvedType = 'remote';
      resolvedStatus = 'wfh';
    } else {
      if (type === 'remote') {
        resolvedStatus = 'wfh';
      }
    }

    attendance = await Attendance.create({
      userId: req.user._id,
      clientId: req.clientId,
      date: todayStr,
      checkInTime: now,
      checkInLat,
      checkInLng,
      type: resolvedType,
      status: resolvedStatus,
      isMarked: true
    });

    return sendResponse(res, 201, true, 'Log-in recorded successfully', attendance);
  } catch (error) {
    next(error);
  }
};

// Check out with GPS
exports.markOut = async (req, res, next) => {
  try {
    const { checkOutLat, checkOutLng } = req.body;
    const todayStr = getTodayString();

    const attendance = await Attendance.findOne({ userId: req.user._id, clientId: req.clientId, date: todayStr });
    if (!attendance || !attendance.checkInTime) {
      return sendResponse(res, 400, false, 'No check-in record found for today.');
    }

    if (attendance.checkOutTime) {
      return sendResponse(res, 400, false, 'Already clocked out for today.');
    }

    const now = new Date();
    attendance.checkOutTime = now;
    attendance.checkOutLat = checkOutLat;
    attendance.checkOutLng = checkOutLng;

    // Calculate total hours
    const checkIn = new Date(attendance.checkInTime);
    const hours = (now - checkIn) / (1000 * 60 * 60);
    attendance.totalHours = parseFloat(hours.toFixed(2));

    // Update status based on working hours if not a leave or wfh
    if (attendance.status !== 'leave' && attendance.status !== 'wfh') {
      if (attendance.totalHours < 4) {
        attendance.status = 'half-day';
      } else if (attendance.totalHours < 9) {
        attendance.status = 'late';
      } else {
        attendance.status = 'present';
      }
    }

    await attendance.save();
    return sendResponse(res, 200, true, 'Log-out recorded successfully', attendance);
  } catch (error) {
    next(error);
  }
};

// Get today's attendance record
exports.getTodayAttendance = async (req, res, next) => {
  try {
    const todayStr = getTodayString();
    const attendance = await Attendance.findOne({ userId: req.user._id, clientId: req.clientId, date: todayStr });
    return sendResponse(res, 200, true, 'Today attendance record fetched', attendance);
  } catch (error) {
    next(error);
  }
};

// Get history (filtered by month and year)
exports.getHistory = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return sendResponse(res, 400, false, 'Month and year parameters are required.');
    }

    const formattedMonth = String(month).padStart(2, '0');
    const prefix = `${year}-${formattedMonth}-`;

    // Retrieve attendance records for the month using regex or string starting
    const history = await Attendance.find({
      userId: req.user._id,
      clientId: req.clientId,
      date: { $regex: new RegExp(`^${prefix}`) }
    }).sort({ date: -1 });

    return sendResponse(res, 200, true, 'Attendance history fetched', history);
  } catch (error) {
    next(error);
  }
};

// Get summary stats (present/absent/leave/wfh counts)
exports.getStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    const stats = await Attendance.aggregate([
      { $match: { userId, clientId: req.clientId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Map aggregate result to structured object
    const result = {
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      leave: 0,
      wfh: 0
    };

    stats.forEach(item => {
      if (item._id === 'present') result.present = item.count;
      if (item._id === 'absent') result.absent = item.count;
      if (item._id === 'late') result.late = item.count;
      if (item._id === 'half-day') result.halfDay = item.count;
      if (item._id === 'leave') result.leave = item.count;
      if (item._id === 'wfh') result.wfh = item.count;
    });

    return sendResponse(res, 200, true, 'Summary stats fetched', result);
  } catch (error) {
    next(error);
  }
};
