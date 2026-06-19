// ==========================================
// APP ROUTER & GLOBAL UTILITIES
// ==========================================
// Handles page navigation and global utilities

/**
 * Navigate to a specific page
 * @param {string} page - Page name or HTML file
 */
function navigateTo(page) {
    const pageMap = {
        'home': 'index.html',
        'login': 'login.html',
        'signup': 'signup.html',
        'dashboard-student': 'dashboard-student.html',
        'dashboard-faculty': 'dashboard-faculty.html',
        'dashboard-admin': 'dashboard-admin.html'
    };

    const target = pageMap[page] || `${page}.html`;
    window.location.href = target;
}

/**
 * Format date to readable format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

/**
 * Get current user ID
 * @returns {string|null}
 */
function getCurrentUserId() {
    return firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;
}

/**
 * Check if user is authenticated
 * @returns {Promise<Object|null>}
 */
async function checkAuth() {
    return new Promise((resolve) => {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        resolve(userDoc.data());
                    } else {
                        resolve(null);
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        });
    });
}

/**
 * Protect routes - redirect to login if not authenticated
 * @param {Array<string>} allowedRoles - Allowed roles for the page
 */
async function protectRoute(allowedRoles = []) {
    const user = await checkAuth();

    if (!user) {
        window.location.href = 'login.html';
        return null;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        window.location.href = 'index.html';
        return null;
    }

    return user;
}

/**
 * Show loading spinner
 * @param {boolean} show - Whether to show or hide
 */
function showLoading(show = true) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.style.display = show ? 'block' : 'none';
    }
}

/**
 * Show alert message
 * @param {string} message - Message to display
 * @param {string} type - Alert type (success, error, info, warning)
 */
function showAlert(message, type = 'info') {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    // Add to body
    document.body.appendChild(alertDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with message
 */
function validatePassword(password) {
    const result = {
        isValid: true,
        message: ''
    };

    if (password.length < 6) {
        result.isValid = false;
        result.message = 'Password must be at least 6 characters long';
    } else if (!/\d/.test(password)) {
        result.isValid = false;
        result.message = 'Password should contain at least one number';
    }

    return result;
}

/**
 * Check Firebase initialization
 */
function checkFirebaseInitialization() {
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not loaded. Please add Firebase CDN script to HTML.');
        return false;
    }

    if (!firebase.apps.length) {
        console.error('Firebase not initialized. Check firebase-config.js');
        return false;
    }

    return true;
}

/**
 * Clear all user data (logout)
 */
async function clearUserData() {
    try {
        await firebase.auth().signOut();
        // Clear localStorage if any
        localStorage.clear();
        sessionStorage.clear();
    } catch (error) {
        console.error('Error clearing user data:', error);
    }
}

// Initialize Firebase on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check if Firebase is properly initialized
    if (!checkFirebaseInitialization()) {
        console.warn('Firebase initialization check failed');
    }
});

/**
 * Global error handler
 */
window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
});

/**
 * Global unhandled promise rejection handler
 */
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
