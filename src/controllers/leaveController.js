const Leave = require('../models/Leave');
const sendResponse = require('../utils/sendResponse');

// Apply for leave
exports.applyLeave = async (req, res, next) => {
  try {
    const { leaveType, fromDate, toDate, reason } = req.body;

    if (!leaveType || !fromDate || !toDate || !reason) {
      return sendResponse(res, 400, false, 'All fields are required.');
    }

    const leave = await Leave.create({
      userId: req.user._id,
      clientId: req.clientId,
      leaveType,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      reason,
      status: 'pending'
    });

    return sendResponse(res, 201, true, 'Leave applied successfully', leave);
  } catch (error) {
    next(error);
  }
};

// Get own leave history
exports.getMyLeaves = async (req, res, next) => {
  try {
    const leaves = await Leave.find({ userId: req.user._id, clientId: req.clientId }).sort({ createdAt: -1 });
    return sendResponse(res, 200, true, 'Leave history fetched', leaves);
  } catch (error) {
    next(error);
  }
};

// Get leave balance (computed)
exports.getLeaveBalance = async (req, res, next) => {
  try {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    // Fetch approved leaves within current calendar year
    const approvedLeaves = await Leave.find({
      userId: req.user._id,
      clientId: req.clientId,
      status: 'approved',
      fromDate: { $gte: startOfYear, $lte: endOfYear }
    });

    // Default entitlement limits
    const defaults = {
      'Sick Leave': 10,
      'Casual Leave': 12,
      'Earned Leave': 15,
      'Unpaid Leave': 99
    };

    // Calculate usage
    const used = {
      'Sick Leave': 0,
      'Casual Leave': 0,
      'Earned Leave': 0,
      'Unpaid Leave': 0
    };

    approvedLeaves.forEach(leave => {
      if (used[leave.leaveType] !== undefined) {
        used[leave.leaveType] += leave.totalDays || 1;
      }
    });

    const balance = {
      sick: { allowed: defaults['Sick Leave'], used: used['Sick Leave'], balance: Math.max(0, defaults['Sick Leave'] - used['Sick Leave']) },
      casual: { allowed: defaults['Casual Leave'], used: used['Casual Leave'], balance: Math.max(0, defaults['Casual Leave'] - used['Casual Leave']) },
      earned: { allowed: defaults['Earned Leave'], used: used['Earned Leave'], balance: Math.max(0, defaults['Earned Leave'] - used['Earned Leave']) },
      unpaid: { allowed: defaults['Unpaid Leave'], used: used['Unpaid Leave'], balance: Math.max(0, defaults['Unpaid Leave'] - used['Unpaid Leave']) }
    };

    return sendResponse(res, 200, true, 'Leave balance computed', balance);
  } catch (error) {
    next(error);
  }
};

// Cancel pending leave
exports.cancelLeave = async (req, res, next) => {
  try {
    const { id } = req.params;
    const leave = await Leave.findOne({ _id: id, userId: req.user._id, clientId: req.clientId });

    if (!leave) {
      return sendResponse(res, 404, false, 'Leave request not found.');
    }

    if (leave.status !== 'pending') {
      return sendResponse(res, 400, false, `Cannot cancel a leave request that is already ${leave.status}.`);
    }

    await Leave.findByIdAndDelete(id);
    return sendResponse(res, 200, true, 'Leave request cancelled successfully');
  } catch (error) {
    next(error);
  }
};
