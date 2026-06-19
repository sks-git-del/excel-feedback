# 🔐 TEST CREDENTIALS & SETUP DATA

## Quick Reference - Copy & Paste these credentials

### Admin Account (Full System Access)

```
📧 Email: admin@feedback.com
🔑 Password: Admin123
📋 Role: Admin
```

### Faculty Accounts (Can create forms)

```
Faculty 1:
📧 Email: devi.sir@feedback.com
🔑 Password: Faculty123
👤 Name: Devi Kumar
📚 Semester: 3
🏢 Branch: Computer Science

Faculty 2:
📧 Email: bandana.mohapatra@feedback.com
🔑 Password: Faculty123
👤 Name: Bandana Mohapatra
📚 Semester: 3
🏢 Branch: Computer Science

Faculty 3:
📧 Email: jc.badjena@feedback.com
🔑 Password: Faculty123
👤 Name: J.C. Badjena
📚 Semester: 3
🏢 Branch: Computer Science

Faculty 4:
📧 Email: bikash.patnaik@feedback.com
🔑 Password: Faculty123
👤 Name: Bikash Patnaik
📚 Semester: 3
🏢 Branch: Industrial Safety Engineering

Faculty 5:
📧 Email: simanta.nayak@feedback.com
🔑 Password: Faculty123
👤 Name: Simanta Nayak
📚 Semester: 3
🏢 Branch: Compiler Design
```

### Student Test Accounts (Semester 3)

```
Student 1:
📧 Email: student1@feedback.com
🔑 Password: Student123
👤 Name: Rajesh Kumar
📚 Semester: 3
🏢 Branch: Computer Science

Student 2:
📧 Email: student2@feedback.com
🔑 Password: Student123
👤 Name: Priya Singh
📚 Semester: 3
🏢 Branch: Computer Science

Student 3:
📧 Email: student3@feedback.com
🔑 Password: Student123
👤 Name: Amit Patel
📚 Semester: 3
🏢 Branch: Computer Science

Student 4:
📧 Email: student4@feedback.com
🔑 Password: Student123
👤 Name: Neha Sharma
📚 Semester: 3
🏢 Branch: Computer Science

Student 5:
📧 Email: student5@feedback.com
🔑 Password: Student123
👤 Name: Vikram Das
📚 Semester: 3
🏢 Branch: Industrial Safety Engineering
```

---

## 📝 Subjects to Create

### By Faculty (Database Reference)

**Faculty 1: Devi Kumar**
- Subject 1: Database Management Systems
- Subject 2: Web Development

**Faculty 2: Bandana Mohapatra**
- Subject 1: Deep Learning
- Subject 2: Machine Learning

**Faculty 3: J.C. Badjena**
- Subject 1: Data Mining
- Subject 2: Big Data Analytics

**Faculty 4: Bikash Patnaik**
- Subject 1: Industrial Safety Engineering
- Subject 2: Safety Management Systems

**Faculty 5: Simanta Nayak**
- Subject 1: Compiler Design
- Subject 2: Programming Languages

---

## 🔧 How to Set Up Test Data

### Step 1: Create User Accounts

1. **Open the app** at `http://localhost:5173/login` (or your Live Server URL)
2. **Click "Sign Up"**
3. **For each account above**, fill in:
   - Full Name
   - Email
   - Password
   - Role (Admin/Student/Faculty)
   - Semester
   - Branch
4. **Click "Sign Up"**
5. **You'll be logged in automatically**

### Step 2: Create Subjects (As Faculty)

1. **Login as Faculty** (e.g., `devi.sir@feedback.com`)
2. **Go to Faculty Dashboard**
3. **In "Create New Feedback Form" section:**
   - Subject Name: "Database Management Systems"
   - Semester: 3
   - Google Apps Script URL: [Paste your deployed Apps Script URL]
   - Click "Create Form"
4. **Repeat for all subjects**

### Step 3: Submit Test Feedback (As Students)

1. **Login as Student** (e.g., `student1@feedback.com`)
2. **Go to Student Dashboard**
3. **See the subjects created by faculty**
4. **Click "Give Feedback"**
5. **Google Form opens** - fill all 12 questions with ratings from 1-5
6. **Submit the form**
7. **Status changes to "Feedback Submitted"**
8. **Repeat with different students and subjects**

---

## 📊 20 Sample Feedback Responses (For Reference)

These are example feedback ratings (1-5 scale) for testing:

