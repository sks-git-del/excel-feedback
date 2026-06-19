# 🚀 STEP-BY-STEP TESTING SETUP GUIDE

Complete guide to set up your system with test data and run all tests.

---

## ⏰ Total Setup Time: 30-45 minutes

---

## 🎯 Step 1: Start the Application (5 minutes)

### 1.1 Open the project
```bash
cd "c:\Users\asus\OneDrive\Dokumen\excel feedback"
```

### 1.2 Launch Live Server
1. Open the folder in **VS Code**
2. Right-click on `index.html`
3. Select **"Open with Live Server"**
4. Browser opens at: `http://localhost:5173` or similar

### 1.3 Verify it loads
- You should see the landing page with "Login" and "Sign Up" buttons
- If Firebase error → Check HTML files for correct credentials

---

## 🔐 Step 2: Create Test User Accounts (15 minutes)

### 2.1 Create Admin Account

1. Click **"Sign Up"**
2. Fill form:
   ```
   Name: Admin User
   Email: admin@feedback.com
   Password: Admin123
   Role: Admin
   ```
3. Click **"Sign Up"** → You'll be logged in automatically
4. You'll redirect to Admin Dashboard

### 2.2 Create Faculty Accounts

**Logout first** (click Logout button)

Then create 5 faculty accounts, one by one:

**Faculty 1:**
```
Name: Devi Kumar
Email: devi.sir@feedback.com
Password: Faculty123
Role: Faculty
Semester: 3
Branch: Computer Science
```

**Faculty 2:**
```
Name: Bandana Mohapatra
Email: bandana.mohapatra@feedback.com
Password: Faculty123
Role: Faculty
Semester: 3
Branch: Computer Science
```

**Faculty 3:**
```
Name: J.C. Badjena
Email: jc.badjena@feedback.com
Password: Faculty123
Role: Faculty
Semester: 3
Branch: Computer Science
```

**Faculty 4:**
```
Name: Bikash Patnaik
Email: bikash.patnaik@feedback.com
Password: Faculty123
Role: Faculty
Semester: 3
Branch: Industrial Safety Engineering
```

**Faculty 5:**
```
Name: Simanta Nayak
Email: simanta.nayak@feedback.com
Password: Faculty123
Role: Faculty
Semester: 3
Branch: Compiler Design
```

### 2.3 Create Student Accounts

Following same signup process, create 5 student accounts:

**Student 1:**
```
Name: Rajesh Kumar
Email: student1@feedback.com
Password: Student123
Role: Student
Semester: 3
Branch: Computer Science
```

**Student 2:**
```
Name: Priya Singh
Email: student2@feedback.com
Password: Student123
Role: Student
Semester: 3
Branch: Computer Science
```

**Student 3:**
```
Name: Amit Patel
Email: student3@feedback.com
Password: Student123
Role: Student
Semester: 3
Branch: Computer Science
```

**Student 4:**
```
Name: Neha Sharma
Email: student4@feedback.com
Password: Student123
Role: Student
Semester: 3
Branch: Computer Science
```

**Student 5:**
```
Name: Vikram Das
Email: student5@feedback.com
Password: Student123
Role: Student
Semester: 3
Branch: Industrial Safety Engineering
```

---

## 📚 Step 3: Create Subjects (10 minutes)

**Note: You need Google Apps Script URL first!**

### 3.1 Get Apps Script URL

