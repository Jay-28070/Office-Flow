/**
 * Role Monitor - Listens for role changes and redirects users
 * When a user is promoted to admin, they are automatically redirected
 */

import { auth, db, onSnapshot, doc } from './firebase-config.js';

let unsubscribe = null;

/**
 * Start monitoring user role changes
 */
export function startRoleMonitoring() {
    // Get current user's auth token to extract userId
    const token = localStorage.getItem('authToken');
    if (!token) return;

    // Decode JWT to get userId (simple decode, not verification)
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.userId;

        // Listen to user document changes
        const userRef = doc(db, 'users', userId);

        unsubscribe = onSnapshot(userRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const userData = docSnapshot.data();
                const currentRole = userData.role;

                // Check if user was promoted to admin
                if (currentRole === 'admin') {
                    // Show notification
                    showPromotionNotification(userData);

                    // Redirect to admin dashboard after 2 seconds
                    setTimeout(() => {
                        window.location.href = '../../admin/pages/dashboard_admin.html';
                    }, 2000);
                }
            }
        }, (error) => {
            console.error('Error monitoring role changes:', error);
        });
    } catch (error) {
        console.error('Error starting role monitoring:', error);
    }
}

/**
 * Stop monitoring role changes
 */
export function stopRoleMonitoring() {
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
}

/**
 * Show promotion notification
 */
function showPromotionNotification(userData) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 2rem 3rem;
        border-radius: 1rem;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        text-align: center;
        animation: slideIn 0.5s ease-out;
    `;

    notification.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 1rem;">
            <i class="fas fa-crown"></i>
        </div>
        <h2 style="margin: 0 0 0.5rem 0; font-size: 1.5rem;">Congratulations!</h2>
        <p style="margin: 0; font-size: 1rem; opacity: 0.95;">
            You've been promoted to <strong>${userData.jobTitle || 'Admin'}</strong>
        </p>
        <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; opacity: 0.9;">
            Redirecting to admin dashboard...
        </p>
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translate(-50%, -60%);
            }
            to {
                opacity: 1;
                transform: translate(-50%, -50%);
            }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);
}
