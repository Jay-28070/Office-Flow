/**
 * officeFlow Dashboard Script - Clean Version
 * Handles dashboard functionality, navigation, and request management
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

let requests = [];
let currentSection = 'overview';
let filteredRequests = [];

// ===== UTILITY FUNCTIONS =====

function generateRequestId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `REQ${timestamp}${random}`.slice(-10);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const format = currentUser.preferences.dateFormat;
    const timezone = currentUser.preferences.timezone;

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
        default:
            return localDate;
    }
}

function getCurrentTimestamp() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

function getStatusClass(status) {
    const statusMap = {
        'Pending': 'status-pending',
        'In Progress': 'status-in-progress',
        'Completed': 'status-completed',
        'Rejected': 'status-rejected'
    };
    return statusMap[status] || 'status-pending';
}

function showMessage(text, type = 'success') {
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
    if (firstSection) {
        firstSection.insertBefore(messageDiv, firstSection.firstChild);
    }

    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}

function updateStats() {
    const pendingCount = requests.filter(r => r.status === 'Pending').length;
    const completedCount = requests.filter(r => r.status === 'Completed').length;
    const thisMonthCount = requests.filter(r => {
        const requestDate = new Date(r.dateSubmitted);
        const currentDate = new Date();
        return requestDate.getMonth() === currentDate.getMonth() &&
            requestDate.getFullYear() === currentDate.getFullYear();
    }).length;

    const pendingEl = document.getElementById('pendingCount');
    const completedEl = document.getElementById('completedCount');
    const monthEl = document.getElementById('thisMonth');
    const balanceEl = document.getElementById('leaveBalance');

    if (pendingEl) pendingEl.textContent = pendingCount;
    if (completedEl) completedEl.textContent = completedCount;
    if (monthEl) monthEl.textContent = thisMonthCount;
    if (balanceEl) balanceEl.textContent = `${currentUser.leaveBalance.annual}`;
}

// ===== FORM SUBMISSION =====

async function handleFormSubmit(e) {
    e.preventDefault();
    console.log('🚀 Form submission started');

    const formData = new FormData(e.target);
    const requestData = {
        title: formData.get('title'),
        category: formData.get('category'),
        priority: formData.get('priority'),
        description: formData.get('description'),
        type: 'General'
    };

    console.log('📝 Form data collected:', requestData);

    // If HR category, check if leave dates are provided
    if (requestData.category === 'HR') {
        const start = formData.get('leaveStart');
        const end = formData.get('leaveEnd');

        if (start && end) {
            const days = calculateLeaveDays(start, end);
            requestData.type = 'Leave';
            requestData.leave = { start, end, days };
            requestData.deduct = document.getElementById('deductFromBalance')?.checked || false;
            console.log('📅 Leave request detected:', requestData.leave);
        }
    }

    // Validate form
    if (!validateForm(requestData)) {
        console.log('❌ Form validation failed');
        return;
    }

    // Add loading state
    const submitBtn = document.getElementById('submitRequest');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';
    submitBtn.disabled = true;

    try {
        const token = localStorage.getItem('authToken');
        console.log('🔑 Token available:', !!token);

        const response = await fetch('http://localhost:3000/api/requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestData)
        });

        console.log('📡 Response status:', response.status);
        const data = await response.json();
        console.log('📦 Response data:', data);

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
        console.log('✅ Request added to local array');

        // Reset form
        clearForm();

        // Show success message
        showMessage(data.message || 'Request submitted successfully!');

        // Update stats
        updateStats();

        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;

        // Switch to requests view
        switchSection('your-requests');
        document.querySelector('[data-section="your-requests"]')?.classList.add('active');
        document.querySelector('[data-section="submit-request"]')?.classList.remove('active');

        console.log('✅ Request submitted successfully:', data.request);
    } catch (error) {
        console.error('❌ Error submitting request:', error);
        showMessage('Failed to submit request: ' + error.message, 'error');

        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

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

    if (data.type === 'Leave') {
        if (!data.leave || !data.leave.start || !data.leave.end || data.leave.days <= 0) {
            showMessage('Please provide valid start/end dates for leave.', 'error');
            isValid = false;
        }
    }

    return isValid;
}

function calculateLeaveDays(start, end) {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s) || isNaN(e) || e < s) return 0;
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return diff;
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.add('error');

    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.style.cssText = 'color: var(--error-color); font-size: 0.75rem; margin-top: 0.25rem;';
    errorDiv.textContent = message;
    field.parentNode.appendChild(errorDiv);
}

function clearFieldError(e) {
    const field = e.target;
    field.classList.remove('error');

    const errorDiv = field.parentNode.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.remove();
    }
}

function clearForm() {
    const form = document.getElementById('requestForm');
    if (!form) return;

    form.reset();

    const errorFields = form.querySelectorAll('.error');
    errorFields.forEach(field => field.classList.remove('error'));

    const errorMessages = form.querySelectorAll('.field-error');
    errorMessages.forEach(msg => msg.remove());

    const leaveFields = document.getElementById('leaveFields');
    if (leaveFields) leaveFields.style.display = 'none';

    const leaveDaysEl = document.getElementById('leaveDays');
    if (leaveDaysEl) leaveDaysEl.textContent = '0';

    const availEl = document.getElementById('availableLeave');
    if (availEl) availEl.textContent = '--';

    const deductChk = document.getElementById('deductFromBalance');
    if (deductChk) deductChk.checked = true;
}

// ===== INITIALIZATION =====

document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Dashboard initializing...');

    // Initialize form
    const form = document.getElementById('requestForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
        console.log('✅ Form event listener attached');
    }

    // Initialize user info
    const stored = localStorage.getItem('user');
    if (stored) {
        try {
            const userData = JSON.parse(stored);
            Object.assign(currentUser, userData);
            console.log('✅ User data loaded:', currentUser.name);
        } catch (e) {
            console.warn('Failed to parse user data:', e);
        }
    }

    // Update UI
    const nameEl = document.getElementById('userName');
    if (nameEl) nameEl.textContent = currentUser.name || 'User';

    updateStats();

    // Hide loading overlay
    setTimeout(() => {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
    }, 500);

    console.log('✅ Dashboard ready');
});