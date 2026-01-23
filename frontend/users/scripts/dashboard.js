/**
 * officeFlow Dashboard Script
 * Handles dashboard functionality, navigation, and request management
 * Prepared for Firebase integration
 */

// ===== GLOBAL STATE =====
let currentUser = {
    id: 'user123',
    name: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    phoneNumber: '+1 (555) 123-4567',
    jobTitle: 'Software Engineer',
    role: 'Employee',
    department: 'Engineering',
    avatar: 'user',
    preferences: {
        defaultCategory: 'IT',
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        fontSize: 'medium',
        highContrast: false,
        theme: 'light',
        colorScheme: 'warm'
    },
    leaveBalance: {
        annual: 15,
        sick: 8,
        personal: 3,
        emergency: 5
    }
};

// Remove hard-coded sample requests — start with an empty list in production
let requests = [];

let currentSection = 'overview';
let filteredRequests = [];

// ===== AUTHENTICATION & NOTIFICATIONS =====

/**
 * Check authentication and load user data
 */
function checkAuthentication() {
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    console.log('Authentication check:', {
        hasToken: !!token,
        hasUserId: !!user.id,
        user: user
    });

    // Only redirect if both token and user are completely missing
    if (!token && !user.id) {
        console.log('No authentication found, redirecting to login');
        window.location.href = 'login.html';
        return false;
    }

    // If we have some authentication data, proceed but warn about missing pieces
    if (!token) {
        console.warn('No auth token found, some features may not work');
    }
    if (!user.id) {
        console.warn('No user ID found, some features may not work');
    }

    // Update current user with stored data
    if (user.id) {
        currentUser = { ...currentUser, ...user };
    }

    return true;
}

/**
 * Update user's last login time
 */
async function updateLastLogin() {
    try {
        const token = localStorage.getItem('authToken');
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        if (!token || !user.id) {
            console.log('Skipping login update - missing auth data');
            return;
        }

        await fetch(`${getApiUrl()}/api/users/${user.id}/login`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('Login time updated successfully');
    } catch (error) {
        console.error('Error updating last login:', error);
    }
}

/**
 * Check for request status notifications
 */
async function checkNotifications() {
    try {
        console.log('=== CHECKING NOTIFICATIONS ===');
        const token = localStorage.getItem('authToken');
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        console.log('Token exists:', !!token);
        console.log('User ID:', user.id);

        if (!token || !user.id) {
            console.log('No token or user ID, skipping notifications');
            return;
        }

        console.log('Fetching notifications from API...');
        const response = await fetch(`${getApiUrl()}/api/users/${user.id}/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('Notifications response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('Notifications data:', data);

            if (data.notifications && data.notifications.length > 0) {
                console.log('Showing notification popup with', data.notifications.length, 'notifications');
                showNotificationPopup(data.notifications);
            } else {
                console.log('No notifications to show');
            }
        } else {
            console.error('Failed to fetch notifications:', response.status);
        }
    } catch (error) {
        console.error('Error checking notifications:', error);
    }
}

/**
 * Show notification popup for request status updates
 */
function showNotificationPopup(notifications) {
    // Create notification modal
    const modal = document.createElement('div');
    modal.className = 'notification-modal';
    modal.innerHTML = `
        <div class="notification-modal-content">
            <div class="notification-header">
                <h3><i class="fas fa-bell"></i> Request Updates</h3>
                <button class="notification-close" onclick="closeNotificationModal()">&times;</button>
            </div>
            <div class="notification-body">
                ${notifications.map(notification => `
                    <div class="notification-item ${notification.type}">
                        <div class="notification-icon">
                            <i class="fas ${notification.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
                        </div>
                        <div class="notification-content">
                            <h4>${notification.title}</h4>
                            <p>${notification.message}</p>
                            <small>Category: ${notification.category}</small>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="notification-footer">
                <button class="btn btn-primary" onclick="closeNotificationModal()">
                    Got it, thanks!
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add styles if not already present
    if (!document.getElementById('notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease-out;
            }

            .notification-modal-content {
                background: white;
                border-radius: 12px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                animation: slideIn 0.3s ease-out;
            }

            .notification-header {
                padding: 1.5rem;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .notification-header h3 {
                margin: 0;
                color: #1f2937;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .notification-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #6b7280;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.2s;
            }

            .notification-close:hover {
                background: #f3f4f6;
                color: #374151;
            }

            .notification-body {
                padding: 1.5rem;
            }

            .notification-item {
                display: flex;
                gap: 1rem;
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 1rem;
                border-left: 4px solid;
            }

            .notification-item.success {
                background: #f0fdf4;
                border-left-color: #22c55e;
            }

            .notification-item.warning {
                background: #fefce8;
                border-left-color: #eab308;
            }

            .notification-icon {
                flex-shrink: 0;
            }

            .notification-item.success .notification-icon {
                color: #22c55e;
            }

            .notification-item.warning .notification-icon {
                color: #eab308;
            }

            .notification-content h4 {
                margin: 0 0 0.5rem 0;
                color: #1f2937;
                font-size: 1rem;
            }

            .notification-content p {
                margin: 0 0 0.5rem 0;
                color: #4b5563;
                font-size: 0.9rem;
            }

            .notification-content small {
                color: #6b7280;
                font-size: 0.8rem;
            }

            .notification-footer {
                padding: 1.5rem;
                border-top: 1px solid #e5e7eb;
                text-align: center;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideIn {
                from { 
                    opacity: 0;
                    transform: translateY(-20px) scale(0.95);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
        `;
        document.head.appendChild(styles);
    }
}

/**
 * Close notification modal
 */
function closeNotificationModal() {
    const modal = document.querySelector('.notification-modal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

/**
 * Test notification system (for debugging)
 */
function testNotifications() {
    console.log('Testing notification system...');
    const sampleNotifications = [
        {
            id: 'test1',
            title: 'IT Support Request',
            category: 'IT',
            status: 'Completed',
            message: 'Your IT request "Computer not working" has been approved!',
            type: 'success'
        },
        {
            id: 'test2',
            title: 'Leave Request',
            category: 'HR',
            status: 'Rejected',
            message: 'Your HR request "Vacation Leave" has been rejected.',
            type: 'warning'
        }
    ];

    showNotificationPopup(sampleNotifications);
}

/**
 * Force check notifications (for debugging)
 */
async function forceCheckNotifications() {
    console.log('Force checking notifications...');
    await checkNotifications();
}

/**
 * Create a test request and simulate status change (for testing)
 */
async function createAndTestNotification() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('No auth token available');
            return;
        }

        console.log('Creating test request...');

        // Create a test request
        const createResponse = await fetch('http://localhost:3000/api/debug/create-test-request', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!createResponse.ok) {
            console.error('Failed to create test request');
            return;
        }

        const createData = await createResponse.json();
        console.log('Test request created:', createData);

        // Wait a moment, then simulate status change
        setTimeout(async () => {
            console.log('Simulating status change...');

            const statusResponse = await fetch('http://localhost:3000/api/debug/simulate-status-change', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    requestId: createData.request.id,
                    status: 'Completed'
                })
            });

            if (statusResponse.ok) {
                console.log('Status changed successfully');
                alert('Test request created and approved! Now check notifications.');

                // Check notifications
                await forceCheckNotifications();
            } else {
                console.error('Failed to change status');
            }
        }, 1000);

    } catch (error) {
        console.error('Error in test:', error);
    }
}

/**
 * Clean up test/fake requests (for debugging)
 */
async function cleanupTestRequests() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('No auth token available');
            return;
        }

        console.log('Cleaning up test requests...');

        const response = await fetch('http://localhost:3000/api/debug/cleanup-test-requests', {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Cleanup result:', data);
            alert(`Cleaned up ${data.deletedCount} test requests`);

            // Refresh requests
            await loadUserRequests();
        } else {
            console.error('Failed to cleanup test requests');
        }
    } catch (error) {
        console.error('Error cleaning up test requests:', error);
    }
}

// Make test functions available globally for debugging
window.testNotifications = testNotifications;
window.forceCheckNotifications = forceCheckNotifications;
window.checkNotifications = checkNotifications;
window.createAndTestNotification = createAndTestNotification;
window.cleanupTestRequests = cleanupTestRequests;

// Add fadeOut animation
const fadeOutStyle = document.createElement('style');
fadeOutStyle.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(fadeOutStyle);

// ===== UTILITY FUNCTIONS =====

/**
 * Get API base URL based on environment
 */
function getApiUrl() {
    return window.APP_CONFIG?.API_BASE_URL || 'http://localhost:3000';
}

/**
 * Generate unique ID for new requests
 */
function generateRequestId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `REQ${timestamp}${random}`.slice(-10);
}

/**
 * Show requests popup modal
 */
