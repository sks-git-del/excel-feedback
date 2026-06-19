// ==========================================
// AUTHENTICATION MODULE
// ==========================================

const PENDING_SIGNUP_PROFILE_KEY = 'pending_signup_profile';
const USERNAME_EMAIL_MAP_KEY = 'username_email_map';
const PIN_VERIFIED_SESSION_KEY = 'pin_verified_session';

function getStoredPinSession() {
    try {
        const raw = localStorage.getItem(PIN_VERIFIED_SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function hasValidPinSession(userId, role) {
    const data = getStoredPinSession();
    if (!data) return false;
    if (String(data.userId || '') !== String(userId || '')) return false;
    if (String(data.role || '').toLowerCase() !== String(role || '').toLowerCase()) return false;
    const ts = Number(data.timestamp || 0);
    if (!Number.isFinite(ts) || ts <= 0) return false;

    const maxAgeMs = 24 * 60 * 60 * 1000;
    return (Date.now() - ts) < maxAgeMs;
}

function storePinSession(userId, role) {
    try {
        localStorage.setItem(PIN_VERIFIED_SESSION_KEY, JSON.stringify({
            userId,
            role,
            timestamp: Date.now()
        }));
    } catch (e) {}
}

function clearPinSession() {
    try { localStorage.removeItem(PIN_VERIFIED_SESSION_KEY); } catch (e) {}
}

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

    document.getElementById('signup-btn').disabled = true;
    document.getElementById('signup-btn').textContent = 'Creating Account...';

    const pendingProfile = {
        name, username,
        username_lower: username.toLowerCase(),
        email,
        email_lower: email.toLowerCase(),
        role,
        semester: semester || null,
        branch: branch || null
    };
    savePendingSignupProfile(pendingProfile);
    saveUsernameEmailMapping(username, email);

    try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const userId = userCredential.user.uid;

        const userData = {
            id: userId,
            name, username,
            username_lower: username.toLowerCase(),
            email,
            email_lower: email.toLowerCase(),
            role,
            semester: semester ? String(semester) : null,
            branch: branch || null,
            createdAt: new Date().toISOString()
        };

        try {
            await firebase.firestore().collection('users').doc(userId).set(userData);
            clearPendingSignupProfile();
        } catch (firestoreError) {
            console.warn('Profile save failed, but auth account created.', firestoreError);
        }

        showMessage(messageDiv, 'Account created successfully! Redirecting to login...', 'success');
        document.getElementById('signup-form').reset();
        setTimeout(() => {
            window.location.href = `login.html?email=${encodeURIComponent(email)}&created=1`;
        }, 1500);

    } catch (error) {
        console.error('Signup Error:', error);
        let errorMessage = 'An error occurred during signup';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This email is already registered';
            clearPendingSignupProfile();
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address';
        } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = 'Email/Password sign-up is disabled in Firebase Authentication.';
        } else if (error.code === 'auth/unauthorized-domain') {
            errorMessage = 'This domain is not authorized in Firebase.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Network error. Check internet and try again.';
        }
        showMessage(messageDiv, `${errorMessage} (${error.code || 'unknown'})`, 'error');
    } finally {
        document.getElementById('signup-btn').disabled = false;
        document.getElementById('signup-btn').textContent = 'Sign Up';
    }
}

