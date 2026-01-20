let companySettings = null;
let allUsers = [];

function getToken() {
    return localStorage.getItem('authToken');
}

function checkAuth() {
    const token = getToken();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || !user.role) {
        window.location.href = '../../users/pages/login.html';
        return false;
    }

    if (user.role !== 'superadmin') {
        alert('Access denied. Super admin only.');
        window.location.href = '../../users/pages/login.html';
        return false;
    }

    return true;
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '../../users/pages/login.html';
    }
}

function scrollToUsers(event) {
    event.preventDefault();
    document.getElementById('all-users').scrollIntoView({ behavior: 'smooth' });
}

async function loadData() {
    if (!checkAuth()) return;

    // Display user name
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('userName').textContent = user.fullName || 'Admin';

    // Fix for existing super admins with old job titles
    if (user.role === 'superadmin' && user.jobTitle && user.jobTitle !== '') {
        // Update the super admin to have empty job title
        try {
            await fetch(`http://localhost:3000/api/users/${user.id}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    role: 'superadmin',
                    jobTitle: '',
                    department: ''
                })
            });
            // Update local storage
            user.jobTitle = '';
            user.department = '';
            localStorage.setItem('user', JSON.stringify(user));
        } catch (error) {
            console.log('Could not update super admin job title:', error);
        }
    }

    await loadCompanySettings();
    await loadUsers();
    await loadAdminRequests();
    // Initialize profile dropdown quick-settings
    initProfileDropdownSettings();

    // Listen for user profile updates from other tabs/windows
    window.addEventListener('storage', (e) => {
        if (e.key === 'officeflow_user_updated') {
            console.log('User data updated in another tab, refreshing user list...');
            loadUsers(); // Refresh the user list when someone updates their profile
        }
    });
}

async function loadCompanySettings() {
    const response = await fetch('http://localhost:3000/api/company/settings', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await response.json();
    if (data.success) {
        companySettings = data.company.settings;
        // Load departments list
        loadDepartmentsList(data.company.settings.departments || []);
    }
}

async function loadUsers() {
    const response = await fetch('http://localhost:3000/api/company/users', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await response.json();
    if (data.success) {
        allUsers = data.users;

        // Initialize filters and display (from staff-management.js)
        if (typeof initializeStaffFilters === 'function') {
            initializeStaffFilters();
        } else {
            displayUsers();
        }
    }
}

// Manual refresh function for the refresh button
async function refreshUserList() {
    const refreshBtn = document.querySelector('button[onclick="refreshUserList()"]');
    if (refreshBtn) {
        const originalHTML = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
        refreshBtn.disabled = true;
    }

    try {
        await loadUsers();
        console.log('User list refreshed successfully');
    } catch (error) {
        console.error('Error refreshing user list:', error);
    } finally {
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            refreshBtn.disabled = false;
        }
    }
}

async function loadAdminRequests() {
    const response = await fetch('http://localhost:3000/api/admin-requests', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await response.json();
    if (data.success && data.requests.length > 0) {
        displayAdminRequests(data.requests);
    }
}

function displayUsers() {
    const tbody = document.getElementById('usersTableBody');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // Filter out super admins (don't show them in staff list)
    const staffUsers = allUsers.filter(user => user.role !== 'superadmin');

    // Group users by department
    const usersByDepartment = {};
    staffUsers.forEach(user => {
        const dept = user.department || 'Unassigned';
        if (!usersByDepartment[dept]) {
            usersByDepartment[dept] = [];
        }
        usersByDepartment[dept].push(user);
    });

    // Sort each department: admins first, then regular users
    Object.keys(usersByDepartment).forEach(dept => {
        usersByDepartment[dept].sort((a, b) => {
            // Admins come first
            if (a.role === 'admin' && b.role !== 'admin') return -1;
            if (a.role !== 'admin' && b.role === 'admin') return 1;
            // Then sort by name
            return a.fullName.localeCompare(b.fullName);
        });
    });

    // Sort departments alphabetically, but put 'Unassigned' last
    const sortedDepartments = Object.keys(usersByDepartment).sort((a, b) => {
        if (a === 'Unassigned') return 1;
        if (b === 'Unassigned') return -1;
        return a.localeCompare(b);
    });

    // Build the table HTML
    let html = '';
    sortedDepartments.forEach(dept => {
        // Department header row
        html += `
            <tr class="department-header">
                <td colspan="7">
                    <strong><i class="fas fa-building"></i> ${dept}</strong>
                    <span class="badge">${usersByDepartment[dept].length} ${usersByDepartment[dept].length === 1 ? 'member' : 'members'}</span>
                </td>
            </tr>
        `;

        // Users in this department
        usersByDepartment[dept].forEach(user => {
            html += `
                <tr>
                    <td>
                        <input type="checkbox" class="user-checkbox" value="${user.id}" onchange="updateBulkActions()">
                    </td>
                    <td>${user.fullName}</td>
                    <td>${user.email}</td>
                    <td><span class="role-badge role-${user.role}">${user.role}</span></td>
                    <td>${user.department || '-'}</td>
                    <td>${user.jobTitle || '-'}</td>
                    <td>
                        ${user.role === 'admin' ? `
                            <button class="btn-small btn-warning" onclick="demoteAdmin('${user.id}')" title="Remove Admin">
                                <i class="fas fa-user-minus"></i>
                            </button>
                        ` : ''}
                        <button class="btn-small btn-danger" onclick="deleteUser('${user.id}')" title="Delete User">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    });

    tbody.innerHTML = html || '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #6b7280;">No staff members yet</td></tr>';
}

function displayAdminRequests(requests) {
    const container = document.getElementById('adminRequests');

    if (!requests || requests.length === 0) {
        container.innerHTML = '<p class="empty-state">No pending admin requests</p>';
        return;
    }

    container.innerHTML = requests.map(req => {
        // Format date properly
        let dateStr = 'Unknown date';
        if (req.createdAt) {
            try {
                // Handle Firestore timestamp
                const date = req.createdAt.toDate ? req.createdAt.toDate() : new Date(req.createdAt);
                dateStr = date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            } catch (e) {
                console.error('Error parsing date:', e);
            }
        }

        // Get initials for avatar
        const initials = req.userName ? req.userName.split(' ').map(n => n[0]).join('').toUpperCase() : '?';

        // Check if user has profile picture
        const avatarContent = req.profilePicture
            ? `<img src="${req.profilePicture}" alt="${req.userName}" class="avatar-image" />`
            : `<div class="avatar-initials">${initials}</div>`;

        return `
            <div class="request-card" id="request-${req.id}">
                <div class="request-header">
                    <div class="request-avatar">
                        <div class="avatar-circle">${avatarContent}</div>
                    </div>
                    <div class="request-info">
                        <h3>${req.userName}</h3>
                        <p class="request-email">${req.userEmail}</p>
                        <small class="request-date"><i class="fas fa-clock"></i> ${dateStr}</small>
                    </div>
                </div>
                <div class="request-actions">
                    <button class="btn-success" onclick="approveRequest('${req.id}', '${req.userId}')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn-danger" onclick="rejectRequest('${req.id}')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function closeCreateAdminModal() {
    const modal = document.getElementById('createAdminModal');
    modal.style.display = 'none';
    document.getElementById('createAdminForm').reset();
}

function showCreateAdminModal() {
    const modal = document.getElementById('createAdminModal');
    modal.style.display = 'flex';
    populateDepartments();
    setupEmployeeSearch();
}

function populateDepartments() {
    const select = document.getElementById('adminDepartment');
    select.innerHTML = '<option value="">Select department...</option>' +
        companySettings.departments.map(dept =>
            `< option value = "${dept}" > ${dept}</option > `
        ).join('');
}

function setupEmployeeSearch() {
    const searchInput = document.getElementById('employeeSearch');
    const resultsDiv = document.getElementById('employeeResults');
    const hiddenInput = document.getElementById('selectedUserId');

    // Clear previous values
    searchInput.value = '';
    hiddenInput.value = '';
    resultsDiv.innerHTML = '';
    resultsDiv.classList.remove('show');

    // Search on input
    searchInput.addEventListener('input', function () {
        const query = this.value.toLowerCase().trim();

        // Hide results if search is blank or too short
        if (query.length === 0 || query.length < 2) {
            resultsDiv.classList.remove('show');
            resultsDiv.innerHTML = '';
            hiddenInput.value = ''; // Clear selection
            return;
        }

        // Filter regular users only
        const regularUsers = allUsers.filter(u => u.role === 'user');
        const matches = regularUsers.filter(user =>
            user.fullName.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            (user.department && user.department.toLowerCase().includes(query))
        );

        if (matches.length === 0) {
            resultsDiv.innerHTML = '<div class="no-results">No employees found</div>';
            resultsDiv.classList.add('show');
            return;
        }

        resultsDiv.innerHTML = matches.slice(0, 10).map(user => `
    < div class="search-result-item" data - user - id="${user.id}" data - user - name="${user.fullName}" >
                <span class="search-result-name">${user.fullName}</span>
                <span class="search-result-details">${user.email} • ${user.department || 'No Department'} • ${user.jobTitle || 'No Title'}</span>
            </div >
    `).join('');

        resultsDiv.classList.add('show');

        // Add click handlers
        resultsDiv.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', function () {
                const userId = this.dataset.userId;
                const userName = this.dataset.userName;

                searchInput.value = userName;
                hiddenInput.value = userId;
                resultsDiv.classList.remove('show');

                // Highlight selected
                resultsDiv.querySelectorAll('.search-result-item').forEach(i => i.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
    });

    // Close results when clicking outside
    document.addEventListener('click', function (e) {
        if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
            resultsDiv.classList.remove('show');
        }
    });
}

async function approveRequest(requestId, userId) {
    if (!confirm('Are you sure you want to approve this admin request?')) {
        return;
    }

    // Disable buttons to prevent double-click
    const requestCard = document.getElementById(`request - ${requestId} `);
    if (requestCard) {
        const buttons = requestCard.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        });
    }

    try {
        const response = await fetch(`http://localhost:3000/api/admin-requests/${requestId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ userId })
        });

        const data = await response.json();
        console.log('Approve response:', data);

        if (data.success) {
            // Remove card with animation
            if (requestCard) {
                requestCard.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => {
                    requestCard.remove();
                    // Check if no more requests
                    const container = document.getElementById('adminRequests');
                    if (container.children.length === 0) {
                        container.innerHTML = '<p class="empty-state">No pending admin requests</p>';
                    }
                }, 300);
            }
            alert(data.message);
        } else {
            alert(data.message || 'Failed to approve request');
            loadData(); // Reload to restore state
        }
    } catch (error) {
        console.error('Error approving request:', error);
        alert('An error occurred while approving the request');
        loadData(); // Reload to restore state
    }
}