function showRequestsPopup(status) {
    console.log(`Showing ${status} requests popup`);

    // Filter requests by status
    const filteredRequests = requests.filter(request =>
        request.status === status ||
        (status === 'Completed' && request.status === 'Approved')
    );

    console.log(`Found ${filteredRequests.length} ${status} requests`);

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'requests-modal';
    modal.innerHTML = `
        <div class="requests-modal-content">
            <div class="requests-modal-header">
                <h3>
                    <i class="fas ${getStatusIcon(status)}"></i>
                    ${status} Requests (${filteredRequests.length})
                </h3>
                <button class="requests-modal-close" onclick="closeRequestsModal()">&times;</button>
            </div>
            <div class="requests-modal-body">
                ${filteredRequests.length > 0 ?
            filteredRequests.map(request => `
                        <div class="modal-request-item">
                            <div class="modal-request-icon ${status.toLowerCase()}">
                                <i class="fas ${getStatusIcon(status)}"></i>
                            </div>
                            <div class="modal-request-content">
                                <h4 class="modal-request-title">${request.title || 'No Title'}</h4>
                                <div class="modal-request-meta">
                                    <span><i class="fas fa-tag"></i> ${request.category || 'No Category'}</span>
                                    <span><i class="fas fa-calendar"></i> ${formatDate(request.dateSubmitted)}</span>
                                    <span><i class="fas fa-flag"></i> ${request.priority || 'Normal'}</span>
                                </div>
                                <p class="modal-request-description">${request.description || 'No description provided'}</p>
                            </div>
                        </div>
                    `).join('') :
            `<div class="modal-empty-state">
                        <i class="fas ${getStatusIcon(status)}"></i>
                        <h3>No ${status} Requests</h3>
                        <p>You don't have any ${status.toLowerCase()} requests yet.</p>
                    </div>`
        }
            </div>
            <div class="requests-modal-footer">
                <button class="btn btn-primary" onclick="closeRequestsModal()">
                    Close
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

/**
 * Close requests modal
 */
function closeRequestsModal() {
    const modal = document.querySelector('.requests-modal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
    }
}

/**
 * Get icon for request status
 */
function getStatusIcon(status) {
    switch (status) {
        case 'Pending': return 'fa-clock';
        case 'Completed': return 'fa-check-circle';
        case 'Approved': return 'fa-check-circle';
        case 'Rejected': return 'fa-times-circle';
        case 'In Progress': return 'fa-spinner';
        default: return 'fa-file';
    }
}

/**
 * Update dashboard statistics
 */
function updateDashboardStats() {
    console.log('Updating dashboard stats with', requests.length, 'requests');

    // Count requests by status
    const pending = requests.filter(r => r.status === 'Pending').length;
    const completed = requests.filter(r => r.status === 'Completed' || r.status === 'Approved').length;
    const rejected = requests.filter(r => r.status === 'Rejected').length;

    // Update UI
    const pendingEl = document.getElementById('pendingCount');
    const completedEl = document.getElementById('completedCount');
    const rejectedEl = document.getElementById('rejectedCount');
    const leaveBalanceEl = document.getElementById('leaveBalance');

    if (pendingEl) pendingEl.textContent = pending;
    if (completedEl) completedEl.textContent = completed;
    if (rejectedEl) rejectedEl.textContent = rejected;

    // Update leave balance from user data
    if (leaveBalanceEl && currentUser.leaveBalance) {
        leaveBalanceEl.textContent = currentUser.leaveBalance.annual || 0;
    }

    console.log('Stats updated:', { pending, completed, rejected });
}

// Make functions available globally
window.showRequestsPopup = showRequestsPopup;
window.closeRequestsModal = closeRequestsModal;

/**
 * Format date for display based on user preferences
 */
function formatDate(dateInput) {
    try {
        let date;

        // Handle different date input types
        if (!dateInput) {
            return 'No date';
        }

        // Handle Firestore timestamp objects
        if (dateInput && typeof dateInput === 'object' && dateInput.seconds) {
            date = new Date(dateInput.seconds * 1000);
        }
        // Handle Firestore timestamp with toDate method
        else if (dateInput && typeof dateInput.toDate === 'function') {
            date = dateInput.toDate();
        }
        // Handle regular date strings/objects
        else {
            date = new Date(dateInput);
        }

        // Check if date is valid
        if (isNaN(date.getTime())) {
            console.warn('Invalid date input:', dateInput);
            return 'Invalid date';
        }

        const format = currentUser.preferences.dateFormat;
        const timezone = currentUser.preferences.timezone;

        // Convert to user's timezone
        const options = {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        };

        const localDate = new Intl.DateTimeFormat('en-US', options).format(date);

        switch (format) {
            case 'DD/MM/YYYY':
                const [month, day, year] = localDate.split('/');
                return `${day}/${month}/${year}`;
            case 'YYYY-MM-DD':
                const [m, d, y] = localDate.split('/');
                return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            case 'MMM DD, YYYY':
                return date.toLocaleDateString('en-US', {
                    timeZone: timezone,
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            default: // MM/DD/YYYY
                return localDate;
        }
    } catch (error) {
        console.error('Error formatting date:', error, 'Input:', dateInput);
        return 'Date error';
    }
}

/**
 * Get current timestamp in user's timezone
 */
function getCurrentTimestamp() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

/**
 * Get status class for styling
 */
function getStatusClass(status) {
    const statusMap = {
        'Pending': 'status-pending',
        'In Progress': 'status-in-progress',
        'Completed': 'status-completed',
        'Rejected': 'status-rejected'
    };
    return statusMap[status] || 'status-pending';
}

/**
 * Show success message (only one at a time)
 */
function showMessage(text, type = 'success') {
    // Remove any existing messages first
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());

    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${text}</span>
    `;

    const mainContent = document.querySelector('.main-content');
    const firstSection = mainContent.querySelector('.content-section.active');
    firstSection.insertBefore(messageDiv, firstSection.firstChild);

    // Auto remove after 3 seconds (reduced from 5)
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}

/**
 * Update statistics
 */
// This function is replaced by updateDashboardStats above

/**
 * Temporary updateStats function for compatibility
 */
function updateStats() {
    console.log('updateStats called - redirecting to updateDashboardStats');
    updateDashboardStats();
}

// ===== NAVIGATION FUNCTIONS =====

/**
 * Initialize navigation
 */
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            const sectionId = this.getAttribute('data-section');
            if (sectionId && sectionId !== currentSection) {
                switchSection(sectionId);

                // Update active nav link
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');

                currentSection = sectionId;

                // Close mobile menu
                closeMobileMenu();

                // Remove hints after first interaction
                removeNavigationHints();
            }
        });
    });

    // Logo click to toggle menu
    const navBrand = document.getElementById('navBrand');
    const sidebar = document.querySelector('.sidebar');

    if (navBrand) {
        navBrand.addEventListener('click', function () {
            if (window.innerWidth <= 1024) {
                toggleMobileMenu();
                removeNavigationHints();
            }
        });
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', function (e) {
        if (window.innerWidth <= 1024) {
            const sidebar = document.querySelector('.sidebar');
            const navBrand = document.getElementById('navBrand');

            if (!sidebar.contains(e.target) && !navBrand.contains(e.target)) {
                closeMobileMenu();
            }
        }
    });

    // Initialize navigation hints
    initNavigationHints();
}

/**
 * Initialize subtle navigation hints
 */
function initNavigationHints() {
    const navBrand = document.getElementById('navBrand');
    const menuHint = document.getElementById('menuHint');

    // Only show hints on mobile/tablet
    if (window.innerWidth <= 1024) {
        // Add subtle pulse animation to logo
        setTimeout(() => {
            navBrand.classList.add('pulse');
        }, 2000);

        // Add bounce animation to hint arrow
        setTimeout(() => {
            menuHint.classList.add('bounce');
        }, 3000);

        // Remove animations after 10 seconds
        setTimeout(() => {
            navBrand.classList.remove('pulse');
            menuHint.classList.remove('bounce');
        }, 12000);
    }
}

/**
 * Remove navigation hints after user interaction
 */
function removeNavigationHints() {
    const navBrand = document.getElementById('navBrand');
    const menuHint = document.getElementById('menuHint');

    navBrand.classList.remove('pulse');
    menuHint.classList.remove('bounce');

    // Store that user has discovered navigation
    localStorage.setItem('officeflow_nav_discovered', 'true');
}

/**
 * Toggle mobile menu
 */
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');

    sidebar.classList.toggle('open');

    // Add overlay for better UX
    if (sidebar.classList.contains('open')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

/**
 * Close mobile menu
 */
function closeMobileMenu() {
    const sidebar = document.querySelector('.sidebar');

    sidebar.classList.remove('open');
    document.body.style.overflow = '';
}

/**
 * Switch between sections
 */
function switchSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });

    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');

        // Load section-specific content
        switch (sectionId) {
            case 'overview':
                loadOverview();
                break;
            case 'your-requests':
                loadYourRequests();
                break;
            case 'hr-services':
                loadHRServices();
                break;
            case 'profile':
                loadProfile();
                break;
            case 'settings':
                loadSettings();
                break;
        }
    }
}

