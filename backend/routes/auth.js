'use strict';

const express = require('express');
const { admin, db } = require('../config/firebase');
const { verifyFirebaseToken, authenticateFirebaseToken } = require('../utils/auth');

const router = express.Router();

/**
 * Register new user
 * Creates user profile in Firestore after Firebase Auth registration
 */
router.post('/register', verifyFirebaseToken, async (req, res) => {
    try {
        const { fullName, email, firebaseUid, companyCode, companyName, isCreatingCompany } = req.body;

        if (!fullName || !email || !firebaseUid) {
            return res.status(400).json({ message: 'Missing required fields', success: false });
        }

        // Verify the Firebase UID matches the authenticated user
        if (req.firebaseUser.uid !== firebaseUid) {
            return res.status(403).json({ message: 'Unauthorized', success: false });
        }

        let companyId;
        let role = 'user';
        let leaveBalance = { annual: 20, sick: 10, personal: 0, emergency: 0 };

        if (isCreatingCompany) {
            if (!companyName) {
                return res.status(400).json({ message: 'Company name is required', success: false });
            }

            // Generate company code
            const generatedCompanyCode = companyName.substring(0, 4).toUpperCase() + Math.floor(1000 + Math.random() * 9000);
            companyId = db.collection('companies').doc().id;

            // Create company in Firestore
            await db.collection('companies').doc(companyId).set({
                name: companyName,
                companyCode: generatedCompanyCode,
                settings: {
                    annualLeaveBalance: 20,
                    sickLeaveBalance: 10,
                    personalLeaveBalance: 0,
                    emergencyLeaveBalance: 0,
                    departments: ['IT', 'HR', 'Maintenance', 'Finance', 'Operations'],
                    jobTitles: {
                        IT: ['Head of IT', 'IT Manager', 'Developer', 'System Administrator', 'IT Support'],
                        HR: ['Head of HR', 'HR Manager', 'HR Coordinator', 'Recruiter'],
                        Maintenance: ['Head of Maintenance', 'Maintenance Manager', 'Technician'],
                        Finance: ['Head of Finance', 'Finance Manager', 'Accountant', 'Financial Analyst'],
                        Operations: ['Head of Operations', 'Operations Manager', 'Coordinator']
                    }
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            role = 'superadmin';
        } else {
            if (!companyCode) {
                return res.status(400).json({ message: 'Company code is required', success: false });
            }

            // Find company by code
            const companiesSnapshot = await db.collection('companies')
                .where('companyCode', '==', companyCode)
                .limit(1)
                .get();

            if (companiesSnapshot.empty) {
                return res.status(400).json({ message: 'Invalid company code', success: false });
            }

            const companyDoc = companiesSnapshot.docs[0];
            companyId = companyDoc.id;
            const companyData = companyDoc.data();

            leaveBalance = {
                annual: companyData.settings.annualLeaveBalance || 20,
                sick: companyData.settings.sickLeaveBalance || 10,
                personal: companyData.settings.personalLeaveBalance || 0,
                emergency: companyData.settings.emergencyLeaveBalance || 0
            };
        }

        // Create user profile in Firestore
        await db.collection('users').doc(firebaseUid).set({
            email,
            fullName,
            role,
            jobTitle: role === 'superadmin' ? 'Head of IT' : 'Employee',
            department: role === 'superadmin' ? 'IT' : '',
            companyId,
            leaveBalance,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(201).json({ 
            message: `${fullName} successfully registered!`, 
            success: true 
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration', success: false });
    }
});

/**
 * Get user data
 * Returns user profile data from Firestore
 */
router.get('/user-data', authenticateFirebaseToken, async (req, res) => {
    try {
        const userDoc = await db.collection('users').doc(req.firebaseUser.uid).get();

        if (!userDoc.exists) {
            return res.status(404).json({ message: 'User not found', success: false });
        }

        const userData = userDoc.data();

        res.status(200).json({
            success: true,
            user: {
                id: req.firebaseUser.uid,
                email: userData.email,
                fullName: userData.fullName,
                role: userData.role,
                jobTitle: userData.jobTitle,
                department: userData.department,
                companyId: userData.companyId,
                leaveBalance: userData.leaveBalance
            }
        });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});

module.exports = router;
