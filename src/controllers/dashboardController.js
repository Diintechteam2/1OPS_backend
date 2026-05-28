const Attendance = require('../models/Attendance');
const Policy = require('../models/Policy');
const Leave = require('../models/Leave');
const WFHRequest = require('../models/WFHRequest');
const { getTodayString } = require('../utils/dateHelpers');
const sendResponse = require('../utils/sendResponse');

exports.getSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const clientId = req.clientId;
    const todayStr = getTodayString();
    
    // 1. Today's attendance
    const todayRecord = await Attendance.findOne({ userId, clientId, date: todayStr });
    
    // 2. This week's stats (past 7 days including today)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    const startOfWeekStr = getTodayString(sevenDaysAgo);
    
    const weekRecords = await Attendance.find({
      userId,
      clientId,
      date: { $gte: startOfWeekStr, $lte: todayStr }
    });
    
    const weekStats = {
      present: 0,
      late: 0,
      halfDay: 0,
      wfh: 0,
      leave: 0,
    };
    
    weekRecords.forEach(record => {
      if (record.status === 'present') weekStats.present++;
      if (record.status === 'late') weekStats.late++;
      if (record.status === 'half-day') weekStats.halfDay++;
      if (record.status === 'wfh') weekStats.wfh++;
      if (record.status === 'leave') weekStats.leave++;
    });

    // 3. Overall stats for stats row
    const totalLeaves = await Leave.countDocuments({ userId, clientId, status: 'approved' });
    const approvedWfhRequests = await WFHRequest.find({ userId, clientId, status: 'approved' });
    const totalWfh = approvedWfhRequests.reduce((sum, req) => sum + (req.totalDays || 1), 0);
    
    // Find count of all present & late records
    const presentDaysCount = await Attendance.countDocuments({
      userId,
      clientId,
      status: { $in: ['present', 'late'] }
    });

    // 4. Recent active policies and announcements for this client
    const recentAnnouncements = await Policy.find({ isActive: true, clientId })
      .sort({ createdAt: -1 })
      .limit(5);

    return sendResponse(res, 200, true, 'Dashboard summary fetched', {
      todayRecord,
      weekStats,
      summaryStats: {
        presentDays: presentDaysCount,
        approvedLeaves: totalLeaves,
        approvedWfh: totalWfh
      },
      announcements: recentAnnouncements
    });
  } catch (error) {
    next(error);
  }
};
