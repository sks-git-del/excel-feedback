// ==========================================
// FACULTY DASHBOARD MODULE
// ==========================================
// Handles feedback form creation and management for faculty

let currentUser = null;
const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbymdViCClx6266NT7VTnnEqKvUekf7RI61mfwWmHphHiG4rIymTlF02g1wReX3y0Ubzmg/exec';
const CREATE_FORM_PROXY_ENDPOINT = '/api/create-form';
let cachedFacultySubjects = [];
const facultyCharts = {
    subjectResponses: null,
    responseTrend: null
};

function normalizeLookupText(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function subjectBelongsToCurrentFaculty(subject) {
    const currentFacultyId = normalizeLookupText(getCurrentUserId());
    const currentFacultyEmail = normalizeLookupText(currentUser && currentUser.email);
    const currentFacultyName = normalizeLookupText((currentUser && (currentUser.fullname || currentUser.name || currentUser.displayName)) || '');
    const currentFacultyUsername = normalizeLookupText(currentUser && currentUser.username);

    const subjectIdentityValues = [
        subject.faculty_id,
        subject.faculty_email,
        subject.faculty_name,
        subject.assigned_faculty_id,
        subject.assigned_faculty_email,
        subject.assigned_faculty_name,
        subject.owner_id,
        subject.owner_email,
        subject.owner_name
    ]
        .map(normalizeLookupText)
        .filter(Boolean);

    const targetValues = [currentFacultyId, currentFacultyEmail, currentFacultyName, currentFacultyUsername]
        .filter(Boolean);

    if (!subjectIdentityValues.length || !targetValues.length) {
        return false;
    }

    return targetValues.some((target) =>
        subjectIdentityValues.some((candidate) =>
            candidate === target || candidate.includes(target) || target.includes(candidate)
        )
    );
}

/**
 * Initialize faculty dashboard
 */
async function initializeFacultyDashboard() {
    // Check authentication
    currentUser = await checkAuth();

    if (!currentUser || currentUser.role !== 'faculty') {
        window.location.href = 'login.html';
        return;
    }

    console.log('=== FACULTY DASHBOARD DEBUG ===');
    console.log('Current User:', currentUser);
    console.log('User ID:', getCurrentUserId());
    console.log('User Name:', currentUser.name);
    console.log('User Full Name:', currentUser.fullname);
    console.log('================================');

    const appsScriptInput = document.getElementById('apps-script-url');
    if (appsScriptInput && !appsScriptInput.value.trim()) {
        appsScriptInput.value = DEFAULT_APPS_SCRIPT_URL;
    }

    // Load faculty's forms
    loadFacultyForms();
}

/**
 * Handle form creation
 * @param {Event} event - Form submission event
 */
async function handleCreateForm(event) {
    event.preventDefault();

    const subjectName = document.getElementById('subject-name').value.trim();
    const semester = document.getElementById('subject-semester').value;
    const messageDiv = document.getElementById('create-message');

    // Validation
    if (!subjectName || !semester) {
        showMessageFaculty('Please fill all fields', 'error');
        return;
    }

    // Show loading state
    document.getElementById('create-form-btn').disabled = true;
    document.getElementById('create-form-btn').textContent = 'Creating Form...';

    try {
        // Create form through backend proxy endpoint.
        const response = await fetch(CREATE_FORM_PROXY_ENDPOINT, {
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
            alert(`Error: ${backendMessage}`);
            throw new Error(backendMessage);
        }

        if (!result.formUrl || !result.sheetUrl) {
            throw new Error('Invalid response from Google Apps Script');
        }

        alert('Form created successfully!');

        const docRef = await saveSubjectRecord({
            subjectName,
            semester,
            formLink: result.formUrl,
            sheetLink: result.sheetUrl
        });

        // Clear form
        document.getElementById('create-form').reset();
        document.getElementById('apps-script-url').value = DEFAULT_APPS_SCRIPT_URL;

        showMessageFaculty(
            `Form created successfully! Subject ID: ${docRef.id}`,
            'success'
        );

        // Reload faculty forms
        setTimeout(() => {
            loadFacultyForms();
        }, 1500);

    } catch (error) {
        console.error('Error creating form:', error);
        let errorMessage = 'Error creating form. ';

        if (error.message.includes('Failed to fetch')) {
            errorMessage += 'Backend is not reachable. Start server with npm start and open app via http://localhost:3001.';
        } else if (error.message.includes('HTTP')) {
            errorMessage += 'Please check the Apps Script URL and make sure it\'s deployed correctly.';
        } else if (error.message.includes('Missing required fields')) {
            errorMessage += 'Invalid input sent to backend. Please recheck Subject and Semester values.';
        } else if (error.message.includes('Invalid JSON from Google Script')) {
            errorMessage += 'Apps Script returned non-JSON. Re-deploy Web App as "Execute as Me" and "Who has access: Anyone".';
        } else if (error.message.includes('Invalid response')) {
            errorMessage += 'Apps Script returned invalid data. Check the deployment.';
        } else {
            errorMessage += error.message;
        }

        showMessageFaculty(errorMessage, 'error');
    } finally {
        // Restore button state
        document.getElementById('create-form-btn').disabled = false;
        document.getElementById('create-form-btn').textContent = 'Create Form';
    }
}

/**
 * Save manual form and sheet links to Firestore.
 * @param {Event} event
 */
async function handleManualCreateForm(event) {
    event.preventDefault();

    const subjectName = document.getElementById('subject-name').value.trim();
    const semester = document.getElementById('subject-semester').value;
    const formLink = document.getElementById('manual-form-link').value.trim();
    const sheetLink = document.getElementById('manual-sheet-link').value.trim();

    if (!subjectName || !semester || !formLink || !sheetLink) {
        showMessageFaculty('Fill Subject, Semester, Form Link, and Sheet Link first.', 'error');
        return;
    }

    try {
        const docRef = await saveSubjectRecord({
            subjectName,
            semester,
            formLink,
            sheetLink
        });

        document.getElementById('manual-form').reset();
        showMessageFaculty(`Manual form saved successfully! Subject ID: ${docRef.id}`, 'success');

        setTimeout(() => {
            loadFacultyForms();
        }, 1000);
    } catch (error) {
        console.error('Error saving manual form:', error);
        showMessageFaculty(`Error saving manual form: ${error.message}`, 'error');
    }
}

/**
 * Save subject data to Firestore.
 * @param {{subjectName:string, semester:string, formLink:string, sheetLink:string}} payload
 * @returns {Promise<firebase.firestore.DocumentReference>}
 */
async function saveSubjectRecord(payload) {
    const subjectData = {
        subject_name: payload.subjectName,
        semester: payload.semester,
        faculty_id: getCurrentUserId(),
        faculty_name: currentUser.fullname || currentUser.name || currentUser.displayName || '',
        faculty_email: currentUser.email || '',
        faculty_username: currentUser.username || '',
        form_link: payload.formLink,
        sheet_link: payload.sheetLink,
        createdAt: new Date().toISOString(),
        status: 'active',
        created_by: 'faculty'
    };

    return firebase.firestore().collection('subjects').add(subjectData);
}

/**
 * Open Google Forms manual creator.
 */
function openManualFormTools() {
    window.open('https://forms.new', '_blank');
}

/**
 * Open Google Sheets manual creator.
 */
function openManualSheetTool() {
    window.open('https://sheets.new', '_blank');
}

/**
 * Load faculty's created forms
 */
async function loadFacultyForms() {
    const gridElement = document.getElementById('forms-grid');
    const emptyStateElement = document.getElementById('empty-state');
    const loadingElement = document.getElementById('loading');

    gridElement.innerHTML = '';
    loadingElement.style.display = 'block';
    emptyStateElement.style.display = 'none';

    try {
        const allSubjectsSnapshot = await firebase.firestore()
            .collection('subjects')
            .get();

        const allDocs = allSubjectsSnapshot.docs.filter((doc) => subjectBelongsToCurrentFaculty(doc.data()));

        console.log(`Faculty debug:`, {
            currentUser,
            currentFacultyId: getCurrentUserId(),
            currentFacultyName: currentUser.fullname || currentUser.name || currentUser.displayName || '',
            totalSubjectsInFirestore: allSubjectsSnapshot.size,
            matchedSubjects: allDocs.map((doc) => ({
                id: doc.id,
                subject_name: doc.data().subject_name,
                faculty_name: doc.data().faculty_name,
                faculty_id: doc.data().faculty_id,
                faculty_email: doc.data().faculty_email,
                created_by: doc.data().created_by
            }))
        });

        if (allDocs.length === 0) {
            loadingElement.style.display = 'none';
            emptyStateElement.style.display = 'block';
            await loadFacultyVisualizations([]);
            return;
        }

        // Sort newest first
        const sortedDocs = allDocs.sort((a, b) => {
            const aDate = new Date(a.data().createdAt || 0).getTime();
            const bDate = new Date(b.data().createdAt || 0).getTime();
            return bDate - aDate;
        });

        cachedFacultySubjects = sortedDocs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // Create form cards
        sortedDocs.forEach((doc) => {
            const subject = doc.data();
            subject.id = doc.id;

            const card = createFormCard(subject);
            gridElement.appendChild(card);
        });

        await loadFacultySubjectSummaries(cachedFacultySubjects);

        await loadFacultyVisualizations(sortedDocs);

        loadingElement.style.display = 'none';

    } catch (error) {
        console.error('Error loading forms:', error);
        console.error('Stack:', error.stack);
        loadingElement.style.display = 'none';
        showMessageFaculty('❌ Error loading forms: ' + error.message, 'error');
    }
}

/**
 * Build faculty analytics charts from Firestore feedback submissions.
 * @param {firebase.firestore.QueryDocumentSnapshot[]} subjectDocs
 */
async function loadFacultyVisualizations(subjectDocs) {
    const summaryElement = document.getElementById('faculty-visual-summary');

    if (typeof Chart === 'undefined') {
        if (summaryElement) summaryElement.textContent = 'Visualization library not loaded.';
        return;
    }

    if (!subjectDocs || subjectDocs.length === 0) {
        renderOrUpdateFacultyChart('subjectResponses', 'faculty-subject-feedback-chart', {
            type: 'bar',
            data: {
                labels: ['No Subjects'],
                datasets: [{
                    label: 'Responses',
                    data: [0],
                    backgroundColor: '#2d8cff'
                }]
            },
            options: baseChartOptions()
        });

        renderOrUpdateFacultyChart('responseTrend', 'faculty-feedback-trend-chart', {
            type: 'line',
            data: {
                labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
                datasets: [{
                    label: 'Responses',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#0ea5a6',
                    backgroundColor: 'rgba(14, 165, 166, 0.2)',
                    fill: true,
                    tension: 0.25
                }]
            },
            options: baseChartOptions()
        });

        if (summaryElement) summaryElement.textContent = 'No forms yet. Create a form to start seeing analytics.';
        return;
    }

    const subjectStats = await Promise.all(
        subjectDocs.map(async (doc) => {
            const feedbackSnapshot = await firebase.firestore()
                .collection('feedback_submissions')
                .where('subject_id', '==', doc.id)
                .get();

            const timestamps = feedbackSnapshot.docs
                .map((d) => d.data().timestamp)
                .filter(Boolean);

            return {
                id: doc.id,
                name: doc.data().subject_name || 'Unnamed Subject',
                count: feedbackSnapshot.size,
                timestamps
            };
        })
    );

    const subjectLabels = subjectStats.map((item) => truncateLabel(item.name, 18));
    const subjectCounts = subjectStats.map((item) => item.count);
    const totalResponses = subjectCounts.reduce((sum, value) => sum + value, 0);
    const totalSubjects = subjectStats.length;

    renderOrUpdateFacultyChart('subjectResponses', 'faculty-subject-feedback-chart', {
        type: 'bar',
        data: {
            labels: subjectLabels,
            datasets: [{
                label: 'Responses',
                data: subjectCounts,
                backgroundColor: ['#2d8cff', '#0ea5a6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']
            }]
        },
        options: baseChartOptions()
    });

    const trendData = buildLastSevenDaysSeries(subjectStats.flatMap((item) => item.timestamps));
    renderOrUpdateFacultyChart('responseTrend', 'faculty-feedback-trend-chart', {
        type: 'line',
        data: {
            labels: trendData.labels,
            datasets: [{
                label: 'Daily Responses',
                data: trendData.values,
                borderColor: '#0ea5a6',
                backgroundColor: 'rgba(14, 165, 166, 0.2)',
                fill: true,
                tension: 0.3
            }]
        },
        options: baseChartOptions()
    });

    if (summaryElement) {
        summaryElement.textContent = `Total Subjects: ${totalSubjects} | Total Responses: ${totalResponses}`;
    }
}

function renderOrUpdateFacultyChart(chartKey, canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (facultyCharts[chartKey]) {
        facultyCharts[chartKey].destroy();
    }

    const ctx = canvas.getContext('2d');
    facultyCharts[chartKey] = new Chart(ctx, config);
}

function buildLastSevenDaysSeries(timestamps) {
    const labels = [];
    const values = [];
    const now = new Date();
    const dayMap = new Map();

    for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const key = date.toISOString().slice(0, 10);
        labels.push(date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        dayMap.set(key, 0);
    }

    timestamps.forEach((timestamp) => {
        const d = new Date(timestamp);
        if (Number.isNaN(d.getTime())) return;
        const key = d.toISOString().slice(0, 10);
        if (dayMap.has(key)) {
            dayMap.set(key, dayMap.get(key) + 1);
        }
    });

    dayMap.forEach((value) => values.push(value));
    return { labels, values };
}

function baseChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top'
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
    };
}

