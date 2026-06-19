# Student Feedback Management System

A complete, modern, beginner-friendly feedback collection and management system built with HTML, CSS, JavaScript, Firebase, and Google Apps Script.

## 📋 Table of Contents

- [Features](#features)
- [System Requirements](#system-requirements)
- [Project Setup](#project-setup)
- [Firebase Setup](#firebase-setup)
- [Google Apps Script Setup](#google-apps-script-setup)
- [Running the Project](#running-the-project)
- [User Guide](#user-guide)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

### Core Features

- **Role-Based Access**: Student, Faculty, and Admin dashboards
- **Authentication**: Secure email/password login and signup via Firebase
- **Dynamic Form Creation**: Faculty can create Google Forms automatically via Apps Script
- **Feedback Submissions**: One response per student per subject
- **Data Collection**: Automatic collection to Google Sheets
- **Report Download**: Download feedback reports as CSV
- **Admin Panel**: System-wide management and reporting

### Student Features

- View subjects by semester
- Submit feedback once per subject
- Track submission status
- Access Google Forms directly

### Faculty Features

- Create feedback forms with predefined questions
- Manage multiple subjects
- View response data in Google Sheets
- Download feedback reports
- Delete forms when needed

### Admin Features

- View all subjects and forms
- Manage all users (view/delete)
- Download any reports
- System-wide oversight

---

## 🔧 System Requirements

- **Browser**: Modern browser (Chrome, Firefox, Safari, Edge)
- **Internet Connection**: Required for Firebase and Google services
- **Firebase Account**: Free account sufficient
- **Google Account**: For Google Apps Script and Forms/Sheets
- **Text Editor**: VS Code (recommended) or any editor
- **Live Server**: VS Code Live Server extension or similar

---

## 📦 Installation & Setup

### Step 1: Project Structure

The project is already organized in your workspace:

```
/project-root
│── index.html
│── login.html
│── signup.html
│── dashboard-student.html
│── dashboard-faculty.html
│── dashboard-admin.html
│── /css/
│   └── style.css
│── /js/
│   ├── firebase-config.js
│   ├── auth.js
│   ├── student.js
│   ├── faculty.js
│   ├── admin.js
│   └── app.js
│── /apps-script/
│   └── code.gs
└── README.md
```

### Step 2: Firebase Setup

#### 2.1 Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name (e.g., "Student Feedback")
4. Select a region
5. Click "Create project"

#### 2.2 Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click "Get started"
3. Select **Email/Password** provider
4. Enable it and click "Save"

#### 2.3 Create Firestore Database

1. Go to **Firestore Database**
2. Click "Create database"
3. Start in **Test mode** (for development)
4. Select your region
5. Click "Create"

#### 2.4 Get Firebase Config

1. Go to **Project Settings** (gear icon)
2. Scroll to "Your apps" section
3. Click the web icon (</>) to create a web app
4. Copy the Firebase config object
5. Replace values in `js/firebase-config.js`:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};
```

#### 2.5 Create Firestore Collections

In Firestore Database, manually create these collections:

1. **users**
   - Auto-ID documents
   - Sample fields: id, name, email, role, semester, branch, createdAt

2. **subjects**
   - Auto-ID documents
   - Sample fields: subject_name, semester, faculty_id, form_link, sheet_link, createdAt, status

3. **feedback_submissions**
   - Auto-ID documents
   - Sample fields: student_email, subject_id, submitted, timestamp

#### 2.6 Set Firestore Security Rules

Replace the default rules with:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can read/write their own document
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      allow read: if request.auth.uid != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Everyone can read subjects
    // Only faculty can create/update their own subjects
    match /subjects/{subject} {
      allow read: if request.auth.uid != null;
      allow create: if request.auth.uid != null;
      allow update, delete: if request.auth.uid != null && 
                               request.auth.uid == resource.data.faculty_id ||
                               get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Students can create feedback submissions
    match /feedback_submissions/{submission} {
      allow read: if request.auth.uid != null;
      allow create: if request.auth.uid != null;
    }
  }
}
```

#### 2.7 Add Firebase SDK to HTML

Add these scripts to the `<head>` of each HTML file (after `<meta>` tags):

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js"></script>

<script>
    // Initialize Firebase
    firebase.initializeApp({
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT_ID.appspot.com",
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
        appId: "YOUR_APP_ID",
        measurementId: "YOUR_MEASUREMENT_ID"
    });
</script>
```

Or keep it in `firebase-config.js` and update it with actual credentials.

---

## 📝 Google Apps Script Setup

### Step 1: Create Google Apps Script Project

1. Go to [script.google.com](https://script.google.com)
2. Click "Create new project"
3. Name it "Feedback Form Creator"
4. Replace the default code with content from `apps-script/code.gs`

### Step 2: Deploy as Web App

1. In Apps Script editor, click **Deploy** > **New deployment**
2. Click the gear icon (Select type)
3. Choose **Web app**
4. Set configurations:
   - **Execute as**: Your email/account
   - **Who has access**: Anyone
5. Click "Deploy"
6. Copy the Web App URL

### Step 3: Update Your Project

In your feedback management system, you now have the Google Apps Script URL.

When faculty create forms, they'll need to paste this URL in the "Google Apps Script Web App URL" field:

```
https://script.google.com/macros/d/{SCRIPT_ID}/usercopy
```

This URL is shown after deployment. If you lose it:
1. Go back to the Apps Script editor
2. Click the deployment dropdown
3. Copy the latest webapp URL

**Important**: Keep this URL secure and share only with authorized faculty members.

---

## 🚀 Running the Project

### Using VS Code Live Server

1. **Install Live Server Extension** (if not already installed)
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Search for "Live Server"
   - Install by Ritwick Dey

2. **Start Live Server**
   - Right-click on `index.html`
   - Select "Open with Live Server"
   - Browser will open at `http://127.0.0.1:5500`

3. **Navigate the Application**
   - Start at the home page
   - Sign up or login
   - Access your role-specific dashboard

### Using Python Simple Server

```bash
cd /path/to/project
python -m http.server 8000
```

Then visit `http://localhost:8000`

### Using Node.js http-server

```bash
npm install -g http-server
cd /path/to/project
http-server
```

---

## 👥 User Guide

### For Students

1. **Sign Up**
   - Click "Sign Up"
   - Fill in details (Name, Email, Password)
   - Select role as "Student"
   - Choose your semester and branch
   - Click "Sign Up"

2. **Submit Feedback**
   - Login with your credentials
   - You'll see subjects for your semester
   - Click "Give Feedback" button
   - Feedback form opens in new tab
   - Fill all questions (1-5 scale)
   - Submit the form
   - Status will change to "Feedback Submitted"
   - Only one submission per subject is allowed

### For Faculty

1. **Sign Up**
   - Click "Sign Up"
   - Fill in details
   - Select role as "Faculty"
   - Choose your semester
   - Click "Sign Up"

2. **Create Feedback Forms**
   - Login to faculty dashboard
   - Enter subject name (e.g., "Data Structures")
   - Select semester
   - Paste Google Apps Script URL
   - Click "Create Form"
   - System will generate both form and sheet automatically
   - Links are saved and displayed in your dashboard

3. **View Feedback**
   - Click "View Sheet" to see responses
   - Click "Open Form" to edit the form
   - Click "Download" to get report as CSV

4. **Manage Forms**
   - Click "Delete" to remove a form
   - You can regenerate it anytime

### For Admin

1. **Sign Up**
   - Create account with role "Admin"
   - (Note: First admin can only be created via Firebase Console or email registration)

2. **Manage System**
   - **Subjects Tab**: View all subjects, download reports, delete subjects
   - **Users Tab**: View all registered users, delete users if needed
   - Access all Google Sheets for reporting

---

## 🔐 Security Considerations

1. **Firebase Rules**: Update security rules for production
2. **Google Apps Script**: Change execution permissions as needed
3. **Admin Access**: Restrict admin account creation
4. **Password Policy**: Enforce strong passwords
5. **Data Privacy**: Ensure compliance with local regulations

---

## 🐛 Troubleshooting

### Firebase Not Initializing

**Problem**: "Firebase SDK not loaded" in console

**Solution**:
1. Verify Firebase SDK scripts are in HTML `<head>`
2. Check internet connection
3. Verify Firebase config values are correct
4. Check browser console for specific errors

### Google Form Not Creating

**Problem**: Form creation fails

**Solution**:
1. Verify Apps Script URL is correct and deployed
2. Check that Apps Script execution permission is set to "Anyone"
3. Verify subject and semester are filled
4. Check browser console for error messages
5. Try deploying a new version of Apps Script

### Login Not Working

**Problem**: "User not found" or "Wrong password"

**Solution**:
1. Ensure you signed up first
2. Check email spelling
3. Password is case-sensitive
4. Verify Firebase is initialized
5. Check Firestore database connection

### Forms Not Showing for Students

**Problem**: Student dashboard shows "No subjects available"

**Solution**:
1. Verify student's semester matches subject semester
2. Faculty must have created subjects for that semester
3. Check Firestore subjects collection has data
4. Verify security rules allow student read access

### Feedback Submission Recording Issue

**Problem**: Status shows "Pending" after submission

**Solution**:
1. The form still opens (that's correct)
2. Wait 2-3 seconds for status to update
3. Refresh the page to see updated status
4. Check Firestore feedback_submissions collection for your entry

### Google Sheet Not Linked

**Problem**: Responses not appearing in sheet

**Solution**:
1. Verify form was created successfully
2. Check that sheet link is valid
3. In Apps Script, form responses should auto-collect
4. Wait 1-2 minutes after first submission
5. Refresh the sheet to see new responses

---

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Google Apps Script Guide](https://developers.google.com/apps-script/guides)
- [HTML/CSS/JavaScript Tutorial](https://www.freecodecamp.org)

---

## 📞 Support

For issues or questions:

1. Check the troubleshooting section
2. Review browser console for error messages
3. Check Firestore and Firebase Console logs
4. Review Apps Script execution logs

---

## 📄 License

This project is provided as-is for educational purposes.

---

## ✅ Checklist Before Production

- [ ] Update Firebase security rules
- [ ] Verify all user roles are working
- [ ] Test form creation with sample subject
- [ ] Test feedback submission flow
- [ ] Test admin dashboard (view, download, delete)
- [ ] Set up Google Drive folder organization
- [ ] Create backup of Firestore data
- [ ] Test on multiple browsers
- [ ] Document any custom modifications
- [ ] Train faculty and admin users

---

**Version**: 1.0  
**Last Updated**: April 2026  
**Status**: Production Ready
