const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

app.use(express.json());
app.use(express.static(__dirname));

// Friendly frontend routes (without .html extension)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'signup.html'));
});

app.get('/dashboard-student', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard-student.html'));
});

app.get('/dashboard-faculty', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard-faculty.html'));
});

app.get('/dashboard-admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard-admin.html'));
});

// Proxy route - shields browser from Apps Script CORS issues
app.post('/api/create-form', async (req, res) => {
  try {
    if (!GOOGLE_SCRIPT_URL) {
      return res.status(500).json({
        success: false,
        message: 'GOOGLE_SCRIPT_URL is not configured. Add it to .env file.'
      });
    }

    const payload = {
      subject: req.body.subjectName || req.body.subject,
      semester: req.body.semester
    };

    if (!payload.subject || !payload.semester) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: subjectName and semester'
      });
    }

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const raw = await response.text();
    let data;

    try {
      data = JSON.parse(raw);
    } catch (parseError) {
      return res.status(502).json({
        success: false,
        message: 'Invalid JSON from Google Script',
        raw
      });
    }

    if (!response.ok || data.success === false) {
      return res.status(response.ok ? 502 : response.status).json({
        success: false,
        message: data.error || data.message || 'Google Script returned an error',
        data
      });
    }

    const normalized = {
      success: typeof data.success === 'boolean' ? data.success : true,
      ...data
    };

    res.status(200).json(normalized);
  } catch (error) {
    console.error('Google Script error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/sheet-summary', async (req, res) => {
  try {
    if (!GOOGLE_SCRIPT_URL) {
      return res.status(500).json({
        success: false,
        message: 'GOOGLE_SCRIPT_URL is not configured. Add it to .env file.'
      });
    }

    const sheetLink = req.body.sheetLink || req.body.sheetId;
    if (!sheetLink) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: sheetLink'
      });
    }

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'getSummary',
        sheetLink
      }),
      redirect: 'follow'
    });

    const raw = await response.text();
    let data;

    try {
      data = JSON.parse(raw);
    } catch (parseError) {
      return res.status(502).json({
        success: false,
        message: 'Invalid JSON from Google Script summary endpoint',
        raw
      });
    }

    if (!response.ok || data.success === false) {
      return res.status(response.ok ? 502 : response.status).json({
        success: false,
        message: data.message || data.error || 'Unable to fetch sheet summary',
        data
      });
    }

    const hasSummaryPayload = Object.prototype.hasOwnProperty.call(data, 'totalResponses') ||
      Object.prototype.hasOwnProperty.call(data, 'averageScore');

    if (!hasSummaryPayload) {
      return res.status(502).json({
        success: false,
        message: 'Apps Script deployment is outdated. Re-deploy the latest code.gs so getSummary action is available.',
        data
      });
    }

    res.status(200).json({ success: true, ...data });
  } catch (error) {
    console.error('Sheet summary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// ADMIN ROUTES (require firebase-admin-config)
// ==========================================

let admin;
try {
  admin = require('./firebase-admin-config');
} catch (err) {
  console.warn('⚠️  Firebase Admin not available. Admin routes will return errors.');
  admin = null;
}

// ✅ Get all users
app.get('/api/admin/users', async (req, res) => {
  try {
    if (!admin) {
      return res.status(500).json({ 
        success: false, 
        message: 'Admin SDK not initialized. Upload service account JSON file.' 
      });
    }
    const snapshot = await admin.firestore().collection('users').get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, users });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Add faculty
app.post('/api/admin/add-faculty', async (req, res) => {
  try {
    if (!admin) {
      return res.status(500).json({ 
        success: false, 
        message: 'Admin SDK not initialized. Upload service account JSON file.' 
      });
    }
    const { fullname, username, email, password, semester, branch, subject } = req.body;
    
    // Validate required fields
    if (!fullname || !email || !password) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Create auth user
    const userRecord = await admin.auth().createUser({ 
      email, 
      password, 
      displayName: fullname 
    });

    // Create Firestore document
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      fullname, 
      username: username || email.split('@')[0], 
      email, 
      semester, 
      branch, 
      subject: subject || '',
      role: 'faculty', 
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, id: userRecord.uid, message: 'Faculty added successfully' });
  } catch (err) {
    console.error('Error adding faculty:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Add student
app.post('/api/admin/add-student', async (req, res) => {
  try {
    if (!admin) {
      return res.status(500).json({ 
        success: false, 
        message: 'Admin SDK not initialized. Upload service account JSON file.' 
      });
    }
    const { fullname, username, email, password, semester, branch } = req.body;
    
    // Validate required fields
    if (!fullname || !email || !password) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Create auth user
    const userRecord = await admin.auth().createUser({ 
      email, 
      password, 
      displayName: fullname 
    });

    // Create Firestore document
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      fullname, 
      username: username || email.split('@')[0], 
      email, 
      semester, 
      branch,
      role: 'student', 
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, id: userRecord.uid, message: 'Student added successfully' });
  } catch (err) {
    console.error('Error adding student:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Remove user (delete from Auth & Firestore)
app.delete('/api/admin/remove-user/:id', async (req, res) => {
  try {
    if (!admin) {
      return res.status(500).json({ 
        success: false, 
        message: 'Admin SDK not initialized. Upload service account JSON file.' 
      });
    }
    
    // Delete from Firebase Auth
    await admin.auth().deleteUser(req.params.id);
    
    // Delete from Firestore
    await admin.firestore().collection('users').doc(req.params.id).delete();
    
    res.json({ success: true, message: 'User removed successfully' });
  } catch (err) {
    console.error('Error removing user:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Assign subject to faculty
app.post('/api/admin/assign-subject', async (req, res) => {
  try {
    if (!admin) {
      return res.status(500).json({ 
        success: false, 
        message: 'Admin SDK not initialized. Upload service account JSON file.' 
      });
    }
    const { facultyId, subjectName, semester } = req.body;
    
    if (!facultyId || !subjectName) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    await admin.firestore().collection('users').doc(facultyId).update({
      subjects: admin.firestore.FieldValue.arrayUnion({ subjectName, semester })
    });

    res.json({ success: true, message: 'Subject assigned successfully' });
  } catch (err) {
    console.error('Error assigning subject:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
