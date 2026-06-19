# System Deployment & Verification Guide

## ✅ Current System Status

### Backend Services
- **Express Server**: Running on `http://localhost:3001`
- **Firebase Admin SDK**: ✅ Initialized
- **Google Apps Script**: ✅ Configured
- **Webhook Endpoint**: ✅ Receiving POST requests

### Network Access
- **Localtunnel**: Active at `https://hungry-memes-deny.loca.lt`
- **Public Webhook URL**: `https://hungry-memes-deny.loca.lt/api/feedback`

### Data Flow Verification
✅ Webhook receives responses: **Working**
✅ Data stored in Firestore: **Working**
✅ Analytics calculations: **Working**
✅ Teaching summary endpoint: **Returning data**

---

## 🔧 Final Configuration Steps

### Step 1: Update Apps Script Webhook URL
**File**: Google Apps Script (code.gs)
**Action**: Set script property

1. Open https://script.google.com
2. Click **Project Settings** ⚙️
3. Under "Script properties", add/update:
   ```
   Property: BACKEND_FEEDBACK_URL
   Value: https://hungry-memes-deny.loca.lt/api/feedback
   ```
4. Click **Save**

### Step 2: Redeploy Apps Script
1. Click **Deploy** (top right)
2. Select **Manage deployments**
3. Click edit icon on webapp deployment
4. Click **Create new version**
5. Click **Deploy**
6. **Copy the new Web App URL** that appears

### Step 3: Update Backend .env
**File**: `.env`

Update `GOOGLE_SCRIPT_URL` with the new deployment URL:
```
GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/[YOUR_NEW_SCRIPT_ID]/usercontent
PORT=3001
```

### Step 4: Restart Backend
```powershell
taskkill /IM node.exe /F
npm start
```

---

## 🧪 Testing the Complete Flow

### Test 1: Verify Webhook Accepts Data
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method GET | ConvertTo-Json
# Should return: success: true, firebaseReady: true, googleScriptConfigured: true
```

### Test 2: Check Analytics Data
1. Go to: `http://localhost:3001/dashboard-faculty.html`
2. Select a subject
3. Click **Overview** tab
4. You should see:
   - Summary statistics cards (Teaching avg, CO %, Gap frequency)
   - Problem areas and strengths
   - Bar chart for teaching feedback
   - Individual question scores
   - Pie chart for CO attainment
   - Bar chart for gap analysis

### Test 3: Student Submission Flow
1. Go to: `http://localhost:3001/dashboard-student.html`
2. Fill out and submit a feedback form
3. Wait 2-3 seconds for webhook to process
4. Go back to Faculty Dashboard
5. Refresh the page
6. Overview should now show response data and charts

---

## 📊 Expected Dashboard Features

### Student Dashboard
- Subject cards showing completion status
- Forms for teaching feedback, CO attainment, gap analysis
- View/submit/status tracking

### Faculty Dashboard - Overview Tab (NEW!)
- **Summary Statistics**: 
  - Teaching feedback average (0-5)
  - CO attainment percentage
  - Gap analysis frequency
  - Priority issues count
  
- **Problem Areas & Strengths**:
  - Red tags for questions scoring <3.0
  - Green tags for questions scoring ≥4.0
  
- **Detailed Breakdowns**:
  - All 12 question individual scores
  - CO1-CO12 attainment percentages
  - Gap frequency per category
  
- **Visual Charts**:
  - Teaching feedback bar chart (color-coded by score)
  - CO attainment pie chart
  - Gap analysis frequency bar chart

### Faculty Dashboard - Other Tabs
- **Responses**: Raw submission data table
- **CO Attainment**: CO-specific analysis
- **Curricular Gap**: Gap-specific analysis

---

## 🔍 Troubleshooting

### Responses Not Appearing?
1. Check Apps Script Executions:
   - Go to https://script.google.com
   - View → Executions
   - Look for POST request failures (red X)

2. Verify webhook URL:
   - Apps Script property value contains correct tunnel URL
   - Backend .env contains correct Apps Script URL

3. Check tunnel is active:
   - Terminal should show: "your url is: https://..."
   - Keep terminal running

### Tunnel URL Changes?
- Each time you restart localtunnel, you get a new URL
- Update Apps Script property again
- Redeploy a new version
- Restart backend

### No Data in Analytics?
- Ensure teaching form has exactly 12 questions (Q1-Q12)
- Student responses must have numeric values (1-5)
- Wait 2-3 seconds for webhook to process after form submission

---

## 📱 Access URLs

| Page | URL |
|------|-----|
| Student Dashboard | http://localhost:3001/dashboard-student.html |
| Faculty Dashboard | http://localhost:3001/dashboard-faculty.html |
| Admin Dashboard | http://localhost:3001/dashboard-admin.html |
| API Health | http://localhost:3001/api/health |
| Public Webhook | https://hungry-memes-deny.loca.lt/api/feedback |

---

## 🎯 Verification Checklist

- [ ] Apps Script BACKEND_FEEDBACK_URL property set to: `https://hungry-memes-deny.loca.lt/api/feedback`
- [ ] Apps Script deployed (new version created)
- [ ] Backend .env updated with new Google Apps Script URL
- [ ] Backend restarted successfully
- [ ] Localtunnel active and showing tunnel URL
- [ ] Student submitted feedback form
- [ ] Faculty dashboard shows data in Overview tab
- [ ] All charts rendering correctly
- [ ] Analytics calculations displaying (averages, percentage, frequencies)

**Once all items checked, system is fully operational! ✅**