### Response 1: High Rating (Excellent Faculty)
```
Q1. Covered entire syllabus: 5
Q2. Topics beyond syllabus: 5
Q3. Technical Content: 5
Q4. Communication Skills: 5
Q5. Use of Teaching Aids: 4
Q6. Pace of teaching: 5
Q7. Motivation: 5
Q8. Practical Demonstration: 5
Q9. Hands-on Training: 4
Q10. Clarity of expectations: 5
Q11. Feedback on progress: 5
Q12. Help & support: 5
```

### Response 2: Good Rating
```
Q1: 4, Q2: 4, Q3: 4, Q4: 4, Q5: 3, Q6: 4, 
Q7: 4, Q8: 4, Q9: 3, Q10: 4, Q11: 4, Q12: 4
```

### Response 3: Average Rating
```
Q1: 3, Q2: 3, Q3: 3, Q4: 3, Q5: 2, Q6: 3, 
Q7: 3, Q8: 2, Q9: 2, Q10: 3, Q11: 3, Q12: 3
```

### Response 4: Mixed Feedback
```
Q1: 4, Q2: 2, Q3: 3, Q4: 5, Q5: 3, Q6: 2, 
Q7: 4, Q8: 3, Q9: 2, Q10: 4, Q11: 3, Q12: 4
```

### Response 5: Needs Improvement
```
Q1: 2, Q2: 2, Q3: 2, Q4: 3, Q5: 2, Q6: 2, 
Q7: 2, Q8: 1, Q9: 2, Q10: 2, Q11: 2, Q12: 3
```

### Response 6: Good with Comments
```
Q1: 4, Q2: 4, Q3: 4, Q4: 4, Q5: 3, Q6: 4
Q7: 4, Q8: 4, Q9: 3, Q10: 4, Q11: 4, Q12: 4
Comments: "The subject was well taught. Could have more practical examples."
```

### Response 7: Excellent Faculty
```
Q1: 5, Q2: 5, Q3: 5, Q4: 5, Q5: 4, Q6: 5
Q7: 5, Q8: 5, Q9: 4, Q10: 5, Q11: 5, Q12: 5
Comments: "Outstanding teacher. Very helpful and approachable."
```

### Response 8: Average with Suggestions
```
Q1: 3, Q2: 3, Q3: 3, Q4: 3, Q5: 2, Q6: 3
Q7: 3, Q8: 2, Q9: 2, Q10: 3, Q11: 3, Q12: 3
Comments: "Need more examples and discussions in class."
```

### Response 9: Good Overall
```
Q1: 4, Q2: 3, Q3: 4, Q4: 4, Q5: 4, Q6: 4
Q7: 4, Q8: 3, Q9: 3, Q10: 4, Q11: 4, Q12: 4
```

### Response 10: Very Good
```
Q1: 5, Q2: 4, Q3: 4, Q4: 4, Q5: 4, Q6: 4
Q7: 4, Q8: 4, Q9: 4, Q10: 4, Q11: 4, Q12: 5
```

### Response 11: Excellent
```
Q1: 5, Q2: 5, Q3: 5, Q4: 5, Q5: 5, Q6: 5
Q7: 5, Q8: 5, Q9: 5, Q10: 5, Q11: 5, Q12: 5
```

### Response 12: Good
```
Q1: 4, Q2: 4, Q3: 4, Q4: 4, Q5: 3, Q6: 4
Q7: 4, Q8: 3, Q9: 3, Q10: 4, Q11: 4, Q12: 4
```

### Response 13: Average
```
Q1: 3, Q2: 3, Q3: 3, Q4: 3, Q5: 3, Q6: 3
Q7: 3, Q8: 3, Q9: 2, Q10: 3, Q11: 3, Q12: 3
```

### Response 14: Fair
```
Q1: 3, Q2: 2, Q3: 3, Q4: 2, Q5: 2, Q6: 2
Q7: 3, Q8: 2, Q9: 2, Q10: 3, Q11: 2, Q12: 3
```

### Response 15: Good
```
Q1: 4, Q2: 4, Q3: 4, Q4: 4, Q5: 4, Q6: 4
Q7: 4, Q8: 4, Q9: 3, Q10: 4, Q11: 4, Q12: 4
```

### Response 16: Very Good
```
Q1: 4, Q2: 4, Q3: 5, Q4: 4, Q5: 3, Q6: 4
Q7: 4, Q8: 4, Q9: 4, Q10: 4, Q11: 4, Q12: 4
```

### Response 17: Excellent
```
Q1: 5, Q2: 5, Q3: 5, Q4: 5, Q5: 4, Q6: 5
Q7: 5, Q8: 5, Q9: 4, Q10: 5, Q11: 5, Q12: 5
```

