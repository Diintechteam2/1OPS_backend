const Client = require('../models/Client');
const sendResponse = require('../utils/sendResponse');

/**
 * clientSlugVerification middleware
 * 
 * 1. URL se :clientSlug extract karta hai
 * 2. Database se us slug ka Client record fetch karta hai
 * 3. Logged-in user ke clientId se URL ke client ka _id compare karta hai
 * 4. Mismatch hone par 403 Forbidden return karta hai
 * 5. Match hone par req.client set karke next() call karta hai
 */
const clientSlugVerification = async (req, res, next) => {
  try {
    const { clientSlug } = req.params;

    if (!clientSlug) {
      return res.status(400).json({
        success: false,
        message: 'Client slug is missing from URL.',
        error: 'BAD_REQUEST',
      });
    }

    // Fetch client by slug
    const client = await Client.findOne({ slug: clientSlug, isActive: true });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: `No active client found with slug: "${clientSlug}".`,
        error: 'NOT_FOUND',
      });
    }

    // Verify that the logged-in user belongs to this client
    const userClientId = req.user.clientId ? req.user.clientId.toString() : null;
    const urlClientId = client._id.toString();

    if (userClientId !== urlClientId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not belong to this client workspace.',
        error: 'FORBIDDEN',
      });
    }

    // Attach client to request for downstream use
    req.client = client;
    req.clientId = client._id;
    next();
  } catch (error) {
    console.error('clientSlugVerification error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal error during client verification.',
      error: 'INTERNAL_SERVER_ERROR',
    });
  }
};

module.exports = clientSlugVerification;