1. Go to [script.google.com](https://script.google.com)
2. Create new project → Name it "Feedback System"
3. Paste code from `apps-script/code.gs`
4. Click **Deploy** → **New deployment** → **Web app**
5. Copy the URL (looks like): 
   ```
   https://script.google.com/macros/d/YOUR_ID/usercopy
   ```

### 3.2 Login as Faculty and Create Subjects

**Login as Faculty 1:** `devi.sir@feedback.com` / `Faculty123`

1. Go to Faculty Dashboard
2. Fill "Create New Feedback Form":
   ```
   Subject Name: Database Management Systems
   Semester: 3
   Apps Script URL: [Paste your URL]
   ```
3. Click **"Create Form"** → Wait for success message
4. Repeat for second subject:
   ```
   Subject Name: Web Development
   Semester: 3
   ```

Do same for other faculty members:

**Faculty 2 (Deep Learning, Machine Learning)**
**Faculty 3 (Data Mining, Big Data Analytics)**
**Faculty 4 (Industrial Safety, Safety Management)**
**Faculty 5 (Compiler Design, Programming Languages)**

---

## 📋 Step 4: Submit Test Feedback (10 minutes)

### 4.1 Login as Student

**Logout** → Login as: `student1@feedback.com` / `Student123`

### 4.2 Submit Feedback

1. On Student Dashboard, see all Semester 3 subjects
2. For each subject:
   - Click **"Give Feedback"** button
   - Google Form opens in new tab
   - **Fill 12 questions** using ratings from `SAMPLE_FEEDBACK_RESPONSES.md`
   - Example Response 1 format:
     ```
     Q1: 5, Q2: 5, Q3: 5, Q4: 5, Q5: 4
     Q6: 5, Q7: 5, Q8: 5, Q9: 4, Q10: 5
     Q11: 5, Q12: 5
     ```
   - Submit form
   - Close tab
   - Back to dashboard → Button changes to "Already Submitted"

### 4.3 Test with Other Students

**Logout** → Login as other students (2-5) and repeat feedback submission with different ratings (use Responses 2-20)

---

## ✅ Step 5: Verify Data (5 minutes)

### 5.1 Check as Admin

**Login as:** `admin@feedback.com` / `Admin123`

Verify in Admin Dashboard:
- [ ] All subjects visible
- [ ] All users listed
- [ ] Feedback counts showing

### 5.2 Check as Faculty

**Login as:** `devi.sir@feedback.com` / `Faculty123`

Verify in Faculty Dashboard:
- [ ] Only your subjects shown
- [ ] Can open forms
- [ ] Can view sheets
- [ ] Can download reports

### 5.3 Check as Student

**Login as:** `student1@feedback.com` / `Student123`

Verify in Student Dashboard:
- [ ] Only Semester 3 subjects shown
- [ ] Buttons changed to "Already Submitted"
- [ ] Cannot submit again

---

## 🧪 Step 6: Run Tests (10 minutes)

### Test 1: Role-Based Access
```
✓ Admin can see everything
✓ Faculty can only see their subjects
✓ Students see only their semester
✓ Login/logout works
```

### Test 2: Feedback Submission
```
✓ Student can submit once per subject
✓ Button disables after submission
✓ Form opens correctly
✓ Multiple students can submit same subject
```

### Test 3: Data Persistence
```
✓ Data saved in Firestore
✓ Refreshing page keeps data
✓ Can logout and login — data still there
```

### Test 4: UI Responsiveness
```
✓ Works on desktop
✓ Works on mobile view
✓ Buttons responding correctly
✓ Messages displaying properly
```

---

## 📊 Quick Reference: Test Data Summary

```
ACCOUNTS:
- 1 Admin
- 5 Faculty members
- 5 Student members

SUBJECTS:
- 10 subjects total
- 2 per faculty
- All Semester 3

FEEDBACK:
- 20 sample responses
- Various rating patterns
- Distributed across all subjects
```

---

## 🎯 Expected Results

After completing all steps:

**Firestore should contain:**
- ✅ 11 user accounts
- ✅ 10 subjects
- ✅ 20+ feedback submissions
- ✅ Form links (from Apps Script)
- ✅ Sheet links (from Apps Script)

**Dashboards should show:**
- ✅ Admin: All subjects + all users
- ✅ Faculty: Only their subjects
- ✅ Student: Only Semester 3 subjects

**Forms should:**
- ✅ Collect 20 feedback responses
- ✅ Appear in Google Sheets
- ✅ Show email addresses
- ✅ Enforce one response per user

---

## 🆘 Troubleshooting During Setup

### Issue: "Firebase SDK not loaded"
```
Solution: Check HTML <head> has Firebase scripts
```

### Issue: Account creation fails
```
Solution: Check email not already used
          Verify password is 6+ characters
```

### Issue: Form creation fails
```
Solution: Verify Apps Script URL is correct
          Check Apps Script is deployed
          Check semester matches subject
```

### Issue: Can't see subjects as student
```
Solution: Make sure you created subjects first
          Check student semester = subject semester
          Refresh the page
```

### Issue: Feedback button not responding
```
Solution: Verify Google Form link is valid
          Check browser console for errors
          Try in incognito window
```

---

## 📝 Testing Checklist

- [ ] All 11 accounts created
- [ ] All 10 subjects created
- [ ] All 20 feedback responses submitted
- [ ] Admin dashboard working
- [ ] Faculty dashboard working
- [ ] Student dashboard working
- [ ] One-response-per-subject enforced
- [ ] Data persisting (logout/login)
- [ ] All buttons responding
- [ ] Error handling working
- [ ] Mobile responsive tested
- [ ] Reports downloadable
- [ ] Firestore has correct data

---

## 🚀 Next Steps After Testing

1. **If everything works:**
   - Congratulations! System is ready
   - Can now deploy to production
   - Follow `DEPLOYMENT_CHECKLIST.md`

2. **If issues found:**
   - Check browser console (F12)
   - Review error messages
   - Check Firestore rules
   - Re-read `README.md` troubleshooting

---

## ⏱️ Time Breakdown

```
Step 1: Start app         5 minutes
Step 2: Create accounts  15 minutes
Step 3: Create subjects   10 minutes
Step 4: Submit feedback  10 minutes
Step 5: Verify data       5 minutes
Step 6: Run tests        10 minutes
        ─────────────────────────────
        TOTAL           45-55 minutes
```

---

## 📱 Testing on Mobile

To test mobile responsiveness:

1. With Live Server running, get your IP:
   ```
   Open terminal → ipconfig
   Look for IPv4 Address (e.g., 192.168.x.x)
   ```

2. On phone, visit:
   ```
   http://YOUR_IP:5173
   ```

3. Verify:
   - Layout responsive
   - Buttons clickable
   - Forms readable
   - Navigation working

---

**Status**: ✅ Ready to Execute
**Version**: 1.0
**Estimated Time**: 45-55 minutes
**Difficulty**: Beginner-Friendly
