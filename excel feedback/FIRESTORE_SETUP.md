# 📚 FIRESTORE DATA IMPORT GUIDE

Use this guide to directly import test data into Firestore instead of signing up manually.

---

## 🚀 Option 1: Manual Creation via Firebase Console (Simplest)

### Users Collection

Go to **Firestore Database** → **Collections** → Create collection `users`

**Document 1: Admin**
```
Document ID: admin@feedback.com
Fields:
- id: "admin@feedback.com"
- name: "Admin User"
- email: "admin@feedback.com"
- role: "admin"
- semester: "" (empty for admin)
- branch: "" (empty for admin)
- createdAt: "2026-04-13T08:00:00.000Z"
```

**Document 2: Faculty 1**
```
Document ID: devi.sir@feedback.com
Fields:
- id: "devi.sir@feedback.com"
- name: "Devi Kumar"
- email: "devi.sir@feedback.com"
- role: "faculty"
- semester: "3"
- branch: "Computer Science"
- createdAt: "2026-04-13T08:10:00.000Z"
```

**Document 3: Faculty 2**
```
Document ID: bandana.mohapatra@feedback.com
Fields:
- id: "bandana.mohapatra@feedback.com"
- name: "Bandana Mohapatra"
- email: "bandana.mohapatra@feedback.com"
- role: "faculty"
- semester: "3"
- branch: "Computer Science"
- createdAt: "2026-04-13T08:20:00.000Z"
```

**Document 4: Faculty 3**
```
Document ID: jc.badjena@feedback.com
Fields:
- id: "jc.badjena@feedback.com"
- name: "J.C. Badjena"
- email: "jc.badjena@feedback.com"
- role: "faculty"
- semester: "3"
- branch: "Computer Science"
- createdAt: "2026-04-13T08:30:00.000Z"
```

**Document 5: Faculty 4**
```
Document ID: bikash.patnaik@feedback.com
Fields:
- id: "bikash.patnaik@feedback.com"
- name: "Bikash Patnaik"
- email: "bikash.patnaik@feedback.com"
- role: "faculty"
- semester: "3"
- branch: "Industrial Safety Engineering"
- createdAt: "2026-04-13T08:40:00.000Z"
```

**Document 6: Faculty 5**
```
Document ID: simanta.nayak@feedback.com
Fields:
- id: "simanta.nayak@feedback.com"
- name: "Simanta Nayak"
- email: "simanta.nayak@feedback.com"
- role: "faculty"
- semester: "3"
- branch: "Compiler Design"
- createdAt: "2026-04-13T08:50:00.000Z"
```

**Document 7: Student 1**
```
Document ID: student1@feedback.com
Fields:
- id: "student1@feedback.com"
- name: "Rajesh Kumar"
- email: "student1@feedback.com"
- role: "student"
- semester: "3"
- branch: "Computer Science"
- createdAt: "2026-04-13T09:00:00.000Z"
```

**Document 8: Student 2**
```
Document ID: student2@feedback.com
Fields:
- id: "student2@feedback.com"
- name: "Priya Singh"
- email: "student2@feedback.com"
- role: "student"
- semester: "3"
- branch: "Computer Science"
- createdAt: "2026-04-13T09:10:00.000Z"
```

**Document 9: Student 3**
```
Document ID: student3@feedback.com
Fields:
- id: "student3@feedback.com"
- name: "Amit Patel"
- email: "student3@feedback.com"
- role: "student"
- semester: "3"
- branch: "Computer Science"
- createdAt: "2026-04-13T09:20:00.000Z"
```

**Document 10: Student 4**
```
Document ID: student4@feedback.com
Fields:
- id: "student4@feedback.com"
- name: "Neha Sharma"
- email: "student4@feedback.com"
- role: "student"
- semester: "3"
- branch: "Computer Science"
- createdAt: "2026-04-13T09:30:00.000Z"
```

**Document 11: Student 5**
```
Document ID: student5@feedback.com
Fields:
- id: "student5@feedback.com"
- name: "Vikram Das"
- email: "student5@feedback.com"
- role: "student"
- semester: "3"
- branch: "Industrial Safety Engineering"
- createdAt: "2026-04-13T09:40:00.000Z"
```

