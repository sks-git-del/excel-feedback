// ==========================================
// FIREBASE ADMIN CONFIGURATION
// ==========================================
// Server-side Firebase Admin SDK for backend operations
// IMPORTANT: You need a service account JSON file from Firebase Console

const admin = require('firebase-admin');
const path = require('path');

// Try to initialize with service account
try {
  // Option 1: Load from service-account.json file (recommended for local development)
  const serviceAccountPath = path.join(__dirname, 'service-account.json');
  
  // Check if service account file exists
  const fs = require('fs');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    console.log('✅ Firebase Admin initialized with service account');
  } else {
    // Option 2: Use environment variable FIREBASE_SERVICE_ACCOUNT_JSON
    const serviceAcctJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAcctJson) {
      const serviceAccount = JSON.parse(Buffer.from(serviceAcctJson, 'base64').toString());
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      console.log('✅ Firebase Admin initialized with environment variable');
    } else {
      throw new Error('No service account found. See instructions below.');
    }
  }
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
  console.error(`
    \n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    FIREBASE ADMIN SETUP REQUIRED
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    To enable admin features, you need a Service Account:
    
    1. Go to: https://console.firebase.google.com/project/feedback-system-b513d/settings/serviceaccounts/adminsdk
    2. Click "Generate New Private Key"
    3. Save the JSON file as "service-account.json" in this directory
    4. Restart the server: npm start
    
    OR set environment variable:
    FIREBASE_SERVICE_ACCOUNT_JSON=<base64-encoded-service-account>
    
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
  
  // Don't crash - let server continue without admin features
  // Routes will return error message to user
}

module.exports = admin;
