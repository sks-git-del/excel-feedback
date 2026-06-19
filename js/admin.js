// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// AUTOMATED GOOGLE FORM GENERATION FOR ADMIN
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ADMIN_DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbymdViCClx6266NT7VTnnEqKvUekf7RI61mfwWmHphHiG4rIymTlF02g1wReX3y0Ubzmg/exec';
const ADMIN_CREATE_FORM_PROXY_ENDPOINT = '/api/create-form';

function normalizeLookupText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function resolveFacultyReference(facultyName) {
  const requestedName = String(facultyName || '').trim();
  const normalizedRequestedName = normalizeLookupText(requestedName);

  const fallbackReference = {
    facultyName: requestedName,
    facultyId: 'admin',
    facultyEmail: '',
    facultyUsername: ''
  };

  if (!normalizedRequestedName) {
    return fallbackReference;
  }

  try {
    const response = await fetch('/api/admin/users');
    const data = await response.json();

    if (!response.ok || !data.success || !Array.isArray(data.users)) {
      return fallbackReference;
    }

    const facultyUser = data.users.find((user) => {
      if (!user || user.role !== 'faculty') return false;

      const candidates = [user.fullname, user.name, user.displayName, user.email, user.username]
        .map(normalizeLookupText)
        .filter(Boolean);

      return candidates.some((candidate) =>
        candidate === normalizedRequestedName ||
        candidate.includes(normalizedRequestedName) ||
        normalizedRequestedName.includes(candidate)
      );
    });

    if (!facultyUser) {
      return fallbackReference;
    }

    return {
      facultyName: facultyUser.fullname || facultyUser.name || requestedName,
      facultyId: facultyUser.id,
      facultyEmail: facultyUser.email || '',
      facultyUsername: facultyUser.username || ''
    };
  } catch (error) {
    console.warn('Unable to resolve faculty reference:', error);
    return fallbackReference;
  }
}

/**
 * Handle automated form creation for admin
 */
async function handleAdminCreateForm(event) {
  event.preventDefault();

  const subjectName = document.getElementById('admin-subject-name-auto').value.trim();
  const semester = document.getElementById('admin-subject-semester-auto').value;
  const facultyName = document.getElementById('admin-faculty-name-auto').value.trim();
  const messageDiv = document.getElementById('admin-create-message');

  // Validation
  if (!subjectName || !semester || !facultyName) {
    showAdminMessage('Please fill all fields', 'error');
    return;
  }

  // Show loading state
  document.getElementById('admin-create-form-btn').disabled = true;
  document.getElementById('admin-create-form-btn').textContent = 'Creating Form...';

  try {
    const facultyReference = await resolveFacultyReference(facultyName);

    // Create form through backend proxy endpoint
    const response = await fetch(ADMIN_CREATE_FORM_PROXY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subjectName: subjectName,
        semester: semester
      })
    });

    const result = await response.json();
    const hasGeneratedLinks = Boolean(result.formUrl && result.sheetUrl);
    const isSuccess = response.ok && (result.success === true || hasGeneratedLinks);

    if (!isSuccess) {
      const backendMessage = result.message || result.error || `HTTP error! status: ${response.status}`;
      showAdminMessage(`âŒ Error: ${backendMessage}`, 'error');
      throw new Error(backendMessage);
    }

    if (!result.formUrl || !result.sheetUrl) {
      throw new Error('Invalid response from Google Apps Script');
    }

    // Save to Firestore
    const docRef = await saveAdminSubjectRecord({
      subjectName,
      semester,
      facultyName: facultyReference.facultyName,
      facultyReference,
      formLink: result.formUrl,
      sheetLink: result.sheetUrl
    });

    // Clear form
    document.getElementById('admin-create-form').reset();
    document.getElementById('admin-apps-script-url').value = ADMIN_DEFAULT_APPS_SCRIPT_URL;

    showAdminMessage(`âœ… Form created successfully! Subject ID: ${docRef.id}`, 'success');

    // Reload subjects list
    setTimeout(() => {
      loadAllAdminSubjects();
    }, 1500);

  } catch (error) {
    console.error('Error creating form:', error);
    let errorMessage = 'âŒ Error creating form. ';

    if (error.message.includes('Failed to fetch')) {
      errorMessage += 'Backend is not reachable. Start server with npm start and open app via http://localhost:3001.';
    } else if (error.message.includes('HTTP')) {
      errorMessage += 'Please check the Apps Script URL and make sure it\'s deployed correctly.';
    } else if (error.message.includes('Invalid response')) {
      errorMessage += 'Apps Script returned invalid data. Check the deployment.';
    } else {
      errorMessage += error.message;
    }

    showAdminMessage(errorMessage, 'error');
  } finally {
    // Restore button state
    document.getElementById('admin-create-form-btn').disabled = false;
    document.getElementById('admin-create-form-btn').textContent = 'Create Form';
  }
}