---

## 📚 Subjects Collection

Create collection `subjects`

**Document 1: Database Management Systems**
```
Document ID: auto-generated
Fields:
- subject_name: "Database Management Systems"
- semester: "3"
- faculty_id: "devi.sir@feedback.com"
- faculty_name: "Devi Kumar"
- form_link: "https://forms.google.com/example1" (after Apps Script)
- sheet_link: "https://sheets.google.com/example1" (after Apps Script)
- createdAt: "2026-04-13T10:00:00.000Z"
- status: "active"
```

**Document 2: Web Development**
```
Document ID: auto-generated
Fields:
- subject_name: "Web Development"
- semester: "3"
- faculty_id: "devi.sir@feedback.com"
- faculty_name: "Devi Kumar"
- form_link: "https://forms.google.com/example2"
- sheet_link: "https://sheets.google.com/example2"
- createdAt: "2026-04-13T10:05:00.000Z"
- status: "active"
```

**Document 3: Deep Learning**
```
Document ID: auto-generated
Fields:
- subject_name: "Deep Learning"
- semester: "3"
- faculty_id: "bandana.mohapatra@feedback.com"
- faculty_name: "Bandana Mohapatra"
- form_link: "https://forms.google.com/example3"
- sheet_link: "https://sheets.google.com/example3"
- createdAt: "2026-04-13T10:10:00.000Z"
- status: "active"
```

**Document 4: Machine Learning**
```
Document ID: auto-generated
Fields:
- subject_name: "Machine Learning"
- semester: "3"
- faculty_id: "bandana.mohapatra@feedback.com"
- faculty_name: "Bandana Mohapatra"
- form_link: "https://forms.google.com/example4"
- sheet_link: "https://sheets.google.com/example4"
- createdAt: "2026-04-13T10:15:00.000Z"
- status: "active"
```

**Document 5: Data Mining**
```
Document ID: auto-generated
Fields:
- subject_name: "Data Mining"
- semester: "3"
- faculty_id: "jc.badjena@feedback.com"
- faculty_name: "J.C. Badjena"
- form_link: "https://forms.google.com/example5"
- sheet_link: "https://sheets.google.com/example5"
- createdAt: "2026-04-13T10:20:00.000Z"
- status: "active"
```

**Document 6: Big Data Analytics**
```
Document ID: auto-generated
Fields:
- subject_name: "Big Data Analytics"
- semester: "3"
- faculty_id: "jc.badjena@feedback.com"
- faculty_name: "J.C. Badjena"
- form_link: "https://forms.google.com/example6"
- sheet_link: "https://sheets.google.com/example6"
- createdAt: "2026-04-13T10:25:00.000Z"
- status: "active"
```

**Document 7: Industrial Safety Engineering**
```
Document ID: auto-generated
Fields:
- subject_name: "Industrial Safety Engineering"
- semester: "3"
- faculty_id: "bikash.patnaik@feedback.com"
- faculty_name: "Bikash Patnaik"
- form_link: "https://forms.google.com/example7"
- sheet_link: "https://sheets.google.com/example7"
- createdAt: "2026-04-13T10:30:00.000Z"
- status: "active"
```

**Document 8: Safety Management Systems**
```
Document ID: auto-generated
Fields:
- subject_name: "Safety Management Systems"
- semester: "3"
- faculty_id: "bikash.patnaik@feedback.com"
- faculty_name: "Bikash Patnaik"
- form_link: "https://forms.google.com/example8"
- sheet_link: "https://sheets.google.com/example8"
- createdAt: "2026-04-13T10:35:00.000Z"
- status: "active"
```

**Document 9: Compiler Design**
```
Document ID: auto-generated
Fields:
- subject_name: "Compiler Design"
- semester: "3"
- faculty_id: "simanta.nayak@feedback.com"
- faculty_name: "Simanta Nayak"
- form_link: "https://forms.google.com/example9"
- sheet_link: "https://sheets.google.com/example9"
- createdAt: "2026-04-13T10:40:00.000Z"
- status: "active"
```