// ===== OVERVIEW SECTION =====

/**
 * Load overview section
 */
function loadOverview() {
    updateStats();
    loadRecentActivity();
}

/**
 * Load recent activity
 */
function loadRecentActivity() {
    const activityList = document.getElementById('recentActivity');
    const recentRequests = requests
        .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
        .slice(0, 5);

    activityList.innerHTML = recentRequests.map(request => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas fa-${getActivityIcon(request.category)}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-text">
                    ${request.title} - ${request.status}
                </div>
                <div class="activity-time">
                    ${formatDate(request.lastUpdated)}
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Get activity icon based on category
 */
function getActivityIcon(category) {
    const iconMap = {
        'IT': 'laptop',
        'Maintenance': 'tools',
        'HR': 'users'
    };
    return iconMap[category] || 'file-alt';
}

// ===== REQUEST FORM FUNCTIONS =====

/**
 * Initialize request form
 */
function initRequestForm() {
    const form = document.getElementById('requestForm');
    const clearBtn = document.getElementById('clearForm');
    const categorySelect = document.getElementById('requestCategory');
    const leaveFields = document.getElementById('leaveFields');
    const calcBtn = document.getElementById('calcLeaveBtn');
    const leaveStart = document.getElementById('leaveStart');
    const leaveEnd = document.getElementById('leaveEnd');
    const leaveDaysEl = document.getElementById('leaveDays');
    const availEl = document.getElementById('availableLeave');
    const deductChk = document.getElementById('deductFromBalance');

    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', clearForm);
    }

    // Show leave fields when HR category selected
    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            const leaveFields = document.getElementById('leaveFields');
            const availEl = document.getElementById('availableLeave');

            if (categorySelect.value === 'HR') {
                // Don't automatically show leave fields - let user choose via service buttons
                // Only show if they came from the "Request Leave" button
                if (leaveFields && leaveFields.style.display === 'block') {
                    // Keep it visible if already shown
                    if (availEl) availEl.textContent = `${currentUser.leaveBalance.annual} days`;
                }
            } else {
                // Hide leave fields for non-HR categories
                if (leaveFields) leaveFields.style.display = 'none';
            }
        });

        // Initialize visibility based on current value
        if (categorySelect.value === 'HR') {
            const leaveFields = document.getElementById('leaveFields');
            const availEl = document.getElementById('availableLeave');
            if (leaveFields && leaveFields.style.display === 'block') {
                if (availEl) availEl.textContent = `${currentUser.leaveBalance.annual} days`;
            }
        }
    }

    // Calculate leave days
    if (calcBtn) {
        calcBtn.addEventListener('click', () => {
            const days = calculateLeaveDays(leaveStart.value, leaveEnd.value);
            if (leaveDaysEl) leaveDaysEl.textContent = days;
            if (availEl) {
                const remaining = currentUser.leaveBalance.annual - days;
                availEl.textContent = `${currentUser.leaveBalance.annual} available · After: ${remaining >= 0 ? remaining : 0}`;
                if (remaining < 0) availEl.style.color = 'var(--error-color)';
                else availEl.style.color = '';
            }
        });
    }

    // Add form validation
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearFieldError);
    });
}

/**
 * Handle form submission with backend API
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const requestData = {
        title: formData.get('title'),
        category: formData.get('category'),
        priority: formData.get('priority'),
        description: formData.get('description'),
        type: 'General'
    };

    // If HR category, check if leave dates are provided
    if (requestData.category === 'HR') {
        const start = formData.get('leaveStart');
        const end = formData.get('leaveEnd');

        // Only treat as leave request if dates are provided
        if (start && end) {
            const days = calculateLeaveDays(start, end);
            requestData.type = 'Leave';
            requestData.leave = { start, end, days };
            requestData.deduct = document.getElementById('deductFromBalance')?.checked || false;
            // Note: Balance validation will be done by admin when approving
        }
    }

    // Validate form
    if (!validateForm(requestData)) {
        return;
    }

    // Add loading state
    const submitBtn = document.getElementById('submitRequest');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';
    submitBtn.disabled = true;

    try {
        // Submit request to backend API
        const token = localStorage.getItem('authToken');
        const response = await fetch('http://localhost:3000/api/requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestData)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to submit request');
        }

        // Add request to local array for immediate UI update
        const newRequest = {
            id: data.request.id,
            title: requestData.title,
            category: requestData.category,
            priority: requestData.priority,
            description: requestData.description,
            status: 'Pending',
            dateSubmitted: getCurrentTimestamp(),
            lastUpdated: getCurrentTimestamp(),
            type: requestData.type
        };

        if (requestData.type === 'Leave') {
            newRequest.leave = requestData.leave;
            newRequest.deduct = requestData.deduct;
        }

        requests.unshift(newRequest);

        // NOTE: Leave balance is NOT deducted here - only when request is approved by admin

        // Reset form
        clearForm();

        // Show success message with routing information
        showMessage(data.message || 'Request submitted successfully!');

        // Update stats
        updateStats();

        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;

        // Switch to requests view
        switchSection('your-requests');
        document.querySelector('[data-section="your-requests"]').classList.add('active');
        document.querySelector('[data-section="submit-request"]').classList.remove('active');

        console.log('Request submitted successfully:', data.request);
    } catch (error) {
        console.error('Error submitting request:', error);
        showMessage('Failed to submit request: ' + error.message, 'error');

        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * Validate form
 */
function validateForm(data) {
    let isValid = true;

    if (!data.title.trim()) {
        showFieldError('requestTitle', 'Title is required');
        isValid = false;
    }

    if (!data.category) {
        showFieldError('requestCategory', 'Category is required');
        isValid = false;
    }

    if (!data.priority) {
        showFieldError('requestPriority', 'Priority is required');
        isValid = false;
    }

    if (!data.description.trim()) {
        showFieldError('requestDescription', 'Description is required');
        isValid = false;
    }
    // additional validation for leave requests only
    if (data.type === 'Leave') {
        if (!data.leave || !data.leave.start || !data.leave.end || data.leave.days <= 0) {
            showMessage('Please provide valid start/end dates for leave.', 'error');
            isValid = false;
        }
    }

    return isValid;
}

/**
 * Calculate inclusive days between two YYYY-MM-DD dates.
 */
function calculateLeaveDays(start, end) {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s) || isNaN(e) || e < s) return 0;
    // count inclusive days
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return diff;
}

/**
 * Validate individual field
 */
function validateField(e) {
    const field = e.target;
    const value = field.value.trim();

    if (field.hasAttribute('required') && !value) {
        showFieldError(field.id, `${field.name} is required`);
    }
}

/**
 * Show field error
 */
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    field.classList.add('error');

    // Remove existing error message
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }

    // Add error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.style.cssText = 'color: var(--error-color); font-size: 0.75rem; margin-top: 0.25rem;';
    errorDiv.textContent = message;
    field.parentNode.appendChild(errorDiv);
}

/**
 * Clear field error
 */
function clearFieldError(e) {
    const field = e.target;
    field.classList.remove('error');

    const errorDiv = field.parentNode.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.remove();
    }
}

/**
 * Clear form
 */
function clearForm() {
    const form = document.getElementById('requestForm');
    form.reset();

    // Clear any error states
    const errorFields = form.querySelectorAll('.error');
    errorFields.forEach(field => {
        field.classList.remove('error');
    });

    const errorMessages = form.querySelectorAll('.field-error');
    errorMessages.forEach(msg => msg.remove());
    // hide/reset leave fields if present
    const leaveFields = document.getElementById('leaveFields');
    if (leaveFields) leaveFields.style.display = 'none';
    const leaveDaysEl = document.getElementById('leaveDays');
    if (leaveDaysEl) leaveDaysEl.textContent = '0';
    const availEl = document.getElementById('availableLeave');
    if (availEl) availEl.textContent = '--';
    const deductChk = document.getElementById('deductFromBalance');
    if (deductChk) deductChk.checked = true;
}

// ===== YOUR REQUESTS SECTION =====

/**
 * Load your requests section
 */
/**
 * Render requests grid
 */
/**
 * Initialize filters
 */
function initFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const clearFilters = document.getElementById('clearFilters');

    statusFilter.addEventListener('change', applyFilters);
    categoryFilter.addEventListener('change', applyFilters);
    clearFilters.addEventListener('click', function () {
        statusFilter.value = '';
        categoryFilter.value = '';
        applyFilters();
    });
}

/**
 * Apply filters to requests
 */
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;

    filteredRequests = requests.filter(request => {
        const matchesStatus = !statusFilter || request.status === statusFilter;
        const matchesCategory = !categoryFilter || request.category === categoryFilter;
        return matchesStatus && matchesCategory;
    });

    renderRequests();
}

