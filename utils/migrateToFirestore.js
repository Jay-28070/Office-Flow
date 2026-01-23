'use strict';

/**
 * Migration Script: JSON Database to Firestore
 * 
 * This script migrates existing data from database.json to Firebase Firestore
 * Run this once after setting up Firebase to preserve existing data
 * 
 * Usage: node utils/migrateToFirestore.js
 */

const { admin, db } = require('../config/firebase');
const { readDB } = require('../db/dbHelper');

async function migrateData() {
    console.log('🚀 Starting migration from JSON database to Firestore...\n');

    try {
        // Read existing JSON database
        const jsonDb = await readDB();
        console.log('✅ Successfully read JSON database');

        // Migrate Companies
        console.log('\n📦 Migrating companies...');
        let companiesCount = 0;
        for (const company of jsonDb.companies) {
            await db.collection('companies').doc(company.id).set({
                name: company.name,
                companyCode: company.companyCode,
                settings: company.settings,
                createdAt: admin.firestore.Timestamp.fromDate(new Date(company.createdAt))
            });
            companiesCount++;
            console.log(`  ✓ Migrated company: ${company.name}`);
        }
        console.log(`✅ Migrated ${companiesCount} companies`);

        // Migrate Users (Note: Passwords need to be recreated in Firebase Auth)
        console.log('\n👥 Migrating users...');
        console.log('⚠️  WARNING: User passwords cannot be migrated automatically.');
        console.log('   Users will need to use "Forgot Password" to reset their passwords.');
        
        let usersCount = 0;
        const userMigrationReport = [];

        for (const user of jsonDb.users) {
            try {
                // Create user in Firebase Authentication
                let firebaseUser;
                try {
                    firebaseUser = await admin.auth().createUser({
                        uid: user.id,
                        email: user.email,
                        displayName: user.fullName,
                        // Note: We cannot migrate the hashed password
                        // Users will need to reset their password
                    });
                } catch (authError) {
                    if (authError.code === 'auth/uid-already-exists') {
                        console.log(`  ⚠️  User ${user.email} already exists in Firebase Auth`);
                        firebaseUser = await admin.auth().getUserByEmail(user.email);
                    } else {
                        throw authError;
                    }
                }

                // Create user profile in Firestore
                await db.collection('users').doc(firebaseUser.uid).set({
                    email: user.email,
                    fullName: user.fullName,
                    role: user.role,
                    jobTitle: user.jobTitle || '',
                    department: user.department || '',
                    companyId: user.companyId,
                    leaveBalance: user.leaveBalance || { annual: 20, sick: 10, personal: 0, emergency: 0 },
                    createdAt: admin.firestore.Timestamp.fromDate(new Date(user.createdAt))
                });

                usersCount++;
                userMigrationReport.push({
                    email: user.email,
                    status: 'success',
                    needsPasswordReset: true
                });
                console.log(`  ✓ Migrated user: ${user.email}`);
            } catch (error) {
                console.error(`  ✗ Failed to migrate user ${user.email}:`, error.message);
                userMigrationReport.push({
                    email: user.email,
                    status: 'failed',
                    error: error.message
                });
            }
        }
        console.log(`✅ Migrated ${usersCount} users`);

        // Migrate Admin Requests
        console.log('\n📋 Migrating admin requests...');
        let adminRequestsCount = 0;
        if (jsonDb.adminRequests && jsonDb.adminRequests.length > 0) {
            for (const request of jsonDb.adminRequests) {
                await db.collection('adminRequests').doc(request.id).set({
                    userId: request.userId,
                    userName: request.userName,
                    userEmail: request.userEmail,
                    companyId: request.companyId,
                    status: request.status,
                    createdAt: admin.firestore.Timestamp.fromDate(new Date(request.createdAt)),
                    ...(request.approvedAt && { approvedAt: admin.firestore.Timestamp.fromDate(new Date(request.approvedAt)) }),
                    ...(request.rejectedAt && { rejectedAt: admin.firestore.Timestamp.fromDate(new Date(request.rejectedAt)) })
                });
                adminRequestsCount++;
                console.log(`  ✓ Migrated admin request from: ${request.userName}`);
            }
        }
        console.log(`✅ Migrated ${adminRequestsCount} admin requests`);

        // Migrate Leave Requests
        console.log('\n🏖️  Migrating leave requests...');
        let leaveRequestsCount = 0;
        if (jsonDb.leaveRequests && jsonDb.leaveRequests.length > 0) {
            for (const request of jsonDb.leaveRequests) {
                await db.collection('leaveRequests').doc(request.id).set({
                    userId: request.userId,
                    userName: request.userName,
                    userEmail: request.userEmail,
                    companyId: request.companyId,
                    title: request.title,
                    description: request.description,
                    priority: request.priority,
                    category: request.category,
                    type: request.type,
                    leave: request.leave || {},
                    deduct: request.deduct || false,
                    status: request.status,
                    dateSubmitted: admin.firestore.Timestamp.fromDate(new Date(request.dateSubmitted)),
                    lastUpdated: admin.firestore.Timestamp.fromDate(new Date(request.lastUpdated)),
                    ...(request.approvedAt && { approvedAt: admin.firestore.Timestamp.fromDate(new Date(request.approvedAt)) }),
                    ...(request.rejectedAt && { rejectedAt: admin.firestore.Timestamp.fromDate(new Date(request.rejectedAt)) })
                });
                leaveRequestsCount++;
                console.log(`  ✓ Migrated leave request: ${request.title}`);
            }
        }
        console.log(`✅ Migrated ${leaveRequestsCount} leave requests`);

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 MIGRATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`Companies:       ${companiesCount}`);
        console.log(`Users:           ${usersCount}`);
        console.log(`Admin Requests:  ${adminRequestsCount}`);
        console.log(`Leave Requests:  ${leaveRequestsCount}`);
        console.log('='.repeat(60));

        // User Password Reset Instructions
        if (usersCount > 0) {
            console.log('\n⚠️  IMPORTANT: USER PASSWORD RESET REQUIRED');
            console.log('='.repeat(60));
            console.log('All migrated users need to reset their passwords.');
            console.log('Options:');
            console.log('1. Users can click "Forgot Password" on the login page');
            console.log('2. Admin can send password reset emails from Firebase Console');
            console.log('3. Use the Firebase Admin SDK to send reset emails programmatically');
            console.log('\nUsers that need password reset:');
            userMigrationReport
                .filter(u => u.status === 'success')
                .forEach(u => console.log(`  - ${u.email}`));
        }

        console.log('\n✅ Migration completed successfully!');
        console.log('\n💡 Next steps:');
        console.log('1. Verify data in Firebase Console');
        console.log('2. Send password reset emails to all users');
        console.log('3. Test login with a migrated user account');
        console.log('4. Backup database.json before removing it');

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateData()
    .then(() => {
        console.log('\n👋 Migration script finished. Exiting...');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Unexpected error:', error);
        process.exit(1);
    });