/**
 * Save admin manual fallback form
 */
async function handleAdminManualFallbackForm(event) {
  event.preventDefault();

  const subjectName = document.getElementById('admin-subject-name-auto').value.trim();
  const semester = document.getElementById('admin-subject-semester-auto').value;
  const facultyName = document.getElementById('admin-faculty-name-auto').value.trim();
  const formLink = document.getElementById('admin-manual-form-link').value.trim();
  const sheetLink = document.getElementById('admin-manual-sheet-link').value.trim();

  if (!subjectName || !semester || !facultyName || !formLink || !sheetLink) {
    showAdminMessage('Fill all fields including Subject, Semester, Faculty Name, Form Link, and Sheet Link.', 'error');
    return;
  }

  try {
    const facultyReference = await resolveFacultyReference(facultyName);

    const docRef = await saveAdminSubjectRecord({
      subjectName,
      semester,
      facultyName: facultyReference.facultyName,
      facultyReference,
      formLink,
      sheetLink
    });

    document.getElementById('admin-manual-fallback-form').reset();
    showAdminMessage(`âœ… Manual form saved successfully! Subject ID: ${docRef.id}`, 'success');

    // Reload subjects list
    setTimeout(() => {
      loadAllAdminSubjects();
    }, 1000);

  } catch (error) {
    console.error('Error saving manual form:', error);
    showAdminMessage(`âŒ Error saving manual form: ${error.message}`, 'error');
  }
}

/**
 * Save admin subject record to Firestore
 */
async function saveAdminSubjectRecord(payload) {
  const facultyReference = payload.facultyReference || {
    facultyName: payload.facultyName,
    facultyId: 'admin',
    facultyEmail: '',
    facultyUsername: ''
  };

  const subjectData = {
    subject_name: payload.subjectName,
    semester: payload.semester,
    faculty_name: facultyReference.facultyName || payload.facultyName,
    faculty_id: facultyReference.facultyId || 'admin',
    faculty_email: facultyReference.facultyEmail || '',
    faculty_username: facultyReference.facultyUsername || '',
    form_link: payload.formLink,
    sheet_link: payload.sheetLink,
    createdAt: new Date().toISOString(),
    status: 'active',
    created_by: 'admin',
    assigned_faculty_name: facultyReference.facultyName || payload.facultyName,
    assigned_faculty_id: facultyReference.facultyId || 'admin',
    assigned_faculty_email: facultyReference.facultyEmail || ''
  };

  return firebase.firestore().collection('subjects').add(subjectData);
}

/**
 * Open Google Forms in new tab
 */
function openManualFormToolsAdmin() {
  window.open('https://forms.new', '_blank');
}

/**
 * Open Google Sheets in new tab
 */
function openManualSheetToolAdmin() {
  window.open('https://sheets.new', '_blank');
}

/**
 * Handle legacy manual form creation (for the legacy section)
 */
async function handleAdminManualCreateForm(event) {
  event.preventDefault();

  const subjectName = document.getElementById('admin-subject-name').value.trim();
  const semester = document.getElementById('admin-subject-semester').value;
  const facultyName = document.getElementById('admin-faculty-name').value.trim();
  const formLink = document.getElementById('admin-form-link').value.trim();
  const sheetLink = document.getElementById('admin-sheet-link').value.trim();

  if (!subjectName || !semester || !facultyName || !formLink || !sheetLink) {
    showAdminMessage('Fill all fields including Subject, Semester, Faculty Name, Form Link, and Sheet Link.', 'error');
    return;
  }

  try {
    const facultyReference = await resolveFacultyReference(facultyName);

    const docRef = await saveAdminSubjectRecord({
      subjectName,
      semester,
      facultyName: facultyReference.facultyName,
      facultyReference,
      formLink,
      sheetLink
    });

    document.getElementById('admin-manual-form').reset();
    showAdminMessage(`âœ… Manual form saved successfully! Subject ID: ${docRef.id}`, 'success');

    // Reload subjects list
    setTimeout(() => {
      loadAllAdminSubjects();
    }, 1000);

  } catch (error) {
    console.error('Error saving manual form:', error);
    showAdminMessage(`âŒ Error saving manual form: ${error.message}`, 'error');
  }
}

/**
 * Initialize automatic Apps Script URL
 */
function initializeAdminAppsScriptUrl() {
  const appsScriptInput = document.getElementById('admin-apps-script-url');
  if (appsScriptInput && !appsScriptInput.value.trim()) {
    appsScriptInput.value = ADMIN_DEFAULT_APPS_SCRIPT_URL;
  }
}

