'use strict';

const admin = require('firebase-admin');

// Load service account - prioritize environment variable
let serviceAccount;

console.log('=== FIREBASE CONFIG DEBUG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('FIREBASE_SERVICE_ACCOUNT exists:', !!process.env.FIREBASE_SERVICE_ACCOUNT);

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log('Using environment variable for Firebase config');
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        // VERY IMPORTANT: Fix newlines in private key
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        console.log('Successfully parsed Firebase service account from environment');
    } catch (error) {
        console.error('Error parsing FIREBASE_SERVICE_ACCOUNT:', error.message);
        throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT environment variable');
    }
} else {
    console.log('No environment variable found, trying local file');
    try {
        serviceAccount = require('../firebase-service-account.json');
        console.log('Using local development file');
    } catch (error) {
        throw new Error('Firebase service account not found. Set FIREBASE_SERVICE_ACCOUNT environment variable or ensure firebase-service-account.json exists.');
    }
}

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

module.exports = { admin, db };
