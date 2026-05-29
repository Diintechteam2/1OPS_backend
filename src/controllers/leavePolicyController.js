const LeavePolicy = require('../models/LeavePolicy');
const sendResponse = require('../utils/sendResponse');

// Get all leave policies for a client (with default auto-generation)
exports.getLeavePolicies = async (req, res, next) => {
  try {
    const clientId = req.clientId;

    let policies = await LeavePolicy.find({ clientId }).sort({ createdAt: 1 });

    // Self-bootstrapping / Auto-populating default policies if none exist
    if (policies.length === 0) {
      const defaultPolicies = [
        { clientId, leaveType: 'Sick Leave', displayName: 'Sick Leave', allowedDays: 10, isPaid: true },
        { clientId, leaveType: 'Casual Leave', displayName: 'Casual Leave', allowedDays: 12, isPaid: true },
        { clientId, leaveType: 'Earned Leave', displayName: 'Earned Leave', allowedDays: 15, isPaid: true },
        { clientId, leaveType: 'Unpaid Leave', displayName: 'Unpaid Leave', allowedDays: 99, isPaid: false }
      ];

      policies = await LeavePolicy.insertMany(defaultPolicies);
    }

    return sendResponse(res, 200, true, 'Leave policies fetched successfully', policies);
  } catch (error) {
    next(error);
  }
};

// Create a new custom leave policy
exports.createLeavePolicy = async (req, res, next) => {
  try {
    const clientId = req.clientId;
    const { leaveType, displayName, allowedDays, isPaid } = req.body;

    if (!leaveType || !displayName || allowedDays === undefined) {
      return sendResponse(res, 400, false, 'All fields (leaveType, displayName, allowedDays) are required.');
    }

    // Check if policy type already exists for this client
    const existing = await LeavePolicy.findOne({ clientId, leaveType });
    if (existing) {
      return sendResponse(res, 400, false, `A leave policy for '${leaveType}' already exists.`);
    }

    const policy = await LeavePolicy.create({
      clientId,
      leaveType,
      displayName,
      allowedDays: Number(allowedDays),
      isPaid: isPaid !== undefined ? isPaid : true
    });

    return sendResponse(res, 201, true, 'Leave policy created successfully', policy);
  } catch (error) {
    next(error);
  }
};

// Update an existing leave policy
exports.updateLeavePolicy = async (req, res, next) => {
  try {
    const clientId = req.clientId;
    const { id } = req.params;
    const { displayName, allowedDays, isPaid } = req.body;

    const policy = await LeavePolicy.findOne({ _id: id, clientId });
    if (!policy) {
      return sendResponse(res, 404, false, 'Leave policy not found.');
    }

    if (displayName !== undefined) policy.displayName = displayName;
    if (allowedDays !== undefined) policy.allowedDays = Number(allowedDays);
    if (isPaid !== undefined) policy.isPaid = isPaid;

    await policy.save();

    return sendResponse(res, 200, true, 'Leave policy updated successfully', policy);
  } catch (error) {
    next(error);
  }
};

// Delete a custom leave policy
exports.deleteLeavePolicy = async (req, res, next) => {
  try {
    const clientId = req.clientId;
    const { id } = req.params;

    const policy = await LeavePolicy.findOne({ _id: id, clientId });
    if (!policy) {
      return sendResponse(res, 404, false, 'Leave policy not found.');
    }

    await LeavePolicy.findByIdAndDelete(id);

    return sendResponse(res, 200, true, 'Leave policy deleted successfully');
  } catch (error) {
    next(error);
  }
};
