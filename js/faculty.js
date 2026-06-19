let facultyUser = null;
let facultySubjects = [];
let facultyForms = [];
let chartInstances = {};
let _facultyInitialized = false;

const CREATE_FORM_ENDPOINT = '/api/forms/create';
const FORMS_ENDPOINT = '/api/forms';
const RESPONSES_ENDPOINT = '/api/responses';

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeType(value) {
  const t = normalizeText(value).toLowerCase();
  if (t === 'teaching' || t === 'co' || t === 'gap') return t;
  return 'teaching';
}

function getSubjectName(subject) {
  return subject.subject_name || subject.name || subject.subject || 'Subject';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setStat(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

function showFacultyMessage(message, type = 'info') {
  const el = document.getElementById('faculty-message');
  if (!el) return;
  el.textContent = message;
  el.className = `message show ${type}`;
  if (type !== 'error') {
    setTimeout(() => el.classList.remove('show'), 5000);
  }
}

function getCurrentSubjectId() {
  const select = document.getElementById('subject-select');
  return normalizeText(select?.value);
}

function resolveSubjectForExport(subjectId) {
  const selected = facultySubjects.find((s) => normalizeText(s.id) === normalizeText(subjectId));
  if (!selected) return { subjectId: normalizeText(subjectId), subjectName: '' };
  return {
    subjectId: normalizeText(selected.id),
    subjectName: normalizeText(getSubjectName(selected))
  };
}

function getFormByType(subjectId, type) {
  return facultyForms.find((f) => {
    const sid = normalizeText(f.subjectId || f.subject_id || f.subject);
    return sid === subjectId && normalizeType(f.formType || f.form_type) === type;
  });
}

async function initializeFacultyDashboard() {
  // Prevent double initialization
  if (_facultyInitialized) return;
  _facultyInitialized = true;

  try {
    const firebaseUser = await new Promise((resolve) => {
      const unsub = firebase.auth().onAuthStateChanged((u) => {
        unsub();
        resolve(u);
      });
    });

    if (!firebaseUser) {
      window.location.href = 'login.html';
      return;
    }

    const userDoc = await firebase.firestore().collection('users').doc(firebaseUser.uid).get();
    if (!userDoc.exists) {
      window.location.href = 'login.html';
      return;
    }

    const user = userDoc.data() || {};
    const role = normalizeText(user.role).toLowerCase();
    if (role !== 'faculty' && role !== 'admin') {
      window.location.href = 'login.html';
      return;
    }

    facultyUser = { ...user, uid: firebaseUser.uid };

    const infoEl = document.getElementById('faculty-info');
    if (infoEl) {
      infoEl.textContent = `${facultyUser.fullname || facultyUser.name || facultyUser.username || 'Faculty'} | ${facultyUser.email || ''}`;
    }

    wireEvents();
    await reloadDashboardData();
  } catch (error) {
    console.error('[ERROR] initializeFacultyDashboard', error);
    showFacultyMessage(`Dashboard initialization failed: ${error.message}`, 'error');
  }
}

function wireEvents() {
  const createForm = document.getElementById('create-form');
  if (createForm) createForm.onsubmit = handleCreateForm;

  const manualForm = document.getElementById('manual-form');
  if (manualForm) manualForm.onsubmit = handleManualCreateForm;

  const subjectSelect = document.getElementById('subject-select');
  if (subjectSelect) {
    subjectSelect.onchange = async () => {
      const subjectId = getCurrentSubjectId();
      if (!subjectId) return;
      await refreshSubjectSections(subjectId);
      await renderAnalytics(subjectId);
    };
  }

  const exportSelect = document.getElementById('export-subject-select');
  if (exportSelect) {
    exportSelect.onchange = () => {
      const subjectId = normalizeText(exportSelect.value);
      if (subjectId && subjectSelect) subjectSelect.value = subjectId;
    };
  }
}

async function reloadDashboardData() {
  await loadFacultySubjects();
  await loadFacultyForms();
  populateSubjectSelectors();
  renderOverviewCards();

  const selected = getCurrentSubjectId() || facultySubjects[0]?.id || '';
  if (selected) {
    document.getElementById('subject-select').value = selected;
    document.getElementById('export-subject-select').value = selected;
    await refreshSubjectSections(selected);
    await renderAnalytics(selected);
  } else {
    setEmptySections();
  }
}

async function loadFacultySubjects() {
  const all = await firebase.firestore().collection('subjects').get();
  const docs = all.docs.map((d) => ({ id: d.id, ...d.data() }));

  const role = normalizeText(facultyUser.role).toLowerCase();
  if (role === 'admin') {
    facultySubjects = docs;
    return;
  }

  const me = [
    normalizeText(facultyUser.uid),
    normalizeText(facultyUser.email).toLowerCase(),
    normalizeText(facultyUser.username).toLowerCase(),
    normalizeText(facultyUser.fullname || facultyUser.name).toLowerCase()
  ].filter(Boolean);

  facultySubjects = docs.filter((s) => {
    const owner = [
      normalizeText(s.faculty_id),
      normalizeText(s.faculty_email).toLowerCase(),
      normalizeText(s.faculty_username).toLowerCase(),
      normalizeText(s.faculty_name).toLowerCase(),
      normalizeText(s.owner_id),
      normalizeText(s.owner_email).toLowerCase()
    ].filter(Boolean);

    return owner.some((v) => me.includes(v));
  });
}

async function loadFacultyForms() {
  const response = await fetch(`${FORMS_ENDPOINT}?facultyId=${encodeURIComponent(facultyUser.uid)}`);
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || 'Failed to load forms');
  facultyForms = data.forms || [];
}

function populateSubjectSelectors() {
  const options = facultySubjects
    .map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(getSubjectName(s))}</option>`)
    .join('');

  const subjectSelect = document.getElementById('subject-select');
  if (subjectSelect) subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>' + options;

  const createSubjectSelect = document.getElementById('create-subject-select');
  if (createSubjectSelect) createSubjectSelect.innerHTML = '<option value="">-- Select Subject --</option>' + options;

  const exportSelect = document.getElementById('export-subject-select');
  if (exportSelect) exportSelect.innerHTML = '<option value="">-- Select Subject --</option>' + options;
}

function renderOverviewCards() {
  const subjectCount = new Set(facultyForms.map((f) => normalizeText(f.subjectId || f.subject))).size;
  const teaching = facultyForms.filter((f) => normalizeType(f.formType) === 'teaching').length;
  const co = facultyForms.filter((f) => normalizeType(f.formType) === 'co').length;
  const gap = facultyForms.filter((f) => normalizeType(f.formType) === 'gap').length;

  setStat('stat-subjects', subjectCount);
  setStat('stat-teaching', teaching);
  setStat('stat-co', co);
  setStat('stat-gap', gap);
}

function buildFormActionCard(form, typeLabel) {
  const title = `${typeLabel} Form`;
  const formUrl = normalizeText(form?.formUrl);
  const sheetUrl = normalizeText(form?.sheetUrl);
  const formId = normalizeText(form?.id);
  const formType = normalizeType(form?.formType);
  const disabled = !formId ? 'disabled' : '';

  return `
    <div class="form-action-card">
      <h4>${escapeHtml(title)}</h4>
      <div class="form-action-row">
       <button class=\"btn btn-secondary btn-small\" onclick=\"openFormUrl('${escapeHtml(form?.editUrl || formUrl)}','edit')\">Open Form</button>
        <button class="btn btn-secondary btn-small" onclick="openFormUrl('${escapeHtml(sheetUrl)}','sheet')">Open Google Sheet</button>
        <button class="btn btn-secondary btn-small" ${disabled} onclick="downloadFormExcel('${escapeHtml(formId)}','${escapeHtml(formType)}','${escapeHtml(sheetUrl)}')">Download Excel</button>
        <button class="btn btn-danger btn-small" ${disabled} onclick="deleteFormEntry('${escapeHtml(formId)}')">Delete Form</button>
      </div>
      <p class="info-text" style="margin-top:8px;word-break:break-all;">Form: ${escapeHtml(formUrl || 'Not available')}</p>
      <p class="info-text" style="word-break:break-all;">Sheet: ${escapeHtml(sheetUrl || 'Not available')}</p>
    </div>`;
}

async function refreshSubjectSections(subjectId) {
  const subject = facultySubjects.find((s) => s.id === subjectId);
  if (!subject) {
    setEmptySections();
    return;
  }

  const formsWrap = document.getElementById('subject-forms-wrap');
  if (!formsWrap) return;

  const teachingForm = getFormByType(subjectId, 'teaching');
  const coForm = getFormByType(subjectId, 'co');
  const gapForm = getFormByType(subjectId, 'gap');

  formsWrap.innerHTML = `
    <h3 style="margin-bottom:8px;">${escapeHtml(getSubjectName(subject))}</h3>
    <div class="subject-sections-grid">
      ${buildFormActionCard(teachingForm, 'Teaching Feedback')}
      ${buildFormActionCard(coForm, 'CO Attainment')}
      ${buildFormActionCard(gapForm, 'Gap Analysis')}
    </div>
    <div style="margin-top:12px;">
      <button class="btn btn-danger btn-small" onclick="deleteAllSubjectForms('${escapeHtml(subjectId)}')">Delete All Forms Of Subject</button>
    </div>`;
}

function setEmptySections() {
  ['subject-forms-wrap', 'overview-detail', 'co-results-wrap', 'gap-results-wrap', 'responses-table-wrap'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<p style="color:#888;">Select a subject to view details.</p>';
  });
}

async function renderAnalytics(subjectId) {
  await Promise.all([
    renderTeachingAnalytics(subjectId),
    renderCOAnalytics(subjectId),
    renderGapAnalytics(subjectId),
    renderResponsesTable(subjectId)
  ]);
}

async function renderTeachingAnalytics(subjectId) {
  const wrap = document.getElementById('overview-detail');
  if (!wrap) return;

  try {
    // Fetch all three types of data for comprehensive overview
    const [teachRes, coRes, gapRes] = await Promise.all([
      fetch(`/api/summary/${encodeURIComponent(subjectId)}?type=teaching`),
      fetch(`/api/summary/${encodeURIComponent(subjectId)}?type=co`),
      fetch(`/api/summary/${encodeURIComponent(subjectId)}?type=gap`)
    ]);

    const teachData = await teachRes.json();
    const coData = await coRes.json();
    const gapData = await gapRes.json();

    // Check if we have any data at all
    const totalResponses = Number(teachData.totalResponses || 0);
    if (!totalResponses) {
      wrap.innerHTML = '<p style="color:#888;">No responses collected yet. Responses will appear here once students submit feedback.</p>';
      Object.values(chartInstances).forEach(c => c?.destroy?.());
      return;
    }

    // Build comprehensive overview
    const teachLabels = Array.from({ length: 12 }, (_, i) => `Q${i + 1}`);
    const teachValues = teachLabels.map((q) => Number(teachData.questionAverages?.[q] || 0));
    const coLabels = Object.keys(coData.coAttainment || {});
    const coValues = coLabels.map((k) => Number(coData.coAttainment[k] || 0));
    const gapLabels = Object.keys(gapData.frequency || {});
    const gapValues = gapLabels.map((k) => Number(gapData.frequency[k] || 0));

    // Identify weak areas (teaching questions with avg < 3)
    const weakAreas = teachLabels.filter((q, i) => teachValues[i] < 3);
    const strongAreas = teachLabels.filter((q, i) => teachValues[i] >= 4);
    
    // Calculate statistics
    const avgTeaching = Number(teachData.overallAverage || 0).toFixed(2);
    const avgCO = Number(coData.overallAttainment || 0).toFixed(2);

    wrap.innerHTML = `
      <style>
        .overview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 20px; }
        .stat-summary { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
        .stat-summary h4 { margin: 0 0 12px 0; color: #1e293b; font-size: 0.95rem; }
        .stat-value { font-size: 2rem; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        .stat-unit { font-size: 0.85rem; color: #64748b; }
        .weak-area { background: #fee2e2; color: #991b1b; padding: 6px 10px; border-radius: 4px; margin: 2px; display: inline-block; font-size: 0.9rem; }
        .strong-area { background: #dcfce7; color: #166534; padding: 6px 10px; border-radius: 4px; margin: 2px; display: inline-block; font-size: 0.9rem; }
        .chart-container { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
        .detailed-breakdown { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin-top: 12px; }
        .q-card { background: white; border-left: 4px solid #3b82f6; padding: 12px; border-radius: 4px; text-align: center; }
        .q-score { font-size: 1.6rem; font-weight: 700; color: #0f172a; }
        .q-label { font-size: 0.9rem; color: #64748b; margin-top: 4px; }
      </style>

      <!-- Summary Statistics -->
      <div class="overview-grid">
        <div class="stat-summary">
          <h4>📊 Teaching Feedback</h4>
          <div class="stat-value">${avgTeaching}</div>
          <div class="stat-unit">out of 5.00 (${totalResponses} responses)</div>
        </div>
        <div class="stat-summary">
          <h4>🎯 CO Attainment</h4>
          <div class="stat-value">${avgCO}%</div>
          <div class="stat-unit">${totalResponses} feedback collected</div>
        </div>
        <div class="stat-summary">
          <h4>📈 Gap Analysis</h4>
          <div class="stat-value">${gapValues.reduce((a, b) => a + b, 0)}</div>
          <div class="stat-unit">areas needing improvement</div>
        </div>
        <div class="stat-summary">
          <h4>⚠️ Priority Issues</h4>
          <div class="stat-value">${weakAreas.length}</div>
          <div class="stat-unit">questions scoring < 3.0</div>
        </div>
      </div>

      <!-- Weak & Strong Areas -->
      <div class="chart-container">
        <h3 style="margin: 0 0 12px 0; color: #1e293b;">Problem Areas & Strengths</h3>
        ${weakAreas.length > 0 ? `
          <div style="margin-bottom: 12px;">
            <p style="font-weight: 600; color: #991b1b; margin: 0 0 8px 0;">⚠️ Low Rating Questions (< 3.0):</p>
            <div>${weakAreas.map(q => {
              const idx = parseInt(q.replace('Q', '')) - 1;
              return `<span class="weak-area">${q}: ${teachValues[idx].toFixed(2)}/5</span>`;
            }).join('')}</div>
          </div>
        ` : '<p style="color: #16a34a; margin-bottom: 12px;">✅ All questions are rated 3.0 or above!</p>'}
        ${strongAreas.length > 0 ? `
          <div>
            <p style="font-weight: 600; color: #166534; margin: 0 0 8px 0;">✨ High Rating Questions (≥ 4.0):</p>
            <div>${strongAreas.map(q => {
              const idx = parseInt(q.replace('Q', '')) - 1;
              return `<span class="strong-area">${q}: ${teachValues[idx].toFixed(2)}/5</span>`;
            }).join('')}</div>
          </div>
        ` : ''}
      </div>

      <!-- Teaching Feedback Chart -->
      <div class="chart-container">
        <h3 style="margin: 0 0 12px 0; color: #1e293b;">Teaching Feedback - Question Breakdown</h3>
        <canvas id="chart-teaching" height="80"></canvas>
      </div>

      <!-- Teaching Scores Detail -->
      <div class="chart-container">
        <h3 style="margin: 0 0 12px 0; color: #1e293b;">Individual Question Scores</h3>
        <div class="detailed-breakdown">
          ${teachLabels.map((q, i) => {
            const score = teachValues[i].toFixed(2);
            const colorClass = score < 3 ? '#ef4444' : score < 4 ? '#eab308' : '#22c55e';
            return `
              <div class="q-card" style="border-left-color: ${colorClass}">
                <div class="q-label">${q}</div>
                <div class="q-score" style="color: ${colorClass}">${score}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- CO Attainment Summary -->
      ${coValues.length > 0 ? `
        <div class="chart-container">
          <h3 style="margin: 0 0 12px 0; color: #1e293b;">CO Attainment Distribution</h3>
          <div class="detailed-breakdown">
            ${coLabels.map((co, i) => `
              <div class="q-card">
                <div class="q-label">${co}</div>
                <div class="q-score" style="color: #7c3aed">${coValues[i].toFixed(1)}%</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Gap Analysis Summary -->
      ${gapValues.length > 0 ? `
        <div class="chart-container">
          <h3 style="margin: 0 0 12px 0; color: #1e293b;">Gap Analysis Frequency</h3>
          <div class="detailed-breakdown">
            ${gapLabels.map((gap, i) => `
              <div class="q-card" style="border-left-color: #dc2626">
                <div class="q-label">${gap}</div>
                <div class="q-score" style="color: #dc2626">${gapValues[i]}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- CO Chart -->
      <div class="chart-container">
        <h3 style="margin: 0 0 12px 0; color: #1e293b;">CO Attainment - Pie Chart</h3>
        <canvas id="chart-co" height="80"></canvas>
      </div>

      <!-- Gap Chart -->
      <div class="chart-container">
        <h3 style="margin: 0 0 12px 0; color: #1e293b;">Gap Analysis - Frequency Chart</h3>
        <canvas id="chart-gap" height="80"></canvas>
      </div>
    `;

    // Render Teaching Chart
    if (chartInstances.teaching) chartInstances.teaching.destroy();
    const ctxTeach = document.getElementById('chart-teaching')?.getContext('2d');
    if (ctxTeach) {
      chartInstances.teaching = new Chart(ctxTeach, {
        type: 'bar',
        data: {
          labels: teachLabels,
          datasets: [{
            label: 'Average Score',
            data: teachValues,
            backgroundColor: teachValues.map((v) => (v < 3 ? '#fda4af' : v < 4 ? '#fbbf24' : '#86efac')),
            borderColor: teachValues.map((v) => (v < 3 ? '#e11d48' : v < 4 ? '#d97706' : '#16a34a')),
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 2,
          scales: { y: { min: 0, max: 5, ticks: { stepSize: 1 } } },
          plugins: { legend: { display: false } }
        }
      });
    }

    // Render CO Chart
    if (coValues.length > 0) {
      if (chartInstances.co) chartInstances.co.destroy();
      const ctxCO = document.getElementById('chart-co')?.getContext('2d');
      if (ctxCO) {
        chartInstances.co = new Chart(ctxCO, {
          type: 'pie',
          data: {
            labels: coLabels,
            datasets: [{
              label: 'Attainment %',
              data: coValues,
              backgroundColor: ['#60a5fa', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#22d3ee', '#4ade80', '#f97316', '#ec4899', '#84cc16', '#14b8a6', '#6366f1']
            }]
          }
        });
      }
    }

    // Render Gap Chart
    if (gapValues.length > 0) {
      if (chartInstances.gap) chartInstances.gap.destroy();
      const ctxGap = document.getElementById('chart-gap')?.getContext('2d');
      if (ctxGap) {
        chartInstances.gap = new Chart(ctxGap, {
          type: 'bar',
          data: {
            labels: gapLabels,
            datasets: [{ label: 'Frequency', data: gapValues, backgroundColor: '#fca5a5', borderColor: '#ef4444', borderWidth: 1 }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
            plugins: { legend: { display: false } }
          }
        });
      }
    }
  } catch (error) {
    console.error('[ERROR] renderTeachingAnalytics', error);
    wrap.innerHTML = `<p style="color:#dc2626;">Error loading analytics: ${escapeHtml(error.message)}</p>`;
  }
}

async function renderCOAnalytics(subjectId) {
  const wrap = document.getElementById('co-results-wrap');
  if (!wrap) return;

  const response = await fetch(`/api/summary/${encodeURIComponent(subjectId)}?type=co`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    wrap.innerHTML = `<p style="color:#dc2626;">${escapeHtml(data.message || 'Failed to load CO analytics')}</p>`;
    return;
  }

  const labels = Object.keys(data.coAttainment || {});
  const values = labels.map((k) => Number(data.coAttainment[k] || 0));

  if (!Number(data.totalResponses || 0)) {
    wrap.innerHTML = '<p style="color:#888;">No CO responses with answers yet.</p>';
    if (chartInstances.co) chartInstances.co.destroy();
    return;
  }

  wrap.innerHTML = `
    <div class="chart-wrap">
      <h3>CO Attainment (Overall ${Number(data.overallAttainment || 0).toFixed(2)}%)</h3>
      <canvas id="chart-co" height="90"></canvas>
    </div>`;

  if (chartInstances.co) chartInstances.co.destroy();
  const ctx = document.getElementById('chart-co').getContext('2d');
  chartInstances.co = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        label: 'Attainment %',
        data: values,
        backgroundColor: ['#60a5fa', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#22d3ee', '#4ade80', '#f97316', '#ec4899', '#84cc16', '#14b8a6', '#6366f1']
      }]
    }
  });
}

async function renderGapAnalytics(subjectId) {
  const wrap = document.getElementById('gap-results-wrap');
  if (!wrap) return;

  const response = await fetch(`/api/summary/${encodeURIComponent(subjectId)}?type=gap`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    wrap.innerHTML = `<p style="color:#dc2626;">${escapeHtml(data.message || 'Failed to load gap analytics')}</p>`;
    return;
  }

  const labels = Object.keys(data.frequency || {});
  const values = labels.map((k) => Number(data.frequency[k] || 0));

  if (!Number(data.totalResponses || 0)) {
    wrap.innerHTML = '<p style="color:#888;">No gap responses with answers yet.</p>';
    if (chartInstances.gap) chartInstances.gap.destroy();
    return;
  }

  wrap.innerHTML = `
    <div class="chart-wrap">
      <h3>Gap Frequency</h3>
      <canvas id="chart-gap" height="90"></canvas>
    </div>`;

  if (chartInstances.gap) chartInstances.gap.destroy();
  const ctx = document.getElementById('chart-gap').getContext('2d');
  chartInstances.gap = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Frequency', data: values, backgroundColor: '#fca5a5', borderColor: '#ef4444', borderWidth: 1 }]
    },
    options: {
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
      plugins: { legend: { display: false } }
    }
  });
}

async function renderResponsesTable(subjectId) {
  const wrap = document.getElementById('responses-table-wrap');
  if (!wrap) return;

  const teachingForm = getFormByType(subjectId, 'teaching');
  if (!teachingForm || !teachingForm.id || teachingForm.id.startsWith('legacy_')) {
    wrap.innerHTML = '<p style="color:#888;">Teaching form not managed by API yet. Create or save it once to enable response table.</p>';
    return;
  }

  const response = await fetch(`${RESPONSES_ENDPOINT}/${encodeURIComponent(teachingForm.id)}`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    wrap.innerHTML = `<p style="color:#dc2626;">${escapeHtml(data.message || 'Failed to load responses')}</p>`;
    return;
  }

  const rows = Array.isArray(data.submissions) ? data.submissions : [];
  if (!rows.length) {
    wrap.innerHTML = '<p style="color:#888;">No submission rows found.</p>';
    return;
  }

  wrap.innerHTML = `
    <div class="table-responsive">
      <table class="resp-table">
        <thead>
          <tr>
            <th>Student Name</th>
            <th>Email</th>
            <th>Form Type</th>
            <th>Submitted At</th>
            <th>Q1</th>
            <th>Q2</th>
            <th>Q3</th>
            <th>Q4</th>
            <th>Q5</th>
            <th>Q6</th>
            <th>Q7</th>
            <th>Q8</th>
            <th>Q9</th>
            <th>Q10</th>
            <th>Q11</th>
            <th>Q12</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => {
            const answers = row.answers || {};
            return `
              <tr>
                <td>${escapeHtml(row.student_name || '-')}</td>
                <td>${escapeHtml(row.student_email || '-')}</td>
                <td>${escapeHtml(row.form_type || '-')}</td>
                <td>${escapeHtml(row.timestamp ? new Date(row.timestamp).toLocaleString() : '-')}</td>
                ${Array.from({ length: 12 }, (_, i) => `<td>${escapeHtml(answers[`Q${i + 1}`] ?? '')}</td>`).join('')}
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

async function handleCreateForm(event) {
  event.preventDefault();

  const subjectId = normalizeText(document.getElementById('create-subject-select')?.value);
  const formType = normalizeText(document.getElementById('create-form-type')?.value);
  const semester = normalizeText(document.getElementById('subject-semester')?.value);

  if (!subjectId || !formType) {
    showFacultyMessage('Select subject and form type first.', 'error');
    return;
  }

  const subject = facultySubjects.find((s) => s.id === subjectId);
  if (!subject) {
    showFacultyMessage('Invalid subject selected.', 'error');
    return;
  }

  const btn = document.getElementById('create-form-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Creating Form...';
  }

  try {
    const response = await fetch(CREATE_FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'auto',
        facultyId: facultyUser.uid,
        subjectId,
        subject: getSubjectName(subject),
        semester,
        formType
      })
    });

    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Create form failed');

    showFacultyMessage('Form created successfully.', 'success');
    await reloadDashboardData();
  } catch (error) {
    console.error('[ERROR] handleCreateForm', error);
    showFacultyMessage(`Error creating form: ${error.message}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Create Form';
    }
  }
}

async function handleManualCreateForm(event) {
  event.preventDefault();

  const subjectId = normalizeText(document.getElementById('create-subject-select')?.value);
  const formType = normalizeText(document.getElementById('manual-form-type')?.value);
  const semester = normalizeText(document.getElementById('subject-semester')?.value);
  const formUrl = normalizeText(document.getElementById('manual-form-link')?.value);
  const sheetUrl = normalizeText(document.getElementById('manual-sheet-link')?.value);

  if (!subjectId || !formType || !formUrl || !sheetUrl) {
    showFacultyMessage('Select subject/form type and provide form/sheet links.', 'error');
    return;
  }

  const subject = facultySubjects.find((s) => s.id === subjectId);
  if (!subject) {
    showFacultyMessage('Invalid subject selected.', 'error');
    return;
  }

  try {
    const response = await fetch(CREATE_FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'manual',
        facultyId: facultyUser.uid,
        subjectId,
        subject: getSubjectName(subject),
        semester,
        formType,
        formUrl,
        sheetUrl
      })
    });

    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Manual save failed');

    showFacultyMessage('Manual form saved successfully.', 'success');
    document.getElementById('manual-form')?.reset();
    await reloadDashboardData();
  } catch (error) {
    console.error('[ERROR] handleManualCreateForm', error);
    showFacultyMessage(`Error saving manual form: ${error.message}`, 'error');
  }
}

function openManualFormTools() {
  window.open('https://forms.new', '_blank');
}

function openManualSheetTool() {
  window.open('https://sheets.new', '_blank');
}

function openFormUrl(url, kind = 'generic') {
  const safeUrl = normalizeText(url);
  if (!safeUrl) {
    showFacultyMessage('Link is not available yet.', 'error');
    return;
  }

  let targetUrl = safeUrl;
  if (kind === 'form' && /docs\.google\.com\/forms\//i.test(safeUrl)) {
    // Faculty should open form editor/owner view, not responder view that can show "already responded".
    targetUrl = safeUrl.replace(/\/viewform(\?.*)?$/i, '/edit');
  }

  window.open(targetUrl, '_blank');
}

async function deleteFormEntry(formId) {
  if (!formId || formId.startsWith('legacy_')) {
    showFacultyMessage('This form is legacy-only. Save it once manually to manage deletion.', 'error');
    return;
  }

  if (!confirm('Delete this form entry?')) return;

  try {
    const response = await fetch(`/api/forms/${encodeURIComponent(formId)}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Delete failed');

    showFacultyMessage('Form deleted successfully.', 'success');
    await reloadDashboardData();
  } catch (error) {
    console.error('[ERROR] deleteFormEntry', error);
    showFacultyMessage(`Delete failed: ${error.message}`, 'error');
  }
}

async function deleteAllSubjectForms(subjectId) {
  const forms = facultyForms.filter((f) => normalizeText(f.subjectId || f.subject) === subjectId && !String(f.id).startsWith('legacy_'));
  if (!forms.length) {
    showFacultyMessage('No managed forms found for this subject.', 'error');
    return;
  }

  if (!confirm('Delete all forms for this subject?')) return;

  try {
    for (const form of forms) {
      const response = await fetch(`/api/forms/${encodeURIComponent(form.id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || `Delete failed for ${form.id}`);
    }

    showFacultyMessage('All forms for subject deleted.', 'success');
    await reloadDashboardData();
  } catch (error) {
    console.error('[ERROR] deleteAllSubjectForms', error);
    showFacultyMessage(`Delete all failed: ${error.message}`, 'error');
  }
}

function downloadExcelReport(type) {
  const subjectId = normalizeText(document.getElementById('export-subject-select')?.value);
  if (!subjectId) {
    showFacultyMessage('Please select a subject for export.', 'error');
    return;
  }

  const resolved = resolveSubjectForExport(subjectId);
  const params = new URLSearchParams();
  if (resolved.subjectId) params.set('subject', resolved.subjectId);
  if (resolved.subjectName) params.set('subjectName', resolved.subjectName);
  window.location.href = `/api/export/${encodeURIComponent(type)}?${params.toString()}`;
}

function toGoogleSheetCsvUrl(sheetUrl) {
  const safeUrl = normalizeText(sheetUrl);
  if (!safeUrl) return '';

  const idMatch = safeUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i);
  if (!idMatch || !idMatch[1]) return '';

  const gidMatch = safeUrl.match(/[?&]gid=(\d+)/i);
  const gid = gidMatch && gidMatch[1] ? gidMatch[1] : '0';
  return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv&gid=${gid}`;
}

function downloadFormExcel(formId, type, sheetUrl = '') {
  if (!formId) {
    showFacultyMessage('Form is missing.', 'error');
    return;
  }

  // Legacy/manual forms may not have synced feedback_submissions yet. Use sheet CSV directly.
  if (String(formId).startsWith('legacy_')) {
    const directCsvUrl = toGoogleSheetCsvUrl(sheetUrl);
    if (directCsvUrl) {
      window.open(directCsvUrl, '_blank');
      return;
    }
  }

  const currentSubjectId = getCurrentSubjectId();
  const resolved = resolveSubjectForExport(currentSubjectId);
  const params = new URLSearchParams();
  params.set('formId', formId);
  if (resolved.subjectId) params.set('subject', resolved.subjectId);
  if (resolved.subjectName) params.set('subjectName', resolved.subjectName);
  window.location.href = `/api/export/${encodeURIComponent(type)}?${params.toString()}`;
}

function switchFacultyTab(tabId, btn) {
  document.querySelectorAll('.tab-pane').forEach((pane) => {
    pane.style.display = pane.id === tabId ? 'block' : 'none';
    pane.classList.toggle('active', pane.id === tabId);
  });
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function handleLogout() {
  localStorage.removeItem('pin_verified_session');
  firebase.auth().signOut().then(() => {
    window.location.href = 'login.html';
  });
}

document.addEventListener('DOMContentLoaded', initializeFacultyDashboard);