// ===== HR SERVICES SECTION =====

/**
 * Load HR services section
 */
function loadHRServices() {
    updateLeaveBalance();
}

/**
 * Update leave balance display
 */
function updateLeaveBalance() {
    document.getElementById('annualLeave').textContent = `${currentUser.leaveBalance.annual} days`;
    document.getElementById('sickLeave').textContent = `${currentUser.leaveBalance.sick} days`;
    document.getElementById('personalLeave').textContent = `${currentUser.leaveBalance.personal} days`;
    document.getElementById('emergencyLeave').textContent = `${currentUser.leaveBalance.emergency} days`;
}

// ===== SERVICE BUTTONS =====

/**
 * Initialize service buttons
 */
function initServiceButtons() {
    const serviceButtons = document.querySelectorAll('.service-btn');

    serviceButtons.forEach(button => {
        button.addEventListener('click', function () {
            const category = this.getAttribute('data-category');
            const type = this.getAttribute('data-type');

            // Pre-fill form and switch to submit section
            switchSection('submit-request');
            document.querySelector('[data-section="submit-request"]').classList.add('active');
            document.querySelector('[data-section="overview"]').classList.remove('active');

            // Update nav
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            document.querySelector('[data-section="submit-request"]').classList.add('active');

            // Pre-fill form
            setTimeout(() => {
                document.getElementById('requestCategory').value = category;
                document.getElementById('requestTitle').focus();

                // Pre-fill title based on type
                const titleSuggestions = {
                    'Hardware': 'Hardware Issue - ',
                    'Software': 'Software Request - ',
                    'Network': 'Network Issue - ',
                    'Electrical': 'Electrical Issue - ',
                    'Plumbing': 'Plumbing Issue - ',
                    'HVAC': 'HVAC Issue - ',
                    'Leave': 'Leave Request - ',
                    'Documents': 'Document Request - ',
                    'Profile': 'Profile Update Request - '
                };

                if (titleSuggestions[type]) {
                    document.getElementById('requestTitle').value = titleSuggestions[type];
                }
            }, 100);
        });
    });
}

// ===== USER FUNCTIONS =====

/**
 * Initialize user info
 */
function initUserInfo() {
    // Load stored user (if any) and merge with defaults
    const stored = loadStoredUser();
    if (stored) {
        // Merge top-level fields
        Object.assign(currentUser, stored);

        // Merge preferences deeply where provided
        if (stored.preferences) {
            currentUser.preferences = Object.assign({}, currentUser.preferences, stored.preferences);
        }
        if (stored.leaveBalance) {
            currentUser.leaveBalance = Object.assign({}, currentUser.leaveBalance, stored.leaveBalance);
        }

        // Derive display name from common fields if present
        const derivedName = stored.fullName || stored.name ||
            ((stored.firstName || stored.lastName) ? `${stored.firstName || ''} ${stored.lastName || ''}`.trim() : null) ||
            (stored.email ? stored.email.split('@')[0] : null);

        if (derivedName) currentUser.name = derivedName;
    }

    // Update displayed name
    const nameEl = document.getElementById('userName');
    if (nameEl) nameEl.textContent = currentUser.name || 'User';
}

/**
 * Load user object from localStorage if present
 * Returns parsed object or null
 */
function loadStoredUser() {
    try {
        const raw = localStorage.getItem('user');
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        console.warn('Failed to parse stored user:', e);
        return null;
    }
}

/**
 * Handle logout
 */
function handleLogout() {
    const logoutBtn = document.getElementById('logoutBtn');

    logoutBtn.addEventListener('click', function () {
        // Show confirmation
        if (confirm('Are you sure you want to logout?')) {
            // Add loading state
            this.innerHTML = '<span class="spinner"></span> Logging out...';
            this.disabled = true;

            // Simulate logout delay
            setTimeout(() => {
                console.log('User logged out');
                window.location.href = 'index.html';
            }, 1000);
        }
    });
}

// ===== INITIALIZATION =====

/**
 * Initialize dashboard when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function () {
    console.log('officeFlow Dashboard Initialized');

    // Show loading overlay while initializing
    const loadingOverlay = document.getElementById('loadingOverlay');

    // Initialize all components
    initNavigation();
    initRequestForm();
    initServiceButtons();
    initUserInfo();
    // Try to load company settings to get global leave balances
    loadCompanySettingsUser();
    initUserInterface();
    initSettingsActions();
    handleLogout();

    // Apply user preferences
    applyAccessibilitySettings();
    applyTheme(currentUser.preferences.theme);
    applyColorScheme(currentUser.preferences.colorScheme);

    // Load initial section
    loadOverview();

    // Hide loading overlay after everything is loaded
    setTimeout(() => {
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }

        // Check if user needs to complete profile
        checkProfileCompletion();

        // Check if user can request admin access
        checkAdminRequestEligibility();

        // Check if user has discovered navigation before
        const hasDiscoveredNav = localStorage.getItem('officeflow_nav_discovered');
        if (!hasDiscoveredNav && window.innerWidth <= 1024) {
            // Show hints for new users on mobile
            setTimeout(() => {
                initNavigationHints();
            }, 500);
        }
    }, 800); // Give time for content to render

    // Update stats periodically (simulate real-time updates)
    setInterval(updateStats, 30000); // Every 30 seconds

    console.log('Dashboard ready for user interaction');
    console.log('Current user:', currentUser);
    console.log('Total requests:', requests.length);
});

// Load company settings (used to sync leave balances)
async function loadCompanySettingsUser() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn('No auth token available for company settings');
            return;
        }

        const headers = { 'Authorization': `Bearer ${token}` };

        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const res = await fetch('http://localhost:3000/api/company/settings', {
            headers,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            console.warn('Company settings request failed:', res.status);
            return;
        }

        const data = await res.json();
        if (data && data.success && data.company && data.company.settings) {
            const s = data.company.settings;
            // Prefer company-wide leave policy if present
            if (typeof s.annualLeaveBalance !== 'undefined') currentUser.leaveBalance.annual = s.annualLeaveBalance;
            if (typeof s.sickLeaveBalance !== 'undefined') currentUser.leaveBalance.sick = s.sickLeaveBalance;
            if (typeof s.personalLeaveBalance !== 'undefined') currentUser.leaveBalance.personal = s.personalLeaveBalance;
            if (typeof s.emergencyLeaveBalance !== 'undefined') currentUser.leaveBalance.emergency = s.emergencyLeaveBalance;

            // Update UI
            updateLeaveBalance();
            updateStats();

            console.log('Company settings loaded successfully');
        }
    } catch (e) {
        if (e.name === 'AbortError') {
            console.warn('Company settings request timed out');
        } else {
            console.warn('Could not load company settings:', e.message);
        }
    }
}

// ===== FIREBASE INTEGRATION PREPARATION =====

/**
 * TODO: Firebase Integration
 * 
 * When Firebase is set up, replace the simulation functions with:
 * 
 * 1. Authentication:
 *    - Check if user is authenticated on page load
 *    - Redirect to login if not authenticated
 *    - Load user data from Firestore
 * 
 * 2. Real-time Data:
 *    - Listen to user's requests collection
 *    - Update UI when requests change
 *    - Sync leave balance with HR system
 * 
 * 3. Request Management:
 *    - Save new requests to Firestore
 *    - Update request status in real-time
 *    - Send notifications for status changes
 * 
 * 4. User Management:
 *    - Load user profile from Firestore
 *    - Update leave balance based on approved requests
 *    - Sync with company directory
 * 
 * Example Firebase functions:
 * 
 * async function loadUserRequests(userId) {
 *     const requestsRef = collection(db, 'requests');
 *     const q = query(requestsRef, where('userId', '==', userId));
 *     const querySnapshot = await getDocs(q);
 *     return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
 * }
 * 
 * async function submitRequest(requestData) {
 *     const docRef = await addDoc(collection(db, 'requests'), {
 *         ...requestData,
 *         userId: currentUser.id,
 *         timestamp: serverTimestamp()
 *     });
 *     return docRef.id;
 * }
 */
// ===== PROFILE FUNCTIONS =====

/**
 * Load profile section
 */
function loadProfile() {
    updateProfileDisplay();
    initProfileForm();
    initAvatarSelection();

    // Load latest departments from company settings
    loadCompanyDepartments();
}

/**
 * Update profile display
 */
