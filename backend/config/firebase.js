'use strict';

const admin = require('firebase-admin');

// Load service account from secret file in production, local file in development
let serviceAccount;
try {
    // Try production path first (Render secret files)
    serviceAccount = require('/etc/secrets/firebase-service-account.json');
} catch (error) {
    // Fallback to local development file
    serviceAccount = require('../firebase-service-account.json');
}

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

module.exports = { admin, db };
