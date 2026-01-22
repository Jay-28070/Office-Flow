// Staff Management - Filtering and Pagination
let currentPage = 1;
const itemsPerPage = 10;
let filteredUsers = [];

function filterStaff() {
    const deptFilter = document.getElementById('departmentFilter')?.value || 'all';
    const roleFilter = document.getElementById('roleFilter')?.value || 'all';
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';

    // Filter out super admins
    filteredUsers = allUsers.filter(user => {
        if (user.role === 'superadmin') return false;

        // Department filter
        if (deptFilter !== 'all' && user.department !== deptFilter) return false;

        // Role filter
        if (roleFilter !== 'all' && user.role !== roleFilter) return false;

        // Search filter
        if (searchTerm) {
            const nameMatch = user.fullName.toLowerCase().includes(searchTerm);
            const emailMatch = user.email.toLowerCase().includes(searchTerm);
            if (!nameMatch && !emailMatch) return false;
        }

        return true;
    });

    currentPage = 1;
    displayFilteredUsers();
}

function changePage(direction) {
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    currentPage += direction;

    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    displayFilteredUsers();
}

function displayFilteredUsers() {
    // Use the updated displayUsers function from super_admin_dashboard.js
    if (typeof displayUsers === 'function') {
        displayUsers();
    } else {
        // Fallback for standalone usage
        const tbody = document.getElementById('usersTableBody');

        // Pagination
        const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;

        // Get users for current page
        const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

        // Group paginated users by department
        const paginatedByDept = {};
        paginatedUsers.forEach(user => {
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

        // Build HTML
        let html = '';
        paginatedDepts.forEach(dept => {
            html += `
                <tr class="department-header">
                    <td colspan="7">
                        <strong><i class="fas fa-building"></i> ${dept}</strong>
                        <span class="badge">${paginatedByDept[dept].length} on this page</span>
                    </td>
                </tr>
            `;

            paginatedByDept[dept].forEach(user => {
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

        tbody.innerHTML = html || '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #6b7280;">No staff members found</td></tr>';

        // Update pagination
        updatePagination(totalPages);
    }
}

function updatePagination(totalPages) {
    const paginationInfo = document.getElementById('paginationInfo');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    if (paginationInfo) {
        paginationInfo.textContent = `Page ${currentPage} of ${totalPages || 1} (${filteredUsers.length} total)`;
    }

    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }

    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages || totalPages === 0;
    }
}

// Initialize filters when users are loaded
function initializeStaffFilters() {
    // Populate department filter from company settings
    // This ensures all departments show up, even if they have no users yet
    if (typeof companySettings !== 'undefined' && companySettings && companySettings.departments) {
        const deptFilter = document.getElementById('departmentFilter');
        if (deptFilter) {
            deptFilter.innerHTML = '<option value="all">All Departments</option>' +
                companySettings.departments.map(dept => `<option value="${dept}">${dept}</option>`).join('');
        }
    }

    // Initialize filtered users
    filterStaff();
}
