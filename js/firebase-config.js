// ==========================================
// FIREBASE CONFIGURATION
// ==========================================
// Centralized Firebase setup shared by all pages.

const firebaseConfig = {
    apiKey: "AIzaSyA8sTB17c_zWj4hv7PSPZ69PgEcFwaYXww",
    authDomain: "feedback-system-b513d.firebaseapp.com",
    projectId: "feedback-system-b513d",
    storageBucket: "feedback-system-b513d.firebasestorage.app",
    messagingSenderId: "285292990655",
    appId: "1:285292990655:web:99279bafa7d8abd176360a"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

window.firebaseConfig = firebaseConfig;
window.auth = auth;
window.db = db;
