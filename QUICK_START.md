## 🚀 QUICK START GUIDE - 5 MINUTE SETUP

Follow these steps in order to get the system running:

### Step 1: Get Firebase Credentials (2 minutes)

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" → Name it "StudentFeedback"
3. Wait for project creation
4. Go to **Settings** (gear icon) → **Project Settings**
5. Scroll to "Your apps" → Click **Web** icon
6. Copy the config object that looks like:
```javascript
{
  "apiKey": "AIzaS...",
  "authDomain": "studentfeedback-xxx.firebaseapp.com",
  ...
}
```

### Step 2: Update Configuration (1 minute)

Find and replace in **all HTML files** (index.html, login.html, signup.html, dashboard-*.html):

Change:
```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};
```

With your actual Firebase credentials from Step 1.

### Step 3: Enable Firebase Services (1 minute)

In Firebase Console:

1. **Authentication Tab**
   - Click "Get Started"
   - Enable "Email/Password"

2. **Firestore Database Tab**
   - Click "Create Database"
   - Select "Test mode"
   - Create

### Step 4: Start the App (1 minute)

1. Open project folder in VS Code
2. Right-click `index.html`
3. Select "Open with Live Server"
4. Browser opens automatically

### Step 5: Test the Application

1. **Sign Up**: Click "Sign Up" → Create account with role "Student"
2. **Login**: Login with your credentials
3. **Success**: You should see Student Dashboard

---

## 🔧 For Faculty: Create Feedback Forms

### Setup Google Apps Script (2 minutes)

1. Go to [script.google.com](https://script.google.com)
2. Click "New Project"
3. Copy all code from `apps-script/code.gs`
4. Paste into Apps Script editor
5. Save
6. Click **Deploy** > **New deployment**
7. Select **Web app**
8. Click "Deploy"
9. **Copy the Web App URL** shown

### Use in System

1. Faculty login to dashboard
2. Enter Subject Name and Semester
3. Paste the Web App URL you copied
4. Click "Create Form"
5. Form and Sheet created automatically!

---

## ✅ What's Included

- ✅ Complete HTML structure (6 pages)
- ✅ Professional CSS styling
- ✅ Full authentication system
- ✅ Three role-based dashboards
- ✅ Firebase integration
- ✅ Google Apps Script for form creation
- ✅ Feedback tracking system
- ✅ Admin management panel
- ✅ Report download functionality

---

## 📂 File Structure

```
/project-root
├── index.html                 → Landing page
├── login.html                → Login page
├── signup.html               → Registration page
├── dashboard-student.html    → Student view
├── dashboard-faculty.html    → Faculty view
├── dashboard-admin.html      → Admin view
├── css/
│   └── style.css            → All styling (responsive)
├── js/
│   ├── firebase-config.js   → Firebase setup (UPDATE THIS!)
│   ├── auth.js              → Login/Signup logic
│   ├── student.js           → Student features
│   ├── faculty.js           → Faculty features
│   ├── admin.js             → Admin features
│   └── app.js               → Navigation & utilities
├── apps-script/
│   └── code.gs              → Google Form/Sheet creator
└── README.md                → Full documentation
```

---

## 🔑 Test Accounts

After setup, create these for testing:

1. **Student Account**
   - Email: student@test.com
   - Password: Test123
   - Role: Student
   - Semester: 3

2. **Faculty Account**
   - Email: faculty@test.com
   - Password: Test123
   - Role: Faculty
   - Semester: 3

3. **Admin Account**
   - Email: admin@test.com
   - Password: Test123
   - Role: Admin

---

## 🆘 Common Issues

**Q: Firebase config error**
- A: Make sure you replaced YOUR_* values with actual credentials

**Q: "User not found" when logging in**
- A: Sign up first, then login

**Q: Form creation fails**
- A: Check Apps Script URL and make sure it's deployed as Web App

**Q: Subjects not showing for student**
- A: Faculty must create subjects for that semester first

---

## 📖 Full Documentation

See **README.md** for:
- Detailed setup steps
- Security rules
- Troubleshooting guide
- Feature explanations
- Production checklist

---

**You're ready to go! Start with index.html in Live Server** 🎉
