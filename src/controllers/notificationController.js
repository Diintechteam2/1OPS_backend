const Notification = require('../models/Notification');
const User = require('../models/User');
const sendResponse = require('../utils/sendResponse');

// Fetch notifications for the logged-in user
exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const notifications = await Notification.find({ recipient: userId, clientId: req.clientId })
      .populate('sender', 'name email role profileImageUrl')
      .sort({ createdAt: -1 })
      .limit(100);

    return sendResponse(res, 200, true, 'Notifications fetched successfully', notifications);
  } catch (error) {
    next(error);
  }
};

// Mark a specific notification as read
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return sendResponse(res, 404, false, 'Notification not found.');
    }

    return sendResponse(res, 200, true, 'Notification marked as read', notification);
  } catch (error) {
    next(error);
  }
};

// Mark all user notifications as read
exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { recipient: userId, clientId: req.clientId, isRead: false },
      { isRead: true }
    );

    return sendResponse(res, 200, true, 'All notifications marked as read successfully.');
  } catch (error) {
    next(error);
  }
};

// Save mobile device FCM Token
exports.saveFcmToken = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) {
      return sendResponse(res, 400, false, 'FCM token is required.');
    }

    const userId = req.user._id;
    await User.findByIdAndUpdate(userId, { fcmToken });

    return sendResponse(res, 200, true, 'FCM token saved successfully.');
  } catch (error) {
    next(error);
  }
};