async function rejectRequest(requestId) {
    if (!confirm('Are you sure you want to reject this admin request?')) {
        return;
    }

    // Disable buttons to prevent double-click
    const requestCard = document.getElementById(`request-${requestId}`);
    if (requestCard) {
        const buttons = requestCard.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        });
    }

    try {
        const response = await fetch(`http://localhost:3000/api/admin-requests/${requestId}/reject`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        const data = await response.json();
        console.log('Reject response:', data);

        if (data.success) {
            // Remove card with animation
            if (requestCard) {
                requestCard.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => {
                    requestCard.remove();
                    // Check if no more requests
                    const container = document.getElementById('adminRequests');
                    if (container.children.length === 0) {
                        container.innerHTML = '<p class="empty-state">No pending admin requests</p>';
                    }
                }, 300);
            }
            alert(data.message);
        } else {
            alert(data.message || 'Failed to reject request');
            loadData(); // Reload to restore state
        }
    } catch (error) {
        console.error('Error rejecting request:', error);
        alert('An error occurred while rejecting the request');
        loadData(); // Reload to restore state
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // Show loading overlay
    const loadingOverlay = document.getElementById('loadingOverlay');

    // Load data
    loadData();

    // Set up promote to admin form
    document.getElementById('createAdminForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const userId = document.getElementById('selectedUserId').value;
        const department = document.getElementById('adminDepartment').value;
        const password = document.getElementById('superAdminPassword').value;

        if (!userId || !department || !password) {
            alert('Please fill in all fields');
            return;
        }

        // Get submit button and show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Promoting...';

        try {
            const response = await fetch('http://localhost:3000/api/promote-to-admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    userId,
                    department,
                    superAdminPassword: password
                })
            });

            const data = await response.json();
            console.log('Promote response:', data);

            if (data.success) {
                alert(data.message);
                closeCreateAdminModal();
                loadUsers(); // Refresh the user list
            } else {
                console.error('Promotion failed:', data);
                alert(data.message || 'Failed to promote user');
            }
        } catch (error) {
            console.error('Error promoting user:', error);
            alert(`An error occurred: ${error.message}`);
        } finally {
            // Restore button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });

    // Hide loading overlay after data is loaded
    setTimeout(() => {
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
    }, 800);
});