**Document 10: Programming Languages**
```
Document ID: auto-generated
Fields:
- subject_name: "Programming Languages"
- semester: "3"
- faculty_id: "simanta.nayak@feedback.com"
- faculty_name: "Simanta Nayak"
- form_link: "https://forms.google.com/example10"
- sheet_link: "https://sheets.google.com/example10"
- createdAt: "2026-04-13T10:45:00.000Z"
- status: "active"
```

---

## 📝 Feedback Submissions Collection

Create collection `feedback_submissions`

**Document 1:**
```
Document ID: auto-generated
Fields:
- student_email: "student1@feedback.com"
- subject_id: "1" (Database Management Systems)
- submitted: true
- timestamp: "2026-04-13T11:00:00.000Z"
```

**Document 2:**
```
Document ID: auto-generated
Fields:
- student_email: "student1@feedback.com"
- subject_id: "2" (Web Development)
- submitted: true
- timestamp: "2026-04-13T11:05:00.000Z"
```

**Document 3:**
```
Document ID: auto-generated
Fields:
- student_email: "student2@feedback.com"
- subject_id: "1" (Database Management Systems)
- submitted: true
- timestamp: "2026-04-13T11:10:00.000Z"
```

**Document 4:**
```
Document ID: auto-generated
Fields:
- student_email: "student2@feedback.com"
- subject_id: "3" (Deep Learning)
- submitted: true
- timestamp: "2026-04-13T11:15:00.000Z"
```

**Document 5:**
```
Document ID: auto-generated
Fields:
- student_email: "student3@feedback.com"
- subject_id: "1" (Database Management Systems)
- submitted: true
- timestamp: "2026-04-13T11:20:00.000Z"
```

**Document 6:**
```
Document ID: auto-generated
Fields:
- student_email: "student3@feedback.com"
- subject_id: "4" (Machine Learning)
- submitted: true
- timestamp: "2026-04-13T11:25:00.000Z"
```

**Document 7:**
```
Document ID: auto-generated
Fields:
- student_email: "student4@feedback.com"
- subject_id: "2" (Web Development)
- submitted: true
- timestamp: "2026-04-13T11:30:00.000Z"
```

**Document 8:**
```
Document ID: auto-generated
Fields:
- student_email: "student4@feedback.com"
- subject_id: "5" (Data Mining)
- submitted: true
- timestamp: "2026-04-13T11:35:00.000Z"
```

**Document 9:**
```
Document ID: auto-generated
Fields:
- student_email: "student5@feedback.com"
- subject_id: "7" (Industrial Safety Engineering)
- submitted: true
- timestamp: "2026-04-13T11:40:00.000Z"
```

**Document 10:**
```
Document ID: auto-generated
Fields:
- student_email: "student1@feedback.com"
- subject_id: "3" (Deep Learning)
- submitted: true
- timestamp: "2026-04-13T11:45:00.000Z"
```

**Continue adding more to reach 20+ feedback submissions...**

---

## 🔑 Firebase Authentication Setup

**Important**: You need to create these accounts manually in Firebase Console under Authentication → Users

Go to **Firebase Console** → **Authentication** → **Users** → **Add User**

Create these accounts:
1. `admin@feedback.com` / `Admin123`
2. `devi.sir@feedback.com` / `Faculty123`
3. `bandana.mohapatra@feedback.com` / `Faculty123`
4. `jc.badjena@feedback.com` / `Faculty123`
5. `bikash.patnaik@feedback.com` / `Faculty123`
6. `simanta.nayak@feedback.com` / `Faculty123`
7. `student1@feedback.com` / `Student123`
8. `student2@feedback.com` / `Student123`
9. `student3@feedback.com` / `Student123`
10. `student4@feedback.com` / `Student123`
11. `student5@feedback.com` / `Student123`

---

## ✅ Setup Checklist

- [ ] Create `users` collection in Firestore
- [ ] Add 11 user documents (1 admin + 5 faculty + 5 students)
- [ ] Create `subjects` collection in Firestore
- [ ] Add 10 subject documents
- [ ] Create 11 Firebase Auth accounts
- [ ] Create `feedback_submissions` collection in Firestore
- [ ] Add 20+ feedback submission documents
- [ ] Test login with different accounts
- [ ] Verify data appears in dashboards

---

**Status**: ✅ Ready to Implement
**Version**: 1.0
**Date**: April 2026
