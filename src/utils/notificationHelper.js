const Notification = require('../models/Notification');
const User = require('../models/User');
const { messaging } = require('../config/firebase');

/**
 * Utility to send notifications.
 * If recipient is provided, sends to that single user.
 * If recipientRoles is provided, finds all active users with those roles for the clientId and sends to all.
 */
const sendNotification = async ({ recipient, sender, clientId, title, message, type, link, recipientRoles }) => {
  try {
    let recipients = [];
    
    if (recipient) {
      recipients.push(recipient);
    } else if (recipientRoles && recipientRoles.length > 0 && clientId) {
      const targetUsers = await User.find({
        clientId,
        role: { $in: recipientRoles },
        isActive: true
      }).select('_id');
      recipients = targetUsers.map(u => u._id);
    }

    if (recipients.length === 0) return;

    const notificationDocs = recipients.map(rec => ({
      recipient: rec,
      sender: sender || null,
      clientId: clientId || null,
      title,
      message,
      type: type || 'alert',
      link: link || '',
      isRead: false
    }));

    await Notification.insertMany(notificationDocs);

    // Dynamic FCM Push Notifications Integration
    const usersWithTokens = await User.find({
      _id: { $in: recipients },
      fcmToken: { $ne: '', $exists: true }
    }).select('fcmToken');

    const fcmTokens = usersWithTokens.map(u => u.fcmToken);

    if (messaging && fcmTokens.length > 0) {
      try {
        const payload = {
          tokens: fcmTokens,
          notification: {
            title,
            body: message
          },
          data: {
            type: type || 'alert',
            link: link || ''
          },
          android: {
            notification: {
              clickAction: 'FLUTTER_NOTIFICATION_CLICK',
              sound: 'default'
            }
          }
        };

        const response = await messaging.sendEachForMulticast(payload);
        console.log(`FCM Multicast sent: ${response.successCount} sent. ${response.failureCount} failed.`);
      } catch (fcmError) {
        console.error('FCM push notification delivery failed:', fcmError.message);
      }
    }
  } catch (error) {
    console.error('sendNotification helper error:', error.message);
  }
};

module.exports = {
  sendNotification
};