function updateProfileDisplay() {
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileRole').textContent = currentUser.role;

    // Update avatar
    const avatarLarge = document.getElementById('profileAvatarLarge');
    avatarLarge.innerHTML = `<i class="fas fa-${currentUser.avatar}"></i>`;

    // Update form fields
    document.getElementById('firstName').value = currentUser.firstName;
    document.getElementById('lastName').value = currentUser.lastName;
    document.getElementById('email').value = currentUser.email;
    document.getElementById('phoneNumber').value = currentUser.phoneNumber;
    document.getElementById('jobTitle').value = currentUser.jobTitle;
    document.getElementById('defaultCategory').value = currentUser.preferences.defaultCategory;
    document.getElementById('timezone').value = currentUser.preferences.timezone;
    document.getElementById('dateFormat').value = currentUser.preferences.dateFormat;
    document.getElementById('fontSize').value = currentUser.preferences.fontSize;
    document.getElementById('highContrast').checked = currentUser.preferences.highContrast;
}

/**
 * Initialize profile form
 */
function initProfileForm() {
    const profileForm = document.getElementById('profileForm');
    const resetBtn = document.getElementById('resetProfileForm');
    const deactivateBtn = document.getElementById('deactivateAccountBtn');

    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            updateProfileDisplay();
            showMessage('Form reset to current values', 'info');
        });
    }

    if (deactivateBtn) {
        deactivateBtn.addEventListener('click', handleAccountDeactivation);
    }
}

/**
 * Handle profile form submission
 */
