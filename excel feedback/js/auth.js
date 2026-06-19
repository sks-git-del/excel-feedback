// ==========================================
// AUTHENTICATION MODULE
// ==========================================
// Handles user login, signup, logout, and authentication state

const PENDING_SIGNUP_PROFILE_KEY = 'pending_signup_profile';
const USERNAME_EMAIL_MAP_KEY = 'username_email_map';

/**
 * Handle user signup/registration
 * @param {Event} event - Form submission event
 */
async function handleSignup(event) {
    event.preventDefault();

    if (!firebase.auth) {
        alert('Firebase Authentication SDK not loaded. Please refresh the page.');
        return;
    }

    const name = document.getElementById('signup-name').value.trim();
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const role = document.getElementById('signup-role').value;
    const semester = document.getElementById('signup-semester').value;
    const branch = document.getElementById('signup-branch').value.trim();

    const messageDiv = document.getElementById('signup-message');

    // Validation
    if (password.length < 6) {
        showMessage(messageDiv, 'Password must be at least 6 characters long', 'error');
        return;
    }

    if (!/^[a-zA-Z0-9._-]{3,20}$/.test(username)) {
        showMessage(messageDiv, 'Username must be 3-20 characters (letters, numbers, ., _, -)', 'error');
        return;
    }

    if (!role) {
        showMessage(messageDiv, 'Please select a role', 'error');
        return;
    }

    if ((role === 'student' || role === 'faculty') && !semester) {
        showMessage(messageDiv, 'Please select a semester', 'error');
        return;
    }

    // Show loading state
    document.getElementById('signup-btn').disabled = true;
    document.getElementById('signup-btn').textContent = 'Creating Account...';

    const pendingProfile = {
        name: name,
        username: username,
        username_lower: username.toLowerCase(),
        email: email,
        email_lower: email.toLowerCase(),
        role: role,
        semester: semester || null,
        branch: branch || null
    };
    savePendingSignupProfile(pendingProfile);
    saveUsernameEmailMapping(username, email);

    try {
        // Create user in Firebase Authentication
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const userId = userCredential.user.uid;

        // Prepare user data
        const userData = {
            id: userId,
            name: name,
            username: username,
            username_lower: username.toLowerCase(),
            email: email,
            email_lower: email.toLowerCase(),
            role: role,
            semester: semester || null,
            branch: branch || null,
            createdAt: new Date().toISOString()
        };

        // Store user data in Firestore
        try {
            await firebase.firestore().collection('users').doc(userId).set(userData);
            clearPendingSignupProfile();
        } catch (firestoreError) {
            console.warn('Profile save failed, but auth account created. Will recover on login.', firestoreError);
        }

        // Show success message
        showMessage(messageDiv, 'Account created successfully! Redirecting to login...', 'success');

        // Clear form
        document.getElementById('signup-form').reset();

        // Redirect to login page after 1.5 seconds
        setTimeout(() => {
            window.location.href = `login.html?email=${encodeURIComponent(email)}&created=1`;
        }, 1500);

    } catch (error) {
        console.error('Signup Error:', error);
        let errorMessage = 'An error occurred during signup';

        if (error.code === 'auth/configuration-not-found') {
            errorMessage = 'Firebase auth configuration error. Ensure Email/Password is enabled.';
        } else if (error.code === 'PERMISSION_DENIED' || error.message?.includes('permission')) {
            errorMessage = 'Database permission denied. Publish Firestore rules, then try again.';
        } else if (error.code === 'auth/email-already-in-use' || error.message?.includes('already in use')) {
            errorMessage = 'This email is already registered';
            clearPendingSignupProfile();
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address';
        } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = 'Email/Password sign-up is disabled in Firebase Authentication.';
        } else if (error.code === 'auth/unauthorized-domain') {
            errorMessage = 'This domain is not authorized in Firebase. Add localhost in Firebase Auth settings.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Network error while creating account. Check internet and try again.';
        } else if (error.code === 'permission-denied') {
            errorMessage = 'Auth account created but profile save failed due to Firestore rules. You can still login with email.';
        }

        const detailedError = error && error.code ? `${errorMessage} (${error.code})` : errorMessage;
        showMessage(messageDiv, detailedError, 'error');
    } finally {
        document.getElementById('signup-btn').disabled = false;
        document.getElementById('signup-btn').textContent = 'Sign Up';
    }
}

