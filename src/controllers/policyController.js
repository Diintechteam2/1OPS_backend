const Policy = require('../models/Policy');
const sendResponse = require('../utils/sendResponse');

// Get all active policies and announcements
exports.getActivePolicies = async (req, res, next) => {
  try {
    const list = await Policy.find({ isActive: true, clientId: req.clientId }).sort({ createdAt: -1 });
    return sendResponse(res, 200, true, 'Active policies/announcements fetched', list);
  } catch (error) {
    next(error);
  }
};

// Get single policy detail
exports.getPolicyDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const policy = await Policy.findOne({ _id: id, clientId: req.clientId });

    if (!policy) {
      return sendResponse(res, 404, false, 'Policy/Announcement not found.');
    }

    return sendResponse(res, 200, true, 'Policy details fetched', policy);
  } catch (error) {
    next(error);
  }
};
