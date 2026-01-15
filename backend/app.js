'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const { admin, db } = require('./config/firebase');
const { authenticateFirebaseToken, requireSuperAdmin, requireAdmin } = require('./utils/auth');
const authRoutes = require('./routes/auth');

//Create instance of server
const app = express();

const PORT = 3000;

//Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Auth routes
app.use('/api/auth', authRoutes);

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

        // Update user role
        await db.collection('users').doc(userId).update({
            role: 'admin',
            department: companyData.settings.departments[0] || 'IT',
            jobTitle: 'Manager'
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
        const { fullName, email, password, department, jobTitle } = req.body;

        // Create user in Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: fullName
        });

        const companyDoc = await db.collection('companies').doc(req.user.companyId).get();
        const companyData = companyDoc.data();

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

// ===== COMPANY SETTINGS API (Super Admin Only) =====

// Get company settings (available to any authenticated user)
app.get('/api/company/settings', authenticateFirebaseToken, async (req, res) => {
    try {
        const companyDoc = await db.collection('companies').doc(req.user.companyId).get();

        if (!companyDoc.exists) {
            return res.status(404).json({ message: 'Company not found', success: false });
        }

        const companyData = companyDoc.data();
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
        res.status(500).json({ message: 'Server error', success: false });
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

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role', success: false });
        }

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: 'User not found', success: false });
        }

        const updateData = { role };
        if (jobTitle) updateData.jobTitle = jobTitle;
        if (department) updateData.department = department;

        await db.collection('users').doc(userId).update(updateData);

        res.status(200).json({ message: 'User role updated successfully', success: true });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});

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
            dateSubmitted: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('leaveRequests').add(newRequest);

        res.status(201).json({ 
            success: true, 
            request: { id: docRef.id, ...newRequest }
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
                .orderBy('dateSubmitted', 'desc')
                .get();
        } else {
            requestsSnapshot = await db.collection('leaveRequests')
                .where('userId', '==', req.user.userId)
                .orderBy('dateSubmitted', 'desc')
                .get();
        }

        const requests = requestsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json({ success: true, requests });
    } catch (error) {
        console.error('Error fetching leave requests:', error);
        res.status(500).json({ message: 'Server error', success: false });
    }
});


//Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
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
