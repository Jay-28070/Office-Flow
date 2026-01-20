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

// ===== UTILITY FUNCTIONS =====

/**
 * Generate unique ID for new requests
 */
function generateRequestId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `REQ${timestamp}${random}`.slice(-10);
}

/**
 * Format date for display based on user preferences
 */
function formatDate(dateString) {
    const date = new Date(dateString);
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
function updateStats() {
    const pendingCount = requests.filter(r => r.status === 'Pending').length;
    const completedCount = requests.filter(r => r.status === 'Completed').length;
    const thisMonthCount = requests.filter(r => {
        const requestDate = new Date(r.dateSubmitted);
        const currentDate = new Date();
        return requestDate.getMonth() === currentDate.getMonth() &&
            requestDate.getFullYear() === currentDate.getFullYear();
    }).length;

    document.getElementById('pendingCount').textContent = pendingCount;
    document.getElementById('completedCount').textContent = completedCount;
    document.getElementById('thisMonth').textContent = thisMonthCount;
    document.getElementById('leaveBalance').textContent = `${currentUser.leaveBalance.annual}`;
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
            if (categorySelect.value === 'HR') {
                if (leaveFields) leaveFields.style.display = 'block';
                // show available balance
                if (availEl) availEl.textContent = `${currentUser.leaveBalance.annual} days`;
            } else {
                if (leaveFields) leaveFields.style.display = 'none';
            }
        });
        // initialize visibility based on current value
        if (categorySelect.value === 'HR') {
            if (leaveFields) leaveFields.style.display = 'block';
            if (availEl) availEl.textContent = `${currentUser.leaveBalance.annual} days`;
        } else {
            if (leaveFields) leaveFields.style.display = 'none';
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
 * Handle form submission
 */
function handleFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const requestData = {
        id: generateRequestId(),
        title: formData.get('title'),
        category: formData.get('category'),
        priority: formData.get('priority'),
        description: formData.get('description'),
        status: 'Pending',
        dateSubmitted: getCurrentTimestamp(),
        lastUpdated: getCurrentTimestamp(),
        type: 'General'
    };
    // If HR leave request, include dates and days
    if (requestData.category === 'HR') {
        const start = formData.get('leaveStart');
        const end = formData.get('leaveEnd');
        const days = calculateLeaveDays(start, end);
        requestData.type = 'Leave';
        requestData.leave = { start, end, days };
        requestData.deduct = document.getElementById('deductFromBalance')?.checked || false;
        // If user chose to deduct immediately, ensure enough balance
        if (requestData.deduct && days > currentUser.leaveBalance.annual) {
            showMessage('Not enough annual leave balance for this request.', 'error');
            return;
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

    // Simulate API call
    setTimeout(() => {
        // Add request to array
        requests.unshift(requestData);

        // Deduct leave immediately if requested
        if (requestData.type === 'Leave' && requestData.deduct) {
            currentUser.leaveBalance.annual = Math.max(0, currentUser.leaveBalance.annual - requestData.leave.days);
            updateLeaveBalance();
        }

        // Reset form
        clearForm();

        // Show success message
        showMessage('Request submitted successfully! You will receive updates via email.');

        // Update stats
        updateStats();

        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;

        // Switch to requests view
        switchSection('your-requests');
        document.querySelector('[data-section="your-requests"]').classList.add('active');
        document.querySelector('[data-section="submit-request"]').classList.remove('active');

        console.log('New request submitted:', requestData);
    }, 1500);
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
    // additional validation for leave requests
    if (data.category === 'HR' && data.type === 'Leave') {
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
function loadYourRequests() {
    renderRequests();
    initFilters();
}

/**
 * Render requests grid
 */
function renderRequests() {
    const grid = document.getElementById('requestsGrid');

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

    grid.innerHTML = filteredRequests.map(request => `
        <div class="request-card">
            <div class="request-header">
                <div>
                    <h3 class="request-title">${request.title}</h3>
                    <span class="request-category">${request.category}</span>
                </div>
            </div>
            <p class="request-description">${request.description}</p>
            <div class="request-footer">
                <span class="request-status ${getStatusClass(request.status)}">
                    ${request.status}
                </span>
                <span class="request-date">${formatDate(request.dateSubmitted)}</span>
            </div>
        </div>
    `).join('');
}

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
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch('http://localhost:3000/api/company/settings', { headers });
        if (!res.ok) return;
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
        }
    } catch (e) {
        console.warn('Could not load company settings:', e);
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
    // If user already has both department and job title, mark as completed
    if (currentUser.department && currentUser.jobTitle) {
        localStorage.setItem('officeflow_profile_completed', 'true');
        return; // Don't show popup
    }

    // Check if user has already been prompted
    const hasCompletedProfile = localStorage.getItem('officeflow_profile_completed');

    // Only show popup if not completed AND missing department or job title
    if (!hasCompletedProfile) {
        // Load company departments
        await loadCompanyDepartments();

        // Show popup after a short delay
        setTimeout(() => {
            showProfilePopup();
        }, 1000);
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
