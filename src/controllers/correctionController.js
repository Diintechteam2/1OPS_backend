const CorrectionRequest = require('../models/CorrectionRequest');
const sendResponse = require('../utils/sendResponse');

// Request attendance correction
exports.requestCorrection = async (req, res, next) => {
  try {
    const { date, correctionType, requestedCheckIn, requestedCheckOut, reason } = req.body;

    if (!date || !correctionType || !reason) {
      return sendResponse(res, 400, false, 'Date, correction type, and reason are required.');
    }

    const payload = {
      userId: req.user._id,
      clientId: req.clientId,
      date: new Date(date),
      correctionType,
      reason,
      status: 'pending'
    };

    if (requestedCheckIn) payload.requestedCheckIn = new Date(requestedCheckIn);
    if (requestedCheckOut) payload.requestedCheckOut = new Date(requestedCheckOut);

    const request = await CorrectionRequest.create(payload);

    return sendResponse(res, 201, true, 'Attendance correction request submitted successfully', request);
  } catch (error) {
    next(error);
  }
};

// Get own correction request history
exports.getMyRequests = async (req, res, next) => {
  try {
    const requests = await CorrectionRequest.find({ userId: req.user._id, clientId: req.clientId }).sort({ createdAt: -1 });
    return sendResponse(res, 200, true, 'Correction request history fetched', requests);
  } catch (error) {
    next(error);
  }
};