/**
 * Initialize Admin Dashboard
 */
function initializeAdminDashboard() {
  // Initialize all components
  initializeAdminAppsScriptUrl();
  loadUsers();
  loadAnalytics();
  loadPinSettings();
  loadAllAdminSubjects();
}

// ADMIN SUBJECT & FEEDBACK VIEWING

let allAdminSubjects = [];
let allAdminForms = [];

function renderAdminSubjectSummaryTable(subjects) {
  const tbody = document.getElementById('admin-subjects-summary-body');
  const loadingEl = document.getElementById('admin-subjects-summary-loading');

  if (!tbody) return;

  if (loadingEl) loadingEl.style.display = subjects.length ? 'none' : 'block';

  if (!subjects.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">No subjects found in the system.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = subjects.map((subject) => {
    const createdAt = subject.createdAt ? new Date(subject.createdAt).toLocaleDateString() : '-';
    const facultyName = subject.faculty_name || subject.assigned_faculty_name || '-';

    return `
      <tr>
        <td>
          <strong>${subject.subject_name || 'Unnamed Subject'}</strong><br>
          <small class="info-text">Created: ${createdAt}</small>
        </td>
        <td>${facultyName}</td>
        <td>${subject.semester || '-'}</td>
        <td id="admin-table-summary-${subject.id}">Average Score: loading...</td>
        <td id="admin-table-count-${subject.id}">loading...</td>
        <td>
          <div class="subject-actions" style="min-width: 320px;">
            <button class="btn btn-primary btn-small" type="button" onclick="openAdminUrl('${subject.form_link || ''}', 'Google Form')">Open Form</button>
            <button class="btn btn-secondary btn-small" type="button" onclick="openAdminUrl('${subject.sheet_link || ''}', 'Google Sheet')">View Sheet</button>
            <button class="btn btn-warning btn-small" type="button" onclick="downloadAdminReport('${subject.subject_name || 'subject'}', '${subject.sheet_link || ''}')">Download</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function loadAllAdminSubjects() {
  const selectElement = document.getElementById('admin-subject-selector');
  const emptyStateElement = document.getElementById('subjects-empty');
  const loadingElement = document.getElementById('subjects-loading');

  if (loadingElement) loadingElement.style.display = 'block';
  if (emptyStateElement) emptyStateElement.style.display = 'none';

  try {
    const querySnapshot = await firebase.firestore().collection('subjects').get();
    const formsSnapshot = await firebase.firestore().collection('feedback_forms').get();
    
    allAdminForms = formsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    // Sort forms by createdAt descending so .find() always returns the latest form for a subject
    allAdminForms.sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime();
      const bDate = new Date(b.createdAt || 0).getTime();
      return bDate - aDate;
    });

    if (querySnapshot.empty) {
      renderAdminSubjectSummaryTable([]);
      if (selectElement) selectElement.innerHTML = '<option value="">-- Select Subject --</option>';
      if (loadingElement) loadingElement.style.display = 'none';
      if (emptyStateElement) emptyStateElement.style.display = 'block';
      return;
    }

    const sortedDocs = [...querySnapshot.docs].sort((a, b) => {
      const aDate = new Date(a.data().createdAt || 0).getTime();
      const bDate = new Date(b.data().createdAt || 0).getTime();
      return bDate - aDate;
    });

    allAdminSubjects = sortedDocs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderAdminSubjectSummaryTable(allAdminSubjects);

    if (selectElement) {
      const options = allAdminSubjects.map(s => 
        `<option value="${s.id}">${s.subject_name || s.name || s.subject || 'Unnamed Subject'}</option>`
      ).join('');
      selectElement.innerHTML = '<option value="">-- Select Subject --</option>' + options;
    }

    await loadAllAdminSubjectSummaries(allAdminSubjects);

    if (loadingElement) loadingElement.style.display = 'none';
  } catch (error) {
    console.error('Error loading subjects:', error);
    if (loadingElement) loadingElement.style.display = 'none';
    showAdminMessage(`❌ Error loading subjects: ${error.message}`, 'error');
  }
}

function getAdminFormByType(subjectName, type) {
  return allAdminForms.find(f => {
    const sName = String(f.subject || f.subjectId || '').toLowerCase().trim();
    const targetName = String(subjectName || '').toLowerCase().trim();
    return sName === targetName && String(f.formType || f.form_type || '').toLowerCase() === type;
  });
}

function buildAdminFormActionCard(form, typeLabel, subjectName) {
  const title = `${typeLabel} Form`;
  const formUrl = form?.formUrl || form?.form_link || '';
  const sheetUrl = form?.sheetUrl || form?.sheet_link || '';
  const formId = form?.id || '';
  const formType = String(form?.formType || form?.form_type || '').toLowerCase();
  const disabled = !formId ? 'disabled' : '';

  return `
    <div class="form-action-card">
      <h4>${title}</h4>
      <div class="form-action-row">
        <button class="btn btn-secondary btn-small" type="button" onclick="openAdminUrl('${formUrl}', 'Google Form')">Open Form</button>
        <button class="btn btn-secondary btn-small" type="button" onclick="openAdminUrl('${sheetUrl}', 'Google Sheet')">Open Google Sheet</button>
        <button class="btn btn-secondary btn-small" type="button" ${disabled} onclick="downloadAdminReport('${subjectName}', '${sheetUrl}')">Download Excel</button>
        <button class="btn btn-danger btn-small" type="button" ${disabled} onclick="deleteAdminFeedbackForm('${formId}')">Delete Form</button>
      </div>
      <p class="info-text" style="margin-top:8px;word-break:break-all;">Form: ${formUrl || 'Not available'}</p>
      <p class="info-text" style="word-break:break-all;">Sheet: ${sheetUrl || 'Not available'}</p>
    </div>`;
}

function refreshAdminSubjectForms(subjectId) {
  const formsWrap = document.getElementById('admin-subject-forms-wrap');
  if (!formsWrap) return;

  if (!subjectId) {
    formsWrap.style.display = 'none';
    return;
  }

  const subject = allAdminSubjects.find(s => s.id === subjectId);
  if (!subject) {
    formsWrap.style.display = 'none';
    return;
  }

  const subjectName = subject.subject_name || subject.name || subject.subject || 'Unnamed Subject';

  const teachingForm = getAdminFormByType(subjectName, 'teaching') || { formUrl: subject.form_link, sheetUrl: subject.sheet_link, formType: 'teaching' };
  const coForm = getAdminFormByType(subjectName, 'co');
  const gapForm = getAdminFormByType(subjectName, 'gap');

  formsWrap.innerHTML = `
    <h3 style="margin-bottom:8px;">${subjectName}</h3>
    <div class="subject-sections-grid">
      ${buildAdminFormActionCard(teachingForm, 'Teaching Feedback', subjectName)}
      ${buildAdminFormActionCard(coForm, 'CO Attainment', subjectName)}
      ${buildAdminFormActionCard(gapForm, 'Gap Analysis', subjectName)}
    </div>
    <div style="margin-top:12px;">
      <button class="btn btn-danger btn-small" type="button" onclick="deleteAdminForm('${subjectId}')">Delete Subject Completely</button>
    </div>`;
  
  formsWrap.style.display = 'block';
}

async function deleteAdminFeedbackForm(formId) {
  if (!confirm('Are you sure you want to delete this specific form entry?')) return;
  try {
    await firebase.firestore().collection('feedback_forms').doc(formId).delete();
    showAdminMessage('✅ Form entry deleted successfully!', 'success');
    loadAllAdminSubjects();
  } catch (error) {
    console.error('Error deleting form:', error);
    showAdminMessage('❌ Error deleting form. Please try again.', 'error');
  }
}

async function loadAllAdminSubjectSummaries(subjects) {
  await Promise.all(subjects.map((subject) => updateAdminSummaryElement(subject.id, subject.sheet_link)));
}

async function refreshAdminSummary(subjectId, encodedSheetLink) {
  const sheetLink = decodeURIComponent(encodedSheetLink || '');
  await updateAdminSummaryElement(subjectId, sheetLink, true);
}

async function updateAdminSummaryElement(subjectId, sheetLink, notify = false) {
  const summaryElement = document.getElementById(`admin-summary-${subjectId}`);
  const tableSummaryElement = document.getElementById(`admin-table-summary-${subjectId}`);
  const tableCountElement = document.getElementById(`admin-table-count-${subjectId}`);

  if (!tableSummaryElement && !tableCountElement) return;

  if (summaryElement) summaryElement.textContent = 'Average Score: checking... | Responses: checking...';
  if (tableSummaryElement) tableSummaryElement.textContent = 'Average Score: checking...';
  if (tableCountElement) tableCountElement.textContent = 'checking...';

  try {
    // Try Firestore-based summary first (works without Google Sheets API)
    const firestoreRes = await fetch(`/api/admin/subject-summary/${encodeURIComponent(subjectId)}`);
    const firestoreData = await firestoreRes.json();

    if (firestoreRes.ok && firestoreData.success && firestoreData.totalResponses > 0) {
      const avg = parseFloat(firestoreData.averageScore).toFixed(2);
      const total = firestoreData.totalResponses;

      if (summaryElement) summaryElement.textContent = `Average Score: ${avg} / 5 | Responses: ${total}`;
      if (tableSummaryElement) tableSummaryElement.textContent = `Average Score: ${avg} / 5`;
      if (tableCountElement) tableCountElement.textContent = String(total);

      if (notify) showAdminMessage('✅ Stats refreshed from Firestore.', 'success');
      return;
    }

    // Fallback to Google Sheet-based summary
    if (!sheetLink) {
      if (summaryElement) summaryElement.textContent = 'Average Score: N/A | Responses: 0';
      if (tableSummaryElement) tableSummaryElement.textContent = 'Average Score: N/A';
      if (tableCountElement) tableCountElement.textContent = '0';
      return;
    }

    const response = await fetch('/api/sheet-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetLink })
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Unable to fetch summary');
    }

    const avg = result.averageScore !== null && result.averageScore !== undefined
      ? parseFloat(result.averageScore).toFixed(2)
      : 'N/A';
    const total = result.totalResponses || 0;

    if (summaryElement) summaryElement.textContent = `Average Score: ${avg} / 5 | Responses: ${total}`;
    if (tableSummaryElement) tableSummaryElement.textContent = `Average Score: ${avg} / 5`;
    if (tableCountElement) tableCountElement.textContent = String(total);

    if (notify) {
      showAdminMessage('✅ Stats refreshed successfully.', 'success');
    }
  } catch (error) {
    if (summaryElement) summaryElement.textContent = 'Average Score: unavailable | Responses: unavailable';
    if (tableSummaryElement) tableSummaryElement.textContent = 'Average Score: unavailable';
    if (tableCountElement) tableCountElement.textContent = 'unavailable';
    if (notify) {
      showAdminMessage(`❌ Unable to refresh stats: ${error.message}`, 'error');
    }
  }
}

async function recalculateAllAdminAverages() {
  if (!allAdminSubjects.length) {
    showAdminMessage('No subjects available to recalculate.', 'warning');
    return;
  }

  showAdminMessage('⏳ Recalculating all averages...', 'info');

  await Promise.all(allAdminSubjects.map((subject) => updateAdminSummaryElement(subject.id, subject.sheet_link)));

  showAdminMessage('✅ All subject averages recalculated.', 'success');
}

function openAdminUrl(url, name) {
  if (!url) {
    showAdminMessage('❌ Link not available', 'error');
    return;
  }

  window.open(url, name, 'width=1200,height=800');
}

async function downloadAdminReport(subjectName, sheetLink) {
  showAdminMessage(`⏳ Report download initiated for ${subjectName}. Please wait...`, 'info');

  try {
    const exportUrl = buildAdminGoogleSheetExportUrl(sheetLink, 'xlsx');
    if (!exportUrl) {
      throw new Error('Sheet link missing or invalid. Verify it is a valid Google Sheets URL.');
    }

    const a = document.createElement('a');
    a.href = exportUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.download = `${subjectName}_feedback_${Date.now()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showAdminMessage('✅ Opening Google Sheet export. If asked, allow access and download as Excel.', 'success');
  } catch (error) {
    console.error('Error downloading report:', error);
    showAdminMessage(`❌ Error downloading report: ${error.message}`, 'error');
  }
}

function buildAdminGoogleSheetExportUrl(sheetLink, format = 'xlsx') {
  if (!sheetLink || !sheetLink.includes('docs.google.com/spreadsheets')) {
    return null;
  }

  const match = sheetLink.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match || !match[1]) {
    return null;
  }

  const spreadsheetId = match[1];
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=${encodeURIComponent(format)}`;
}

async function deleteAdminForm(subjectId) {
  const confirmDelete = confirm('Are you sure you want to delete this form? This action cannot be undone.');

  if (!confirmDelete) {
    return;
  }

  try {
    await firebase.firestore().collection('subjects').doc(subjectId).delete();
    showAdminMessage('✅ Form deleted successfully!', 'success');
    setTimeout(() => {
      loadAllAdminSubjects();
    }, 1000);
  } catch (error) {
    console.error('Error deleting form:', error);
    showAdminMessage('❌ Error deleting form. Please try again.', 'error');
  }
}

// â”€â”€â”€ Show/Hide Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => {
    t.style.display = 'none';
    t.classList.remove('active');
  });
  document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).style.display = 'block';
  document.getElementById(tabId).classList.add('active');
  event.target.classList.add('active');

  if (tabId === 'users-tab') loadUsers();
  if (tabId === 'subjects-tab') loadAllAdminSubjects();
}

// â”€â”€â”€ Load All Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadUsers() {
  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';

  try {
    let users = [];

    // Try API first, fallback to Firestore
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        users = data.users;
      } else {
        throw new Error('API failed');
      }
    } catch (apiErr) {
      console.warn('API /api/admin/users failed, using Firestore fallback');
      const usersSnap = await firebase.firestore().collection('users').get();
      users = usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="6">No users found.</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(u => `
      <tr>
        <td>${u.fullname || u.name || '-'}</td>
        <td>${u.email || '-'}</td>
        <td><span class="badge ${u.role}">${u.role}</span></td>
        <td>${u.semester ? u.semester + ' Sem' : '-'}</td>
        <td>${u.branch || '-'}</td>
        <td>
          <button class="btn btn-danger btn-small" onclick="removeUser('${u.id}')">Remove</button>
          ${u.role === 'faculty' ? `<button class="btn btn-secondary btn-small" onclick="openAssignModal('${u.id}', '${u.fullname || u.name}')">Assign Subject</button>` : ''}
        </td>
      </tr>
    `).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6">Error: ${err.message}</td></tr>`;
  }
}

