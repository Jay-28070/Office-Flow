/**
 * officeFlow Admin Dashboard Script
 * Role-based admin system with Firebase integration
 * Supports Admin and Super Admin roles with department-specific access control
 */

// ===== GLOBAL STATE =====
let currentUser = null;
let currentAdmin = null;
let userRole = null; // 'admin' or 'super_admin'
let userDepartment = null;
let allUsers = [];
let departmentRequests = [];
let allDepartments = [];
let currentSection = 'overview';

// ===== MOCK DATA (Remove when Firebase is integrated) =====
const mockUsers = [
    {
        uid: 'user1',
        email: 'john.doe@company.com',
        firstName: 'John',
        lastName: 'Doe',
        jobTitle: 'Software Developer',
        department: 'IT',
        role: 'user',
        phoneNumber: '+1-555-0101',
        joinDate: '2024-01-15',
        status: 'active'
    },
    {
        uid: 'user2',
        email: 'jane.smith@company.com',
        firstName: 'Jane',
        lastName: 'Smith',
        jobTitle: 'HR Specialist',
        department: 'HR',
        role: 'user',
        phoneNumber: '+1-555-0102',
        joinDate: '2024-01-10',
        status: 'active'
    },
    {
        uid: 'admin1',
        email: 'admin.it@company.com',
        firstName: 'Mike',
        lastName: 'Johnson',
        jobTitle: 'IT Department Head',
        department: 'IT',
        role: 'admin',
        phoneNumber: '+1-555-0201',
        joinDate: '2023-12-01',
        status: 'active'
    },
    {
        uid: 'superadmin1',
        email: 'super.admin@company.com',
        firstName: 'Sarah',
        lastName: 'Wilson',
        jobTitle: 'Operations Director',
        department: 'Administration',
        role: 'super_admin',
        phoneNumber: '+1-555-0301',
        joinDate: '2023-11-01',
        status: 'active'
    }
];

const mockRequests = [
    {
        id: 'REQ001',
        title: 'Laptop Screen Flickering',
        description: 'My laptop screen has been flickering intermittently.',
        category: 'IT',
        type: 'Hardware',
        priority: 'Medium',
        status: 'Pending',
        submittedBy: 'user1',
        submittedByName: 'John Doe',
        department: 'IT',
        dateSubmitted: '2024-01-12',
        lastUpdated: '2024-01-12',
        assignedTo: null,
        assignedToName: null
    },
    {
        id: 'REQ002',
        title: 'Annual Leave Request',
        description: 'Requesting 5 days of annual leave from January 25th.',
        category: 'HR',
        type: 'Leave',
        priority: 'Low',
        status: 'Assigned',
        submittedBy: 'user1',
        submittedByName: 'John Doe',
        department: 'HR',
        dateSubmitted: '2024-01-10',
        lastUpdated: '2024-01-11',
        assignedTo: 'user2',
        assignedToName: 'Jane Smith'
    }
];

const mockDepartments = [
    {
        id: 'IT',
        name: 'IT Department',
        description: 'Information Technology services and support',
        adminId: 'admin1',
        adminName: 'Mike Johnson',
        staffCount: 8,
        pendingRequests: 3,
        completedToday: 2
    },
    {
        id: 'HR',
        name: 'HR Department',
        description: 'Human Resources and employee services',
        adminId: 'admin2',
        adminName: 'Lisa Garcia',
        staffCount: 5,
        pendingRequests: 1,
        completedToday: 4
    },
    {
        id: 'Maintenance',
        name: 'Maintenance Department',
        description: 'Facility maintenance and repairs',
        adminId: 'admin3',
        adminName: 'Tom Anderson',
        staffCount: 12,
        pendingRequests: 5,
        completedToday: 3
    }
];

// ===== UTILITY FUNCTIONS =====

/**
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Get status class for styling
 */
function getStatusClass(status) {
    const statusMap = {
        'Pending': 'status-pending',
        'Assigned': 'status-assigned',
        'In Progress': 'status-in-progress',
        'Completed': 'status-completed',
        'Rejected': 'status-rejected'
    };
    return statusMap[status] || 'status-pending';
}

/**
 * Get priority class for styling
 */
