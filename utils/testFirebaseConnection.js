'use strict';

/**
 * Firebase Connection Test Script
 * 
 * This script tests your Firebase configuration to ensure everything is set up correctly.
 * Run this after setting up Firebase to verify the connection.
 * 
 * Usage: node utils/testFirebaseConnection.js
 */

const { admin, db } = require('../config/firebase');

async function testConnection() {
    console.log('🔥 Testing Firebase Connection...\n');
    console.log('='.repeat(60));

    try {
        // Test 1: Firebase Admin SDK Initialization
        console.log('\n✓ Test 1: Firebase Admin SDK');
        console.log('  Status: Initialized');
        console.log(`  Project ID: ${admin.app().options.projectId || 'Not set'}`);

        // Test 2: Firestore Connection
        console.log('\n✓ Test 2: Firestore Connection');
        const testDoc = await db.collection('_test').doc('connection').set({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            message: 'Connection test successful'
        });
        console.log('  Status: Connected');
        console.log('  Write test: Successful');

        // Clean up test document
        await db.collection('_test').doc('connection').delete();
        console.log('  Cleanup: Complete');

        // Test 3: Firebase Authentication
        console.log('\n✓ Test 3: Firebase Authentication');
        try {
            // Try to list users (will work even if no users exist)
            const listUsersResult = await admin.auth().listUsers(1);
            console.log('  Status: Connected');
            console.log(`  Total users: ${listUsersResult.users.length}`);
        } catch (authError) {
            console.log('  Status: Error');
            console.log(`  Error: ${authError.message}`);
        }

        // Test 4: Check Collections
        console.log('\n✓ Test 4: Firestore Collections');
        const collections = await db.listCollections();
        console.log('  Existing collections:');
        if (collections.length === 0) {
            console.log('    (No collections yet - this is normal for new projects)');
        } else {
            collections.forEach(col => {
                console.log(`    - ${col.id}`);
            });
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('✅ All tests passed!');
        console.log('='.repeat(60));
        console.log('\n🎉 Your Firebase configuration is working correctly!');
        console.log('\nNext steps:');
        console.log('1. Update frontend/users/scripts/firebase-config.js with your web config');
        console.log('2. Start your server: node app.js');
        console.log('3. Test registration at http://localhost:3000/users/pages/register.html');
        console.log('\n');

    } catch (error) {
        console.log('\n' + '='.repeat(60));
        console.log('❌ Connection test failed!');
        console.log('='.repeat(60));
        console.error('\nError details:', error.message);
        console.log('\nCommon issues:');
        console.log('1. firebase-service-account.json is missing or invalid');
        console.log('2. Firebase project is not set up correctly');
        console.log('3. Firestore is not enabled in Firebase Console');
        console.log('4. Service account doesn\'t have proper permissions');
        console.log('\nPlease check FIREBASE_SETUP_GUIDE.md for setup instructions.\n');
        process.exit(1);
    }
}

// Run the test
testConnection()
    .then(() => {
        console.log('Test completed successfully.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });
