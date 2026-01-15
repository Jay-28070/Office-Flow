'use strict';

const { admin } = require('../config/firebase');

/**
 * Middleware to verify Firebase token only (without checking Firestore)
 * Used for registration where user doesn't exist in Firestore yet
 */
async function verifyFirebaseToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            message: 'Access token required', 
            success: false 
        });
    }

    try {
        // Verify Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.firebaseUser = decodedToken;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(403).json({ 
            message: 'Invalid or expired token', 
            success: false 
        });
    }
}

/**
 * Middleware to authenticate Firebase tokens
 */
async function authenticateFirebaseToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            message: 'Access token required', 
            success: false 
        });
    }

    try {
        // Verify Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.firebaseUser = decodedToken;
        
        // Fetch user data from Firestore
        const userDoc = await admin.firestore()
            .collection('users')
            .doc(decodedToken.uid)
            .get();
        
        if (!userDoc.exists) {
            return res.status(403).json({ 
                message: 'User not found in database', 
                success: false 
            });
        }

        req.user = {
            userId: decodedToken.uid,
            email: decodedToken.email,
            ...userDoc.data()
        };
        
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(403).json({ 
            message: 'Invalid or expired token', 
            success: false 
        });
    }
}

/**
 * Middleware to check if user is super admin
 */
function requireSuperAdmin(req, res, next) {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ 
            message: 'Super admin access required', 
            success: false 
        });
    }
    next();
}

/**
 * Middleware to check if user is admin or super admin
 */
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ 
            message: 'Admin access required', 
            success: false 
        });
    }
    next();
}

module.exports = {
    verifyFirebaseToken,
    authenticateFirebaseToken,
    requireSuperAdmin,
    requireAdmin
};