async function handleProfileSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const jobTitle = formData.get('jobTitle');
    const department = formData.get('department'); // If department field exists

    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;

        // Update profile via API if jobTitle or department changed
        if (jobTitle !== currentUser.jobTitle || (department && department !== currentUser.department)) {
            const token = localStorage.getItem('authToken');
            const user = JSON.parse(localStorage.getItem('user') || '{}');

            const updateData = {};
            if (jobTitle !== currentUser.jobTitle) updateData.jobTitle = jobTitle;
            if (department && department !== currentUser.department) updateData.department = department;

            const response = await fetch(`http://localhost:3000/api/users/${user.id}/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updateData)
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to update profile');
            }

            // Update localStorage
            if (updateData.jobTitle) user.jobTitle = updateData.jobTitle;
            if (updateData.department) user.department = updateData.department;
            localStorage.setItem('user', JSON.stringify(user));

            // Notify other tabs/windows
            const timestamp = Date.now().toString();
            localStorage.setItem('officeflow_user_updated', timestamp);
            console.log('Profile update notification sent from main form:', timestamp);
        }

        // Update local user data (for UI preferences and other non-API fields)
        currentUser.firstName = formData.get('firstName');
        currentUser.lastName = formData.get('lastName');
        currentUser.name = `${currentUser.firstName} ${currentUser.lastName}`;
        currentUser.email = formData.get('email');
        currentUser.phoneNumber = formData.get('phoneNumber');
        currentUser.jobTitle = jobTitle;
        if (department) currentUser.department = department;
        currentUser.preferences.defaultCategory = formData.get('defaultCategory');
        currentUser.preferences.timezone = formData.get('timezone');
        currentUser.preferences.dateFormat = formData.get('dateFormat');
        currentUser.preferences.fontSize = formData.get('fontSize');
        currentUser.preferences.highContrast = formData.get('highContrast') === 'on';

        // Apply accessibility settings
        applyAccessibilitySettings();

        // Update UI
        initUserInfo();
        updateProfileDisplay();

        // Show success message
        showMessage('Profile updated successfully!');

        console.log('Profile updated:', currentUser);

        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;

    } catch (error) {
        console.error('Error updating profile:', error);
        showMessage('Failed to update profile: ' + error.message, 'error');

        // Reset button state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = 'Save Changes';
            submitBtn.disabled = false;
        }
    }
}

/**
 * Handle account deactivation request
 */
function handleAccountDeactivation() {
    const confirmed = confirm(
        'Are you sure you want to request account deactivation?\n\n' +
        'This will:\n' +
        '• Send a request to administrators for approval\n' +
        '• Temporarily disable your account access\n' +
        '• Require admin approval to reactivate\n\n' +
        'This action cannot be undone without admin intervention.'
    );

    if (confirmed) {
        showMessage('Account deactivation request submitted. An administrator will review your request.', 'info');
        console.log('Account deactivation requested for user:', currentUser.id);
    }
}

/**
 * Initialize avatar selection
 */
function initAvatarSelection() {
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    const avatarModal = document.getElementById('avatarModal');
    const closeModal = document.getElementById('closeAvatarModal');
    const cancelBtn = document.getElementById('cancelAvatarChange');
    const confirmBtn = document.getElementById('confirmAvatarChange');
    const avatarOptions = document.querySelectorAll('.avatar-option');

    let selectedAvatar = currentUser.avatar;

    // Open modal
    changeAvatarBtn.addEventListener('click', function () {
        avatarModal.classList.add('active');

        // Set current avatar as selected
        avatarOptions.forEach(option => {
            option.classList.remove('active');
            if (option.getAttribute('data-avatar') === currentUser.avatar) {
                option.classList.add('active');
            }
        });
    });

    // Close modal
    function closeAvatarModal() {
        avatarModal.classList.remove('active');
    }

    closeModal.addEventListener('click', closeAvatarModal);
    cancelBtn.addEventListener('click', closeAvatarModal);

    // Avatar selection
    avatarOptions.forEach(option => {
        option.addEventListener('click', function () {
            avatarOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            selectedAvatar = this.getAttribute('data-avatar');
        });
    });

    // Confirm avatar change
    confirmBtn.addEventListener('click', function () {
        currentUser.avatar = selectedAvatar;

        // Update all avatar displays
        const userAvatar = document.querySelector('.user-avatar i');
        const profileAvatarLarge = document.getElementById('profileAvatarLarge');

        userAvatar.className = `fas fa-${selectedAvatar}`;
        profileAvatarLarge.innerHTML = `<i class="fas fa-${selectedAvatar}"></i>`;

        closeAvatarModal();
        showMessage('Avatar updated successfully!');
    });

    // Close modal when clicking outside
    avatarModal.addEventListener('click', function (e) {
        if (e.target === avatarModal) {
            closeAvatarModal();
        }
    });
}

// ===== SETTINGS FUNCTIONS =====

/**
 * Load settings section
 */
function loadSettings() {
    initSettingsTabs();
    initThemeSettings();
    initNotificationSettings();
    initPrivacySettings();
}

/**
 * Initialize settings tabs
 */
function initSettingsTabs() {
    const tabs = document.querySelectorAll('.settings-tab');
    const contents = document.querySelectorAll('.settings-content');
    const goToProfileBtn = document.getElementById('goToProfile');

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const targetTab = this.getAttribute('data-tab');

            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            // Update active content
            contents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetTab) {
                    content.classList.add('active');
                }
            });
        });
    });

    // Go to profile button
    if (goToProfileBtn) {
        goToProfileBtn.addEventListener('click', function () {
            switchSection('profile');
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            document.querySelector('[data-section="profile"]').classList.add('active');
        });
    }
}

/**
 * Initialize theme settings
 */
function initThemeSettings() {
    const themeInputs = document.querySelectorAll('input[name="theme"]');
    const colorSchemeInputs = document.querySelectorAll('input[name="colorScheme"]');

    // Set current values
    themeInputs.forEach(input => {
        if (input.value === currentUser.preferences.theme) {
            input.checked = true;
        }
    });

    colorSchemeInputs.forEach(input => {
        if (input.value === currentUser.preferences.colorScheme) {
            input.checked = true;
        }
    });

    // Theme change handlers
    themeInputs.forEach(input => {
        input.addEventListener('change', function () {
            if (this.checked) {
                currentUser.preferences.theme = this.value;
                applyTheme(this.value);
                // Only show message for theme changes, not color scheme
                if (this.value !== 'light') { // Don't show message for default light theme
                    showMessage(`Switched to ${this.value} theme`, 'info');
                }
            }
        });
    });

    // Color scheme change handlers
    colorSchemeInputs.forEach(input => {
        input.addEventListener('change', function () {
            if (this.checked) {
                applyColorScheme(this.value);
                // Only show message for non-default color schemes
                if (this.value !== 'warm') {
                    showMessage(`Applied ${this.value} color scheme`, 'info');
                }
            }
        });
    });
}

/**
 * Apply theme
 */
function applyTheme(theme) {
    const body = document.body;

    // Remove existing theme classes
    body.classList.remove('light-theme', 'dark-theme', 'auto-theme');

    if (theme === 'dark') {
        body.classList.add('dark-theme');
    } else if (theme === 'auto') {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        body.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
    } else {
        body.classList.add('light-theme');
    }
}

/**
 * Apply color scheme
 */
function applyColorScheme(scheme) {
    const root = document.documentElement;

    switch (scheme) {
        case 'cool':
            // Cool blue/cyan theme
            root.style.setProperty('--primary-color', '#3b82f6');
            root.style.setProperty('--primary-hover', '#2563eb');
            root.style.setProperty('--primary-light', '#dbeafe');
            root.style.setProperty('--primary-dark', '#1d4ed8');
            root.style.setProperty('--secondary-color', '#06b6d4');
            root.style.setProperty('--secondary-hover', '#0891b2');
            root.style.setProperty('--secondary-light', '#cffafe');
            root.style.setProperty('--accent-color', '#8b5cf6');
            root.style.setProperty('--accent-hover', '#7c3aed');
            root.style.setProperty('--accent-light', '#f3e8ff');
            root.style.setProperty('--gradient-primary', 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)');
            root.style.setProperty('--gradient-accent', 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)');
            root.style.setProperty('--gradient-bg', 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 25%, #f3e8ff 50%, #cffafe 75%, #dbeafe 100%)');
            break;
        case 'nature':
            // Green/nature theme
            root.style.setProperty('--primary-color', '#10b981');
            root.style.setProperty('--primary-hover', '#059669');
            root.style.setProperty('--primary-light', '#d1fae5');
            root.style.setProperty('--primary-dark', '#047857');
            root.style.setProperty('--secondary-color', '#84cc16');
            root.style.setProperty('--secondary-hover', '#65a30d');
            root.style.setProperty('--secondary-light', '#ecfccb');
            root.style.setProperty('--accent-color', '#f59e0b');
            root.style.setProperty('--accent-hover', '#d97706');
            root.style.setProperty('--accent-light', '#fef3c7');
            root.style.setProperty('--gradient-primary', 'linear-gradient(135deg, #10b981 0%, #f59e0b 100%)');
            root.style.setProperty('--gradient-accent', 'linear-gradient(135deg, #f59e0b 0%, #84cc16 100%)');
            root.style.setProperty('--gradient-bg', 'linear-gradient(135deg, #d1fae5 0%, #ecfccb 25%, #fef3c7 50%, #d1fae5 75%, #ecfccb 100%)');
            break;
        default: // warm
            // Warm orange/coral theme (original)
            root.style.setProperty('--primary-color', '#fb923c');
            root.style.setProperty('--primary-hover', '#f97316');
            root.style.setProperty('--primary-light', '#fed7aa');
            root.style.setProperty('--primary-dark', '#ea580c');
            root.style.setProperty('--secondary-color', '#f87171');
            root.style.setProperty('--secondary-hover', '#ef4444');
            root.style.setProperty('--secondary-light', '#fecaca');
            root.style.setProperty('--accent-color', '#fbbf24');
            root.style.setProperty('--accent-hover', '#f59e0b');
            root.style.setProperty('--accent-light', '#fef3c7');
            root.style.setProperty('--gradient-primary', 'linear-gradient(135deg, #fb923c 0%, #fbbf24 100%)');
            root.style.setProperty('--gradient-accent', 'linear-gradient(135deg, #fbbf24 0%, #f87171 100%)');
            root.style.setProperty('--gradient-bg', 'linear-gradient(135deg, #fef7ed 0%, #fed7aa 25%, #fecaca 50%, #fef3c7 75%, #fef7ed 100%)');
            break;
    }

    // Update current user preference
    currentUser.preferences.colorScheme = scheme;
}

/**
 * Initialize notification settings
 */
function initNotificationSettings() {
    const notificationInputs = document.querySelectorAll('#notifications input[type="checkbox"]');

    notificationInputs.forEach(input => {
        input.addEventListener('change', function () {
            const setting = this.id;
            const enabled = this.checked;

            // Store preference (would sync with backend in real app)
            console.log(`Notification setting ${setting}: ${enabled}`);

            showMessage(`${enabled ? 'Enabled' : 'Disabled'} ${setting.replace(/([A-Z])/g, ' $1').toLowerCase()}`, 'info');
        });
    });
}

/**
 * Initialize privacy settings
 */
function initPrivacySettings() {
    const privacyInputs = document.querySelectorAll('#privacy input[type="checkbox"]');

    privacyInputs.forEach(input => {
        input.addEventListener('change', function () {
            const setting = this.id;
            const enabled = this.checked;

            // Store preference (would sync with backend in real app)
            console.log(`Privacy setting ${setting}: ${enabled}`);

            showMessage(`${enabled ? 'Enabled' : 'Disabled'} ${setting.replace(/([A-Z])/g, ' $1').toLowerCase()}`, 'info');
        });
    });
}

/**
 * Apply accessibility settings
 */
function applyAccessibilitySettings() {
    const body = document.body;
    const fontSize = currentUser.preferences.fontSize;
    const highContrast = currentUser.preferences.highContrast;

    // Remove existing font size classes
    body.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large');
    body.classList.add(`font-${fontSize}`);

    // Apply high contrast
    if (highContrast) {
        body.classList.add('high-contrast');
    } else {
        body.classList.remove('high-contrast');
    }
}

/**
 * Initialize settings actions
 */
function initSettingsActions() {
    const resetBtn = document.getElementById('resetSettings');
    const saveBtn = document.getElementById('saveSettings');

    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            if (confirm('Reset all settings to default values?')) {
                // Reset to defaults
                currentUser.preferences = {
                    defaultCategory: '',
                    timezone: 'America/New_York',
                    dateFormat: 'MM/DD/YYYY',
                    fontSize: 'medium',
                    highContrast: false,
                    theme: 'light',
                    colorScheme: 'warm'
                };

                // Reload settings
                loadSettings();
                applyAccessibilitySettings();
                applyTheme('light');
                applyColorScheme('warm');

                showMessage('Settings reset to defaults');
            }
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', function () {
            showMessage('Settings saved successfully!');
            console.log('Settings saved:', currentUser.preferences);
        });
    }
}

// ===== USER INTERFACE FUNCTIONS =====

/**
 * Initialize user avatar and settings buttons
 */
function initUserInterface() {
    const userAvatarBtn = document.getElementById('userAvatarBtn');
    const settingsBtn = document.getElementById('settingsBtn');

    // User avatar click - go to profile
    if (userAvatarBtn) {
        userAvatarBtn.addEventListener('click', function () {
            switchSection('profile');
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            document.querySelector('[data-section="profile"]').classList.add('active');
            currentSection = 'profile';
        });
    }

    // Settings button click - go to settings
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function () {
            switchSection('settings');
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            document.querySelector('[data-section="settings"]').classList.add('active');
            currentSection = 'settings';
        });
    }
}


// ===== WELCOME MODAL FOR NEW USERS =====

/**
 * Show welcome modal for new users
 */
function showWelcomeModal() {
    const modal = document.getElementById('welcomeModal');
    if (modal) {
        modal.style.display = 'flex';

        // Mark as shown
        localStorage.setItem('officeflow_welcome_shown', 'true');
    }
}

/**
 * Initialize welcome modal buttons
 */
document.getElementById('welcomeCustomize')?.addEventListener('click', function () {
    // Close modal
    const modal = document.getElementById('welcomeModal');
    if (modal) modal.style.display = 'none';

    // Navigate to profile section
    loadSection('profile');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.getElementById('welcomeLater')?.addEventListener('click', function () {
    // Just close the modal
    const modal = document.getElementById('welcomeModal');
    if (modal) modal.style.display = 'none';
});


// ===== PROFILE CUSTOMIZATION POPUP =====

/**
 * Check if user needs to complete their profile
 */
async function checkProfileCompletion() {
    try {
        // If user already has both department and job title, mark as completed
        if (currentUser.department && currentUser.jobTitle) {
            localStorage.setItem('officeflow_profile_completed', 'true');
            return; // Don't show popup
        }

        // Check if user has already been prompted
        const hasCompletedProfile = localStorage.getItem('officeflow_profile_completed');

        // Only show popup if not completed AND missing department or job title
        if (!hasCompletedProfile) {
            // Load company departments with timeout
            await loadCompanyDepartments();

            // Show popup after a short delay
            setTimeout(() => {
                showProfilePopup();
            }, 1000);
        }
    } catch (error) {
        console.warn('Profile completion check failed:', error);
    }
}

/**
 * Load company departments for the popup
 */
async function loadCompanyDepartments() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('http://localhost:3000/api/company/settings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.company.settings.departments) {
                // Populate both popup and profile form department dropdowns
                const departments = data.company.settings.departments;

                const popupSelect = document.getElementById('popupDepartment');
                const profileSelect = document.getElementById('department');

                const options = departments.map(dept =>
                    `<option value="${dept}">${dept}</option>`
                ).join('');

                if (popupSelect) {
                    popupSelect.innerHTML = '<option value="">Select your department</option>' + options;
                }

                if (profileSelect) {
                    profileSelect.innerHTML = '<option value="">Select Department</option>' + options;
                }
            }
        }
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

/**
 * Show profile customization popup
 */
function showProfilePopup() {
    const overlay = document.getElementById('profilePopupOverlay');
    if (overlay) {
        overlay.classList.add('show');

        // Set current values if they exist
        if (currentUser.department) {
            document.getElementById('popupDepartment').value = currentUser.department;
        }
        if (currentUser.jobTitle) {
            document.getElementById('popupJobTitle').value = currentUser.jobTitle;
        }
    }
}

/**
 * Hide profile customization popup
 */
function hideProfilePopup() {
    const overlay = document.getElementById('profilePopupOverlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

/**
 * Save profile from popup
 */
async function saveProfileFromPopup() {
    const department = document.getElementById('popupDepartment').value;
    const jobTitle = document.getElementById('popupJobTitle').value.trim();

    if (!department) {
        alert('Please select your department');
        return;
    }

    if (!jobTitle) {
        alert('Please enter your job title');
        return;
    }

    try {
        const token = localStorage.getItem('authToken');
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        console.log('Saving profile:', { userId: user.id, department, jobTitle });

        const response = await fetch(`http://localhost:3000/api/users/${user.id}/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ department, jobTitle })
        });

        const data = await response.json();
        console.log('Profile update response:', data);

        if (response.ok && data.success) {
            // Update local user data
            currentUser.department = department;
            currentUser.jobTitle = jobTitle;
            user.department = department;
            user.jobTitle = jobTitle;
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('officeflow_profile_completed', 'true');

            // Update UI
            initUserInfo();

            // Hide popup
            hideProfilePopup();

            // Show success message
            showMessage('Profile updated successfully!', 'success');

            // Notify other tabs/windows that user data changed
            // This will help admin dashboards refresh their user lists
            const timestamp = Date.now().toString();
            localStorage.setItem('officeflow_user_updated', timestamp);
            console.log('Profile update notification sent:', timestamp);
        } else {
            console.error('Profile update failed:', data);
            alert(data.message || 'Failed to update profile. Please try again.');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('An error occurred. Please try again.');
    }
}

