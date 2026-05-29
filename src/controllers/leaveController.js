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

// Get leave balance (computed dynamically)
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

    const LeavePolicy = require('../models/LeavePolicy');
    let policies = await LeavePolicy.find({ clientId: req.clientId }).sort({ createdAt: 1 });

    // Fallback default entitlements if database contains no policies
    if (policies.length === 0) {
      policies = [
        { leaveType: 'Sick Leave', displayName: 'Sick Leave', allowedDays: 10, isPaid: true },
        { leaveType: 'Casual Leave', displayName: 'Casual Leave', allowedDays: 12, isPaid: true },
        { leaveType: 'Earned Leave', displayName: 'Earned Leave', allowedDays: 15, isPaid: true },
        { leaveType: 'Unpaid Leave', displayName: 'Unpaid Leave', allowedDays: 99, isPaid: false }
      ];
    }

    // Initialize counts
    const used = {};
    policies.forEach(p => {
      used[p.leaveType] = 0;
    });

    approvedLeaves.forEach(leave => {
      // Accumulate if the leaveType exists in our policy configurations
      if (used[leave.leaveType] !== undefined) {
        used[leave.leaveType] += leave.totalDays || 1;
      } else {
        // Fallback for legacy leaves whose leaveType might not exactly match the key
        const matched = policies.find(p => p.leaveType.toLowerCase() === leave.leaveType.toLowerCase());
        if (matched) {
          used[matched.leaveType] += leave.totalDays || 1;
        } else {
          if (used[leave.leaveType] === undefined) {
            used[leave.leaveType] = 0;
          }
          used[leave.leaveType] += leave.totalDays || 1;
        }
      }
    });

    // Compile dynamic allBalances array
    const allBalances = policies.map(p => {
      const allowed = p.allowedDays;
      const countUsed = used[p.leaveType] || 0;
      return {
        leaveType: p.leaveType,
        displayName: p.displayName,
        allowed,
        used: countUsed,
        balance: Math.max(0, allowed - countUsed),
        isPaid: p.isPaid
      };
    });

    // Standard legacy keys mapping for 100% backward-compatibility in UI
    const findPolicyBalance = (keywords, defaultAllowed, defaultIsPaid) => {
      const match = allBalances.find(b => 
        keywords.some(kw => b.leaveType.toLowerCase().includes(kw))
      );
      if (match) {
        return { allowed: match.allowed, used: match.used, balance: match.balance, isPaid: match.isPaid };
      }
      const keyword = keywords[0];
      const legacyTypeName = keyword.charAt(0).toUpperCase() + keyword.slice(1) + ' Leave';
      const countUsed = used[legacyTypeName] || 0;
      return { 
        allowed: defaultAllowed, 
        used: countUsed, 
        balance: Math.max(0, defaultAllowed - countUsed),
        isPaid: defaultIsPaid
      };
    };

    const balance = {
      sick: findPolicyBalance(['sick'], 10, true),
      casual: findPolicyBalance(['casual'], 12, true),
      earned: findPolicyBalance(['earned', 'paid'], 15, true),
      unpaid: findPolicyBalance(['unpaid'], 99, false),
      allBalances // Dynamic balances for custom types to display in frontend
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

// Get available leave types (dynamic list for dropdown)
exports.getLeaveTypes = async (req, res, next) => {
  try {
    const clientId = req.clientId;
    const LeavePolicy = require('../models/LeavePolicy');
    
    let policies = await LeavePolicy.find({ clientId }).sort({ createdAt: 1 });
    
    // Fallback defaults if none configured yet
    if (policies.length === 0) {
      return sendResponse(res, 200, true, 'Default leave types fetched', [
        { leaveType: 'Sick Leave', displayName: 'Sick Leave', allowedDays: 10, isPaid: true },
        { leaveType: 'Casual Leave', displayName: 'Casual Leave', allowedDays: 12, isPaid: true },
        { leaveType: 'Earned Leave', displayName: 'Earned Leave', allowedDays: 15, isPaid: true },
        { leaveType: 'Unpaid Leave', displayName: 'Unpaid Leave', allowedDays: 99, isPaid: false }
      ]);
    }

    return sendResponse(res, 200, true, 'Leave types fetched successfully', policies);
  } catch (error) {
    next(error);
  }
};
