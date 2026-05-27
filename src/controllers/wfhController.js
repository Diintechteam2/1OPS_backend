const WFHRequest = require('../models/WFHRequest');
const sendResponse = require('../utils/sendResponse');

// Request WFH
exports.requestWfh = async (req, res, next) => {
  try {
    const { date, reason } = req.body;

    if (!date || !reason) {
      return sendResponse(res, 400, false, 'Date and reason are required.');
    }

    const request = await WFHRequest.create({
      userId: req.user._id,
      clientId: req.clientId,
      date: new Date(date),
      reason,
      status: 'pending'
    });

    return sendResponse(res, 201, true, 'WFH request submitted successfully', request);
  } catch (error) {
    next(error);
  }
};

// Get own WFH request history
exports.getMyRequests = async (req, res, next) => {
  try {
    const requests = await WFHRequest.find({ userId: req.user._id, clientId: req.clientId }).sort({ createdAt: -1 });
    return sendResponse(res, 200, true, 'WFH request history fetched', requests);
  } catch (error) {
    next(error);
  }
};

// Cancel pending WFH request
exports.cancelWfh = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await WFHRequest.findOne({ _id: id, userId: req.user._id, clientId: req.clientId });

    if (!request) {
      return sendResponse(res, 404, false, 'WFH request not found.');
    }

    if (request.status !== 'pending') {
      return sendResponse(res, 400, false, `Cannot cancel request that is already ${request.status}.`);
    }

    await WFHRequest.findByIdAndDelete(id);
    return sendResponse(res, 200, true, 'WFH request cancelled successfully');
  } catch (error) {
    next(error);
  }
};