function truncateLabel(text, maxLen) {
    if (!text || text.length <= maxLen) return text;
    return `${text.slice(0, maxLen - 1)}...`;
}

/**
 * Create a form card element
 * @param {Object} subject - Subject data
 * @returns {HTMLElement}
 */
function createFormCard(subject) {
    const card = document.createElement('div');
    card.className = 'subject-card';

    const formDate = new Date(subject.createdAt).toLocaleDateString();

    card.innerHTML = `
        <h3>${subject.subject_name}</h3>
        <p class="subject-meta">
            Semester: ${subject.semester} | Created: ${formDate}
        </p>
        <p class="subject-meta" id="faculty-summary-${subject.id}">Average Score: loading... | Responses: loading...</p>
        <div class="subject-actions">
            <button 
                class="btn btn-primary btn-small" 
                onclick="openUrl('${subject.form_link}', 'Google Form')"
            >
                Open Form
            </button>
            <button 
                class="btn btn-secondary btn-small" 
                onclick="openUrl('${subject.sheet_link}', 'Google Sheet')"
            >
                View Sheet
            </button>
            <button 
                class="btn btn-warning btn-small" 
                onclick="downloadReport('${subject.subject_name}', '${subject.sheet_link || ''}')"
            >
                Download
            </button>
            <button 
                class="btn btn-secondary btn-small" 
                onclick="refreshFacultySummary('${subject.id}', '${encodeURIComponent(subject.sheet_link || '')}')"
            >
                Recalculate Avg
            </button>
            <button 
                class="btn btn-danger btn-small" 
                onclick="deleteForm('${subject.id}')"
            >
                Delete
            </button>
        </div>
    `;

    return card;
}

