const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let messaging = null;

try {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (serviceAccountPath) {
    // Resolve absolute path relative to project working directory
    const absolutePath = path.resolve(process.cwd(), serviceAccountPath);
    
    if (fs.existsSync(absolutePath)) {
      const serviceAccount = require(absolutePath);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId || serviceAccount.project_id
      });
      
      messaging = admin.messaging();
      console.log('Firebase Admin SDK initialized successfully.');
    } else {
      console.warn(`Firebase service account file not found at: ${absolutePath}`);
    }
  } else {
    console.warn('FIREBASE_SERVICE_ACCOUNT environment variable is missing.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error.message);
}

module.exports = {
  admin,
  messaging
};
