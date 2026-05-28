const WFHRequest = require('../models/WFHRequest');
const sendResponse = require('../utils/sendResponse');

exports.requestWfh = async (req, res, next) => {
  try {
    let { fromDate, toDate, date, reason } = req.body;

    // Fallback for single date input
    if (!fromDate && !toDate && date) {
      fromDate = date;
      toDate = date;
    }

    if (!fromDate || !toDate || !reason) {
      return sendResponse(res, 400, false, 'From date, to date and reason are required.');
    }

    if (new Date(fromDate) > new Date(toDate)) {
      return sendResponse(res, 400, false, 'From date cannot be after To date.');
    }

    const request = await WFHRequest.create({
      userId: req.user._id,
      clientId: req.clientId,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
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
