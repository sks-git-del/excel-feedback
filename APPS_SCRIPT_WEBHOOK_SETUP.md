# Apps Script Webhook Configuration - QUICK SETUP

## Current Status
✅ Backend running: `http://localhost:3001`
✅ Localtunnel active: `https://hungry-memes-deny.loca.lt`
✅ Google Apps Script deployed

## Step-by-Step Configuration

### STEP 1: Open Apps Script Editor
1. Go to: https://script.google.com
2. Select your "feedback-form-factory" project
3. Click on `code.gs` file

### STEP 2: Configure Webhook URL
1. In the Apps Script editor, click **Project Settings** (gear icon, bottom left)
2. Scroll down to **Script properties** section
3. Click **Add script property**
4. Add this property:
   - **Property**: `BACKEND_FEEDBACK_URL`
   - **Value**: `https://hungry-memes-deny.loca.lt/api/feedback`
5. Click **Save**

### STEP 3: Deploy New Version
1. Click **Deploy** button (top right)
2. Select **Manage deployments**
3. Click the pencil icon to edit existing "webapp" deployment
4. Click **Create new version** dropdown
5. Select **New** (it will auto-increment)
6. Click **Deploy**
7. **COPY the new deployment URL** shown in the modal
   - Format: `https://script.google.com/macros/s/[SCRIPT_ID]/usercontent`

### STEP 4: Update Backend Environment
1. Open `.env` file in your project
2. Update `GOOGLE_SCRIPT_URL` with the NEW deployment URL from Step 3
3. Example:
   ```
   GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_NEW_SCRIPT_ID/usercontent
   PORT=3001
   ```
4. Save the file

### STEP 5: Restart Backend
1. In terminal, run: `taskkill /IM node.exe /F`
2. Then: `npm start`
3. Confirm it shows: `✅ Firebase Admin initialized with service account`

### STEP 6: Test the Integration
1. Go to student dashboard: `http://localhost:3001/dashboard-student.html`
2. Fill out and submit a feedback form
3. Go to faculty dashboard: `http://localhost:3001/dashboard-faculty.html`
4. Click Overview tab
5. **You should now see:**
   - Teaching Feedback average
   - CO Attainment percentage
   - Gap Analysis frequency
   - All charts and calculations

## Troubleshooting

### Responses still not appearing?
- Check Apps Script Executions log (in Apps Script editor: View → Executions)
- Look for red error entries showing webhook request failures
- Verify tunnel is still active (check terminal)

### Tunnel URL changed?
- If you need to restart localtunnel, you'll get a NEW URL
- Update `BACKEND_FEEDBACK_URL` script property again
- Redeploy a new version of Apps Script
- Update `.env` with new `GOOGLE_SCRIPT_URL`
- Restart backend

### Forms not syncing?
- Ensure teaching form has 12 questions (Q1-Q12)
- Check that Average Score column is set up in Google Sheet
- Verify form responses are being recorded in the sheet

## Quick Reference
- Localtunnel URL: `https://hungry-memes-deny.loca.lt`
- Backend health: `http://localhost:3001/api/health`
- Student dashboard: `http://localhost:3001/dashboard-student.html`
- Faculty dashboard: `http://localhost:3001/dashboard-faculty.html`
- Apps Script Executions: https://script.google.com/home/executions
