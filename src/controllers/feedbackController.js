const Feedback = require('../models/Feedback');
const sendResponse = require('../utils/sendResponse');

// Submit grievance or feedback
exports.submitFeedback = async (req, res, next) => {
  try {
    const { subject, message, priority = 'Medium' } = req.body;

    if (!subject || !message) {
      return sendResponse(res, 400, false, 'Subject and message are required.');
    }

    const feedback = await Feedback.create({
      userId: req.user._id,
      clientId: req.clientId,
      subject,
      message,
      priority,
      status: 'open'
    });

    return sendResponse(res, 201, true, 'Feedback/Grievance submitted successfully', feedback);
  } catch (error) {
    next(error);
  }
};

// Get own submitted feedbacks
exports.getMyFeedbacks = async (req, res, next) => {
  try {
    const feedbacks = await Feedback.find({ userId: req.user._id, clientId: req.clientId }).sort({ createdAt: -1 });
    return sendResponse(res, 200, true, 'Feedback history fetched', feedbacks);
  } catch (error) {
    next(error);
  }
};