function getPriorityClass(priority) {
    const priorityMap = {
        'Low': 'priority-low',
        'Medium': 'priority-medium',
        'High': 'priority-high',
        'Urgent': 'priority-urgent'
    };
    return priorityMap[priority] || 'priority-medium';
}

/**
 * Show success/error message
 */
function showMessage(text, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${text}</span>
    `;

    const mainContent = document.querySelector('.main-content');
    const firstSection = mainContent.querySelector('.content-section.active');
    firstSection.insertBefore(messageDiv, firstSection.firstChild);

    // Auto remove after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

/**
 * Check if user has permission for action
 */
function hasPermission(action) {
    if (userRole === 'super_admin') return true;

    const adminPermissions = [
        'view_department_requests',
        'assign_tasks',
        'manage_department_staff',
        'view_department_analytics'
    ];

    const superAdminPermissions = [
        'create_admins',
        'view_all_departments',
        'manage_all_users',
        'system_settings'
    ];

    if (userRole === 'admin') {
        return adminPermissions.includes(action);
    }

    return false;
}

// ===== FIREBASE AUTHENTICATION =====

/**
 * Initialize Firebase Authentication
 */
function initFirebaseAuth() {
    console.log('Initializing Firebase Auth for admin dashboard');

    // Load real user data from token
    loadCurrentUser();
}

/**
 * Load current user from auth token
 */
async function loadCurrentUser() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('No auth token found');
            window.location.href = '../../users/pages/login.html';
            return;
        }

        // Decode Firebase ID token to get user ID
        // Firebase tokens have 'user_id' field in the payload
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.user_id || payload.uid;
        console.log('Token payload:', payload);
        console.log('Loading user with ID:', userId);

        if (!userId) {
            throw new Error('No user ID found in token');
        }

        // Fetch user data from backend
        const response = await fetch(`http://localhost:3000/api/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error response:', errorData);
            throw new Error(errorData.message || 'Failed to load user data');
        }

        const data = await response.json();
        console.log('User data received:', data);

        if (data.success && data.user) {
            currentUser = data.user;
            currentAdmin = data.user;
            userRole = data.user.role;
            userDepartment = data.user.department;

            console.log('Loaded current user:', currentUser);

            // Initialize UI based on role
            initializeUserInterface();
        } else {
            throw new Error('Invalid user data');
        }
    } catch (error) {
        console.error('Error loading user:', error);
        alert(`Failed to load user data: ${error.message}. Please login again.`);
        // Don't redirect immediately, let user see the error
        setTimeout(() => {
            window.location.href = '../../users/pages/login.html';
        }, 2000);
    }
}

/**
 * Load user profile from Firestore
 */
async function loadUserProfile(uid) {
    // TODO: Load from Firestore
    console.log('Would load user profile from Firestore:', uid);

    // Mock data for development
    return currentUser;
}

/**
 * Handle logout
 */
function handleLogout() {
    const logoutBtn = document.getElementById('logoutBtn');

    logoutBtn.addEventListener('click', function () {
        if (confirm('Are you sure you want to logout?')) {
            this.innerHTML = '<span class="spinner"></span> <span class="desktop-only">Logging out...</span>';
            this.disabled = true;

            // TODO: Firebase signOut
            // auth.signOut().then(() => {
            //     window.location.href = '../../users/pages/index.html';
            // });

            // Mock logout
            setTimeout(() => {
                console.log('Admin logged out');
                window.location.href = '../../users/pages/index.html';
            }, 1000);
        }
    });
}
// ===== USER INTERFACE INITIALIZATION =====

/**
 * Initialize user interface based on role
 */
function initializeUserInterface() {
    updateUserInfo();
    updateRoleBasedUI();
    loadDepartmentData();
    initNavigation();
    loadOverview();
}

/**
 * Update user information in UI
 */