async function handleLogin(event) {
    event.preventDefault();

    const usernameOrEmail = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const messageDiv = document.getElementById('login-message');

    document.getElementById('login-btn').disabled = true;
    document.getElementById('login-btn').textContent = 'Logging in...';

    try {
        let emailForAuth = usernameOrEmail;

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

        const userCredential = await firebase.auth().signInWithEmailAndPassword(emailForAuth, password);
        const userId = userCredential.user.uid;

        let userDoc = await firebase.firestore().collection('users').doc(userId).get();

        if (!userDoc.exists) {
            const repairedUserData = buildRecoveredUserData(userCredential.user);
            await firebase.firestore().collection('users').doc(userId).set(repairedUserData);
            userDoc = await firebase.firestore().collection('users').doc(userId).get();
        }

        if (!userDoc.exists) throw new Error('User data not found');

        const userData = userDoc.data();
        console.log('User authenticated, role:', userData.role);

        const role = String(userData.role || '').toLowerCase();

        if ((role === 'admin' || role === 'faculty') && !hasValidPinSession(userId, role)) {
            const pinSettings = await getPinSettings();
            const savedPin = role === 'admin'
                ? String(pinSettings?.adminPin || '1234')
                : String(pinSettings?.facultyPin || '5678');

           const enteredPin = String(document.getElementById('login-pin')?.value || '').trim();
            if (enteredPin === null || String(enteredPin).trim() === '') {
                await firebase.auth().signOut();
                showMessage(messageDiv, 'PIN is required for faculty/admin login.', 'error');
                return;
            }

            if (String(enteredPin).trim() !== savedPin) {
                await firebase.auth().signOut();
                showMessage(messageDiv, `Incorrect security PIN for ${role}`, 'error');
                return;
            }

            storePinSession(userId, role);
        }

        clearPendingSignupProfile();
        showMessage(messageDiv, 'Login successful! Redirecting...', 'success');
        document.getElementById('login-form').reset();
        setTimeout(() => navigateToDashboard(role || userData.role), 1500);

    } catch (error) {
        console.error('Login Error:', error);
        let errorMessage = 'Login failed. Please try again.';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'Account not found. Sign up first.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password.';
        } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-login-credentials') {
            errorMessage = 'Invalid login credentials.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email format.';
        }
        showMessage(messageDiv, `${errorMessage} (${error.code || ''})`, 'error');
    } finally {
        document.getElementById('login-btn').disabled = false;
        document.getElementById('login-btn').textContent = 'Login';
    }
}

async function handleLogout() {
    try {
        clearPinSession();
        await firebase.auth().signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout Error:', error);
        alert('Error logging out. Please try again.');
    }
}

