// ==========================================
// STUDENT DASHBOARD — FINAL FIXED VERSION
// Fix: uid taken directly from firebase.auth()
// ==========================================

let currentUser = null;
let _studentInitialized = false;

function normalizeText(value) {
    return String(value || '').trim();
}

function normalizeType(value) {
    const t = normalizeText(value).toLowerCase();
    if (t === 'teaching' || t === 'co' || t === 'gap') return t;
    return 'teaching';
}

function hasAnsweredSubmission(data) {
    if (!data || typeof data !== 'object') return false;

    const answers = data.answers && typeof data.answers === 'object' ? data.answers : null;
    if (answers && Object.keys(answers).length > 0) return true;

    for (let i = 1; i <= 12; i++) {
        const raw = data[`Q${i}`];
        const num = Number(raw);
        if (Number.isFinite(num) && num >= 1 && num <= 5) return true;
    }

    return false;
}

function submissionMatchesSubject(data, subject) {
    if (!data || !subject) return false;

    const targetId = normalizeText(subject.id).toLowerCase();
    const targetName = normalizeText(subject.subject_name || subject.name || subject.subject).toLowerCase();
    const subjectId = normalizeText(data.subject_id || data.subjectId).toLowerCase();
    const subjectName = normalizeText(data.subject).toLowerCase();

    // Don't match on empty strings — this was causing false positives for new students
    if (!targetId && !targetName) return false;
    if (!subjectId && !subjectName) return false;

    return [subjectId, subjectName].some((value) => {
        if (!value) return false;
        return (targetId && value === targetId) || (targetName && value === targetName);
    });
}

async function getStudentFeedbackDocs() {
    const db = firebase.firestore();
    const queries = [];

    if (currentUser?.uid) {
        queries.push(db.collection('feedback_submissions').where('student_uid', '==', currentUser.uid).get());
    }
    if (currentUser?.email) {
        queries.push(db.collection('feedback_submissions').where('student_email', '==', currentUser.email).get());
    }

    const snaps = await Promise.all(queries);
    const combined = new Map();

    snaps.forEach((snap) => {
        snap.forEach((doc) => {
            combined.set(doc.id, { id: doc.id, ...doc.data() });
        });
    });

    return Array.from(combined.values());
}

async function getSubjectFormsMap() {
    const snap = await firebase.firestore().collection('feedback_forms').get();
    const map = new Map();

    snap.forEach((doc) => {
        const data = doc.data() || {};
        const type = normalizeType(data.formType || data.form_type);
        const keys = [
            normalizeText(data.subjectId || data.subject_id).toLowerCase(),
            normalizeText(data.subject).toLowerCase()
        ].filter(Boolean);

        keys.forEach((key) => {
            if (!map.has(key)) {
                map.set(key, { teaching: '', co: '', gap: '' });
            }
            const entry = map.get(key);
            entry[type] = normalizeText(data.formUrl || data.form_link || data.formURL);
        });
    });

    return map;
}

async function initializeStudentDashboard() {
    // Prevent double initialization (caused by both DOMContentLoaded and onAuthStateChanged triggers)
    if (_studentInitialized) return;
    _studentInitialized = true;

    // Wait for Firebase Auth to be ready
    await new Promise(resolve => {
        const unsub = firebase.auth().onAuthStateChanged(user => {
            unsub();
            resolve(user);
        });
    });

    const firebaseUser = firebase.auth().currentUser;
    if (!firebaseUser) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const userDoc = await firebase.firestore()
            .collection('users').doc(firebaseUser.uid).get();

        if (!userDoc.exists) {
            window.location.href = 'login.html';
            return;
        }

        // Build currentUser with uid GUARANTEED
        currentUser = {
            ...userDoc.data(),
            uid: firebaseUser.uid   // ← always set from firebase.auth()
        };

        if (currentUser.role !== 'student') {
            window.location.href = 'login.html';
            return;
        }

        const infoEl = document.getElementById('student-info');
        if (infoEl) {
            infoEl.textContent =
                `Welcome, ${currentUser.fullname || currentUser.name || currentUser.username || 'Student'
                } | Semester: ${currentUser.semester || 'N/A'
                } | Branch: ${currentUser.branch || 'N/A'}`;
        }

        loadSubjectsForStudent();

    } catch (err) {
        console.error('Init error:', err);
        showMessageStudent('Error initializing. Please refresh.', 'error');
    }
}