function updateUserInfo() {
    if (!currentAdmin) return;

    // Handle fullName (split if needed) or use firstName/lastName if available
    const displayName = currentAdmin.fullName || `${currentAdmin.firstName || ''} ${currentAdmin.lastName || ''}`.trim();
    document.getElementById('userName').textContent = displayName;
    document.getElementById('userDepartment').textContent = currentAdmin.department || 'No Department';

    // Check if adminRole element exists before updating
    const adminRoleElement = document.getElementById('adminRole');
    if (adminRoleElement) {
        adminRoleElement.textContent = userRole === 'superadmin' ? 'Super Admin' : 'Admin';
    }

    // Update profile section if elements exist
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileRole = document.getElementById('profileRole');
    const profileDepartment = document.getElementById('profileDepartment');

    if (profileName) profileName.textContent = displayName;
    if (profileEmail) profileEmail.textContent = currentAdmin.email;
    if (profileRole) profileRole.textContent = userRole === 'superadmin' ? 'Super Administrator' : 'Administrator';
    if (profileDepartment) profileDepartment.textContent = currentAdmin.department || 'No Department';
}

/**
 * Update UI based on user role
 */
function updateRoleBasedUI() {
    const body = document.body;
    const superAdminElements = document.querySelectorAll('.super-admin-only');

    if (userRole === 'super_admin') {
        body.classList.add('super-admin');
        superAdminElements.forEach(el => el.style.display = 'block');
    } else {
        body.classList.remove('super-admin');
        superAdminElements.forEach(el => el.style.display = 'none');
    }

    // Update section subtitles based on role
    updateSectionSubtitles();
}

/**
 * Update section subtitles based on role
 */
function updateSectionSubtitles() {
    const overviewSubtitle = document.getElementById('overviewSubtitle');
    const departmentRequestsSubtitle = document.getElementById('departmentRequestsSubtitle');
    const staffManagementSubtitle = document.getElementById('staffManagementSubtitle');
    const analyticsSubtitle = document.getElementById('analyticsSubtitle');

    if (userRole === 'super_admin') {
        if (overviewSubtitle) overviewSubtitle.textContent = 'Manage all departments and system administration.';
        if (departmentRequestsSubtitle) departmentRequestsSubtitle.textContent = 'View and manage requests across all departments.';
        if (staffManagementSubtitle) staffManagementSubtitle.textContent = 'Manage all staff members across departments.';
        if (analyticsSubtitle) analyticsSubtitle.textContent = 'System-wide performance metrics and analytics.';
    } else {
        if (overviewSubtitle) overviewSubtitle.textContent = `Manage your ${userDepartment} department's requests and staff.`;
        if (departmentRequestsSubtitle) departmentRequestsSubtitle.textContent = `View and manage requests for the ${userDepartment} department.`;
        if (staffManagementSubtitle) staffManagementSubtitle.textContent = `Manage your ${userDepartment} department staff.`;
        if (analyticsSubtitle) analyticsSubtitle.textContent = `Performance metrics for the ${userDepartment} department.`;
    }
}

// ===== DEPARTMENT DATA MANAGEMENT =====

/**
 * Load department-specific data
 */
function loadDepartmentData() {
    if (userRole === 'super_admin') {
        loadAllDepartmentsData();
    } else {
        loadSingleDepartmentData();
    }
}

/**
 * Load data for all departments (Super Admin)
 */
function loadAllDepartmentsData() {
    // TODO: Load from Firestore
    console.log('Loading all departments data');

    // Mock data
    allDepartments = mockDepartments;
    departmentRequests = mockRequests;
    allUsers = mockUsers;

    updateDepartmentInfo();
}

/**
 * Load data for single department (Admin)
 */
function loadSingleDepartmentData() {
    // TODO: Load from Firestore with department filter
    console.log('Loading department data for:', userDepartment);

    // Mock data filtered by department
    const departmentData = mockDepartments.find(d => d.id === userDepartment);
    departmentRequests = mockRequests.filter(r => r.department === userDepartment);
    allUsers = mockUsers.filter(u => u.department === userDepartment);

    updateDepartmentInfo(departmentData);
}

/**
 * Update department information in UI
 */
function updateDepartmentInfo(departmentData = null) {
    const departmentInfoCard = document.getElementById('departmentInfoCard');
    const departmentName = document.getElementById('departmentName');
    const departmentDescription = document.getElementById('departmentDescription');

    if (userRole === 'super_admin') {
        // Hide department info card for super admin
        if (departmentInfoCard) departmentInfoCard.style.display = 'none';
    } else if (departmentData) {
        if (departmentName) departmentName.textContent = departmentData.name;
        if (departmentDescription) departmentDescription.textContent = departmentData.description;
    }

    updateDepartmentStats();
}