/**
 * Handle user login
 * @param {Event} event - Form submission event
 */
async function handleLogin(event) {
    event.preventDefault();

    const usernameOrEmail = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const enteredPin = document.getElementById('login-pin').value.trim(); // ✅ single declaration
    const messageDiv = document.getElementById('login-message');

    // Show loading state
    document.getElementById('login-btn').disabled = true;
    document.getElementById('login-btn').textContent = 'Logging in...';

    try {
        let emailForAuth = usernameOrEmail;

        // Resolve username to email
        if (!usernameOrEmail.includes('@')) {
            const userByUsername = await getUserByUsername(usernameOrEmail);
            if (userByUsername) {
                emailForAuth = userByUsername.email;
            } else {
                const pendingProfile = getPendingSignupProfile();
                if (pendingProfile && pendingProfile.username_lower === usernameOrEmail.toLowerCase()) {
                    emailForAuth = pendingProfile.email;
                } else {
                    const localMappedEmail = getEmailFromLocalUsernameMap(usernameOrEmail);
                    if (localMappedEmail) {
                        emailForAuth = localMappedEmail;
                    } else {
                        throw { code: 'auth/user-not-found' };
                    }
                }
            }
        }

        // Sign in with Firebase Authentication
        const userCredential = await firebase.auth().signInWithEmailAndPassword(emailForAuth, password);
        const userId = userCredential.user.uid;

        // Fetch user profile from Firestore
        let userDoc = await firebase.firestore().collection('users').doc(userId).get();

        // Self-heal: recreate missing profile
        if (!userDoc.exists) {
            const repairedUserData = buildRecoveredUserData(userCredential.user);
            await firebase.firestore().collection('users').doc(userId).set(repairedUserData);
            userDoc = await firebase.firestore().collection('users').doc(userId).get();
        }

        if (!userDoc.exists) {
            throw new Error('User data not found');
        }

        const userData = userDoc.data();
        console.log('User authenticated, role:', userData.role);

        // PIN VALIDATION (Optional - for Faculty/Admin)
        // If PIN field is empty, allow login anyway (backward compatibility)
        const enteredPin = document.getElementById('login-pin').value.trim();
        
        if ((userData.role === 'admin' || userData.role === 'faculty') && enteredPin) {
            // User entered a PIN - validate it
            const correctPin = userData.role === 'admin' ? '1234' : '5678';
            
            if (enteredPin !== correctPin) {
                // Wrong PIN - reject login
                await firebase.auth().signOut();
                showMessage(messageDiv, `Incorrect security PIN for ${userData.role}`, 'error');
                document.getElementById('login-btn').disabled = false;
                document.getElementById('login-btn').textContent = 'Login';
                return;
            }
            console.log('PIN validated successfully for', userData.role);
        }

        // PIN validation passed (or not needed) - proceed with login
        clearPendingSignupProfile();
        showMessage(messageDiv, 'Login successful! Redirecting...', 'success');
        document.getElementById('login-form').reset();

        setTimeout(() => {
            navigateToDashboard(userData.role);
        }, 1500);

    } catch (error) {
        console.error('Login Error:', error);
        let errorMessage = 'Login failed. Please try again.';

        if (error.code === 'auth/user-not-found') {
            errorMessage = 'Account not found. Use your username or recovery email, or sign up first.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password. Please try again.';
        } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-login-credentials') {
            errorMessage = 'Invalid login credentials. Please check your username/email and password.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email format.';
        } else if (error.code === 'permission-denied') {
            errorMessage = 'Username login is blocked by Firestore rules. Please log in with recovery email.';
        }

        const detailedError = error && error.code ? `${errorMessage} (${error.code})` : errorMessage;
        showMessage(messageDiv, detailedError, 'error');
    } finally {
        document.getElementById('login-btn').disabled = false;
        document.getElementById('login-btn').textContent = 'Login';
    }
}

/**
 * Handle user logout
 */
async function handleLogout() {
    try {
        await firebase.auth().signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout Error:', error);
        alert('Error logging out. Please try again.');
    }
}