// ── Load subjects ─────────────────────────────────────────────────────────
async function loadSubjectsForStudent() {
    const gridEl    = document.getElementById('subjects-grid');
    const emptyEl   = document.getElementById('empty-state');
    const loadingEl = document.getElementById('loading');

    if (gridEl)    gridEl.innerHTML = '';
    if (loadingEl) loadingEl.style.display = 'block';
    if (emptyEl)   emptyEl.style.display   = 'none';

    try {
        const endpoint = `/api/student-dashboard?uid=${encodeURIComponent(currentUser.uid)}&email=${encodeURIComponent(currentUser.email || '')}&semester=${encodeURIComponent(currentUser.semester || '')}`;
        const response = await fetch(endpoint);
        const data = await response.json();

        if (response.ok && data.success && Array.isArray(data.subjects)) {
            if (!data.subjects.length) {
                if (loadingEl) loadingEl.style.display = 'none';
                if (emptyEl)   emptyEl.style.display   = 'block';
                return;
            }

            data.subjects.forEach((subject) => {
                const card = createSubjectCard(subject, subject.submitted || { teaching: false, co: false, gap: false }, subject.submittedData || {});
                if (gridEl) gridEl.appendChild(card);
            });

            if (loadingEl) loadingEl.style.display = 'none';
            return;
        }

        throw new Error(data.message || 'Failed to load student dashboard');

        if (loadingEl) loadingEl.style.display = 'none';

    } catch (err) {
        console.error('Load error:', err);
        // Fallback to direct Firestore reads if the backend endpoint is unreachable.
        try {
            const allSnap = await firebase.firestore().collection('subjects').get();
            const studentDocs = await getStudentFeedbackDocs();
            const formsMap = await getSubjectFormsMap();

            if (allSnap.empty) {
                if (loadingEl) loadingEl.style.display = 'none';
                if (emptyEl)   emptyEl.style.display   = 'block';
                return;
            }

            const mySem = String(currentUser.semester || '');
            const matching = allSnap.docs.filter(doc => {
                const s = doc.data().semester;
                return s === undefined || String(s) === mySem || mySem === '';
            });

            if (!matching.length) {
                if (loadingEl) loadingEl.style.display = 'none';
                if (emptyEl)   emptyEl.style.display   = 'block';
                return;
            }

            for (const doc of matching) {
                const subject = { ...doc.data(), id: doc.id };
                const subjectKey = normalizeText(subject.id || '').toLowerCase();
                const subjectNameKey = normalizeText(subject.subject_name || subject.name || subject.subject).toLowerCase();
                const formBundle = formsMap.get(subjectKey) || formsMap.get(subjectNameKey) || null;

                subject.form_link = subject.form_link || subject.formUrl || formBundle?.teaching || '';
                subject.co_form_link = subject.co_form_link || subject.coFormLink || formBundle?.co || '';
                subject.gap_form_link = subject.gap_form_link || subject.gapFormLink || formBundle?.gap || '';

                const submitted    = { teaching: false, co: false, gap: false };
                const submittedData = { teaching: null,  co: null,  gap: null  };

                studentDocs.forEach((entry) => {
                    const type = normalizeType(entry.form_type || entry.formType);
                    if (!submitted[type]) {
                        if (hasAnsweredSubmission(entry) && submissionMatchesSubject(entry, subject)) {
                            submitted[type] = true;
                            submittedData[type] = entry;
                        }
                    }
                });

                const card = createSubjectCard(subject, submitted, submittedData);
                if (gridEl) gridEl.appendChild(card);
            }

            if (loadingEl) loadingEl.style.display = 'none';
        } catch (fallbackErr) {
            console.error('Fallback load error:', fallbackErr);
            if (loadingEl) loadingEl.style.display = 'none';
            showMessageStudent('Error loading subjects: ' + fallbackErr.message, 'error');
        }
    }
}