/**
 * Update department statistics
 */
function updateDepartmentStats() {
    let pendingCount, assignedCount, completedToday, staffCount;

    if (userRole === 'super_admin') {
        // Aggregate stats across all departments
        pendingCount = mockRequests.filter(r => r.status === 'Pending').length;
        assignedCount = mockRequests.filter(r => r.status === 'Assigned' || r.status === 'In Progress').length;
        completedToday = mockRequests.filter(r => {
            const today = new Date().toISOString().split('T')[0];
            return r.status === 'Completed' && r.lastUpdated === today;
        }).length;
        staffCount = mockUsers.filter(u => u.role === 'user').length;
    } else {
        // Department-specific stats
        pendingCount = departmentRequests.filter(r => r.status === 'Pending').length;
        assignedCount = departmentRequests.filter(r => r.status === 'Assigned' || r.status === 'In Progress').length;
        completedToday = departmentRequests.filter(r => {
            const today = new Date().toISOString().split('T')[0];
            return r.status === 'Completed' && r.lastUpdated === today;
        }).length;
        staffCount = allUsers.filter(u => u.role === 'user').length;
    }

    document.getElementById('departmentPending').textContent = pendingCount;
    document.getElementById('departmentAssigned').textContent = assignedCount;
    document.getElementById('departmentCompleted').textContent = completedToday;
    document.getElementById('departmentStaff').textContent = staffCount;
}

// ===== NAVIGATION =====

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
            }
        });
    });

    // Logo click to toggle menu on mobile
    const navBrand = document.getElementById('navBrand');
    if (navBrand) {
        navBrand.addEventListener('click', function () {
            if (window.innerWidth <= 1024) {
                toggleMobileMenu();
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

    // Initialize settings tabs
    initSettingsTabs();
}

/**
 * Toggle mobile menu
 */
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('open');

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
            case 'department-requests':
                loadDepartmentRequests();
                break;
            case 'task-assignment':
                loadTaskAssignment();
                break;
            case 'staff-management':
                loadStaffManagement();
                break;
            case 'admin-management':
                loadAdminManagement();
                break;
            case 'all-departments':
                loadAllDepartments();
                break;
            case 'analytics':
                loadAnalytics();
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
    updateDepartmentStats();
    loadRecentActivity();
}

/**
 * Load recent activity
 */
function loadRecentActivity() {
    const activityList = document.getElementById('recentActivity');
    const recentRequests = (userRole === 'super_admin' ? mockRequests : departmentRequests)
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
                    ${request.assignedToName ? `(Assigned to ${request.assignedToName})` : ''}
                </div>
                <div class="activity-time">
                    ${formatDate(request.lastUpdated)} • ${request.department}
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
        'HR': 'users',
        'Security': 'shield-alt',
        'Administration': 'building'
    };
    return iconMap[category] || 'file-alt';
}
// ===== DEPARTMENT REQUESTS SECTION =====

/**
 * Load department requests section
 */
function loadDepartmentRequests() {
    renderRequestsTable();
    initRequestFilters();
}

/**
 * Render requests table
 */
function renderRequestsTable() {
    const tableBody = document.getElementById('departmentRequestsTableBody');
    const requests = userRole === 'super_admin' ? mockRequests : departmentRequests;

    if (requests.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 3rem; color: var(--gray-500);">
                    <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                    No requests found.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = requests.map(request => `
        <tr>
            <td><span class="request-id">${request.id}</span></td>
            <td>${request.title}</td>
            <td>${request.category}</td>
            <td><span class="priority-badge ${getPriorityClass(request.priority)}">${request.priority}</span></td>
            <td><span class="status-badge ${getStatusClass(request.status)}">${request.status}</span></td>
            <td>${request.assignedToName || 'Unassigned'}</td>
            <td>${formatDate(request.dateSubmitted)}</td>
            <td>
                <div class="table-actions">
                    ${request.status === 'Pending' ?
            `<button class="action-btn assign" onclick="assignRequestFromTable('${request.id}')">Assign</button>` :
            `<button class="action-btn view" onclick="viewRequest('${request.id}')">View</button>`
        }
                </div>
            </td>
        </tr>
    `).join('');
}

/**
 * Initialize request filters
 */
function initRequestFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const priorityFilter = document.getElementById('priorityFilter');
    const clearFilters = document.getElementById('clearFilters');

    if (statusFilter) statusFilter.addEventListener('change', applyRequestFilters);
    if (priorityFilter) priorityFilter.addEventListener('change', applyRequestFilters);
    if (clearFilters) clearFilters.addEventListener('click', clearRequestFilters);
}

/**
 * Apply filters to requests
 */
function applyRequestFilters() {
    // TODO: Implement filtering logic
    console.log('Applying request filters');
    renderRequestsTable();
}

/**
 * Clear request filters
 */
function clearRequestFilters() {
    document.getElementById('statusFilter').value = '';
    document.getElementById('priorityFilter').value = '';
    renderRequestsTable();
}

// ===== TASK ASSIGNMENT SECTION =====

/**
 * Load task assignment section
 */
function loadTaskAssignment() {
    populateRequestSelect();
    populateStaffSelect();
    initAssignmentForm();
}

/**
 * Populate request select dropdown
 */
function populateRequestSelect() {
    const requestSelect = document.getElementById('requestSelect');
    const requests = userRole === 'super_admin' ? mockRequests : departmentRequests;
    const pendingRequests = requests.filter(r => r.status === 'Pending');

    if (requestSelect) {
        requestSelect.innerHTML = '<option value="">Choose a request to assign</option>' +
            pendingRequests.map(request =>
                `<option value="${request.id}">${request.id} - ${request.title}</option>`
            ).join('');
    }
}

/**
 * Populate staff select dropdown
 */
function populateStaffSelect() {
    const staffSelect = document.getElementById('staffMemberSelect');
    const staff = allUsers.filter(u => u.role === 'user');

    if (staffSelect) {
        staffSelect.innerHTML = '<option value="">Choose a staff member</option>' +
            staff.map(member =>
                `<option value="${member.uid}">${member.firstName} ${member.lastName} - ${member.jobTitle}</option>`
            ).join('');
    }
}

/**
 * Initialize assignment form
 */
function initAssignmentForm() {
    const assignmentForm = document.getElementById('assignmentForm');
    if (assignmentForm) {
        assignmentForm.addEventListener('submit', handleAssignmentSubmit);
    }

    const clearBtn = document.getElementById('clearAssignmentForm');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAssignmentForm);
    }
}

