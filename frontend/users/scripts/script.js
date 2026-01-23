/**
 * officeFlow Authentication Script
 * Handles login and registration with Firebase Authentication
 */

import {
    auth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile
} from './firebase-config.js';

// API Base URL - now uses environment detection
const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL || 'http://localhost:3000';

// ===== PASSWORD TOGGLE FUNCTIONALITY =====

/**
 * Initialize password toggle functionality
 */
function initPasswordToggle() {
    const passwordToggles = document.querySelectorAll('.password-toggle');

    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function () {
            const passwordInput = this.parentElement.querySelector('.form-input');
            const icon = this.querySelector('i');

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}



// ===== EVENT LISTENERS =====

/**
 * Initialize form event listeners
 */
function initFormListeners() {
    // Company option toggle
    const companyOptions = document.querySelectorAll('input[name="companyOption"]');
    if (companyOptions.length > 0) {
        companyOptions.forEach(option => {
            option.addEventListener('change', function () {
                const joinGroup = document.getElementById('joinCompanyGroup');
                const createGroup = document.getElementById('createCompanyGroup');
                const employeeDetailsGroup = document.getElementById('employeeDetailsGroup');

                if (this.value === 'join') {
                    joinGroup.style.display = 'block';
                    createGroup.style.display = 'none';
                    if (employeeDetailsGroup) employeeDetailsGroup.style.display = 'none';
                    document.getElementById('companyCode').required = true;
                    document.getElementById('companyName').required = false;
                } else {
                    joinGroup.style.display = 'none';
                    createGroup.style.display = 'block';
                    if (employeeDetailsGroup) employeeDetailsGroup.style.display = 'none';
                    document.getElementById('companyCode').required = false;
                    document.getElementById('companyName').required = true;
                }
            });
        });
    }

    // Company code verification
    const companyCodeInput = document.getElementById('companyCode');
    if (companyCodeInput) {
        companyCodeInput.addEventListener('blur', async function () {
            const code = this.value.trim();
            if (!code) return;

            try {
                // Verify company code and get departments
                const response = await fetch(`${API_BASE_URL}/api/verify-company-code`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ companyCode: code })
                });

                const data = await response.json();

                if (data.success) {
                    // Show employee details fields
                    const employeeDetailsGroup = document.getElementById('employeeDetailsGroup');
                    const departmentSelect = document.getElementById('employeeDepartment');

                    if (employeeDetailsGroup && departmentSelect) {
                        // Populate departments
                        departmentSelect.innerHTML = '<option value="">Select your department</option>' +
                            data.departments.map(dept => `<option value="${dept}">${dept}</option>`).join('');

                        employeeDetailsGroup.style.display = 'block';
                        document.getElementById('employeeDepartment').required = true;
                        document.getElementById('employeeJobTitle').required = true;
                    }

                    document.getElementById('companyCodeError').textContent = '';
                } else {
                    document.getElementById('companyCodeError').textContent = 'Invalid company code';
                    const employeeDetailsGroup = document.getElementById('employeeDetailsGroup');
                    if (employeeDetailsGroup) employeeDetailsGroup.style.display = 'none';
                }
            } catch (error) {
                console.error('Error verifying company code:', error);
            }
        });
    }

    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Clear previous errors
            const emailError = document.getElementById('emailError');
            const passwordError = document.getElementById('passwordError');
            if (emailError) emailError.textContent = '';
            if (passwordError) passwordError.textContent = '';

            const formData = new FormData(loginForm);
            const email = formData.get('email');
            const password = formData.get('password');

            // Basic client-side validation
            if (!email) {
                if (emailError) emailError.textContent = 'Email is required.';
                return;
            }
            if (!password) {
                if (passwordError) passwordError.textContent = 'Password is required.';
                return;
            }

            // Show loading overlay
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.classList.remove('hidden');
                const loadingText = loadingOverlay.querySelector('.loading-text');
                if (loadingText) loadingText.textContent = 'Logging in...';
            }

            // Show loading state on button
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

            try {
                // Sign in with Firebase Authentication
                console.log('Attempting Firebase sign in...');
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const firebaseUser = userCredential.user;
                console.log('Firebase sign in successful:', firebaseUser.uid);

                // Get Firebase ID token
                const idToken = await firebaseUser.getIdToken();
                console.log('Got Firebase ID token');

                // Update loading text
                if (loadingOverlay) {
                    const loadingText = loadingOverlay.querySelector('.loading-text');
                    if (loadingText) loadingText.textContent = 'Loading your dashboard...';
                }

                // Fetch user data from backend
                console.log('Fetching user data from backend...');
                const response = await fetch(`${API_BASE_URL}/api/auth/user-data`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${idToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                console.log('Backend response status:', response.status);
                const data = await response.json();
                console.log('Backend response data:', data);

                if (!response.ok || !data.success) {
                    console.error('Backend error:', data.message);
                    alert(data.message || 'Failed to fetch user data.');
                    await signOut(auth);
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                    if (loadingOverlay) loadingOverlay.classList.add('hidden');
                    return;
                }

                // Store token and user data
                localStorage.setItem('authToken', idToken);
                localStorage.setItem('user', JSON.stringify(data.user));

                alert('Login successful!');

                // Redirect based on user role
                if (data.user.role === 'superadmin') {
                    window.location.href = '../../admin/pages/super_admin_dashboard.html';
                } else if (data.user.role === 'admin') {
                    window.location.href = '../../admin/pages/dashboard_admin.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            } catch (err) {
                console.error('Login error details:', err);
                console.error('Error code:', err.code);
                console.error('Error message:', err.message);
                let errorMessage = 'An error occurred. Please try again.';

                // Handle Firebase auth errors
                if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
                    errorMessage = 'Invalid email or password.';
                } else if (err.code === 'auth/too-many-requests') {
                    errorMessage = 'Too many failed attempts. Please try again later.';
                } else if (err.code === 'auth/network-request-failed') {
                    errorMessage = 'Network error. Please check your connection.';
                }

                alert(errorMessage);
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                if (loadingOverlay) loadingOverlay.classList.add('hidden');
            }
        });
    }

    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Clear previous errors
            document.getElementById('fullNameError').textContent = '';
            document.getElementById('emailError').textContent = '';
            document.getElementById('passwordError').textContent = '';
            document.getElementById('confirmPasswordError').textContent = '';
            document.getElementById('companyCodeError').textContent = '';
            document.getElementById('companyNameError').textContent = '';

            const formData = new FormData(registerForm);
            const fullName = formData.get('fullName');
            const email = formData.get('email');
            const password = formData.get('password');
            const confirmPassword = formData.get('confirmPassword');
            const companyOption = formData.get('companyOption');
            const companyCode = formData.get('companyCode');
            const companyName = formData.get('companyName');

            // Basic client-side validation
            if (!fullName) {
                alert('Full name is required.');
                document.getElementById('fullNameError').textContent = 'Full name is required.';
                return;
            }
            if (!email) {
                alert('Email is required.');
                document.getElementById('emailError').textContent = 'Email is required.';
                return;
            }

            // Email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('Please enter a valid email address.');
                document.getElementById('emailError').textContent = 'Please enter a valid email address.';
                return;
            }

            if (!password) {
                alert('Password is required.');
                document.getElementById('passwordError').textContent = 'Password is required.';
                return;
            }

            // Password strength validation
            if (password.length < 6) {
                alert('Password must be at least 6 characters long.');
                document.getElementById('passwordError').textContent = 'Password must be at least 6 characters long.';
                return;
            }

            if (password !== confirmPassword) {
                alert('Passwords do not match.');
                document.getElementById('confirmPasswordError').textContent = 'Passwords do not match.';
                return;
            }

            // Company validation
            if (companyOption === 'join' && !companyCode) {
                alert('Company code is required.');
                document.getElementById('companyCodeError').textContent = 'Company code is required.';
                return;
            }

            // Employee details validation (when joining company)
            if (companyOption === 'join') {
                const department = formData.get('employeeDepartment');
                const jobTitle = formData.get('employeeJobTitle');

                if (!department) {
                    alert('Please select your department.');
                    document.getElementById('employeeDepartmentError').textContent = 'Department is required.';
                    return;
                }

                if (!jobTitle || jobTitle.trim() === '') {
                    alert('Please enter your job title.');
                    document.getElementById('employeeJobTitleError').textContent = 'Job title is required.';
                    return;
                }
            }

            if (companyOption === 'create' && !companyName) {
                alert('Company name is required.');
                document.getElementById('companyNameError').textContent = 'Company name is required.';
                return;
            }

            // Show loading state
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';

            try {
                // Create user in Firebase Authentication
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const firebaseUser = userCredential.user;

                // Update Firebase profile with display name
                await updateProfile(firebaseUser, {
                    displayName: fullName
                });

                // Get Firebase ID token
                const idToken = await firebaseUser.getIdToken();

                // Register user data in backend
                const requestBody = {
                    fullName,
                    email,
                    firebaseUid: firebaseUser.uid,
                    isCreatingCompany: companyOption === 'create'
                };

                if (companyOption === 'join') {
                    requestBody.companyCode = companyCode;
                    requestBody.department = formData.get('employeeDepartment');
                    requestBody.jobTitle = formData.get('employeeJobTitle');
                } else {
                    requestBody.companyName = companyName;
                }

                const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${idToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    // If backend registration fails, delete the Firebase user
                    await firebaseUser.delete();
                    alert(data.message || 'Registration failed. Please try again.');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                    return;
                }

                alert(data.message);

                // Sign out and redirect to login
                await signOut(auth);
                window.location.href = 'login.html';
            } catch (err) {
                console.error('Registration error:', err);
                let errorMessage = 'An error occurred. Please try again.';

                // Handle Firebase auth errors
                if (err.code === 'auth/email-already-in-use') {
                    errorMessage = 'Email is already registered.';
                } else if (err.code === 'auth/weak-password') {
                    errorMessage = 'Password is too weak. Please use a stronger password.';
                } else if (err.code === 'auth/network-request-failed') {
                    errorMessage = 'Network error. Please check your connection.';
                }

                alert(errorMessage);
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }
}