// ==========================================
// PIN MANAGEMENT FUNCTIONS
// ==========================================

/**
 * Initialize PIN settings in Firestore
 * Creates default PIN settings document if it doesn't exist
 * Default: adminPin = '1234', facultyPin = '5678'
 */
async function initializePinSettings() {
    try {
        const pinDocRef = firebase.firestore().collection('system').doc('pin-settings');
        const pinDoc = await pinDocRef.get();

        if (!pinDoc.exists) {
            await pinDocRef.set({
                pinEnabled: true,
                adminPin: '1234',    // ← Default admin PIN (change from admin dashboard)
                facultyPin: '5678',  // ← Default faculty PIN (change from admin dashboard)
                lastUpdated: new Date().toISOString(),
                updatedBy: 'system'
            });
            console.log('PIN settings initialized: adminPin=1234, facultyPin=5678');
        }
    } catch (error) {
        console.error('Error initializing PIN settings:', error);
    }
}

/**
 * Get current PIN settings from Firestore
 * @returns {Promise<Object>} PIN settings object
 */
async function getPinSettings() {
    try {
        const pinDoc = await firebase.firestore().collection('system').doc('pin-settings').get();

        if (pinDoc.exists) {
            return pinDoc.data();
        } else {
            await initializePinSettings();
            const newDoc = await firebase.firestore().collection('system').doc('pin-settings').get();
            return newDoc.exists ? newDoc.data() : null;
        }
    } catch (error) {
        console.error('Error getting PIN settings:', error);
        return null;
    }
}

/**
 * Update admin PIN (called from admin dashboard)
 * @param {string} newPin - New PIN (4-6 digits)
 */
async function updateAdminPin(newPin) {
    try {
        if (!newPin || !/^[0-9]{4,6}$/.test(newPin)) {
            throw new Error('PIN must be 4-6 digits');
        }

        await firebase.firestore().collection('system').doc('pin-settings').update({
            adminPin: newPin,
            lastUpdated: new Date().toISOString(),
            updatedBy: getCurrentUserId()
        });

        return true;
    } catch (error) {
        console.error('Error updating admin PIN:', error);
        throw error;
    }
}

/**
 * Update faculty PIN (called from admin dashboard)
 * All faculty members share this single PIN
 * @param {string} newPin - New PIN (4-6 digits)
 */
async function updateFacultyPin(newPin) {
    try {
        if (!newPin || !/^[0-9]{4,6}$/.test(newPin)) {
            throw new Error('PIN must be 4-6 digits');
        }

        await firebase.firestore().collection('system').doc('pin-settings').update({
            facultyPin: newPin,
            lastUpdated: new Date().toISOString(),
            updatedBy: getCurrentUserId()
        });

        return true;
    } catch (error) {
        console.error('Error updating faculty PIN:', error);
        throw error;
    }
}

/**
 * Toggle PIN system on/off
 * @param {boolean} enabled
 */
async function togglePinSystem(enabled) {
    try {
        await firebase.firestore().collection('system').doc('pin-settings').update({
            pinEnabled: enabled,
            lastUpdated: new Date().toISOString(),
            updatedBy: getCurrentUserId()
        });
        return true;
    } catch (error) {
        console.error('Error toggling PIN system:', error);
        throw error;
    }
}

/**
 * Show/hide PIN field based on username input
 * Students → hide PIN field
 * Faculty/Admin → show PIN field
 */
async function handlePasswordInput() {
    const usernameOrEmail = document.getElementById('login-username').value.trim();
    const pinSection = document.getElementById('pin-section');
    const pinHelpText = document.getElementById('pin-help-text');

    if (!usernameOrEmail) {
        // Show by default when field is empty
        pinSection.style.display = 'block';
        pinHelpText.textContent = 'Security PIN required for admin and faculty';
        return;
    }

    try {
        let userRole = null;

        if (!usernameOrEmail.includes('@')) {
            const userByUsername = await getUserByUsername(usernameOrEmail);
            if (userByUsername) {
                userRole = userByUsername.role;
            }
        }

        if (userRole === 'student') {
            // Students never need PIN
            pinSection.style.display = 'none';
            console.log('Student detected - PIN field hidden');
        } else if (userRole === 'admin') {
            pinSection.style.display = 'block';
            pinHelpText.textContent = '🔐 Admin security PIN required (4-6 digits)';
        } else if (userRole === 'faculty') {
            pinSection.style.display = 'block';
            pinHelpText.textContent = '🔐 Faculty security PIN required (4-6 digits)';
        } else {
            // Unknown role or email login — show PIN (will be skipped for students after auth)
            pinSection.style.display = 'block';
            pinHelpText.textContent = 'Security PIN (required for admin and faculty)';
        }

    } catch (error) {
        console.warn('Error checking user role:', error);
        pinSection.style.display = 'block';
        pinHelpText.textContent = 'Security PIN (required for admin and faculty)';
    }
}