/**
 * Handle assignment form submission
 */
function handleAssignmentSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const requestId = formData.get('requestId');
    const staffMemberId = formData.get('staffMember');
    const notes = formData.get('notes');

    if (!requestId || !staffMemberId) {
        showMessage('Please select both a request and staff member', 'error');
        return;
    }

    // TODO: Save assignment to Firestore
    console.log('Assigning task:', { requestId, staffMemberId, notes });

    // Mock assignment
    const request = mockRequests.find(r => r.id === requestId);
    const staff = mockUsers.find(u => u.uid === staffMemberId);

    if (request && staff) {
        request.status = 'Assigned';
        request.assignedTo = staffMemberId;
        request.assignedToName = `${staff.firstName} ${staff.lastName}`;
        request.lastUpdated = new Date().toISOString().split('T')[0];

        showMessage(`Task successfully assigned to ${staff.firstName} ${staff.lastName}!`);
        clearAssignmentForm();
        populateRequestSelect();
        updateDepartmentStats();
    }
}

/**
 * Clear assignment form
 */
function clearAssignmentForm() {
    const form = document.getElementById('assignmentForm');
    if (form) form.reset();
}

// ===== STAFF MANAGEMENT SECTION =====

/**
 * Load staff management section
 */
function loadStaffManagement() {
    renderStaffList();
}

/**
 * Render staff list
 */