// Profile popup event listeners
document.getElementById('popupLaterBtn')?.addEventListener('click', () => {
    hideProfilePopup();
    // Don't mark as completed so it shows again next time
});

document.getElementById('popupSaveBtn')?.addEventListener('click', () => {
    saveProfileFromPopup();
});


// ===== ADMIN REQUEST FUNCTIONALITY =====

/**
 * Show/hide admin request section based on user role
 */
function checkAdminRequestEligibility() {
    const adminRequestSection = document.getElementById('adminRequestSection');

    if (adminRequestSection && currentUser.role === 'user') {
        adminRequestSection.style.display = 'block';
    }
}

/**
 * Request admin access
 */
async function requestAdminAccess() {
    if (currentUser.role !== 'user') {
        alert('Only regular users can request admin access');
        return;
    }

    if (!confirm('Are you sure you want to request admin access? This will be sent to the Super Admin for approval.')) {
        return;
    }

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('http://localhost:3000/api/request-admin', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            showMessage('Admin request submitted successfully! You will be notified once reviewed.', 'success');
            // Hide the request section
            document.getElementById('adminRequestSection').style.display = 'none';
        } else {
            alert(data.message || 'Failed to submit request');
        }
    } catch (error) {
        console.error('Error requesting admin access:', error);
        alert('An error occurred. Please try again.');
    }
}

// Admin request button handler
document.getElementById('requestAdminBtn')?.addEventListener('click', requestAdminAccess);
// ===== SERVICE BUTTONS =====

/**
 * Initialize service buttons
 */
function initServiceButtons() {
    const serviceButtons = document.querySelectorAll('.service-btn');

    serviceButtons.forEach(button => {
        button.addEventListener('click', function () {
            const category = this.getAttribute('data-category');
            const type = this.getAttribute('data-type');

            // Pre-fill form and switch to submit section
            switchSection('submit-request');
            document.querySelector('[data-section="submit-request"]').classList.add('active');
            document.querySelector('.nav-link.active').classList.remove('active');

            // Update nav
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            document.querySelector('[data-section="submit-request"]').classList.add('active');

            // Pre-fill form
            setTimeout(() => {
                document.getElementById('requestCategory').value = category;

                // Show leave fields if this is a leave request
                if (category === 'HR' && type === 'Leave') {
                    const leaveFields = document.getElementById('leaveFields');
                    if (leaveFields) {
                        leaveFields.style.display = 'block';
                        // Show available balance
                        const availEl = document.getElementById('availableLeave');
                        if (availEl) availEl.textContent = `${currentUser.leaveBalance.annual} days`;
                    }
                }

                document.getElementById('requestTitle').focus();

                // Pre-fill title based on type
                const titleSuggestions = {
                    'Hardware': 'Hardware Issue - ',
                    'Software': 'Software Request - ',
                    'Network': 'Network Issue - ',
                    'Electrical': 'Electrical Issue - ',
                    'Plumbing': 'Plumbing Issue - ',
                    'HVAC': 'HVAC Issue - ',
                    'Leave': 'Leave Request - ',
                    'Documents': 'Document Request - '
                };

                if (titleSuggestions[type]) {
                    document.getElementById('requestTitle').value = titleSuggestions[type];
                }
            }, 100);
        });
    });
}

// ===== REQUEST SUBMISSION =====

/**
 * Handle form submission with backend API
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const requestData = {
        title: formData.get('title'),
        category: formData.get('category'),
        priority: formData.get('priority'),
        description: formData.get('description'),
        type: 'General'
    };

    // If HR category, check if leave dates are provided
    if (requestData.category === 'HR') {
        const start = formData.get('leaveStart');
        const end = formData.get('leaveEnd');

        // Only treat as leave request if dates are provided
        if (start && end) {
            const days = calculateLeaveDays(start, end);
            requestData.type = 'Leave';
            requestData.leave = { start, end, days };
            requestData.deduct = document.getElementById('deductFromBalance')?.checked || false;
            // Note: Balance validation will be done by admin when approving
        }
    }

    // Validate form
    if (!validateForm(requestData)) {
        return;
    }

    // Add loading state
    const submitBtn = document.getElementById('submitRequest');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';
    submitBtn.disabled = true;

    try {
        // Submit request to backend API
        const token = localStorage.getItem('authToken');
        const response = await fetch('http://localhost:3000/api/requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestData)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to submit request');
        }

        // Add request to local array for immediate UI update
        const newRequest = {
            id: data.request.id,
            title: requestData.title,
            category: requestData.category,
            priority: requestData.priority,
            description: requestData.description,
            status: 'Pending',
            dateSubmitted: getCurrentTimestamp(),
            lastUpdated: getCurrentTimestamp(),
            type: requestData.type
        };

        if (requestData.type === 'Leave') {
            newRequest.leave = requestData.leave;
            newRequest.deduct = requestData.deduct;
        }

        requests.unshift(newRequest);

        // NOTE: Leave balance is NOT deducted here - only when request is approved by admin

        // Reset form
        clearForm();

        // Show success message with routing information
        showMessage(data.message || 'Request submitted successfully!');

        // Update stats
        updateStats();

        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;

        // Switch to requests view
        switchSection('your-requests');
        document.querySelector('[data-section="your-requests"]').classList.add('active');
        document.querySelector('[data-section="submit-request"]').classList.remove('active');

        console.log('Request submitted successfully:', data.request);
    } catch (error) {
        console.error('Error submitting request:', error);
        showMessage('Failed to submit request: ' + error.message, 'error');

        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// ===== FORM INITIALIZATION =====

/**
 * Initialize request form
 */
function initRequestForm() {
    const form = document.getElementById('requestForm');
    const clearBtn = document.getElementById('clearForm');
    const categorySelect = document.getElementById('requestCategory');
    const leaveFields = document.getElementById('leaveFields');
    const calcBtn = document.getElementById('calcLeaveBtn');
    const leaveStart = document.getElementById('leaveStart');
    const leaveEnd = document.getElementById('leaveEnd');
    const leaveDaysEl = document.getElementById('leaveDays');
    const availEl = document.getElementById('availableLeave');
    const deductChk = document.getElementById('deductFromBalance');

    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', clearForm);
    }

    // Show leave fields when HR category selected
    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            const leaveFields = document.getElementById('leaveFields');
            const availEl = document.getElementById('availableLeave');

            if (categorySelect.value === 'HR') {
                // Don't automatically show leave fields - let user choose via service buttons
                // Only show if they came from the "Request Leave" button
                if (leaveFields && leaveFields.style.display === 'block') {
                    // Keep it visible if already shown
                    if (availEl) availEl.textContent = `${currentUser.leaveBalance.annual} days`;
                }
            } else {
                // Hide leave fields for non-HR categories
                if (leaveFields) leaveFields.style.display = 'none';
            }
        });

        // Initialize visibility based on current value
        if (categorySelect.value === 'HR') {
            const leaveFields = document.getElementById('leaveFields');
            const availEl = document.getElementById('availableLeave');
            if (leaveFields && leaveFields.style.display === 'block') {
                if (availEl) availEl.textContent = `${currentUser.leaveBalance.annual} days`;
            }
        }
    }

    // Calculate leave days
    if (calcBtn) {
        calcBtn.addEventListener('click', () => {
            const days = calculateLeaveDays(leaveStart.value, leaveEnd.value);
            if (leaveDaysEl) leaveDaysEl.textContent = days;
            if (availEl) {
                const remaining = currentUser.leaveBalance.annual - days;
                availEl.textContent = `${currentUser.leaveBalance.annual} available · After: ${remaining >= 0 ? remaining : 0}`;
                if (remaining < 0) availEl.style.color = 'var(--error-color)';
                else availEl.style.color = '';
            }
        });
    }

    // Add form validation
    const inputs = form?.querySelectorAll('input, select, textarea');
    inputs?.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearFieldError);
    });
}