/**
 * Load PIN settings on login page init
 */
async function loadPinSettingsOnLogin() {
    try {
        const pinSettings = await getPinSettings();
        console.log('PIN system enabled:', pinSettings ? pinSettings.pinEnabled : 'unknown');
    } catch (error) {
        console.error('Error loading PIN settings on login:', error);
    }
}

/**
 * Initialize login page
 */
async function initializeLoginPage() {
    console.log('Initializing login page...');
    try {
        await initializePinSettings();
    } catch (error) {
        console.error('Error initializing PIN settings:', error);
    }
    await loadPinSettingsOnLogin();
}

async function checkAuth() {
    return new Promise((resolve) => {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                    resolve(userDoc.exists ? userDoc.data() : null);
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
 * Get current user ID
 */
function getCurrentUserId() {
    return firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;
}

/**
 * Navigate to appropriate dashboard based on role
 */
function navigateToDashboard(role) {
    const dashboardMap = {
        'student': 'dashboard-student.html',
        'faculty': 'dashboard-faculty.html',
        'admin': 'dashboard-admin.html'
    };

    const dashboard = dashboardMap[role];
    window.location.href = dashboard || 'index.html';
}

/**
 * Show message to user
 */
function showMessage(element, message, type = 'info') {
    if (!element) {
        alert(message);
        return;
    }

    element.textContent = message;
    element.className = `message show ${type}`;
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    if (type !== 'error') {
        setTimeout(() => {
            element.classList.remove('show');
        }, 5000);
    }
}

function savePendingSignupProfile(profile) {
    try {
        localStorage.setItem(PENDING_SIGNUP_PROFILE_KEY, JSON.stringify(profile));
    } catch (error) {
        console.warn('Unable to persist pending signup profile:', error);
    }
}

function getPendingSignupProfile() {
    try {
        const raw = localStorage.getItem(PENDING_SIGNUP_PROFILE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.warn('Unable to read pending signup profile:', error);
        return null;
    }
}

function clearPendingSignupProfile() {
    try {
        localStorage.removeItem(PENDING_SIGNUP_PROFILE_KEY);
    } catch (error) {
        console.warn('Unable to clear pending signup profile:', error);
    }
}

function saveUsernameEmailMapping(username, email) {
    try {
        const usernameMap = getUsernameEmailMap();
        usernameMap[username.toLowerCase()] = email.toLowerCase();
        localStorage.setItem(USERNAME_EMAIL_MAP_KEY, JSON.stringify(usernameMap));
    } catch (error) {
        console.warn('Unable to save username-email mapping:', error);
    }
}

function getEmailFromLocalUsernameMap(username) {
    try {
        const usernameMap = getUsernameEmailMap();
        return usernameMap[username.toLowerCase()] || null;
    } catch (error) {
        console.warn('Unable to read username-email mapping:', error);
        return null;
    }
}

function getUsernameEmailMap() {
    try {
        const raw = localStorage.getItem(USERNAME_EMAIL_MAP_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        console.warn('Unable to parse username-email mapping:', error);
        return {};
    }
}

function buildRecoveredUserData(authUser) {
    const fallbackEmail = authUser && authUser.email ? authUser.email : '';
    const pending = getPendingSignupProfile();
    const pendingMatches = pending && fallbackEmail && pending.email_lower === fallbackEmail.toLowerCase();

    if (pendingMatches) {
        return {
            id: authUser.uid,
            name: pending.name,
            username: pending.username,
            username_lower: pending.username_lower,
            email: pending.email,
            email_lower: pending.email_lower,
            role: pending.role || 'student',
            semester: pending.semester || null,
            branch: pending.branch || null,
            createdAt: new Date().toISOString()
        };
    }

    const fallbackUsername = fallbackEmail ? fallbackEmail.split('@')[0] : `user_${Date.now()}`;
    return {
        id: authUser.uid,
        name: fallbackUsername,
        username: fallbackUsername,
        username_lower: fallbackUsername.toLowerCase(),
        email: fallbackEmail,
        email_lower: fallbackEmail.toLowerCase(),
        role: 'student',
        semester: null,
        branch: null,
        createdAt: new Date().toISOString()
    };
}

/**
 * Resolve user by username
 */
async function getUserByUsername(username) {
    const normalized = username.toLowerCase();

    let querySnapshot = await firebase.firestore()
        .collection('users')
        .where('username_lower', '==', normalized)
        .limit(1)
        .get();

    if (querySnapshot.empty) {
        querySnapshot = await firebase.firestore()
            .collection('users')
            .where('username', '==', username)
            .limit(1)
            .get();
    }

    if (querySnapshot.empty) {
        const localMappedEmail = getEmailFromLocalUsernameMap(username);
        if (!localMappedEmail) return null;
        return { username: username, email: localMappedEmail };
    }

    return querySnapshot.docs[0].data();
}

/**
 * Show/hide password toggle
 */
function togglePassword(inputId, toggleBtn) {
    const input = document.getElementById(inputId);
    if (!input) return;

    if (input.type === 'password') {
        input.type = 'text';
        toggleBtn.textContent = 'Hide';
    } else {
        input.type = 'password';
        toggleBtn.textContent = 'Show';
    }
}

/**
 * Toggle forgot password panel
 */
function toggleForgotPasswordSection() {
    const section = document.getElementById('forgot-password-section');
    if (!section) return;
    section.classList.toggle('hidden');
}

/**
 * Send password reset email
 */
async function handleForgotPassword() {
    const forgotInput = document.getElementById('forgot-username');
    const messageElement = document.getElementById('forgot-message');

    if (!forgotInput || !messageElement) return;

    const usernameOrEmail = forgotInput.value.trim();
    if (!usernameOrEmail) {
        showMessage(messageElement, 'Enter your username first.', 'error');
        return;
    }

    try {
        let emailForReset = usernameOrEmail;
        if (!usernameOrEmail.includes('@')) {
            const userByUsername = await getUserByUsername(usernameOrEmail);
            if (!userByUsername) throw { code: 'auth/user-not-found' };
            emailForReset = userByUsername.email;
        }

        await firebase.auth().sendPasswordResetEmail(emailForReset);
        showMessage(messageElement, 'Password reset link sent to your recovery email.', 'success');
        forgotInput.value = '';
    } catch (error) {
        console.error('Forgot Password Error:', error);
        let errorMessage = 'Unable to send reset link.';
        if (error.code === 'auth/user-not-found') errorMessage = 'Username not found.';
        showMessage(messageElement, errorMessage, 'error');
    }
}

// Show/hide semester and branch fields based on selected role
document.addEventListener('DOMContentLoaded', () => {
    const roleSelect = document.getElementById('signup-role');
    const semesterBranchContainer = document.getElementById('semester-branch-container');
    const loginInput = document.getElementById('login-username');
    const loginMessage = document.getElementById('login-message');

    if (loginInput) {
        const params = new URLSearchParams(window.location.search);
        const emailParam = params.get('email');
        const created = params.get('created');

        if (emailParam) loginInput.value = emailParam;

        if (created === '1' && loginMessage) {
            showMessage(loginMessage, 'Account created. Please sign in to continue.', 'success');
        }
    }

    if (roleSelect) {
        roleSelect.addEventListener('change', (e) => {
            if (e.target.value === 'student' || e.target.value === 'faculty') {
                semesterBranchContainer.style.display = 'block';
                document.getElementById('signup-semester').required = true;
            } else {
                semesterBranchContainer.style.display = 'none';
                document.getElementById('signup-semester').required = false;
            }
        });
    }
});