### Response 18: Good with Notes
```
Q1: 4, Q2: 4, Q3: 4, Q4: 4, Q5: 3, Q6: 4
Q7: 4, Q8: 3, Q9: 3, Q10: 4, Q11: 4, Q12: 4
Comments: "Good teaching method but needs improvement in practical sessions."
```

### Response 19: Very Good
```
Q1: 4, Q2: 4, Q3: 4, Q4: 4, Q5: 4, Q6: 4
Q7: 4, Q8: 4, Q9: 4, Q10: 4, Q11: 4, Q12: 4
```

### Response 20: Excellent Overall
```
Q1: 5, Q2: 5, Q3: 5, Q4: 5, Q5: 4, Q6: 5
Q7: 5, Q8: 5, Q9: 5, Q10: 5, Q11: 5, Q12: 5
Comments: "Best teacher in the department. Keep up the good work!"
```

---

## 🧪 Testing Workflow

### Test 1: Admin Workflow
```
1. Login as admin@feedback.com / Admin123
2. Go to Admin Dashboard
3. See all subjects
4. View all users
5. Test download functionality
6. Test delete operations (optional)
```

### Test 2: Faculty Workflow
```
1. Login as devi.sir@feedback.com / Faculty123
2. Create subjects (5+ subjects)
3. For each subject:
   - Click "Open Form" → Opens Google Form
   - Click "View Sheet" → Shows responses
   - Click "Download" → Gets CSV report
```

### Test 3: Student Workflow
```
1. Login as student1@feedback.com / Student123
2. See all semester 3 subjects
3. For each subject:
   - Click "Give Feedback"
   - Fill all 12 questions (use Response 1-20 templates)
   - Submit
   - Status changes to "Feedback Submitted"
4. Try same subject again → Button disabled
```

### Test 4: Multi-User Scenario
```
1. Login/Logout with different users
2. Verify correct data for each role
3. Test cross-role permissions
4. Verify subject filtering by semester
```

---

## 💾 Database Structure After Setup

```
Firestore Database:

users/
├── admin@feedback.com
│   ├── role: "admin"
│   ├── name: "Admin User"
│   └── email: "admin@feedback.com"
├── devi.sir@feedback.com
│   ├── role: "faculty"
│   ├── name: "Devi Kumar"
│   ├── semester: "3"
│   └── branch: "Computer Science"
└── student1@feedback.com
    ├── role: "student"
    ├── name: "Rajesh Kumar"
    ├── semester: "3"
    └── branch: "Computer Science"

subjects/
├── subject_1
│   ├── subject_name: "Database Management Systems"
│   ├── faculty_id: "devi.sir@feedback.com"
│   ├── faculty_name: "Devi Kumar"
│   ├── semester: "3"
│   ├── form_link: "https://forms.google.com/..."
│   └── sheet_link: "https://sheets.google.com/..."
└── subject_2
    ├── subject_name: "Deep Learning"
    ├── faculty_id: "bandana.mohapatra@feedback.com"
    └── ...

feedback_submissions/
├── submission_1
│   ├── student_email: "student1@feedback.com"
│   ├── subject_id: "subject_1"
│   ├── submitted: true
│   └── timestamp: "2026-04-13T10:30:00Z"
└── ...
```

---

## ⚡ Quick Commands

### Run the app:
```bash
cd "c:\Users\asus\OneDrive\Dokumen\excel feedback"
# Then right-click index.html → Open with Live Server
```

### Test URLs:
```
Login: http://localhost:5173/login
Signup: http://localhost:5173/signup
```

---

## ✅ Verification Checklist

- [ ] All admin account created and working
- [ ] All faculty accounts created and working
- [ ] All student accounts created
- [ ] 5+ subjects created by different faculty
- [ ] 20 feedback responses submitted
- [ ] Admin can view all subjects and users
- [ ] Faculty can see their subjects
- [ ] Students can only see semester 3 subjects
- [ ] One response per student per subject enforced
- [ ] Reports downloadable

---

## 🔗 Important URLs

**After Setup:**

1. **Admin Dashboard**
   - Login: `admin@feedback.com` / `Admin123`
   - View: All subjects, all users

2. **Faculty Dashboard**
   - Login: `devi.sir@feedback.com` / `Faculty123`
   - View: Their created subjects

3. **Student Dashboard**
   - Login: `student1@feedback.com` / `Student123`
   - View: Semester 3 subjects only

---

**Status**: ✅ Ready to Set Up
**Version**: 1.0
**Date**: April 2026