// ===== DASHBOARD INITIALIZATION =====

/**
 * Initialize dashboard when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function () {
    console.log('officeFlow Dashboard Initializing...');

    // Check authentication first
    if (!checkAuthentication()) {
        return; // Will redirect to login
    }

    // Show loading overlay
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
    }

    try {
        // Initialize core components (these should be fast)
        console.log('Initializing user info...');
        initUserInfo();

        console.log('Initializing navigation...');
        initNavigation();

        console.log('Initializing request form...');
        initRequestForm();

        console.log('Initializing service buttons...');
        initServiceButtons();

        console.log('Initializing user interface...');
        initUserInterface();

        console.log('Initializing settings actions...');
        initSettingsActions();

        console.log('Handling logout...');
        handleLogout();

        // Apply user preferences
        console.log('Applying accessibility settings...');
        applyAccessibilitySettings();

        console.log('Applying theme...');
        applyTheme(currentUser.preferences.theme);

        console.log('Applying color scheme...');
        applyColorScheme(currentUser.preferences.colorScheme);

        // Load initial section
        console.log('Loading overview...');
        loadOverview();

        console.log('Dashboard core initialized successfully');

        // Hide loading overlay quickly
        setTimeout(() => {
            if (loadingOverlay) {
                loadingOverlay.classList.add('hidden');
            }
        }, 500);

        // Load optional features asynchronously (don't block UI)
        setTimeout(async () => {
            try {
                loadCompanySettingsUser();
                await loadUserRequests(); // Load user requests from backend
                checkProfileCompletion();
                checkAdminRequestEligibility();

                // Update last login and check for notifications
                await updateLastLogin();
                await checkNotifications();
            } catch (error) {
                console.warn('Optional features failed to load:', error);
            }
        }, 100);

    } catch (error) {
        console.error('Dashboard initialization error:', error);

        // Hide loading overlay even if there's an error
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }

        // Show error message
        showMessage('Dashboard loaded with limited functionality. Some features may not work.', 'error');
    }

    console.log('Dashboard ready for user interaction');
});

// ===== SECTION NAVIGATION =====

/**
 * Switch between sections
 */
function switchSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });

    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');

        // Load section-specific content
        switch (sectionId) {
            case 'overview':
                loadOverview();
                break;
            case 'your-requests':
                loadYourRequests();
                break;
            case 'hr-services':
                loadHRServices();
                break;
            case 'profile':
                loadProfile();
                break;
            case 'settings':
                loadSettings();
                break;
        }
    }
}

// ===== YOUR REQUESTS SECTION =====

/**
 * Load your requests section
 */
async function loadYourRequests() {
    showRequestsLoading();

    try {
        // Load requests from backend
        await loadUserRequests();

        // Initialize filters and render
        initFilters();
        applyFilters();
    } catch (error) {
        console.error('Error loading requests:', error);
        showMessage('Failed to load requests', 'error');
    } finally {
        hideRequestsLoading();
    }
}

/**
 * Load user requests from backend
 */
async function loadUserRequests() {
    try {
        console.log('Loading user requests...');
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn('No auth token available for loading requests');
            requests = []; // Set empty array so UI doesn't break
            return;
        }

        console.log('Making API call to load requests...');
        const response = await fetch('http://localhost:3000/api/requests', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('Requests API response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            requests = data.requests || [];
            console.log('Successfully loaded requests:', requests.length);

            // Update dashboard stats after loading requests
            updateDashboardStats();
        } else {
            console.error('Failed to load requests:', response.status, response.statusText);
            requests = []; // Set empty array so UI doesn't break

            // Try to get error details
            try {
                const errorData = await response.json();
                console.error('Error details:', errorData);
            } catch (e) {
                console.error('Could not parse error response');
            }
        }
    } catch (error) {
        console.error('Error loading user requests:', error);
        requests = []; // Set empty array so UI doesn't break
    }
}

/**
 * Show loading state for requests
 */
function showRequestsLoading() {
    const grid = document.getElementById('requestsGrid');
    if (grid) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--gray-500);">
                <div class="loading-spinner" style="margin: 0 auto 1rem; width: 40px; height: 40px;"></div>
                <p>Loading your requests...</p>
            </div>
        `;
    }
}

/**
 * Hide loading state for requests
 */
function hideRequestsLoading() {
    // Loading will be replaced by actual content in renderRequests
}

/**
 * Render requests grid
 */
function renderRequests() {
    const grid = document.getElementById('requestsGrid');
    if (!grid) return;

    console.log('Rendering requests:', filteredRequests.length);
    console.log('Sample request data:', filteredRequests[0]);

    if (filteredRequests.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--gray-500);">
                <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                <h3>No requests found</h3>
                <p>Try adjusting your filters or submit a new request.</p>
            </div>
        `;
        return;
    }

    try {
        grid.innerHTML = filteredRequests.map((request, index) => {
            console.log(`Processing request ${index}:`, {
                title: request.title,
                dateSubmitted: request.dateSubmitted,
                dateType: typeof request.dateSubmitted
            });

            return `
                <div class="request-card">
                    <div class="request-header">
                        <div>
                            <h3 class="request-title">${request.title || 'No Title'}</h3>
                            <span class="request-category">${request.category || 'No Category'}</span>
                        </div>
                    </div>
                    <p class="request-description">${request.description || 'No Description'}</p>
                    <div class="request-footer">
                        <span class="request-status ${getStatusClass(request.status)}">
                            ${request.status || 'Unknown'}
                        </span>
                        <span class="request-date">${formatDate(request.dateSubmitted)}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error rendering requests:', error);
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--red-500);">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                <h3>Error loading requests</h3>
                <p>There was an error displaying your requests. Please refresh the page.</p>
            </div>
        `;
    }
}

/**
 * Initialize filters
 */
function initFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const clearFilters = document.getElementById('clearFilters');

    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }
    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyFilters);
    }
    if (clearFilters) {
        clearFilters.addEventListener('click', function () {
            if (statusFilter) statusFilter.value = '';
            if (categoryFilter) categoryFilter.value = '';
            applyFilters();
        });
    }
}

/**
 * Apply filters to requests
 */
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const categoryFilter = document.getElementById('categoryFilter');

    const statusValue = statusFilter ? statusFilter.value : '';
    const categoryValue = categoryFilter ? categoryFilter.value : '';

    filteredRequests = requests.filter(request => {
        const matchesStatus = !statusValue || request.status === statusValue;
        const matchesCategory = !categoryValue || request.category === categoryValue;
        return matchesStatus && matchesCategory;
    });

    renderRequests();
}

// ===== OVERVIEW SECTION =====

/**
 * Load overview section
 */
function loadOverview() {
    updateStats();
    loadRecentActivity();
}

/**
 * Load recent activity
 */
function loadRecentActivity() {
    const activityList = document.getElementById('recentActivity');
    if (!activityList) return;

    const recentRequests = requests
        .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
        .slice(0, 5);

    activityList.innerHTML = recentRequests.map(request => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas fa-${getActivityIcon(request.category)}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-text">
                    ${request.title} - ${request.status}
                </div>
                <div class="activity-time">
                    ${formatDate(request.lastUpdated)}
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Get activity icon based on category
 */
function getActivityIcon(category) {
    const iconMap = {
        'IT': 'laptop',
        'Maintenance': 'tools',
        'HR': 'users'
    };
    return iconMap[category] || 'file-alt';
}

// ===== HR SERVICES SECTION =====

/**
 * Load HR services section
 */
function loadHRServices() {
    updateLeaveBalance();
}

/**
 * Update leave balance display
 */
function updateLeaveBalance() {
    const annualEl = document.getElementById('annualLeave');
    const sickEl = document.getElementById('sickLeave');
    const personalEl = document.getElementById('personalLeave');
    const emergencyEl = document.getElementById('emergencyLeave');

    if (annualEl) annualEl.textContent = `${currentUser.leaveBalance.annual} days`;
    if (sickEl) sickEl.textContent = `${currentUser.leaveBalance.sick} days`;
    if (personalEl) personalEl.textContent = `${currentUser.leaveBalance.personal} days`;
    if (emergencyEl) emergencyEl.textContent = `${currentUser.leaveBalance.emergency} days`;
}