// ── Build subject card ─────────────────────────────────────────────────────
function createSubjectCard(subject, submitted, submittedData) {
    const card = document.createElement('div');
    card.className = 'subject-card';

    const done  = [submitted.teaching, submitted.co, submitted.gap].filter(Boolean).length;
    const allOk = done === 3;

    const subjectName = subject.subject_name || subject.name || 'Unknown Subject';
    const formLink    = subject.form_link    || '';
    const coLink      = subject.co_form_link || '';
    const gapLink     = subject.gap_form_link|| '';

    const btnHTML = (label, type, done_flag, link) => {
        if (done_flag) {
            const ts = submittedData[type]?.timestamp
                ? new Date(submittedData[type].timestamp).toLocaleDateString() : '';
            return `
                <div class="form-row form-row-done">
                    <div class="form-row-left">
                        <span class="form-row-label">${label}</span>
                        ${ts ? `<span class="submitted-at">Submitted: ${ts}</span>` : ''}
                    </div>
                    <div class="form-row-actions">
                        <span class="badge-done">✅ Done</span>
                        ${link ? `<button class="btn-view" onclick="window.open('${link}','_blank')">👁 View</button>` : ''}
                    </div>
                </div>`;
        }
        return `
            <div class="form-row">
                <div class="form-row-left">
                    <span class="form-row-label">${label}</span>
                </div>
                <div class="form-row-actions">
                    <button class="btn btn-primary btn-small"
                        onclick="openForm('${link}','${subject.id}','${type}')">
                        Fill Form
                    </button>
                </div>
            </div>`;
    };

    card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <h3 style="margin:0;font-size:1rem;">${subjectName}</h3>
            <span class="subject-status ${allOk ? 'submitted' : 'not-submitted'}">${done}/3 Completed</span>
        </div>
        <p style="font-size:0.82rem;color:#666;margin:2px 0 10px;">
            Faculty: ${subject.faculty_name || 'N/A'} &nbsp;|&nbsp; Code: ${subject.subject_code || subject.code || 'N/A'}
        </p>
        <div style="display:flex;flex-direction:column;gap:8px;">
            ${btnHTML('📝 Teaching Feedback', 'teaching', submitted.teaching, formLink)}
            ${btnHTML('📊 CO Attainment',     'co',       submitted.co,       coLink)}
            ${btnHTML('🔍 Curricular Gap',    'gap',      submitted.gap,      gapLink)}
        </div>`;

    return card;
}

// ── Open form & record submission ──────────────────────────────────────────
let _refreshTimer = null;
async function openForm(formLink, subjectId, formType) {
    if (!formLink || formLink === 'undefined' || formLink === '') {
        showMessageStudent('Form link not set yet. Please contact faculty.', 'error');
        return;
    }

    try {
        // Open the form immediately — Google Forms handles duplicate prevention
        // via setLimitOneResponsePerUser. Don't block students with our own check.
        window.open(formLink, '_blank', 'width=860,height=650');
        
        // Record that the student opened this form so the 0/3 counter updates!
        try {
            const db = firebase.firestore();
            await db.collection('feedback_submissions').add({
                subject_id: subjectId,
                form_type: formType,
                student_uid: currentUser.uid,
                student_email: currentUser.email || '',
                student_name: currentUser.displayName || currentUser.name || currentUser.fullname || '',
                form_opened: true,
                source: 'student_dashboard_click',
                timestamp: new Date().toISOString()
            });
        } catch (dbErr) {
            console.error('Failed to record form open:', dbErr);
        }

        showMessageStudent('Form opened! After submitting, click "Refresh Status" below or wait 15 seconds.', 'success');

        // Show a refresh button instead of auto-refreshing (prevents dashboard bouncing)
        const gridEl = document.getElementById('subjects-grid');
        if (gridEl && !document.getElementById('refresh-status-btn')) {
            const refreshBtn = document.createElement('button');
            refreshBtn.id = 'refresh-status-btn';
            refreshBtn.className = 'btn btn-primary';
            refreshBtn.style.cssText = 'margin:12px auto;display:block;';
            refreshBtn.textContent = '🔄 Refresh Status';
            refreshBtn.onclick = function() {
                refreshBtn.remove();
                loadSubjectsForStudent();
            };
            gridEl.parentNode.insertBefore(refreshBtn, gridEl);
        }

        // Single delayed auto-refresh (not 3 rapid ones that cause bouncing)
        if (_refreshTimer) clearTimeout(_refreshTimer);
        _refreshTimer = setTimeout(() => {
            const btn = document.getElementById('refresh-status-btn');
            if (btn) btn.remove();
            loadSubjectsForStudent();
        }, 15000);

    } catch (err) {
        console.error('openForm error:', err);
        window.open(formLink, '_blank');
    }
}

// ── Message helper ─────────────────────────────────────────────────────────
function showMessageStudent(msg, type = 'info') {
    const el = document.getElementById('student-message');
    if (!el) return;
    el.textContent = msg;
    el.className   = `message show ${type}`;
    if (type !== 'error') setTimeout(() => el.classList.remove('show'), 5000);
}

// ── Boot ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initializeStudentDashboard);