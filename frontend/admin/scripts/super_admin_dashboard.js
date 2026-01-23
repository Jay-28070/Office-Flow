let companySettings = null;
let allUsers = [];

// API Base URL - uses environment detection
function getApiBaseUrl() {
    return window.APP_CONFIG?.API_BASE_URL || '${getApiBaseUrl()}';
}

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
            await fetch(`${getApiBaseUrl()}/api/users/${user.id}/role`, {
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
    try {
        console.log('Loading company settings...');
        const response = await fetch('${getApiBaseUrl()}/api/company/settings', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        console.log('Company settings response status:', response.status);

        if (!response.ok) {
            console.error('Failed to load company settings:', response.status);
            return;
        }

        const data = await response.json();
        console.log('Company settings loaded:', data);

        if (data.success) {
            companySettings = data.company.settings;
            // Load departments list
            loadDepartmentsList(data.company.settings.departments || []);

            // Update UI elements directly here as well
            console.log('Updating UI elements...');
            const companyNameEl = document.getElementById('companyName');
            const companyCodeEl = document.getElementById('companyCode');

            console.log('Company name element:', companyNameEl);
            console.log('Company code element:', companyCodeEl);

            if (companyNameEl) {
                companyNameEl.textContent = data.company.name;
                console.log('Set company name to:', data.company.name);
            }
            if (companyCodeEl) {
                companyCodeEl.textContent = data.company.companyCode;
                console.log('Set company code to:', data.company.companyCode);
            }
        } else {
            console.error('Company settings API returned success: false');
        }
    } catch (error) {
        console.error('Error loading company settings:', error);
    }
}

async function loadUsers() {
    const response = await fetch(`${getApiBaseUrl()}/api/company/users`, {
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

// Mobile menu functions
function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileMenuOverlay');
    const menuBtn = document.getElementById('mobileMenuBtn');

    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');

    if (sidebar.classList.contains('open')) {
        menuBtn.style.opacity = '0';
        menuBtn.style.visibility = 'hidden';
        document.body.style.overflow = 'hidden';
    } else {
        menuBtn.style.opacity = '1';
        menuBtn.style.visibility = 'visible';
        document.body.style.overflow = '';
    }
}

function closeMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileMenuOverlay');
    const menuBtn = document.getElementById('mobileMenuBtn');

    sidebar.classList.remove('open');
    overlay.classList.remove('show');
    menuBtn.style.opacity = '1';
    menuBtn.style.visibility = 'visible';
    document.body.style.overflow = '';
}

// Update the existing displayUsers function to also populate mobile list
function displayUsers() {
    const tbody = document.getElementById('usersTableBody');
    const mobileList = document.getElementById('mobileUsersList');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // Group paginated users by department
    const paginatedByDept = {};
    filteredUsers.forEach(user => {
        const dept = user.department || 'Unassigned';
        if (!paginatedByDept[dept]) {
            paginatedByDept[dept] = [];
        }
        paginatedByDept[dept].push(user);
    });

    // Sort each department
    Object.keys(paginatedByDept).forEach(dept => {
        paginatedByDept[dept].sort((a, b) => {
            if (a.role === 'admin' && b.role !== 'admin') return -1;
            if (a.role !== 'admin' && b.role === 'admin') return 1;
            return a.fullName.localeCompare(b.fullName);
        });
    });

    // Sort departments
    const paginatedDepts = Object.keys(paginatedByDept).sort((a, b) => {
        if (a === 'Unassigned') return 1;
        if (b === 'Unassigned') return -1;
        return a.localeCompare(b);
    });

    // Build desktop table HTML
    let tableHtml = '';
    paginatedDepts.forEach(dept => {
        tableHtml += `
            <tr class="department-header">
                <td colspan="7">
                    <strong><i class="fas fa-building"></i> ${dept}</strong>
                    <span class="badge">${paginatedByDept[dept].length} members</span>
                </td>
            </tr>
        `;

        paginatedByDept[dept].forEach(user => {
            tableHtml += `
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

    tbody.innerHTML = tableHtml || '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #6b7280;">No staff members found</td></tr>';

    // Build mobile list HTML
    let mobileHtml = '';
    paginatedDepts.forEach(dept => {
        mobileHtml += `
            <div class="mobile-department-header">
                <h3><i class="fas fa-building"></i> ${dept}</h3>
                <span class="badge">${paginatedByDept[dept].length} members</span>
            </div>
        `;

        paginatedByDept[dept].forEach(user => {
            mobileHtml += `
                <div class="mobile-user-card">
                    <div class="mobile-user-header">
                        <div class="mobile-user-info">
                            <h3>${user.fullName}</h3>
                            <p>${user.email}</p>
                            <p><span class="role-badge role-${user.role}">${user.role}</span> • ${user.department || 'No Department'}</p>
                            <p><strong>Job Title:</strong> ${user.jobTitle || 'Not specified'}</p>
                        </div>
                        <input type="checkbox" class="user-checkbox" value="${user.id}" onchange="updateBulkActions()">
                    </div>
                    <div class="mobile-user-actions">
                        ${user.role === 'admin' ? `
                            <button class="btn-secondary" onclick="demoteAdmin('${user.id}')">
                                <i class="fas fa-user-minus"></i> Remove Admin
                            </button>
                        ` : ''}
                        <button class="btn-danger" onclick="deleteUser('${user.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        });
    });

    if (mobileList) {
        mobileList.innerHTML = mobileHtml || '<div style="text-align: center; padding: 2rem; color: #6b7280;">No staff members found</div>';
    }

    // Update pagination
    updatePagination(Math.ceil(filteredUsers.length / itemsPerPage));
}

async function loadAdminRequests() {
    const response = await fetch('${getApiBaseUrl()}/api/admin-requests', {
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
        const response = await fetch(`${getApiBaseUrl()}/api/admin-requests/${requestId}/approve`, {
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
        const response = await fetch(`${getApiBaseUrl()}/api/admin-requests/${requestId}/reject`, {
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
            const response = await fetch('${getApiBaseUrl()}/api/promote-to-admin', {
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
    try {
        console.log('Loading company info...');
        const response = await fetch('${getApiBaseUrl()}/api/company/settings', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        console.log('Company settings response status:', response.status);

        if (!response.ok) {
            console.error('Failed to load company settings:', response.status, response.statusText);
            return;
        }

        const data = await response.json();
        console.log('Company settings data:', data);

        if (data.success) {
            const companyNameEl = document.getElementById('companyName');
            const companyCodeEl = document.getElementById('companyCode');
            const annualLeaveEl = document.getElementById('annualLeave');
            const sickLeaveEl = document.getElementById('sickLeave');

            if (companyNameEl) companyNameEl.textContent = data.company.name;
            if (companyCodeEl) companyCodeEl.textContent = data.company.companyCode;
            if (annualLeaveEl) annualLeaveEl.value = data.company.settings.annualLeaveBalance;
            if (sickLeaveEl) sickLeaveEl.value = data.company.settings.sickLeaveBalance;

            // Load departments list
            loadDepartmentsList(data.company.settings.departments || []);
            console.log('Company info loaded successfully');
        } else {
            console.error('Company settings API returned success: false');
        }
    } catch (error) {
        console.error('Error loading company info:', error);
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

    const response = await fetch('${getApiBaseUrl()}/api/company/settings', {
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

    const response = await fetch('${getApiBaseUrl()}/api/company/settings', {
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
    const response = await fetch('${getApiBaseUrl()}/api/company/settings', {
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
const themeRadio = document.querySelector(`input[name="theme"][value="${savedTheme}"]`);
if (themeRadio) themeRadio.checked = true;
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

    const response = await fetch(`${getApiBaseUrl()}/api/users/${userId}/role`, {
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

    const response = await fetch(`${getApiBaseUrl()}/api/users/${userId}`, {
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

    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    updateBulkActions();
}
// ===== UNASSIGNED REQUESTS FUNCTIONALITY =====

let unassignedRequests = [];
let filteredUnassignedRequests = [];

// Debug function to test the API
async function debugUnassignedRequests() {
    try {
        const token = localStorage.getItem('authToken');

        console.log('=== DEBUG: Testing unassigned requests API ===');

        // Test the debug endpoint first
        const debugResponse = await fetch('${getApiBaseUrl()}/api/debug/requests', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (debugResponse.ok) {
            const debugData = await debugResponse.json();
            console.log('All requests in system:', debugData);
        }

        // Test the unassigned endpoint
        const unassignedResponse = await fetch('${getApiBaseUrl()}/api/requests/unassigned', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (unassignedResponse.ok) {
            const unassignedData = await unassignedResponse.json();
            console.log('Unassigned requests:', unassignedData);
        } else {
            console.error('Unassigned requests failed:', unassignedResponse.status);
        }

    } catch (error) {
        console.error('Debug error:', error);
    }
}

// Debug function to create a test request
async function createTestRequest() {
    try {
        const token = localStorage.getItem('authToken');

        console.log('=== Creating test request ===');

        const response = await fetch('${getApiBaseUrl()}/api/debug/create-test-request', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Test request created:', data);
            alert('Test request created! Check the Unassigned Requests tab.');

            // Refresh the unassigned requests list
            await loadUnassignedRequests();
        } else {
            console.error('Failed to create test request:', response.status);
        }

    } catch (error) {
        console.error('Error creating test request:', error);
    }
}

// Make debug functions available globally
window.debugUnassignedRequests = debugUnassignedRequests;
window.createTestRequest = createTestRequest;

/**
 * Load unassigned requests tab
 */
async function loadUnassignedRequests() {
    showUnassignedRequestsLoading();

    try {
        await Promise.all([
            loadDepartmentStatus(),
            loadUnassignedRequestsList()
        ]);
    } catch (error) {
        console.error('Error loading unassigned requests:', error);
        showMessage('Failed to load unassigned requests', 'error');
    }
}

/**
 * Load department status overview
 */
async function loadDepartmentStatus() {
    try {
        const token = localStorage.getItem('authToken');

        // Get company settings to see all departments
        const settingsResponse = await fetch('${getApiBaseUrl()}/api/company/settings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!settingsResponse.ok) return;

        const settingsData = await settingsResponse.json();
        const departments = settingsData.company.settings.departments || [];

        // Get all users to check which departments have admins
        const usersResponse = await fetch('${getApiBaseUrl()}/api/company/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!usersResponse.ok) return;

        const usersData = await usersResponse.json();
        const users = usersData.users || [];

        // Get unassigned requests count per department
        const requestsResponse = await fetch('${getApiBaseUrl()}/api/requests/unassigned', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        let requestsByDepartment = {};
        if (requestsResponse.ok) {
            const requestsData = await requestsResponse.json();
            const unassignedRequests = requestsData.requests || [];

            requestsByDepartment = unassignedRequests.reduce((acc, req) => {
                const dept = getDepartmentFromCategory(req.category);
                acc[dept] = (acc[dept] || 0) + 1;
                return acc;
            }, {});
        }

        renderDepartmentStatus(departments, users, requestsByDepartment);
    } catch (error) {
        console.error('Error loading department status:', error);
    }
}

/**
 * Map request category to department
 */
function getDepartmentFromCategory(category) {
    const categoryToDepartment = {
        'HR': 'HR',
        'IT': 'IT',
        'Maintenance': 'Maintenance'
    };
    return categoryToDepartment[category] || 'General';
}

/**
 * Render department status cards
 */
function renderDepartmentStatus(departments, users, requestsByDepartment) {
    const container = document.getElementById('departmentStatusGrid');
    if (!container) return;

    const departmentCards = departments.map(dept => {
        const admin = users.find(user => user.role === 'admin' && user.department === dept);
        const requestCount = requestsByDepartment[dept] || 0;
        const hasAdmin = !!admin;

        return `
            <div class="department-status-card ${hasAdmin ? 'has-admin' : 'no-admin'}">
                <div class="department-status-header">
                    <div class="department-name">${dept}</div>
                    <div class="department-status-badge ${hasAdmin ? 'has-admin' : 'no-admin'}">
                        ${hasAdmin ? 'Has Admin' : 'No Admin'}
                    </div>
                </div>
                
                ${hasAdmin ? `
                    <div class="department-admin-info">
                        <i class="fas fa-user-shield"></i> ${admin.fullName}
                    </div>
                ` : `
                    <div class="department-admin-info">
                        <i class="fas fa-exclamation-triangle"></i> No admin assigned
                    </div>
                `}
                
                <div class="department-request-count">
                    <i class="fas fa-inbox"></i>
                    <span>${requestCount} unassigned request${requestCount !== 1 ? 's' : ''}</span>
                </div>
                
                ${!hasAdmin ? `
                    <button class="promote-admin-btn" onclick="showCreateAdminModal('${dept}')">
                        <i class="fas fa-user-plus"></i> Promote Staff to Admin
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');

    container.innerHTML = departmentCards;
}

/**
 * Load unassigned requests list
 */
/**
 * Approve unassigned request
 */
async function approveUnassignedRequest(requestId) {
    if (!confirm('Are you sure you want to approve this request?')) return;

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${getApiBaseUrl()}/api/requests/${requestId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'Completed' })
        });

        if (response.ok) {
            showMessage('Request approved successfully', 'success');
            await loadUnassignedRequests(); // Refresh the list
        } else {
            throw new Error('Failed to approve request');
        }
    } catch (error) {
        console.error('Error approving request:', error);
        showMessage('Failed to approve request', 'error');
    }
}

/**
 * Reject unassigned request
 */
async function rejectUnassignedRequest(requestId) {
    const reason = prompt('Please provide a reason for rejection (optional):');
    if (reason === null) return; // User cancelled

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${getApiBaseUrl()}/api/requests/${requestId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                status: 'Rejected',
                comments: reason || 'No reason provided'
            })
        });

        if (response.ok) {
            showMessage('Request rejected successfully', 'success');
            await loadUnassignedRequests(); // Refresh the list
        } else {
            throw new Error('Failed to reject request');
        }
    } catch (error) {
        console.error('Error rejecting request:', error);
        showMessage('Failed to reject request', 'error');
    }
}

/**
 * View request details (placeholder for future modal)
 */
function viewRequestDetails(requestId) {
    const request = unassignedRequests.find(r => r.id === requestId);
    if (request) {
        alert(`Request Details:\n\nTitle: ${request.title}\nCategory: ${request.category}\nPriority: ${request.priority}\nSubmitted by: ${request.userName}\nDescription: ${request.description}`);
    }
}

/**
 * Show create admin modal with pre-selected department
 */
function showCreateAdminModal(department) {
    // Set the department in the modal
    const departmentSelect = document.getElementById('adminDepartment');
    if (departmentSelect) {
        departmentSelect.value = department;
    }

    // Show the existing create admin modal
    const modal = document.getElementById('createAdminModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}// 
//===== TAB NAVIGATION =====

/**
 * Show selected tab and load its content
 */
function showTab(tabName, event) {
    if (event) {
        event.preventDefault();
    }

    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });

    // Remove active class from all nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
    });

    // Show selected tab content
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Add active class to clicked nav item
    if (event && event.target) {
        const clickedItem = event.target.closest('.nav-item');
        if (clickedItem) {
            clickedItem.classList.add('active');
        }
    }

    // Load tab-specific content
    switch (tabName) {
        case 'dashboard':
            loadAdminRequests();
            break;
        case 'staff':
            refreshUserList();
            break;
        case 'unassigned-requests':
            loadUnassignedRequests();
            break;
        case 'settings':
            loadCompanySettings();
            break;
    }
}

// Make showTab globally available
window.showTab = showTab;

// ===== USER MANAGEMENT =====

/**
 * Get current user information
 */
function getCurrentUser() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user;
    } catch (error) {
        console.error('Error getting current user:', error);
        return {};
    }
}

// ===== LOADING STATES =====

/**
 * Show loading state for unassigned requests
 */
function showUnassignedRequestsLoading() {
    const container = document.getElementById('unassignedRequestsList');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--gray-500);">
                <div class="loading-spinner" style="margin: 0 auto 1rem; width: 40px; height: 40px;"></div>
                <p>Loading unassigned requests...</p>
            </div>
        `;
    }

    const statusGrid = document.getElementById('departmentStatusGrid');
    if (statusGrid) {
        statusGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--gray-500);">
                <div class="loading-spinner" style="margin: 0 auto 1rem; width: 30px; height: 30px;"></div>
                <p>Loading department status...</p>
            </div>
        `;
    }
}

/**
 * Show message in requests container
 */
function showMessage(message, type = 'info') {
    // Create or update message element
    let messageEl = document.querySelector('.dashboard-message');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.className = 'dashboard-message';
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            animation: slideInRight 0.3s ease;
        `;
        document.body.appendChild(messageEl);
    }

    messageEl.textContent = message;
    messageEl.style.background = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6';

    // Auto remove after 3 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.remove();
        }
    }, 3000);
}

// ===== UNASSIGNED REQUESTS FUNCTIONALITY =====

/**
 * Load unassigned requests tab
 */
async function loadUnassignedRequests() {
    showUnassignedRequestsLoading();

    try {
        await Promise.all([
            loadDepartmentStatus(),
            loadUnassignedRequestsList()
        ]);
    } catch (error) {
        console.error('Error loading unassigned requests:', error);
        showMessage('Failed to load unassigned requests', 'error');
    }
}

/**
 * Load department status overview
 */
async function loadDepartmentStatus() {
    try {
        const token = localStorage.getItem('authToken');

        // Get company settings to see all departments
        const settingsResponse = await fetch('${getApiBaseUrl()}/api/company/settings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!settingsResponse.ok) return;

        const settingsData = await settingsResponse.json();
        const departments = settingsData.company.settings.departments || [];

        // Get all users to check which departments have admins
        const usersResponse = await fetch('${getApiBaseUrl()}/api/company/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!usersResponse.ok) return;

        const usersData = await usersResponse.json();
        const users = usersData.users || [];

        // Get unassigned requests count per department
        const requestsResponse = await fetch('${getApiBaseUrl()}/api/requests/unassigned', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        let requestsByDepartment = {};
        if (requestsResponse.ok) {
            const requestsData = await requestsResponse.json();
            const unassignedRequests = requestsData.requests || [];

            requestsByDepartment = unassignedRequests.reduce((acc, req) => {
                const dept = getDepartmentFromCategory(req.category);
                acc[dept] = (acc[dept] || 0) + 1;
                return acc;
            }, {});
        }

        renderDepartmentStatus(departments, users, requestsByDepartment);
    } catch (error) {
        console.error('Error loading department status:', error);
    }
}

/**
 * Map request category to department
 */
function getDepartmentFromCategory(category) {
    const categoryToDepartment = {
        'HR': 'HR',
        'IT': 'IT',
        'Maintenance': 'Maintenance'
    };
    return categoryToDepartment[category] || 'General';
}

/**
 * Render department status cards
 */
function renderDepartmentStatus(departments, users, requestsByDepartment) {
    const container = document.getElementById('departmentStatusGrid');
    if (!container) return;

    const departmentCards = departments.map(dept => {
        const admin = users.find(user => user.role === 'admin' && user.department === dept);
        const requestCount = requestsByDepartment[dept] || 0;
        const hasAdmin = !!admin;

        return `
            <div class="department-status-card ${hasAdmin ? 'has-admin' : 'no-admin'}">
                <div class="department-status-header">
                    <div class="department-name">${dept}</div>
                    <div class="department-status-badge ${hasAdmin ? 'has-admin' : 'no-admin'}">
                        ${hasAdmin ? 'Has Admin' : 'No Admin'}
                    </div>
                </div>
                
                ${hasAdmin ? `
                    <div class="department-admin-info">
                        <i class="fas fa-user-shield"></i> ${admin.fullName}
                    </div>
                ` : `
                    <div class="department-admin-info">
                        <i class="fas fa-exclamation-triangle"></i> No admin assigned
                    </div>
                `}
                
                <div class="department-request-count">
                    <i class="fas fa-inbox"></i>
                    <span>${requestCount} unassigned request${requestCount !== 1 ? 's' : ''}</span>
                </div>
                
                ${!hasAdmin ? `
                    <button class="promote-admin-btn" onclick="showCreateAdminModal('${dept}')">
                        <i class="fas fa-user-plus"></i> Promote Staff to Admin
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');

    container.innerHTML = departmentCards;
}

/**
 * Load unassigned requests list
 */
async function loadUnassignedRequestsList() {
    try {
        // Initialize arrays to prevent reference errors
        unassignedRequests = [];
        filteredUnassignedRequests = [];

        const token = localStorage.getItem('authToken');
        const response = await fetch('${getApiBaseUrl()}/api/requests/unassigned', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            console.error('Failed to fetch unassigned requests:', response.status);
            renderUnassignedRequests(); // Render empty state
            return;
        }

        const data = await response.json();
        console.log('Unassigned requests response:', data);

        unassignedRequests = data.requests || [];
        filteredUnassignedRequests = [...unassignedRequests];
        renderUnassignedRequests();
    } catch (error) {
        console.error('Error loading unassigned requests:', error);
        // Ensure arrays are initialized even on error
        unassignedRequests = [];
        filteredUnassignedRequests = [];
        renderUnassignedRequests(); // Render empty state
    }
}

/**
 * Render unassigned requests list
 */
function renderUnassignedRequests() {
    const container = document.getElementById('unassignedRequestsList');
    if (!container) return;

    // Ensure array is initialized
    if (!filteredUnassignedRequests) filteredUnassignedRequests = [];

    if (filteredUnassignedRequests.length === 0) {
        container.innerHTML = `
            <div class="empty-unassigned-requests">
                <i class="fas fa-check-circle"></i>
                <h3>All Requests Are Properly Assigned!</h3>
                <p>Great job! All departments have admins to handle their requests.</p>
            </div>
        `;
        return;
    }

    const requestsHtml = filteredUnassignedRequests.map(request => {
        const department = getDepartmentFromCategory(request.category);
        const submittedDate = new Date(request.dateSubmitted?.seconds * 1000 || Date.now()).toLocaleDateString();

        return `
            <div class="unassigned-request-item">
                <div class="request-info">
                    <div class="request-title">${request.title}</div>
                    <div class="request-meta">
                        <span class="request-category">
                            <i class="fas fa-tag"></i> ${request.category}
                        </span>
                        <span class="request-priority ${request.priority.toLowerCase()}">
                            ${request.priority}
                        </span>
                        <span class="request-submitter">
                            <i class="fas fa-user"></i> ${request.userName} • ${submittedDate}
                        </span>
                    </div>
                    <div class="request-description">${request.description}</div>
                    <div class="request-routing-reason">
                        <i class="fas fa-info-circle"></i>
                        Routed to you because no ${department} department admin is available
                    </div>
                </div>
                <div class="request-actions">
                    <button class="request-action-btn view" onclick="viewRequestDetails('${request.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="request-action-btn approve" onclick="approveUnassignedRequest('${request.id}')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="request-action-btn reject" onclick="rejectUnassignedRequest('${request.id}')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = requestsHtml;
}

/**
 * Filter unassigned requests
 */
function filterUnassignedRequests() {
    const categoryFilter = document.getElementById('unassignedCategoryFilter');
    const priorityFilter = document.getElementById('unassignedPriorityFilter');

    const categoryValue = categoryFilter ? categoryFilter.value : '';
    const priorityValue = priorityFilter ? priorityFilter.value : '';

    // Ensure arrays are initialized
    if (!unassignedRequests) unassignedRequests = [];

    filteredUnassignedRequests = unassignedRequests.filter(request => {
        const matchesCategory = !categoryValue || request.category === categoryValue;
        const matchesPriority = !priorityValue || request.priority === priorityValue;
        return matchesCategory && matchesPriority;
    });

    renderUnassignedRequests();
}

/**
 * Approve unassigned request
 */
async function approveUnassignedRequest(requestId) {
    if (!confirm('Are you sure you want to approve this request?')) return;

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${getApiBaseUrl()}/api/requests/${requestId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'Completed' })
        });

        if (response.ok) {
            showMessage('Request approved successfully', 'success');
            await loadUnassignedRequests(); // Refresh the list
        } else {
            throw new Error('Failed to approve request');
        }
    } catch (error) {
        console.error('Error approving request:', error);
        showMessage('Failed to approve request', 'error');
    }
}

/**
 * Reject unassigned request
 */
async function rejectUnassignedRequest(requestId) {
    const reason = prompt('Please provide a reason for rejection (optional):');
    if (reason === null) return; // User cancelled

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${getApiBaseUrl()}/api/requests/${requestId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                status: 'Rejected',
                comments: reason || 'No reason provided'
            })
        });

        if (response.ok) {
            showMessage('Request rejected successfully', 'success');
            await loadUnassignedRequests(); // Refresh the list
        } else {
            throw new Error('Failed to reject request');
        }
    } catch (error) {
        console.error('Error rejecting request:', error);
        showMessage('Failed to reject request', 'error');
    }
}

/**
 * View request details (placeholder for future modal)
 */
function viewRequestDetails(requestId) {
    const request = unassignedRequests.find(r => r.id === requestId);
    if (request) {
        alert(`Request Details:\n\nTitle: ${request.title}\nCategory: ${request.category}\nPriority: ${request.priority}\nSubmitted by: ${request.userName}\nDescription: ${request.description}`);
    }
}

/**
 * Show create admin modal with pre-selected department
 */
function showCreateAdminModal(department) {
    // Set the department in the modal
    const departmentSelect = document.getElementById('adminDepartment');
    if (departmentSelect) {
        departmentSelect.value = department;
    }

    // Show the existing create admin modal
    const modal = document.getElementById('createAdminModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Make functions globally available
window.filterUnassignedRequests = filterUnassignedRequests;
window.approveUnassignedRequest = approveUnassignedRequest;
window.rejectUnassignedRequest = rejectUnassignedRequest;
window.viewRequestDetails = viewRequestDetails;
window.showCreateAdminModal = showCreateAdminModal;

// ===== INITIALIZATION =====

/**
 * Initialize super admin dashboard
 */
document.addEventListener('DOMContentLoaded', function () {
    console.log('Super Admin Dashboard Initializing...');

    // Check authentication first
    if (!checkAuth()) return;

    // Load initial data
    loadData();

    // Load the default dashboard tab
    showTab('dashboard');

    console.log('Super Admin Dashboard ready');
});