// â”€â”€â”€ Add Faculty â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function handleAdminCreateFaculty(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Adding...';

  try {
    const res = await fetch('/api/admin/add-faculty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullname: document.getElementById('admin-faculty-fullname').value.trim(),
        username: document.getElementById('admin-faculty-username').value.trim(),
        email:    document.getElementById('admin-faculty-email').value.trim(),
        password: document.getElementById('admin-faculty-password').value,
        semester: document.getElementById('admin-faculty-semester').value,
        branch:   document.getElementById('admin-faculty-branch').value.trim(),
        subject:  document.getElementById('admin-faculty-subject').value.trim(),
      })
    });

    const data = await res.json();
    if (data.success) {
      showAdminMessage('âœ… Faculty added successfully!', 'success');
      e.target.reset();
      loadUsers();
    } else {
      showAdminMessage('âŒ ' + data.message, 'error');
    }
  } catch (err) {
    showAdminMessage('âŒ ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add Faculty';
  }
}

// â”€â”€â”€ Add Student â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function handleAdminCreateStudent(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Adding...';

  try {
    const res = await fetch('/api/admin/add-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullname: document.getElementById('admin-student-fullname').value.trim(),
        username: document.getElementById('admin-student-username').value.trim(),
        email:    document.getElementById('admin-student-email').value.trim(),
        password: document.getElementById('admin-student-password').value,
        semester: document.getElementById('admin-student-semester').value,
        branch:   document.getElementById('admin-student-branch').value.trim(),
      })
    });

    const data = await res.json();
    if (data.success) {
      showAdminMessage('âœ… Student added successfully!', 'success');
      e.target.reset();
      loadUsers();
    } else {
      showAdminMessage('âŒ ' + data.message, 'error');
    }
  } catch (err) {
    showAdminMessage('âŒ ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add Student';
  }
}

