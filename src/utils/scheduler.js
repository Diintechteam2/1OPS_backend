const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const WFHRequest = require('../models/WFHRequest');
const { getTodayString } = require('./dateHelpers');
const { sendNotification } = require('./notificationHelper');

// Scan and trigger notifications for absent or missing attendance employees
const runAttendanceAlerts = async () => {
  try {
    const todayStr = getTodayString(); // 'YYYY-MM-DD' in Asia/Kolkata
    const now = new Date();

    // Fetch all active employees
    const employees = await User.find({ role: 'employee', isActive: true });
    
    for (const emp of employees) {
      // 1. Check if employee already marked attendance today
      const attendance = await Attendance.findOne({ userId: emp._id, date: todayStr });
      if (attendance) continue; // Already clocked in or marked today, skip

      // 2. Check if employee has an approved leave today
      const approvedLeave = await Leave.findOne({
        userId: emp._id,
        status: 'approved',
        fromDate: { $lte: now },
        toDate: { $gte: now }
      });
      if (approvedLeave) continue; // On approved leave, skip

      // 3. Check if employee has an approved WFH today
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const approvedWfh = await WFHRequest.findOne({
        userId: emp._id,
        status: 'approved',
        $or: [
          { date: { $gte: startOfDay, $lte: endOfDay } },
          { fromDate: { $lte: now }, toDate: { $gte: now } }
        ]
      });
      if (approvedWfh) continue; // On approved WFH, skip

      // Send reminder to employee
      sendNotification({
        clientId: emp.clientId,
        recipient: emp._id,
        title: 'Attendance Reminder',
        message: "You haven't marked your attendance yet today. Please log in.",
        type: 'reminder',
        link: '/attendance'
      });

      // Send alert to Admin/HR of the company that this employee is absent
      sendNotification({
        clientId: emp.clientId,
        recipientRoles: ['admin', 'hr'],
        title: 'Employee Absent Alert',
        message: `${emp.name} (ID: ${emp.employeeId || 'N/A'}) is absent today.`,
        type: 'alert',
        link: `/client/attendance?date=${todayStr}`
      });
    }
  } catch (error) {
    console.error('runAttendanceAlerts error:', error.message);
  }
};

// Start scheduler to run daily at 11:30 AM and 7:30 PM (Asia/Kolkata timezone)
const startScheduler = () => {
  console.log('Daily Attendance Scheduler initialized successfully.');
  
  // Check every 60 seconds
  setInterval(async () => {
    try {
      const now = new Date();
      // Shift by 5.5 hours to represent India Standard Time (IST)
      const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      const hours = istTime.getUTCHours();
      const minutes = istTime.getUTCMinutes();

      // Trigger at 11:30 AM IST (hours === 11 && minutes === 30)
      // Trigger at 7:30 PM IST (hours === 19 && minutes === 30)
      if ((hours === 11 && minutes === 30) || (hours === 19 && minutes === 30)) {
        console.log(`Scheduler triggered at ${hours}:${minutes} IST. Running attendance checks...`);
        await runAttendanceAlerts();
      }
    } catch (e) {
      console.error('Scheduler interval loop error:', e.message);
    }
  }, 60000);
};

module.exports = {
  startScheduler
};