// ==========================================
// ✅ FIXED checkAuth — always includes uid
// ==========================================
async function checkAuth() {
    return new Promise((resolve) => {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        const data = { ...userDoc.data(), uid: user.uid }; // ✅ FIXED
                        resolve(data);
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

// ==========================================
// PIN MANAGEMENT
// ==========================================
async function initializePinSettings() {
    try {
        const pinDocRef = firebase.firestore().collection('system').doc('pin-settings');
        const pinDoc = await pinDocRef.get();
        if (!pinDoc.exists) {
            await pinDocRef.set({
                pinEnabled: true,
                adminPin: '1234',
                facultyPin: '5678',
                lastUpdated: new Date().toISOString(),
                updatedBy: 'system'
            });
        }
    } catch (error) {
        console.error('Error initializing PIN settings:', error);
    }
}

async function getPinSettings() {
    try {
        const pinDoc = await firebase.firestore().collection('system').doc('pin-settings').get();
        if (pinDoc.exists) return pinDoc.data();
        await initializePinSettings();
        const newDoc = await firebase.firestore().collection('system').doc('pin-settings').get();
        return newDoc.exists ? newDoc.data() : null;
    } catch (error) {
        console.error('Error getting PIN settings:', error);
        return null;
    }
}

async function updateAdminPin(newPin) {
    if (!newPin || !/^[0-9]{4,6}$/.test(newPin)) throw new Error('PIN must be 4-6 digits');
    await firebase.firestore().collection('system').doc('pin-settings').update({
        adminPin: newPin, lastUpdated: new Date().toISOString(), updatedBy: getCurrentUserId()
    });
    return true;
}

async function updateFacultyPin(newPin) {
    if (!newPin || !/^[0-9]{4,6}$/.test(newPin)) throw new Error('PIN must be 4-6 digits');
    await firebase.firestore().collection('system').doc('pin-settings').update({
        facultyPin: newPin, lastUpdated: new Date().toISOString(), updatedBy: getCurrentUserId()
    });
    return true;
}

async function togglePinSystem(enabled) {
    await firebase.firestore().collection('system').doc('pin-settings').update({
        pinEnabled: enabled, lastUpdated: new Date().toISOString(), updatedBy: getCurrentUserId()
    });
    return true;
}

async function handlePasswordInput() {
    const usernameOrEmail = document.getElementById('login-username').value.trim();
    const pinSection = document.getElementById('pin-section');
    const pinHelpText = document.getElementById('pin-help-text');

    if (!usernameOrEmail) {
        pinSection.style.display = 'block';
        pinHelpText.textContent = 'Security PIN required for admin and faculty';
        return;
    }

    try {
        let userRole = null;
        if (!usernameOrEmail.includes('@')) {
            const userByUsername = await getUserByUsername(usernameOrEmail);
            if (userByUsername) userRole = userByUsername.role;
        }

        if (userRole === 'student') {
            pinSection.style.display = 'none';
        } else if (userRole === 'admin') {
            pinSection.style.display = 'block';
            pinHelpText.textContent = '🔐 Admin security PIN required (4-6 digits)';
        } else if (userRole === 'faculty') {
            pinSection.style.display = 'block';
            pinHelpText.textContent = '🔐 Faculty security PIN required (4-6 digits)';
        } else {
            pinSection.style.display = 'block';
            pinHelpText.textContent = 'Security PIN (required for admin and faculty)';
        }
    } catch (error) {
        pinSection.style.display = 'block';
        pinHelpText.textContent = 'Security PIN (required for admin and faculty)';
    }
}

async function loadPinSettingsOnLogin() {
    try {
        const pinSettings = await getPinSettings();
        console.log('PIN system enabled:', pinSettings ? pinSettings.pinEnabled : 'unknown');
    } catch (error) {
        console.error('Error loading PIN settings:', error);
    }
}

async function initializeLoginPage() {
    try { await initializePinSettings(); } catch (e) { console.error(e); }
    await loadPinSettingsOnLogin();
}

function getCurrentUserId() {
    return firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;
}

function navigateToDashboard(role) {
    const map = {
        'student': 'dashboard-student.html',
        'faculty': 'dashboard-faculty.html',
        'admin': 'dashboard-admin.html'
    };
    window.location.href = map[role] || 'index.html';
}

function showMessage(element, message, type = 'info') {
    if (!element) { alert(message); return; }
    element.textContent = message;
    element.className = `message show ${type}`;
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (type !== 'error') setTimeout(() => element.classList.remove('show'), 5000);
}

function savePendingSignupProfile(profile) {
    try { localStorage.setItem(PENDING_SIGNUP_PROFILE_KEY, JSON.stringify(profile)); } catch (e) {}
}

function getPendingSignupProfile() {
    try {
        const raw = localStorage.getItem(PENDING_SIGNUP_PROFILE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

function clearPendingSignupProfile() {
    try { localStorage.removeItem(PENDING_SIGNUP_PROFILE_KEY); } catch (e) {}
}

function saveUsernameEmailMapping(username, email) {
    try {
        const map = getUsernameEmailMap();
        map[username.toLowerCase()] = email.toLowerCase();
        localStorage.setItem(USERNAME_EMAIL_MAP_KEY, JSON.stringify(map));
    } catch (e) {}
}

function getEmailFromLocalUsernameMap(username) {
    try {
        return getUsernameEmailMap()[username.toLowerCase()] || null;
    } catch (e) { return null; }
}

function getUsernameEmailMap() {
    try {
        const raw = localStorage.getItem(USERNAME_EMAIL_MAP_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) { return {}; }
}

function buildRecoveredUserData(authUser) {
    const fallbackEmail = authUser?.email || '';
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
            semester: pending.semester ? String(pending.semester) : null,
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

async function getUserByUsername(username) {
    const normalized = username.toLowerCase();
    let querySnapshot = await firebase.firestore()
        .collection('users').where('username_lower', '==', normalized).limit(1).get();

    if (querySnapshot.empty) {
        querySnapshot = await firebase.firestore()
            .collection('users').where('username', '==', username).limit(1).get();
    }

    if (querySnapshot.empty) {
        const localMappedEmail = getEmailFromLocalUsernameMap(username);
        if (!localMappedEmail) return null;
        return { username, email: localMappedEmail };
    }

    return querySnapshot.docs[0].data();
}

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

function toggleForgotPasswordSection() {
    const section = document.getElementById('forgot-password-section');
    if (section) section.classList.toggle('hidden');
}

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
        let errorMessage = 'Unable to send reset link.';
        if (error.code === 'auth/user-not-found') errorMessage = 'Username not found.';
        showMessage(messageElement, errorMessage, 'error');
    }
}

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