function showTab(tabName, event) {
    event.preventDefault();
    console.log('Switching to tab:', tabName);

    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        console.log('Hiding tab:', tab.id);
    });
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

    // Show selected tab
    const targetTab = document.getElementById(`${tabName}-tab`);
    console.log('Target tab:', targetTab);
    if (targetTab) {
        targetTab.classList.add('active');
        event.currentTarget.classList.add('active');
    }

    // Load data for settings tab
    if (tabName === 'settings') {
        loadCompanyInfo();
    }

    // Refresh staff filters when switching to staff tab
    if (tabName === 'staff' && typeof initializeStaffFilters === 'function') {
        initializeStaffFilters();
    }
}

async function loadCompanyInfo() {
    const response = await fetch('http://localhost:3000/api/company/settings', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await response.json();
    if (data.success) {
        document.getElementById('companyName').textContent = data.company.name;
        document.getElementById('companyCode').textContent = data.company.companyCode;
        document.getElementById('annualLeave').value = data.company.settings.annualLeaveBalance;
        document.getElementById('sickLeave').value = data.company.settings.sickLeaveBalance;

        // Load departments list
        loadDepartmentsList(data.company.settings.departments || []);
    }
}

function loadDepartmentsList(departments) {
    const container = document.getElementById('departmentsList');
    if (!container) return;

    container.innerHTML = departments.map(dept => `
        <div class="department-item">
            <div class="department-info" style="color: #1f2937 !important;">
                <i class="fas fa-building" style="color: #fb923c !important;"></i>
                <span style="color: #1f2937 !important;">${dept}</span>
            </div>
            <button class="btn-small btn-danger" onclick="removeDepartment('${dept}')" title="Remove Department">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

async function removeDepartment(deptName) {
    if (!confirm(`Are you sure you want to remove the "${deptName}" department?`)) return;

    const updatedDepartments = companySettings.departments.filter(d => d !== deptName);

    const response = await fetch('http://localhost:3000/api/company/settings', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ departments: updatedDepartments })
    });

    const data = await response.json();
    if (data.success) {
        companySettings.departments = updatedDepartments;
        loadDepartmentsList(updatedDepartments);
        showSuccessPopup(`Department "${deptName}" removed successfully!`);
    } else {
        alert(data.message || 'Failed to remove department');
    }
}

// Add department button handler
document.getElementById('addDepartmentBtn')?.addEventListener('click', async () => {
    const input = document.getElementById('newDepartmentInput');
    const deptName = input.value.trim();

    if (!deptName) {
        alert('Please enter a department name');
        return;
    }

    if (companySettings.departments.includes(deptName)) {
        alert('This department already exists');
        return;
    }

    const updatedDepartments = [...companySettings.departments, deptName];

    const response = await fetch('http://localhost:3000/api/company/settings', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ departments: updatedDepartments })
    });

    const data = await response.json();
    if (data.success) {
        companySettings.departments = updatedDepartments;
        loadDepartmentsList(updatedDepartments);
        input.value = '';

        // Update all department dropdowns across the page
        updateAllDepartmentDropdowns(updatedDepartments);

        showSuccessPopup(`Department "${deptName}" added successfully!`);
    } else {
        alert(data.message || 'Failed to add department');
    }
});

// Function to update all department dropdowns
function updateAllDepartmentDropdowns(departments) {
    console.log('Updating all department dropdowns with:', departments);

    // Update create admin modal dropdown
    const adminDeptSelect = document.getElementById('adminDepartment');
    if (adminDeptSelect) {
        adminDeptSelect.innerHTML = departments.map(dept =>
            `<option value="${dept}">${dept}</option>`
        ).join('');
        console.log('Updated admin department dropdown');
    }

    // Update staff filter dropdown
    const filterDeptSelect = document.getElementById('departmentFilter');
    if (filterDeptSelect) {
        const currentValue = filterDeptSelect.value;
        filterDeptSelect.innerHTML = '<option value="all">All Departments</option>' +
            departments.map(dept => `<option value="${dept}">${dept}</option>`).join('');
        // Restore previous selection if it still exists
        if (currentValue && (currentValue === 'all' || departments.includes(currentValue))) {
            filterDeptSelect.value = currentValue;
        }
        console.log('Updated staff filter dropdown');
    } else {
        console.log('Staff filter dropdown not found - might be on different tab');
    }
}

// Success popup function
function showSuccessPopup(message) {
    // Create popup if it doesn't exist
    let popup = document.getElementById('successPopup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'successPopup';
        popup.className = 'success-popup';
        document.body.appendChild(popup);
    }

    popup.innerHTML = `
        <div class="success-popup-content">
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        </div>
    `;

    popup.classList.add('show');

    setTimeout(() => {
        popup.classList.remove('show');
    }, 3000);
}

document.getElementById('leaveBalanceForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const response = await fetch('http://localhost:3000/api/company/settings', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
            annualLeaveBalance: parseInt(document.getElementById('annualLeave').value),
            sickLeaveBalance: parseInt(document.getElementById('sickLeave').value)
        })
    });
    const data = await response.json();
    alert(data.message);
});


// Color scheme handling
function applyColorScheme(scheme) {
    const root = document.documentElement;

    switch (scheme) {
        case 'cool':
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
}

// Theme handling
document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const theme = e.target.value;
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        localStorage.setItem('theme', theme);
    });
});

// Color scheme handling for profile settings
document.querySelectorAll('input[name="profile-colorScheme"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const colorScheme = e.target.value;
        applyColorScheme(colorScheme);

        // Save to user data in localStorage
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (!userData.preferences) userData.preferences = {};
        userData.preferences.colorScheme = colorScheme;
        localStorage.setItem('user', JSON.stringify(userData));
    });
});

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
document.querySelector(`input[name="theme"][value="${savedTheme}"]`).checked = true;
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
}

// Load saved color scheme
const userData = JSON.parse(localStorage.getItem('user') || '{}');
const savedColorScheme = userData.preferences?.colorScheme || 'warm';
const colorSchemeRadio = document.querySelector(`input[name="profile-colorScheme"][value="${savedColorScheme}"]`);
if (colorSchemeRadio) colorSchemeRadio.checked = true;
applyColorScheme(savedColorScheme);


function toggleProfileMenu() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-profile') && !e.target.closest('.profile-dropdown')) {
        const dropdown = document.getElementById('profileDropdown');
        if (dropdown) dropdown.classList.remove('show');
    }
});

// Helper to open a tab by name (used by dropdown quick actions)
function openTabByName(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    const targetTab = document.getElementById(`${tabName}-tab`);
    if (targetTab) targetTab.classList.add('active');

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const navItems = Array.from(document.querySelectorAll('.nav-item'));
    const match = navItems.find(a => a.getAttribute('onclick') && a.getAttribute('onclick').includes(`showTab('${tabName}'`));
    if (match) match.classList.add('active');

    if (tabName === 'settings') loadCompanyInfo();
}

// Initialize the compact settings inside the profile dropdown
function initProfileDropdownSettings() {
    const dropdown = document.getElementById('profileDropdown');
    if (!dropdown) return;

    // Theme radios
    document.querySelectorAll('input[name="sa-theme"]').forEach(r => {
        r.addEventListener('change', (e) => {
            const theme = e.target.value;
            if (theme === 'dark') {
                document.body.classList.add('dark-mode');
            } else if (theme === 'light') {
                document.body.classList.remove('dark-mode');
            } else {
                // auto -> remove explicit class and let app decide
                document.body.classList.remove('dark-mode');
            }
            localStorage.setItem('theme', theme);
            // close dropdown
            dropdown.classList.remove('show');
        });
    });

    // Quick action buttons
    document.getElementById('saGoToProfile')?.addEventListener('click', () => {
        dropdown.classList.remove('show');
        openTabByName('profile');
    });

    document.getElementById('saGoToSettings')?.addEventListener('click', () => {
        dropdown.classList.remove('show');
        openTabByName('settings');
    });

    document.getElementById('saLogoutBtn')?.addEventListener('click', () => {
        dropdown.classList.remove('show');
        logout();
    });

    // Apply saved theme selection in dropdown
    const saved = localStorage.getItem('theme') || 'light';
    const sel = document.querySelector(`input[name="sa-theme"][value="${saved}"]`);
    if (sel) sel.checked = true;
}


function toggleSelectAll(checkbox) {
    document.querySelectorAll('.user-checkbox').forEach(cb => {
        cb.checked = checkbox.checked;
    });
    updateBulkActions();
}

function updateBulkActions() {
    const selected = document.querySelectorAll('.user-checkbox:checked').length;
    const bulkBtn = document.getElementById('bulkRemoveBtn');
    if (bulkBtn) {
        bulkBtn.style.display = selected > 0 ? 'inline-flex' : 'none';
        bulkBtn.innerHTML = `<i class="fas fa-trash"></i> Remove Selected (${selected})`;
    }
}

async function demoteAdmin(userId) {
    if (!confirm('Remove admin privileges from this user?')) return;

    const response = await fetch(`http://localhost:3000/api/users/${userId}/role`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ role: 'user', jobTitle: 'Employee', department: '' })
    });
    const data = await response.json();
    alert(data.message);
    if (data.success) loadUsers();
}

async function deleteUser(userId) {
    if (!confirm('Permanently delete this user? This cannot be undone.')) return;

    const response = await fetch(`http://localhost:3000/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await response.json();
    alert(data.message);
    if (data.success) loadUsers();
}

async function bulkRemoveAdmins() {
    const selected = Array.from(document.querySelectorAll('.user-checkbox:checked')).map(cb => cb.value);
    if (selected.length === 0) return;

    if (!confirm(`Remove admin privileges from ${selected.length} user(s)?`)) return;

    for (const userId of selected) {
        await demoteAdmin(userId);
    }

    document.getElementById('selectAll').checked = false;
    updateBulkActions();
}