function renderStaffList() {
    const staffList = document.getElementById('staffList');
    const staff = allUsers.filter(u => u.role === 'user');

    if (!staffList) return;

    if (staff.length === 0) {
        staffList.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--gray-500);">
                <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                <h3>No staff members found</h3>
                <p>No users have registered for this department yet.</p>
            </div>
        `;
        return;
    }

    staffList.innerHTML = staff.map(member => `
        <div class="staff-card" onclick="showStaffProfile('${member.uid}')">
            <div class="staff-header">
                <div class="staff-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="staff-info">
                    <div class="staff-name">${member.firstName} ${member.lastName}</div>
                    <div class="staff-title">${member.jobTitle}</div>
                    <div class="staff-department">${member.department}</div>
                </div>
                <span class="staff-status ${member.status}">${member.status}</span>
            </div>
            <div class="staff-details">
                <p><strong>Email:</strong> ${member.email}</p>
                <p><strong>Phone:</strong> ${member.phoneNumber || 'Not provided'}</p>
                <p><strong>Join Date:</strong> ${formatDate(member.joinDate)}</p>
            </div>
        </div>
    `).join('');
}

/**
 * Show staff profile modal
 */
function showStaffProfile(userId) {
    const user = mockUsers.find(u => u.uid === userId);
    if (!user) return;

    const modal = document.getElementById('staffProfileModal');
    const content = document.getElementById('staffProfileContent');

    content.innerHTML = `
        <div class="staff-profile-header">
            <div class="staff-profile-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="staff-profile-info">
                <h2 class="staff-profile-name">${user.firstName} ${user.lastName}</h2>
                <p class="staff-profile-title">${user.jobTitle}</p>
                <p class="staff-profile-department">${user.department} Department</p>
            </div>
        </div>
        <div class="staff-profile-details">
            <div class="staff-detail-item">
                <span class="staff-detail-label">Email</span>
                <span class="staff-detail-value">${user.email}</span>
            </div>
            <div class="staff-detail-item">
                <span class="staff-detail-label">Phone</span>
                <span class="staff-detail-value">${user.phoneNumber || 'Not provided'}</span>
            </div>
            <div class="staff-detail-item">
                <span class="staff-detail-label">Join Date</span>
                <span class="staff-detail-value">${formatDate(user.joinDate)}</span>
            </div>
            <div class="staff-detail-item">
                <span class="staff-detail-label">Status</span>
                <span class="staff-detail-value">${user.status}</span>
            </div>
        </div>
    `;

    modal.classList.add('active');

    // Close modal handlers
    const closeBtn = document.getElementById('closeStaffProfileModal');
    closeBtn.onclick = () => modal.classList.remove('active');

    modal.onclick = (e) => {
        if (e.target === modal) modal.classList.remove('active');
    };
}
// ===== ADMIN MANAGEMENT SECTION (SUPER ADMIN ONLY) =====

/**
 * Load admin management section
 */
function loadAdminManagement() {
    if (userRole !== 'super_admin') return;

    initCreateAdminForm();
    renderAdminsList();
}

/**
 * Initialize create admin form
 */
function initCreateAdminForm() {
    const form = document.getElementById('createAdminForm');
    if (form) {
        form.addEventListener('submit', handleCreateAdmin);
    }

    const clearBtn = document.getElementById('clearAdminForm');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => form.reset());
    }
}

/**
 * Handle create admin form submission
 */
function handleCreateAdmin(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const email = formData.get('email');
    const department = formData.get('department');
    const jobTitle = formData.get('jobTitle');

    // TODO: Create admin in Firebase
    console.log('Creating admin:', { email, department, jobTitle });

    showMessage(`Admin invitation sent to ${email}!`);
    e.target.reset();
}

/**
 * Render admins list
 */
function renderAdminsList() {
    const adminsList = document.getElementById('adminsList');
    const admins = mockUsers.filter(u => u.role === 'admin' || u.role === 'super_admin');

    if (!adminsList) return;

    adminsList.innerHTML = admins.map(admin => `
        <div class="admin-card ${admin.role === 'super_admin' ? 'super-admin' : ''}">
            <div class="admin-role-badge ${admin.role === 'super_admin' ? 'super-admin' : 'admin'}">
                ${admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
            </div>
            <div class="admin-header">
                <div class="admin-avatar">
                    <i class="fas fa-${admin.role === 'super_admin' ? 'crown' : 'user-shield'}"></i>
                </div>
                <div class="admin-info">
                    <div class="admin-name">${admin.firstName} ${admin.lastName}</div>
                    <div class="admin-email">${admin.email}</div>
                    <div class="admin-department">${admin.department} Department</div>
                </div>
            </div>
            <div class="admin-details">
                <p><strong>Job Title:</strong> ${admin.jobTitle}</p>
                <p><strong>Join Date:</strong> ${formatDate(admin.joinDate)}</p>
            </div>
        </div>
    `).join('');
}

// ===== ALL DEPARTMENTS SECTION (SUPER ADMIN ONLY) =====

/**
 * Load all departments section
 */
function loadAllDepartments() {
    if (userRole !== 'super_admin') return;

    renderDepartmentsGrid();
}

/**
 * Render departments grid
 */
function renderDepartmentsGrid() {
    const grid = document.getElementById('departmentsGrid');
    if (!grid) return;

    grid.innerHTML = mockDepartments.map(dept => `
        <div class="department-card">
            <div class="department-card-header">
                <div class="department-card-icon">
                    <i class="fas fa-${getDepartmentIcon(dept.id)}"></i>
                </div>
                <div class="department-card-info">
                    <h3 class="department-card-name">${dept.name}</h3>
                    <p class="department-card-admin">Admin: ${dept.adminName}</p>
                </div>
            </div>
            <p>${dept.description}</p>
            <div class="department-stats">
                <div class="department-stat">
                    <span class="department-stat-number">${dept.pendingRequests}</span>
                    <span class="department-stat-label">Pending</span>
                </div>
                <div class="department-stat">
                    <span class="department-stat-number">${dept.staffCount}</span>
                    <span class="department-stat-label">Staff</span>
                </div>
                <div class="department-stat">
                    <span class="department-stat-number">${dept.completedToday}</span>
                    <span class="department-stat-label">Today</span>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Get department icon
 */
function getDepartmentIcon(departmentId) {
    const iconMap = {
        'IT': 'laptop',
        'HR': 'users',
        'Maintenance': 'tools',
        'Security': 'shield-alt',
        'Administration': 'building'
    };
    return iconMap[departmentId] || 'building';
}

// ===== ANALYTICS SECTION =====

/**
 * Load analytics section
 */
function loadAnalytics() {
    console.log('Analytics section loaded');
    // TODO: Implement analytics with charts and metrics
}

// ===== PROFILE SECTION =====

/**
 * Load profile section
 */
function loadProfile() {
    populateProfileForm();
    initProfileForm();
}

/**
 * Populate profile form with current user data
 */
function populateProfileForm() {
    if (!currentAdmin) return;

    const form = document.getElementById('profileForm');
    if (!form) return;

    form.firstName.value = currentAdmin.firstName || '';
    form.lastName.value = currentAdmin.lastName || '';
    form.email.value = currentAdmin.email || '';
    form.phoneNumber.value = currentAdmin.phoneNumber || '';
    form.jobTitle.value = currentAdmin.jobTitle || '';
    form.department.value = currentAdmin.department || '';
}

/**
 * Initialize profile form
 */
function initProfileForm() {
    const form = document.getElementById('profileForm');
    if (form) {
        form.addEventListener('submit', handleProfileUpdate);
    }

    const resetBtn = document.getElementById('resetProfileForm');
    if (resetBtn) {
        resetBtn.addEventListener('click', populateProfileForm);
    }
}

/**
 * Handle profile update
 */
async function handleProfileUpdate(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const jobTitle = formData.get('jobTitle');
    const department = formData.get('department');

    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;

        // Update profile via API if jobTitle or department changed
        if (jobTitle !== currentAdmin.jobTitle || (department && department !== currentAdmin.department)) {
            const token = localStorage.getItem('authToken');
            const user = JSON.parse(localStorage.getItem('user') || '{}');

            const updateData = {};
            if (jobTitle !== currentAdmin.jobTitle) updateData.jobTitle = jobTitle;
            if (department && department !== currentAdmin.department) updateData.department = department;

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

            console.log('Admin profile updated successfully');
        }

        // Update local admin data (for UI and other non-API fields)
        const updates = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            phoneNumber: formData.get('phoneNumber'),
            jobTitle: jobTitle
        };

        if (department) updates.department = department;

        Object.assign(currentAdmin, updates);
        updateUserInfo();

        showMessage('Profile updated successfully!');

        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;

    } catch (error) {
        console.error('Error updating admin profile:', error);
        showMessage('Failed to update profile: ' + error.message, 'error');

        // Reset button state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = 'Save Changes';
            submitBtn.disabled = false;
        }
    }
}

