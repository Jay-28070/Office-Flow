/**
 * Role Monitoring Module
 * Monitors user role changes and updates UI accordingly
 */

/**
 * Start role monitoring
 */
export function startRoleMonitoring() {
    console.log('Role monitoring started');

    // Check for role changes every 5 minutes
    setInterval(checkRoleChanges, 5 * 60 * 1000);
}

/**
 * Check for role changes
 */
async function checkRoleChanges() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.id) return;

        // Get current user data from backend
        const response = await fetch(`${window.APP_CONFIG?.API_BASE_URL || 'http://localhost:3000'}/api/users/${user.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const currentRole = user.role;
            const newRole = data.user?.role;

            if (currentRole !== newRole) {
                console.log(`Role changed from ${currentRole} to ${newRole}`);

                // Update stored user data
                const updatedUser = { ...user, role: newRole };
                localStorage.setItem('user', JSON.stringify(updatedUser));

                // Show notification
                if (typeof showMessage === 'function') {
                    showMessage(`Your role has been updated to ${newRole}. Please refresh the page to see changes.`, 'info');
                }
            }
        }
    } catch (error) {
        console.warn('Role monitoring check failed:', error);
    }
}