// ===== AUTH STATE MANAGEMENT =====

/**
 * Monitor Firebase authentication state
 */
export function initAuthStateListener() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in, refresh token
            const idToken = await user.getIdToken(true);
            localStorage.setItem('authToken', idToken);
        } else {
            // User is signed out
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
        }
    });
}

/**
 * Sign out user
 */
export async function logoutUser() {
    try {
        await signOut(auth);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
    }
}

/**
 * Send password reset email
 */
export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        alert('Password reset email sent! Check your inbox.');
    } catch (error) {
        console.error('Password reset error:', error);
        let errorMessage = 'Failed to send password reset email.';

        if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address.';
        }

        alert(errorMessage);
    }
}

// ===== FIREBASE INTEGRATION COMPLETE =====

// Initialize UI behavior on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initPasswordToggle();
    initFormListeners();
    initAuthStateListener();
});

// ===== TERMS OF SERVICE MODAL =====

/**
 * Open the Terms of Service modal
 */
window.openTermsModal = function (event) {
    if (event) {
        event.preventDefault();
    }

    const modal = document.getElementById('termsModalOverlay');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
};

/**
 * Close the Terms of Service modal
 */
window.closeTermsModal = function () {
    const modal = document.getElementById('termsModalOverlay');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = ''; // Restore background scrolling
    }
};

/**
 * Accept terms and close modal
 */
window.acceptTerms = function () {
    const checkbox = document.getElementById('agreeTerms');
    if (checkbox) {
        checkbox.checked = true;

        // Trigger change event to update form validation
        const changeEvent = new Event('change', { bubbles: true });
        checkbox.dispatchEvent(changeEvent);
    }

    closeTermsModal();

    // Optional: Show a brief confirmation
    const termsLink = document.querySelector('.terms-link');
    if (termsLink) {
        const originalText = termsLink.textContent;
        termsLink.textContent = 'Terms Accepted ✓';
        termsLink.style.color = 'var(--success-color, #10b981)';

        setTimeout(() => {
            termsLink.textContent = originalText;
            termsLink.style.color = '';
        }, 2000);
    }
};

/**
 * Handle escape key to close modal
 */
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('termsModalOverlay');
        if (modal && modal.classList.contains('active')) {
            closeTermsModal();
        }
    }
});