async function loadFacultySubjectSummaries(subjects) {
    await Promise.all(
        subjects.map(async (subject) => {
            await updateFacultySummaryElement(subject.id, subject.sheet_link);
        })
    );
}

async function refreshFacultySummary(subjectId, encodedSheetLink) {
    const sheetLink = decodeURIComponent(encodedSheetLink || '');
    await updateFacultySummaryElement(subjectId, sheetLink, true);
}

async function recalculateAllFacultyAverages() {
    if (!cachedFacultySubjects.length) {
        showMessageFaculty('No subjects available to recalculate.', 'warning');
        return;
    }

    await Promise.all(
        cachedFacultySubjects.map((subject) => updateFacultySummaryElement(subject.id, subject.sheet_link))
    );

    showMessageFaculty('All subject averages recalculated.', 'success');
}

async function updateFacultySummaryElement(subjectId, sheetLink, notify = false) {
    const summaryElement = document.getElementById(`faculty-summary-${subjectId}`);
    if (!summaryElement) return;

    if (!sheetLink) {
        summaryElement.textContent = 'Average Score: N/A | Responses: 0';
        return;
    }

    summaryElement.textContent = 'Average Score: checking... | Responses: checking...';

    try {
        // Try to fetch from API first
        const response = await fetch('/api/sheet-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sheetLink })
        });

        const result = await response.json();
        
        if (!response.ok) {
            console.warn(`API Error: ${result.message || 'Unable to fetch summary'}`);
            // Fallback: Try to get feedback from Firestore directly
            await updateFacultySummaryFromFirestore(subjectId, summaryElement, notify);
            return;
        }

        if (!result.success) {
            console.warn(`API returned success:false. Message: ${result.message}`);
            // Fallback to Firestore
            await updateFacultySummaryFromFirestore(subjectId, summaryElement, notify);
            return;
        }

        const avg = result.averageScore !== null && result.averageScore !== undefined
            ? parseFloat(result.averageScore).toFixed(2)
            : 'N/A';
        const total = result.totalResponses || 0;
        summaryElement.textContent = `Average Score: ${avg} / 5 | Responses: ${total}`;

        if (notify) {
            showMessageFaculty('✅ Average score refreshed successfully.', 'success');
        }
    } catch (error) {
        console.error('Error fetching from API:', error);
        // Fallback to Firestore
        await updateFacultySummaryFromFirestore(subjectId, summaryElement, notify);
    }
}