// â”€â”€â”€ Remove User â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function removeUser(id) {
  if (!confirm('Remove this user permanently?')) return;
  try {
    const res = await fetch(`/api/admin/remove-user/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showAdminMessage('âœ… User removed!', 'success');
      loadUsers();
    } else {
      showAdminMessage('âŒ ' + data.message, 'error');
    }
  } catch (err) {
    showAdminMessage('âŒ ' + err.message, 'error');
  }
}

// â”€â”€â”€ Assign Subject Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openAssignModal(facultyId, facultyName) {
  const subjectName = prompt(`Assign subject to ${facultyName}:\nEnter subject name:`);
  if (!subjectName) return;
  const semester = prompt('Enter semester number (1-8):');
  if (!semester) return;
  assignSubjectToFaculty(facultyId, subjectName, semester);
}

async function assignSubjectToFaculty(facultyId, subjectName, semester) {
  try {
    const res = await fetch('/api/admin/assign-subject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facultyId, subjectName, semester })
    });
    const data = await res.json();
    if (data.success) showAdminMessage('âœ… Subject assigned!', 'success');
    else showAdminMessage('âŒ ' + data.message, 'error');
  } catch (err) {
    showAdminMessage('âŒ ' + err.message, 'error');
  }
}

// â”€â”€â”€ Message Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function showAdminMessage(msg, type) {
  const el = document.getElementById('admin-message');
  el.textContent = msg;
  el.className = `message ${type === 'success' ? 'message-success' : 'message-error'}`;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 4000);
}

// â”€â”€â”€ Load Analytics on page open â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadAnalytics() {
  const summaryEl = document.getElementById('admin-visual-summary');
  if (summaryEl) summaryEl.textContent = 'Loading visualization...';

  try {
    let users = [];
    
    // Try API first, fallback to direct Firestore
    try {
      const usersRes = await fetch('/api/admin/users');
      const usersData = await usersRes.json();
      if (usersData.success && Array.isArray(usersData.users)) {
        users = usersData.users;
      } else {
        throw new Error('API failed');
      }
    } catch (apiErr) {
      // Fallback: read users directly from Firestore
      console.warn('API /api/admin/users failed, using Firestore fallback:', apiErr.message);
      const usersSnap = await firebase.firestore().collection('users').get();
      users = usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    const subjectsSnapshot = await firebase.firestore().collection('subjects').get();
    const subjects = subjectsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (summaryEl) {
      summaryEl.textContent = `Total Users: ${users.length} | Total Subjects: ${subjects.length}`;
    }

    // Render charts if Chart.js is available
    if (typeof Chart !== 'undefined') {
      renderRoleChart(users);
      renderSemesterChart(users);
      await renderFeedbackChart(subjects);
    }
  } catch (err) {
    console.error('Error loading analytics:', err);
    if (summaryEl) summaryEl.textContent = 'Unable to load analytics.';
  }
}

function renderRoleChart(users) {
  const canvas = document.getElementById('admin-role-chart');
  if (!canvas) return;

  // Destroy existing chart instance to prevent Canvas reuse errors
  const existingChart = Chart.getChart(canvas);
  if (existingChart) existingChart.destroy();

  const roles = {};
  users.forEach(u => {
    const role = (u.role || 'unknown').toLowerCase();
    roles[role] = (roles[role] || 0) + 1;
  });

  new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(roles).map(r => r.charAt(0).toUpperCase() + r.slice(1)),
      datasets: [{
        data: Object.values(roles),
        backgroundColor: ['#2d8cff', '#22c55e', '#f59e0b', '#ef4444']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } }
    }
  });
}

function renderSemesterChart(users) {
  const canvas = document.getElementById('admin-semester-chart');
  if (!canvas) return;

  // Destroy existing chart instance
  const existingChart = Chart.getChart(canvas);
  if (existingChart) existingChart.destroy();

  const semesters = {};
  users.forEach(u => {
    const sem = u.semester || 'N/A';
    semesters[sem] = (semesters[sem] || 0) + 1;
  });

  new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: Object.keys(semesters),
      datasets: [{
        label: 'Users',
        data: Object.values(semesters),
        backgroundColor: '#0ea5a6'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } }
    }
  });
}

async function renderFeedbackChart(subjects) {
  const canvas = document.getElementById('admin-feedback-chart');
  if (!canvas) return;

  // Destroy existing chart instance
  const existingChart = Chart.getChart(canvas);
  if (existingChart) existingChart.destroy();

  if (!subjects || subjects.length === 0) {
    new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['No Subjects'],
        datasets: [{
          label: 'Responses',
          data: [0],
          backgroundColor: '#2d8cff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
    return;
  }

  const counts = await Promise.all(
    subjects.map(async (subject) => {
      try {
        const feedbackSnapshot = await firebase.firestore()
          .collection('feedback_submissions')
          .where('subject_id', '==', subject.id)
          .get();

        return {
          label: subject.subject_name || 'Unnamed Subject',
          count: feedbackSnapshot.size
        };
      } catch (error) {
        console.warn('Unable to load feedback count for subject:', subject.id, error);
        return {
          label: subject.subject_name || 'Unnamed Subject',
          count: 0
        };
      }
    })
  );

  const totalResponses = counts.reduce((sum, item) => sum + item.count, 0);
  const subjectNames = counts.map((item) => item.label);
  const responseCounts = counts.map((item) => item.count);

  const summaryEl = document.getElementById('admin-visual-summary');
  if (summaryEl) {
    summaryEl.textContent = `Total Users: ${document.querySelectorAll('#users-tbody tr').length || 0} | Total Subjects: ${subjects.length} | Total Responses: ${totalResponses}`;
  }

  new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: subjectNames.map((name) => name.length > 18 ? `${name.slice(0, 15)}...` : name),
      datasets: [{
        label: 'Responses',
        data: responseCounts,
        backgroundColor: '#0ea5a6'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        title: {
          display: true,
          text: `Total Responses: ${totalResponses}`
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}

// â”€â”€â”€ Load on page open â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// (Initialization is now handled by initializeAdminDashboard in HTML)

/**
 * Fallback: Get feedback summary from Firestore for admin
 */
async function updateAdminSummaryFromFirestore(subjectId, summaryElement, notify = false) {
  try {
    const feedbackSnapshot = await firebase.firestore()
      .collection('feedback_submissions')
      .where('subject_id', '==', subjectId)
      .get();

    const responses = feedbackSnapshot.docs.map(doc => doc.data());
    const total = responses.length;
    
    if (total === 0) {
      summaryElement.textContent = 'Average Score: N/A | Responses: 0';
      if (notify) {
        showAdminMessage('No feedback responses yet.', 'info');
      }
      return;
    }

    // Calculate average rating
    const ratings = responses
      .map(r => r.rating || r.feedback_score || 0)
      .filter(r => r > 0);
    
    const avg = ratings.length > 0
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)
      : 'N/A';

    summaryElement.textContent = `Average Score: ${avg} / 5 | Responses: ${total}`;

    if (notify) {
      showAdminMessage('âœ… Average score refreshed from database.', 'success');
    }
  } catch (error) {
    console.error('Error fetching from Firestore:', error);
    summaryElement.textContent = 'Average Score: unavailable | Responses: unavailable';
    if (notify) {
      showAdminMessage(`âŒ Unable to refresh stats: ${error.message}`, 'error');
    }
  }
}

// ==========================================
// PIN MANAGEMENT FUNCTIONS FOR ADMIN
// ==========================================

/**
 * Load PIN settings and display them
 */
async function loadPinSettings() {
  try {
    const pinSettings = await getPinSettings();
    
    if (pinSettings) {
      // Update UI with current PIN settings
      const adminPinDisplay = document.getElementById('current-admin-pin');
      const facultyPinDisplay = document.getElementById('current-faculty-pin');
      const pinEnabledCheckbox = document.getElementById('pin-enabled-checkbox');
      
      if (adminPinDisplay) {
        adminPinDisplay.textContent = 'â€¢â€¢â€¢â€¢'; // Hide for security
      }
      if (facultyPinDisplay) {
        facultyPinDisplay.textContent = 'â€¢â€¢â€¢â€¢'; // Hide for security
      }
      if (pinEnabledCheckbox) {
        pinEnabledCheckbox.checked = pinSettings.pinEnabled || false;
      }
    }
  } catch (error) {
    console.error('Error loading PIN settings:', error);
  }
}

/**
 * Update Admin PIN
 */
async function handleUpdateAdminPin(event) {
  event.preventDefault();
  
  const newPin = document.getElementById('new-admin-pin').value.trim();
  const confirmPin = document.getElementById('confirm-admin-pin').value.trim();
  const messageDiv = document.getElementById('pin-message');
  
  // Validation
  if (!newPin || !confirmPin) {
    showAdminMessage('âŒ Please fill in all fields', 'error');
    return;
  }
  
  if (newPin !== confirmPin) {
    showAdminMessage('âŒ PINs do not match', 'error');
    return;
  }
  
  if (!/^[0-9]{4,6}$/.test(newPin)) {
    showAdminMessage('âŒ PIN must be 4-6 digits', 'error');
    return;
  }
  
  try {
    await updateAdminPin(newPin);
    showAdminMessage('âœ… Admin PIN updated successfully!', 'success');
    document.getElementById('admin-pin-form').reset();
  } catch (error) {
    showAdminMessage('âŒ Error updating admin PIN: ' + error.message, 'error');
  }
}

/**
 * Update Faculty PIN
 */
async function handleUpdateFacultyPin(event) {
  event.preventDefault();
  
  const newPin = document.getElementById('new-faculty-pin').value.trim();
  const confirmPin = document.getElementById('confirm-faculty-pin').value.trim();
  
  // Validation
  if (!newPin || !confirmPin) {
    showAdminMessage('âŒ Please fill in all fields', 'error');
    return;
  }
  
  if (newPin !== confirmPin) {
    showAdminMessage('âŒ PINs do not match', 'error');
    return;
  }
  
  if (!/^[0-9]{4,6}$/.test(newPin)) {
    showAdminMessage('âŒ PIN must be 4-6 digits', 'error');
    return;
  }
  
  try {
    await updateFacultyPin(newPin);
    showAdminMessage('âœ… Faculty PIN updated successfully! All faculty members will use this PIN to login.', 'success');
    document.getElementById('faculty-pin-form').reset();
  } catch (error) {
    showAdminMessage('âŒ Error updating faculty PIN: ' + error.message, 'error');
  }
}

/**
 * Toggle PIN system on/off
 */
async function handleTogglePinSystem(event) {
  const isEnabled = event.target.checked;
  
  try {
    await togglePinSystem(isEnabled);
    const status = isEnabled ? 'enabled' : 'disabled';
    showAdminMessage(`âœ… PIN system ${status}!`, 'success');
  } catch (error) {
    showAdminMessage('âŒ Error toggling PIN system: ' + error.message, 'error');
    // Revert checkbox
    event.target.checked = !isEnabled;
  }
}