// ===== SETTINGS SECTION =====

/**
 * Load settings section
 */
function loadSettings() {
    initSettingsTabs();
    initSettingsForm();
}

/**
 * Initialize settings tabs
 */
function initSettingsTabs() {
    const tabs = document.querySelectorAll('.settings-tab');
    const contents = document.querySelectorAll('.settings-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const targetTab = this.getAttribute('data-tab');

            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            // Update active content
            contents.forEach(c => c.classList.remove('active'));
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

/**
 * Initialize settings form
 */
function initSettingsForm() {
    const saveBtn = document.getElementById('saveSettings');
    if (saveBtn) {
        saveBtn.addEventListener('click', handleSettingsSave);
    }

    const resetBtn = document.getElementById('resetSettings');
    if (resetBtn) {
        resetBtn.addEventListener('click', handleSettingsReset);
    }
}

/**
 * Handle settings save
 */
function handleSettingsSave() {
    // TODO: Save settings to Firestore
    console.log('Saving settings');
    showMessage('Settings saved successfully!');
}

/**
 * Handle settings reset
 */
function handleSettingsReset() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
        // TODO: Reset settings
        console.log('Resetting settings');
        showMessage('Settings reset to defaults');
    }
}

// ===== GLOBAL FUNCTIONS (for onclick handlers) =====