/**
 * Fallback: Get feedback summary from Firestore
 */
async function updateFacultySummaryFromFirestore(subjectId, summaryElement, notify = false) {
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
                showMessageFaculty('No feedback responses yet.', 'info');
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
            showMessageFaculty('✅ Average score refreshed from database.', 'success');
        }
    } catch (error) {
        console.error('Error fetching from Firestore:', error);
        summaryElement.textContent = 'Average Score: unavailable | Responses: unavailable';
        if (notify) {
            showMessageFaculty(`❌ Unable to refresh average: ${error.message}`, 'error');
        }
    }
}
/**
 * Open URL in new tab
 * @param {string} url - URL to open
 * @param {string} name - Name for the window
 */
function openUrl(url, name) {
    if (!url) {
        showMessageFaculty('Link not available', 'error');
        return;
    }
    window.open(url, name, 'width=1200,height=800');
}

/**
 * Download real report from linked Google Sheet as Excel.
 * @param {string} subjectName - Subject name
 * @param {string} sheetLink - Google Sheet link
 */
async function downloadReport(subjectName, sheetLink) {
    showMessageFaculty(
        `Report download initiated for ${subjectName}. Please wait...`,
        'info'
    );

    try {
        const exportUrl = buildGoogleSheetExportUrl(sheetLink, 'xlsx');
        if (!exportUrl) {
            throw new Error('Sheet link missing or invalid. Open View Sheet and verify it is a Google Sheets URL.');
        }

        const a = document.createElement('a');
        a.href = exportUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.download = `${subjectName}_feedback_${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        showMessageFaculty('Opening real Google Sheet export. If asked, allow access and download as Excel.', 'success');

    } catch (error) {
        console.error('Error downloading report:', error);
        showMessageFaculty(`Error downloading report: ${error.message}`, 'error');
    }
}

/**
 * Build Google Sheet export URL from a sheet link.
 * @param {string} sheetLink
 * @param {string} format
 * @returns {string|null}
 */
function buildGoogleSheetExportUrl(sheetLink, format = 'xlsx') {
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

/**
 * Delete a feedback form
 * @param {string} subjectId - Subject ID to delete
 */
async function deleteForm(subjectId) {
    const confirmDelete = confirm(
        'Are you sure you want to delete this form? This action cannot be undone.'
    );

    if (!confirmDelete) {
        return;
    }

    try {
        // Delete from Firestore
        await firebase.firestore().collection('subjects').doc(subjectId).delete();

        showMessageFaculty('Form deleted successfully!', 'success');

        // Reload forms list
        setTimeout(() => {
            loadFacultyForms();
        }, 1000);

    } catch (error) {
        console.error('Error deleting form:', error);
        showMessageFaculty('Error deleting form. Please try again.', 'error');
    }
}

/**
 * Show message to faculty
 * @param {string} message - Message text
 * @param {string} type - Message type
 */
function showMessageFaculty(message, type = 'info') {
    const messageDiv = document.getElementById('faculty-message');
    messageDiv.textContent = message;
    messageDiv.className = `message show ${type}`;

    if (type !== 'error') {
        setTimeout(() => {
            messageDiv.classList.remove('show');
        }, 5000);
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', initializeFacultyDashboard);
