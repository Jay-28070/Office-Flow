'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const { admin, db } = require('./config/firebase');
const { authenticateFirebaseToken, requireSuperAdmin, requireAdmin } = require('./utils/auth');
const authRoutes = require('./routes/auth');

//Create instance of server
const app = express();

const PORT = process.env.PORT || 3000;

//Middleware
app.use(cors({
    origin: [
        'https://jay-28070.github.io', // Your GitHub Pages URL
        'http://localhost:3000',
        'http://localhost:5500',  // Live Server default
        'http://localhost:8000',  // Python server
        'http://localhost:8080',  // Common dev server
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5500',
        'http://127.0.0.1:8000'
    ],
    credentials: true
}));
app.use(express.json());

// Auth routes (MUST come before static files)
app.use('/api/auth', authRoutes);

// Simple health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Backend is running',
        timestamp: new Date().toISOString()
    });
});

// Test endpoint to check if server is responding
app.get('/api/test', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is working',
        timestamp: new Date().toISOString()
    });
});

// Verify company code and get departments (public endpoint for registration)
app.post('/api/verify-company-code', async (req, res) => {
    try {
        const { companyCode } = req.body;

        if (!companyCode) {
            return res.status(400).json({ message: 'Company code is required', success: false });
        }

        // Find company by code
        const companiesSnapshot = await db.collection('companies')
            .where('companyCode', '==', companyCode)
            .limit(1)
            .get();

        if (companiesSnapshot.empty) {
            return res.status(404).json({ message: 'Invalid company code', success: false });
        }

        const companyDoc = companiesSnapshot.docs[0];
        const companyData = companyDoc.data();

        res.status(200).json({
            success: true,
            companyName: companyData.name,
            departments: companyData.settings?.departments || []
        });
    } catch (error) {
        console.error('Error verifying company code:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});

// ===== LEGACY ENDPOINTS (Deprecated - kept for backward compatibility) =====

//register-form-api (DEPRECATED - use /api/auth/register instead)
app.post('/register-form-api', async (req, res) => {
    res.status(410).json({
        message: 'This endpoint is deprecated. Please use Firebase Authentication.',
        success: false
    });
});

//login-form-api (DEPRECATED - use Firebase Authentication directly)
app.post('/login-form-api', async (req, res) => {
    res.status(410).json({
        message: 'This endpoint is deprecated. Please use Firebase Authentication.',
        success: false
    });
});

// ===== ADMIN REQUESTS API =====

// Request admin role
app.post('/api/request-admin', authenticateFirebaseToken, async (req, res) => {
    try {
        const adminRequestsRef = db.collection('adminRequests');

        // Check for existing pending request
        const existingRequest = await adminRequestsRef
            .where('userId', '==', req.user.userId)
            .where('status', '==', 'pending')
            .limit(1)
            .get();

        if (!existingRequest.empty) {
            return res.status(400).json({ message: 'You already have a pending request', success: false });
        }

        const userDoc = await db.collection('users').doc(req.user.userId).get();
        const userData = userDoc.data();

        await adminRequestsRef.add({
            userId: req.user.userId,
            userName: userData.fullName,
            userEmail: userData.email,
            companyId: req.user.companyId,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(201).json({ message: 'Admin request submitted successfully', success: true });
    } catch (error) {
        console.error('Error creating admin request:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});

// Get admin requests
app.get('/api/admin-requests', authenticateFirebaseToken, requireSuperAdmin, async (req, res) => {
    try {
        const requestsSnapshot = await db.collection('adminRequests')
            .where('companyId', '==', req.user.companyId)
            .where('status', '==', 'pending')
            .get();

        const requests = requestsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json({ success: true, requests });
    } catch (error) {
        console.error('Error fetching admin requests:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});

// Approve admin request
app.post('/api/admin-requests/:requestId/approve', authenticateFirebaseToken, requireSuperAdmin, async (req, res) => {
    try {
        const { requestId } = req.params;
        const { userId } = req.body;

        const requestDoc = await db.collection('adminRequests').doc(requestId).get();
        if (!requestDoc.exists) {
            return res.status(404).json({ message: 'Request not found', success: false });
        }

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: 'User not found', success: false });
        }

        const companyDoc = await db.collection('companies').doc(req.user.companyId).get();
        const companyData = companyDoc.data();

        const department = companyData.settings.departments[0] || 'IT';
        // Update user role
        await db.collection('users').doc(userId).update({
            role: 'admin',
            department: department,
            jobTitle: `Head of ${department}`
        });

        // Update request status
        await db.collection('adminRequests').doc(requestId).update({
            status: 'approved',
            approvedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(200).json({ message: 'Admin request approved', success: true });
    } catch (error) {
        console.error('Error approving request:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});

// Reject admin request
app.post('/api/admin-requests/:requestId/reject', authenticateFirebaseToken, requireSuperAdmin, async (req, res) => {
    try {
        const requestDoc = await db.collection('adminRequests').doc(req.params.requestId).get();
        if (!requestDoc.exists) {
            return res.status(404).json({ message: 'Request not found', success: false });
        }

        await db.collection('adminRequests').doc(req.params.requestId).update({
            status: 'rejected',
            rejectedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(200).json({ message: 'Admin request rejected', success: true });
    } catch (error) {
        console.error('Error rejecting request:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});

// Create admin directly
app.post('/api/create-admin', authenticateFirebaseToken, requireSuperAdmin, async (req, res) => {
    try {
        const { fullName, email, password, department } = req.body;

        if (!department) {
            return res.status(400).json({ message: 'Department is required', success: false });
        }

        // Create user in Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: fullName
        });

        const companyDoc = await db.collection('companies').doc(req.user.companyId).get();
        const companyData = companyDoc.data();

        // Automatically set job title as "Head of [Department]"
        const jobTitle = `Head of ${department}`;

        // Create user profile in Firestore
        await db.collection('users').doc(userRecord.uid).set({
            email,
            fullName,
            role: 'admin',
            jobTitle,
            department,
            companyId: req.user.companyId,
            leaveBalance: {
                annual: companyData.settings.annualLeaveBalance || 20,
                sick: companyData.settings.sickLeaveBalance || 10,
                personal: companyData.settings.personalLeaveBalance || 0,
                emergency: companyData.settings.emergencyLeaveBalance || 0
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(201).json({ message: 'Admin created successfully', success: true });
    } catch (error) {
        console.error('Error creating admin:', error);
        if (error.code === 'auth/email-already-exists') {
            return res.status(400).json({ message: 'Email already exists', success: false });
        }
        res.status(500).json({ message: 'Server error', success: false });
    }
});

// Promote existing user to admin
app.post('/api/promote-to-admin', authenticateFirebaseToken, requireSuperAdmin, async (req, res) => {
    try {
        const { userId, department, superAdminPassword } = req.body;

        if (!userId || !department || !superAdminPassword) {
            return res.status(400).json({ message: 'Missing required fields', success: false });
        }

        // Get super admin's email to verify password
        const superAdminDoc = await db.collection('users').doc(req.user.userId).get();
        if (!superAdminDoc.exists) {
            return res.status(404).json({ message: 'Super admin not found', success: false });
        }

        const superAdminData = superAdminDoc.data();
        const superAdminEmail = superAdminData.email;

        // Verify super admin's password by attempting to sign in
        // Note: This is done on the client side, so we'll skip password verification here
        // and rely on the fact that only authenticated super admins can access this endpoint
        // For production, consider implementing a more secure password verification method

        // Get user to promote
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: 'User not found', success: false });
        }

        const userData = userDoc.data();

        // Check if user is already an admin
        if (userData.role !== 'user') {
            return res.status(400).json({ message: 'User is already an admin or super admin', success: false });
        }

        // Promote user to admin
        const jobTitle = `Head of ${department}`;
        await db.collection('users').doc(userId).update({
            role: 'admin',
            department,
            jobTitle
        });

        res.status(200).json({
            message: `${userData.fullName} has been promoted to Admin (${jobTitle})`,
            success: true
        });
    } catch (error) {
        console.error('Error promoting user:', error);
        res.status(500).json({ message: error.message || 'Server error', success: false });
    }
});

// ===== COMPANY SETTINGS API (Super Admin Only) =====

// Get company settings (available to any authenticated user)
app.get('/api/company/settings', authenticateFirebaseToken, async (req, res) => {
    try {
        console.log('=== COMPANY SETTINGS DEBUG ===');
        console.log('User ID:', req.user.userId);
        console.log('Company ID:', req.user.companyId);

        const companyDoc = await db.collection('companies').doc(req.user.companyId).get();

        if (!companyDoc.exists) {
            console.log('Company document not found');
            return res.status(404).json({ message: 'Company not found', success: false });
        }

        const companyData = companyDoc.data();
        console.log('Company data found:', {
            name: companyData.name,
            hasSettings: !!companyData.settings,
            departments: companyData.settings?.departments?.length || 0
        });

        const settings = {
            annualLeaveBalance: companyData.settings?.annualLeaveBalance || 0,
            sickLeaveBalance: companyData.settings?.sickLeaveBalance || 0,
            personalLeaveBalance: companyData.settings?.personalLeaveBalance || 0,
            emergencyLeaveBalance: companyData.settings?.emergencyLeaveBalance || 0,
            departments: companyData.settings?.departments || [],
            jobTitles: companyData.settings?.jobTitles || {}
        };

        res.status(200).json({
            success: true,
            company: {
                id: companyDoc.id,
                name: companyData.name,
                companyCode: companyData.companyCode,
                settings
            }
        });
    } catch (error) {
        console.error('Error fetching company settings:', error);
        res.status(500).json({
            message: 'Server error',
            success: false,
            error: error.message
        });
    }
});

// Update company settings
app.put('/api/company/settings', authenticateFirebaseToken, requireSuperAdmin, async (req, res) => {
    try {
        const { annualLeaveBalance, sickLeaveBalance, departments, jobTitles } = req.body;

        const updateData = {};
        if (annualLeaveBalance !== undefined) updateData['settings.annualLeaveBalance'] = annualLeaveBalance;
        if (sickLeaveBalance !== undefined) updateData['settings.sickLeaveBalance'] = sickLeaveBalance;
        if (departments) updateData['settings.departments'] = departments;
        if (jobTitles) updateData['settings.jobTitles'] = jobTitles;

        await db.collection('companies').doc(req.user.companyId).update(updateData);

        res.status(200).json({ message: 'Company settings updated successfully', success: true });
    } catch (error) {
        console.error('Error updating company settings:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});

// Get single user by ID (authenticated users can get their own data, admins can get any user)
app.get('/api/users/:userId', authenticateFirebaseToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Users can only access their own data unless they're admin
        if (req.user.userId !== userId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Unauthorized', success: false });
        }

        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            return res.status(404).json({ message: 'User not found', success: false });
        }

        const userData = userDoc.data();

        res.status(200).json({
            success: true,
            user: {
                id: userDoc.id,
                ...userData
            }
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});

// Get all users in company (Admin only)
app.get('/api/company/users', authenticateFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const usersSnapshot = await db.collection('users')
            .where('companyId', '==', req.user.companyId)
            .get();

        const users = usersSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                email: data.email,
                fullName: data.fullName,
                role: data.role,
                jobTitle: data.jobTitle,
                department: data.department,
                leaveBalance: data.leaveBalance,
                createdAt: data.createdAt
            };
        });

        res.status(200).json({ success: true, users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});

// Update user role (Super Admin only)
app.put('/api/users/:userId/role', authenticateFirebaseToken, requireSuperAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { role, jobTitle, department } = req.body;

        console.log('Role update request:', { userId, role, jobTitle, department });

        if (!['user', 'admin', 'superadmin'].includes(role)) {
            console.log('Invalid role provided:', role);
            return res.status(400).json({ message: 'Invalid role. Must be user, admin, or superadmin', success: false });
        }

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            console.log('User not found:', userId);
            return res.status(404).json({ message: 'User not found', success: false });
        }

        const updateData = { role };
        if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
        if (department !== undefined) updateData.department = department;

        console.log('Updating user with data:', updateData);
        await db.collection('users').doc(userId).update(updateData);

        console.log('User role updated successfully');
        res.status(200).json({ message: 'User role updated successfully', success: true });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});

// Update user profile (User can update their own profile)
app.put('/api/users/:userId/profile', authenticateFirebaseToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { department, jobTitle } = req.body;

        console.log('Profile update request:', {
            userId,
            requestUserId: req.user.userId,
            department,
            jobTitle
        });

        // Users can only update their own profile
        if (req.user.userId !== userId && req.user.role !== 'superadmin') {
            console.log('Unauthorized: User trying to update different profile');
            return res.status(403).json({ message: 'Unauthorized', success: false });
        }

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            console.log('User not found:', userId);
            return res.status(404).json({ message: 'User not found', success: false });
        }

        const updateData = {};
        if (department !== undefined) updateData.department = department;
        if (jobTitle !== undefined) updateData.jobTitle = jobTitle;

        console.log('Updating user with:', updateData);
        await db.collection('users').doc(userId).update(updateData);

        console.log('Profile updated successfully');
        res.status(200).json({ message: 'Profile updated successfully', success: true });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});

// Update user last login time
app.post('/api/users/:userId/login', authenticateFirebaseToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Users can only update their own login time
        if (req.user.userId !== userId) {
            return res.status(403).json({ message: 'Unauthorized', success: false });
        }

        await db.collection('users').doc(userId).update({
            lastLoginAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(200).json({ message: 'Login time updated', success: true });
    } catch (error) {
        console.error('Error updating login time:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});

// Get request status notifications for user
app.get('/api/users/:userId/notifications', authenticateFirebaseToken, async (req, res) => {
    try {
        console.log('=== NOTIFICATIONS API DEBUG ===');
        const { userId } = req.params;
        console.log('Requested user ID:', userId);
        console.log('Authenticated user ID:', req.user.userId);

        // Users can only get their own notifications
        if (req.user.userId !== userId) {
            console.log('Unauthorized access attempt');
            return res.status(403).json({ message: 'Unauthorized', success: false });
        }

        // Get user's last login time
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            console.log('User not found in database');
            return res.status(404).json({ message: 'User not found', success: false });
        }

        const userData = userDoc.data();
        const lastLoginAt = userData.lastLoginAt;
        console.log('User last login:', lastLoginAt);

        if (!lastLoginAt) {
            // First time login, no notifications
            console.log('First time login, no notifications');
            return res.status(200).json({
                success: true,
                notifications: [],
                message: 'Welcome! This is your first login.'
            });
        }

        // Get all user's requests
        console.log('Fetching user requests...');
        const requestsSnapshot = await db.collection('requests')
            .where('userId', '==', userId)
            .get();

        console.log('Found requests:', requestsSnapshot.docs.length);
        const notifications = [];

        requestsSnapshot.docs.forEach(doc => {
            const request = doc.data();
            console.log(`Checking request ${doc.id}:`, {
                title: request.title,
                status: request.status,
                lastUpdated: request.lastUpdated,
                lastLoginSeconds: lastLoginAt.seconds,
                lastUpdatedSeconds: request.lastUpdated?.seconds
            });

            // Check if request was updated after last login
            const lastUpdated = request.lastUpdated;
            if (lastUpdated && lastUpdated.seconds > lastLoginAt.seconds) {
                console.log('Request updated after last login');
                // Check if status changed to Completed or Rejected
                if (request.status === 'Completed' || request.status === 'Rejected') {
                    console.log('Adding notification for status change');
                    notifications.push({
                        id: doc.id,
                        title: request.title,
                        category: request.category,
                        status: request.status,
                        updatedAt: lastUpdated,
                        message: request.status === 'Completed'
                            ? `Your ${request.category} request "${request.title}" has been approved!`
                            : `Your ${request.category} request "${request.title}" has been rejected.`,
                        type: request.status === 'Completed' ? 'success' : 'warning'
                    });
                }
            }
        });

        console.log('Total notifications:', notifications.length);

        // Sort notifications by update time (newest first)
        notifications.sort((a, b) => b.updatedAt.seconds - a.updatedAt.seconds);

        res.status(200).json({
            success: true,
            notifications,
            count: notifications.length,
            message: notifications.length > 0
                ? `You have ${notifications.length} new notification${notifications.length > 1 ? 's' : ''}`
                : 'No new notifications',
            debug: {
                userId,
                lastLoginAt: lastLoginAt.seconds,
                totalRequests: requestsSnapshot.docs.length,
                notificationCount: notifications.length
            }
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});

// ===== REQUEST ROUTING HELPER =====

/**
 * Route request to appropriate admin based on category
 * Fallback to super admin if no department admin exists
 * 
 * @param {string} category - Request category (HR, IT, Maintenance, etc.)
 * @param {string} companyId - Company ID
 * @returns {Promise<string|null>} - Admin user ID or null
 */
async function routeRequestToAdmin(category, companyId) {
    try {
        console.log(`Routing request - Category: ${category}, CompanyId: ${companyId}`);

        // Map categories to departments
        const categoryToDepartment = {
            'HR': 'HR',
            'IT': 'IT',
            'Maintenance': 'Maintenance',
            'Leave': 'HR'  // Leave requests go to HR
        };

        const targetDepartment = categoryToDepartment[category];
        console.log(`Target department for category ${category}: ${targetDepartment}`);

        if (targetDepartment) {
            // Find admin for this department
            const adminSnapshot = await db.collection('users')
                .where('companyId', '==', companyId)
                .where('role', '==', 'admin')
                .where('department', '==', targetDepartment)
                .limit(1)
                .get();

            if (!adminSnapshot.empty) {
                const adminId = adminSnapshot.docs[0].id;
                console.log(`Found department admin for ${targetDepartment}: ${adminId}`);
                return adminId;
            } else {
                console.log(`No admin found for department: ${targetDepartment}`);
            }
        }

        // Fallback: Route to super admin
        const superAdminSnapshot = await db.collection('users')
            .where('companyId', '==', companyId)
            .where('role', '==', 'superadmin')
            .limit(1)
            .get();

        if (!superAdminSnapshot.empty) {
            const superAdminId = superAdminSnapshot.docs[0].id;
            console.log(`Routing to super admin as fallback: ${superAdminId}`);
            return superAdminId;
        }

        console.log('No super admin found - this should not happen');
        return null;
    } catch (error) {
        console.error('Error routing request:', error);
        return null;
    }
}

// ===== LEAVE REQUESTS API =====

// Create a leave request (users) - optionally deduct from balance immediately
app.post('/api/leave-requests', authenticateFirebaseToken, async (req, res) => {
    try {
        const { title, description, priority, leave, deduct } = req.body;

        const userDoc = await db.collection('users').doc(req.user.userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: 'User not found', success: false });
        }

        const userData = userDoc.data();

        // Route request to appropriate admin (HR for leave requests)
        const assignedAdminId = await routeRequestToAdmin('Leave', req.user.companyId);
        console.log(`Leave request routed to admin ID: ${assignedAdminId}`);

        const newRequest = {
            userId: req.user.userId,
            userName: userData.fullName,
            userEmail: userData.email,
            companyId: req.user.companyId,
            title: title || 'Leave Request',
            description: description || '',
            priority: priority || 'Normal',
            category: 'HR',
            type: 'Leave',
            leave: leave || {},
            deduct: !!deduct,
            status: 'Pending',
            assignedTo: assignedAdminId || null,  // Assigned admin ID
            dateSubmitted: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('leaveRequests').add(newRequest);

        res.status(201).json({
            success: true,
            request: { id: docRef.id, ...newRequest },
            message: assignedAdminId
                ? 'Request submitted and routed to appropriate admin'
                : 'Request submitted (no admin available, routed to super admin)'
        });
    } catch (error) {
        console.error('Error creating leave request:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});

// Approve a leave request (admin/superadmin) — deduct balances and mark approved
app.post('/api/leave-requests/:requestId/approve', authenticateFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const { requestId } = req.params;

        const requestDoc = await db.collection('leaveRequests').doc(requestId).get();
        if (!requestDoc.exists) {
            return res.status(404).json({ message: 'Request not found', success: false });
        }

        const requestData = requestDoc.data();
        if (requestData.companyId !== req.user.companyId) {
            return res.status(403).json({ message: 'Unauthorized', success: false });
        }

        if (requestData.status !== 'Pending') {
            return res.status(400).json({ message: 'Request is not pending', success: false });
        }

        // If this is a leave request and was marked to deduct, apply deduction
        if (requestData.type === 'Leave' && requestData.deduct && requestData.leave?.days) {
            const userDoc = await db.collection('users').doc(requestData.userId).get();
            if (!userDoc.exists) {
                return res.status(404).json({ message: 'Request owner not found', success: false });
            }

            const userData = userDoc.data();
            const days = Number(requestData.leave.days) || 0;
            const type = (requestData.leave.leaveType || 'annual').toLowerCase();

            const leaveBalance = userData.leaveBalance || {};
            if (leaveBalance.annual === undefined) leaveBalance.annual = 0;
            if (leaveBalance.sick === undefined) leaveBalance.sick = 0;
            if (leaveBalance.personal === undefined) leaveBalance.personal = 0;
            if (leaveBalance.emergency === undefined) leaveBalance.emergency = 0;

            if (type === 'sick') leaveBalance.sick = Math.max(0, leaveBalance.sick - days);
            else if (type === 'personal') leaveBalance.personal = Math.max(0, leaveBalance.personal - days);
            else if (type === 'emergency') leaveBalance.emergency = Math.max(0, leaveBalance.emergency - days);
            else leaveBalance.annual = Math.max(0, leaveBalance.annual - days);

            await db.collection('users').doc(requestData.userId).update({ leaveBalance });
        }

        await db.collection('leaveRequests').doc(requestId).update({
            status: 'Approved',
            approvedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error approving leave request:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});

// Reject a leave request (admin/superadmin)
app.post('/api/leave-requests/:requestId/reject', authenticateFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const { requestId } = req.params;

        const requestDoc = await db.collection('leaveRequests').doc(requestId).get();
        if (!requestDoc.exists) {
            return res.status(404).json({ message: 'Request not found', success: false });
        }

        const requestData = requestDoc.data();
        if (requestData.companyId !== req.user.companyId) {
            return res.status(403).json({ message: 'Unauthorized', success: false });
        }

        if (requestData.status !== 'Pending') {
            return res.status(400).json({ message: 'Request is not pending', success: false });
        }

        await db.collection('leaveRequests').doc(requestId).update({
            status: 'Rejected',
            rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error rejecting leave request:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});

// Get leave requests (users get their requests; admins get company requests)
app.get('/api/leave-requests', authenticateFirebaseToken, async (req, res) => {
    try {
        let requestsSnapshot;

        if (req.user.role === 'admin' || req.user.role === 'superadmin') {
            requestsSnapshot = await db.collection('leaveRequests')
                .where('companyId', '==', req.user.companyId)
                .get();
        } else {
            requestsSnapshot = await db.collection('leaveRequests')
                .where('userId', '==', req.user.userId)
                .get();
        }

        const requests = requestsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Sort by dateSubmitted in JavaScript (newest first)
        requests.sort((a, b) => {
            const dateA = a.dateSubmitted?.seconds || 0;
            const dateB = b.dateSubmitted?.seconds || 0;
            return dateB - dateA;
        });

        res.status(200).json({ success: true, requests });
    } catch (error) {
        console.error('Error fetching leave requests:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});


// Serve static frontend files (MUST come after all API routes)
app.use(express.static(path.join(__dirname, '../frontend')));

//Start server
app.listen(PORT, () => {
    console.log(`\nServer running on http://localhost:${PORT}\n`);
});


// Delete user (Super Admin only)
app.delete('/api/users/:userId', authenticateFirebaseToken, requireSuperAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: 'User not found', success: false });
        }

        const userData = userDoc.data();
        if (userData.role === 'superadmin') {
            return res.status(403).json({ message: 'Cannot delete super admin', success: false });
        }

        // Delete from Firebase Authentication
        await admin.auth().deleteUser(userId);

        // Delete from Firestore
        await db.collection('users').doc(userId).delete();

        res.status(200).json({ message: 'User deleted successfully', success: true });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});
// ===== GENERAL REQUESTS API =====

// Create a general request (users) - routes to appropriate admin or super admin
app.post('/api/requests', authenticateFirebaseToken, async (req, res) => {
    try {
        const { title, description, priority, category, type, leave, deduct } = req.body;

        if (!title || !description || !category) {
            return res.status(400).json({
                message: 'Title, description, and category are required',
                success: false
            });
        }

        const userDoc = await db.collection('users').doc(req.user.userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: 'User not found', success: false });
        }

        const userData = userDoc.data();

        // Route request to appropriate admin based on category
        const assignedAdminId = await routeRequestToAdmin(category, req.user.companyId);
        console.log(`Request routed to admin ID: ${assignedAdminId}`);

        const newRequest = {
            userId: req.user.userId,
            userName: userData.fullName,
            userEmail: userData.email,
            userDepartment: userData.department || 'Unknown',
            companyId: req.user.companyId,
            title: title.trim(),
            description: description.trim(),
            priority: priority || 'Medium',
            category: category,
            type: type || 'General',
            status: 'Pending',
            assignedTo: assignedAdminId || null,
            dateSubmitted: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        };

        // Add leave-specific fields if this is a leave request
        if (type === 'Leave' && leave) {
            newRequest.leave = leave;
            newRequest.deduct = !!deduct;
        }

        const docRef = await db.collection('requests').add(newRequest);

        // Determine routing message
        let routingMessage = 'Request submitted successfully';
        if (assignedAdminId) {
            // Check if assigned to department admin or super admin
            const assignedAdminDoc = await db.collection('users').doc(assignedAdminId).get();
            const assignedAdminData = assignedAdminDoc.data();

            if (assignedAdminData.role === 'superadmin') {
                routingMessage = 'Request submitted and routed to Super Admin (no department admin available)';
            } else {
                routingMessage = `Request submitted and routed to ${assignedAdminData.department} department admin`;
            }
        }

        res.status(201).json({
            success: true,
            request: { id: docRef.id, ...newRequest },
            message: routingMessage
        });
    } catch (error) {
        console.error('Error creating request:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});

// Get requests (users get their requests; admins get requests assigned to them or their department)
app.get('/api/requests', authenticateFirebaseToken, async (req, res) => {
    try {
        let requestsSnapshot;

        if (req.user.role === 'superadmin') {
            // Super admin sees all requests in the company
            requestsSnapshot = await db.collection('requests')
                .where('companyId', '==', req.user.companyId)
                .get();
        } else if (req.user.role === 'admin') {
            // Admin sees requests assigned to them
            requestsSnapshot = await db.collection('requests')
                .where('companyId', '==', req.user.companyId)
                .where('assignedTo', '==', req.user.userId)
                .get();
        } else {
            // Regular users see only their own requests
            requestsSnapshot = await db.collection('requests')
                .where('userId', '==', req.user.userId)
                .get();
        }

        const requests = requestsSnapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter(request => request.status !== 'DELETED'); // Filter out deleted requests

        // Sort by dateSubmitted in JavaScript (newest first)
        requests.sort((a, b) => {
            const dateA = a.dateSubmitted?.seconds || 0;
            const dateB = b.dateSubmitted?.seconds || 0;
            return dateB - dateA;
        });

        res.status(200).json({ success: true, requests });
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});

// Test endpoint to simulate request status change (for testing notifications)
app.post('/api/debug/simulate-status-change', authenticateFirebaseToken, async (req, res) => {
    try {
        const { requestId, status } = req.body;

        if (!requestId || !status) {
            return res.status(400).json({
                message: 'requestId and status are required',
                success: false
            });
        }

        if (!['Completed', 'Rejected'].includes(status)) {
            return res.status(400).json({
                message: 'Status must be Completed or Rejected',
                success: false
            });
        }

        // Update the request status
        await db.collection('requests').doc(requestId).update({
            status: status,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(200).json({
            success: true,
            message: `Request ${requestId} status changed to ${status}`,
            requestId,
            status
        });
    } catch (error) {
        console.error('Error simulating status change:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});

// Clean up test/fake requests (Super Admin only)
app.delete('/api/debug/cleanup-test-requests', authenticateFirebaseToken, requireSuperAdmin, async (req, res) => {
    try {
        console.log('Cleaning up test requests...');

        // Get all requests that look like test requests
        const requestsSnapshot = await db.collection('requests')
            .where('companyId', '==', req.user.companyId)
            .get();

        let deletedCount = 0;
        const batch = db.batch();

        requestsSnapshot.docs.forEach(doc => {
            const request = doc.data();
            // Delete requests that have test-like titles or are from debug endpoints
            if (request.title && (
                request.title.toLowerCase().includes('test') ||
                request.title.toLowerCase().includes('debug') ||
                request.title.toLowerCase().includes('sample') ||
                request.description?.toLowerCase().includes('test request')
            )) {
                batch.delete(doc.ref);
                deletedCount++;
                console.log('Marking for deletion:', request.title);
            }
        });

        if (deletedCount > 0) {
            await batch.commit();
            console.log(`Deleted ${deletedCount} test requests`);
        }

        res.status(200).json({
            success: true,
            message: `Cleaned up ${deletedCount} test requests`,
            deletedCount
        });
    } catch (error) {
        console.error('Error cleaning up test requests:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});

// Clear request history by status (User only - their own requests)
app.post('/api/requests/clear-history', authenticateFirebaseToken, async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                message: 'Status is required',
                success: false
            });
        }

        console.log(`User ${req.user.userId} requesting to clear ${status} request history`);

        // Define which statuses to delete
        // For 'Completed', also delete 'Approved' requests since they're shown together
        const statusesToDelete = status === 'Completed' ? ['Completed', 'Approved'] : [status];

        // Query for user's requests with the specified status(es)
        const requestsRef = db.collection('requests');
        const batch = db.batch();
        let deletedCount = 0;

        for (const statusToDelete of statusesToDelete) {
            const query = requestsRef
                .where('userId', '==', req.user.userId)
                .where('status', '==', statusToDelete);

            const snapshot = await query.get();

            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
                deletedCount++;
            });
        }

        if (deletedCount > 0) {
            await batch.commit();
            console.log(`Cleared ${deletedCount} ${status} requests for user ${req.user.userId}`);
        }

        res.status(200).json({
            success: true,
            message: `Successfully cleared ${deletedCount} ${status.toLowerCase()} request${deletedCount !== 1 ? 's' : ''} from your history`,
            deletedCount,
            status
        });
    } catch (error) {
        console.error('Error clearing request history:', error);
        res.status(500).json({
            message: 'Failed to clear request history',
            success: false
        });
    }
});

// Bulk delete requests by status (User only - their own requests)
app.delete('/api/requests/bulk-delete', authenticateFirebaseToken, async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                message: 'Status is required',
                success: false
            });
        }

        console.log(`User ${req.user.userId} requesting to delete all ${status} requests`);

        // Define which statuses to delete
        // For 'Completed', also delete 'Approved' requests since they're shown together
        const statusesToDelete = status === 'Completed' ? ['Completed', 'Approved'] : [status];

        // Query for user's requests with the specified status(es)
        const requestsRef = db.collection('requests');
        const batch = db.batch();
        let deletedCount = 0;

        for (const statusToDelete of statusesToDelete) {
            const query = requestsRef
                .where('userId', '==', req.user.userId)
                .where('status', '==', statusToDelete);

            const snapshot = await query.get();

            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
                deletedCount++;
            });
        }

        if (deletedCount > 0) {
            await batch.commit();
            console.log(`Deleted ${deletedCount} ${status} requests for user ${req.user.userId}`);
        }

        res.status(200).json({
            success: true,
            message: `Successfully deleted ${deletedCount} ${status.toLowerCase()} request${deletedCount !== 1 ? 's' : ''}`,
            deletedCount,
            status
        });
    } catch (error) {
        console.error('Error bulk deleting requests:', error);
        res.status(500).json({
            message: 'Failed to delete requests',
            success: false
        });
    }
});

// Test endpoint to create a sample request (temporary for testing)
app.post('/api/debug/create-test-request', authenticateFirebaseToken, async (req, res) => {
    try {
        const userDoc = await db.collection('users').doc(req.user.userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: 'User not found', success: false });
        }

        const userData = userDoc.data();

        // Create a test request for a department that likely has no admin
        const testCategories = ['HR', 'IT', 'Maintenance'];
        const randomCategory = testCategories[Math.floor(Math.random() * testCategories.length)];

        // Route request to appropriate admin
        const assignedAdminId = await routeRequestToAdmin(randomCategory, req.user.companyId);
        console.log(`Test request routed to admin ID: ${assignedAdminId}`);

        const testRequest = {
            userId: req.user.userId,
            userName: userData.fullName,
            userEmail: userData.email,
            userDepartment: userData.department || 'Test Department',
            companyId: req.user.companyId,
            title: `Test ${randomCategory} Request`,
            description: `This is a test request for ${randomCategory} department to verify unassigned request routing.`,
            priority: 'Medium',
            category: randomCategory,
            type: 'General',
            status: 'Pending',
            assignedTo: assignedAdminId || null,
            dateSubmitted: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('requests').add(testRequest);

        res.status(201).json({
            success: true,
            request: { id: docRef.id, ...testRequest },
            message: `Test request created and ${assignedAdminId ? 'assigned to admin' : 'marked as unassigned'}`
        });
    } catch (error) {
        console.error('Error creating test request:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});

// Test endpoint to check requests (temporary for debugging)
app.get('/api/debug/requests', authenticateFirebaseToken, requireSuperAdmin, async (req, res) => {
    try {
        const requestsSnapshot = await db.collection('requests')
            .where('companyId', '==', req.user.companyId)
            .get();

        const allRequests = requestsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json({
            success: true,
            totalRequests: allRequests.length,
            requests: allRequests.map(req => ({
                id: req.id,
                title: req.title,
                category: req.category,
                status: req.status,
                assignedTo: req.assignedTo,
                userId: req.userId,
                userName: req.userName
            }))
        });
    } catch (error) {
        console.error('Error fetching debug requests:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});

// Get unassigned requests (Super Admin only) - requests that need super admin attention
app.get('/api/requests/unassigned', authenticateFirebaseToken, requireSuperAdmin, async (req, res) => {
    try {
        console.log('=== UNASSIGNED REQUESTS DEBUG ===');
        console.log('User ID:', req.user.userId);
        console.log('Company ID:', req.user.companyId);
        console.log('User Role:', req.user.role);

        // Get all requests in the company first (simple query to avoid index issues)
        const requestsSnapshot = await db.collection('requests')
            .where('companyId', '==', req.user.companyId)
            .get();

        console.log('Found total requests:', requestsSnapshot.docs.length);

        const allRequests = requestsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data
            };
        });

        // Filter for pending requests assigned to super admin or null (unassigned)
        const unassignedRequests = allRequests.filter(request => {
            const isPending = request.status === 'Pending';
            const isUnassigned = request.assignedTo === req.user.userId || request.assignedTo === null;

            console.log(`Request ${request.id}:`, {
                title: request.title,
                assignedTo: request.assignedTo,
                status: request.status,
                category: request.category,
                isPending,
                isUnassigned
            });

            return isPending && isUnassigned;
        });

        console.log('Unassigned requests found:', unassignedRequests.length);

        // Sort by dateSubmitted if it exists, otherwise by creation order
        unassignedRequests.sort((a, b) => {
            const dateA = a.dateSubmitted?.seconds || 0;
            const dateB = b.dateSubmitted?.seconds || 0;
            return dateB - dateA; // Newest first
        });

        res.status(200).json({
            success: true,
            requests: unassignedRequests,
            message: `Found ${unassignedRequests.length} unassigned requests`,
            debug: {
                totalRequests: allRequests.length,
                totalPending: allRequests.filter(r => r.status === 'Pending').length,
                superAdminId: req.user.userId,
                companyId: req.user.companyId
            }
        });
    } catch (error) {
        console.error('Error fetching unassigned requests:', error);
        res.status(500).json({
            message: 'Server error',
            success: false,
            error: error.message
        });
    }
});

// Update request status (admin/superadmin)
app.put('/api/requests/:requestId/status', authenticateFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status, comments } = req.body;

        if (!['Pending', 'In Progress', 'Completed', 'Rejected', 'DELETED'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status', success: false });
        }

        const requestDoc = await db.collection('requests').doc(requestId).get();
        if (!requestDoc.exists) {
            return res.status(404).json({ message: 'Request not found', success: false });
        }

        const requestData = requestDoc.data();
        if (requestData.companyId !== req.user.companyId) {
            return res.status(403).json({ message: 'Unauthorized', success: false });
        }

        // Check if admin is authorized to update this request
        if (req.user.role === 'admin' && requestData.assignedTo !== req.user.userId) {
            return res.status(403).json({ message: 'Not assigned to you', success: false });
        }

        const updateData = {
            status: status,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        };

        if (comments) {
            updateData.adminComments = comments;
        }

        // Add status-specific timestamps
        if (status === 'Completed') {
            updateData.completedAt = admin.firestore.FieldValue.serverTimestamp();
        } else if (status === 'Rejected') {
            updateData.rejectedAt = admin.firestore.FieldValue.serverTimestamp();
        } else if (status === 'In Progress') {
            updateData.startedAt = admin.firestore.FieldValue.serverTimestamp();
        }

        // Handle leave request approval/rejection with balance deduction
        if (requestData.type === 'Leave' && status === 'Completed' && requestData.deduct && requestData.leave?.days) {
            const userDoc = await db.collection('users').doc(requestData.userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const days = Number(requestData.leave.days) || 0;
                const leaveType = (requestData.leave.leaveType || 'annual').toLowerCase();

                const leaveBalance = userData.leaveBalance || {};
                if (leaveBalance.annual === undefined) leaveBalance.annual = 0;
                if (leaveBalance.sick === undefined) leaveBalance.sick = 0;
                if (leaveBalance.personal === undefined) leaveBalance.personal = 0;
                if (leaveBalance.emergency === undefined) leaveBalance.emergency = 0;

                if (leaveType === 'sick') leaveBalance.sick = Math.max(0, leaveBalance.sick - days);
                else if (leaveType === 'personal') leaveBalance.personal = Math.max(0, leaveBalance.personal - days);
                else if (leaveType === 'emergency') leaveBalance.emergency = Math.max(0, leaveBalance.emergency - days);
                else leaveBalance.annual = Math.max(0, leaveBalance.annual - days);

                await db.collection('users').doc(requestData.userId).update({ leaveBalance });
            }
        }

        await db.collection('requests').doc(requestId).update(updateData);

        res.status(200).json({
            success: true,
            message: `Request ${status.toLowerCase()} successfully`
        });
    } catch (error) {
        console.error('Error updating request status:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});