/**
 * Assign request from table
 */
window.assignRequestFromTable = function (requestId) {
    switchSection('task-assignment');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector('[data-section="task-assignment"]').classList.add('active');

    setTimeout(() => {
        const requestSelect = document.getElementById('requestSelect');
        if (requestSelect) requestSelect.value = requestId;
    }, 100);
};

/**
 * View request details
 */
window.viewRequest = function (requestId) {
    const request = mockRequests.find(r => r.id === requestId);
    if (request) {
        alert(`Request Details:\n\nID: ${request.id}\nTitle: ${request.title}\nDescription: ${request.description}\nStatus: ${request.status}\nAssigned to: ${request.assignedToName || 'Unassigned'}`);
    }
};

/**
 * Show staff profile
 */
window.showStaffProfile = function (userId) {
    showStaffProfile(userId);
};

// ===== INITIALIZATION =====

/**
 * Initialize admin dashboard when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function () {
    console.log('officeFlow Admin Dashboard Initializing...');

    // Show loading overlay
    const loadingOverlay = document.getElementById('loadingOverlay');

    // Initialize Firebase Authentication
    initFirebaseAuth();

    // Initialize logout handler
    handleLogout();

    // Hide loading overlay after initialization
    setTimeout(() => {
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
    }, 800);

    console.log('Admin dashboard ready');
});

// ===== FIREBASE INTEGRATION NOTES =====

/**
 * TODO: Firebase Integration Checklist
 * 
 * 1. Authentication:
 *    - Replace mockAuthentication() with real Firebase auth
 *    - Add auth state listener
 *    - Implement role-based access control
 *    - Add email verification for new admins
 * 
 * 2. Firestore Database Structure:
 *    - users collection: { uid, email, firstName, lastName, role, department, ... }
 *    - requests collection: { id, title, description, status, department, ... }
 *    - departments collection: { id, name, adminId, ... }
 *    - assignments collection: { requestId, assignedTo, assignedBy, ... }
 * 
 * 3. Real-time Updates:
 *    - Listen to requests collection changes
 *    - Update UI when assignments change
 *    - Sync staff status across admins
 * 
 * 4. Security Rules:
 *    - Admins can only access their department data
 *    - Super admins can access all data
 *    - Users can only read/write their own data
 * 
 * 5. Cloud Functions:
 *    - Send email notifications for assignments
 *    - Generate analytics data
 *    - Handle admin creation workflow
 */