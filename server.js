const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();
const path = require('path');
const admin = require('./firebase-admin-config');

const app = express();
const PORT = process.env.PORT || 3001;
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || '';

app.use(express.json());
app.use(express.static(__dirname));

function isAdminReady() {
  return Boolean(admin && Array.isArray(admin.apps) && admin.apps.length > 0);
}

function getDbOrNull() {
  return isAdminReady() ? admin.firestore() : null;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeType(value) {
  const t = normalizeText(value).toLowerCase();
  if (t === 'co' || t === 'gap' || t === 'teaching') return t;
  return 'teaching';
}

function extractSheetId(sheetRef) {
  const raw = normalizeText(sheetRef);
  if (!raw) return '';
  if (!raw.startsWith('http')) return raw;
  const match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match && match[1] ? match[1] : '';
}

function normalizeAnswerValue(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (raw === '') return null;

  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < 1 || n > 5) return null;
  return n;
}

function buildAnswersObject(payload = {}) {
  const answers = {};
  const directAnswers = payload.answers && typeof payload.answers === 'object' ? payload.answers : null;
  const ratingsArray = Array.isArray(payload.ratings) ? payload.ratings : null;

  for (let i = 1; i <= 12; i++) {
    const key = `Q${i}`;
    let raw = null;

    if (directAnswers && directAnswers[key] !== undefined) {
      raw = directAnswers[key];
    } else if (payload[key] !== undefined) {
      raw = payload[key];
    } else if (ratingsArray && ratingsArray[i - 1] !== undefined) {
      raw = ratingsArray[i - 1];
    }

    const normalized = normalizeAnswerValue(raw);
    if (normalized !== null) answers[key] = normalized;
  }

  return answers;
}

function hasAnyAnswer(answers) {
  return Object.keys(answers || {}).length > 0;
}

function extractSubmissionAnswers(item = {}) {
  const normalized = buildAnswersObject(item);
  if (hasAnyAnswer(normalized)) return normalized;

  if (item && item.answers && typeof item.answers === 'object') {
    const fromNested = buildAnswersObject({ answers: item.answers });
    if (hasAnyAnswer(fromNested)) return fromNested;
  }

  return {};
}

function escapeCsv(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function calculateTeachingSummary(submissions = []) {
  const sums = {};
  const counts = {};

  for (let i = 1; i <= 12; i++) {
    const key = `Q${i}`;
    sums[key] = 0;
    counts[key] = 0;
  }

  let validResponses = 0;
  for (const item of submissions) {
    const answers = extractSubmissionAnswers(item);
    let hasRowAnswer = false;
    for (let i = 1; i <= 12; i++) {
      const key = `Q${i}`;
      const n = normalizeAnswerValue(answers[key]);
      if (n === null) continue;
      sums[key] += n;
      counts[key] += 1;
      hasRowAnswer = true;
    }
    if (hasRowAnswer) validResponses += 1;
  }

  const questionAverages = {};
  const weakAreas = [];
  let avgSum = 0;
  let avgCount = 0;

  for (let i = 1; i <= 12; i++) {
    const key = `Q${i}`;
    const avg = counts[key] > 0 ? Number((sums[key] / counts[key]).toFixed(2)) : 0;
    questionAverages[key] = avg;
    if (counts[key] > 0) {
      avgSum += avg;
      avgCount += 1;
      if (avg < 3) weakAreas.push({ question: key, average: avg });
    }
  }

  return {
    totalResponses: validResponses,
    questionAverages,
    overallAverage: avgCount > 0 ? Number((avgSum / avgCount).toFixed(2)) : 0,
    weakAreas
  };
}

function calculateCOSummary(submissions = []) {
  const teaching = calculateTeachingSummary(submissions);
  const coAttainment = {};

  Object.keys(teaching.questionAverages).forEach((q) => {
    const pct = Number(((teaching.questionAverages[q] / 3) * 100).toFixed(2));
    coAttainment[q.replace('Q', 'CO')] = pct;
  });

  const values = Object.values(coAttainment);
  const overall = values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) : 0;

  return {
    totalResponses: teaching.totalResponses,
    coAttainment,
    overallAttainment: overall
  };
}

function calculateGapSummary(submissions = []) {
  const frequency = {};
  let validResponses = 0;

  for (const item of submissions) {
    const answers = extractSubmissionAnswers(item);
    let hasRow = false;
    for (let i = 1; i <= 12; i++) {
      const key = `Q${i}`;
      const n = normalizeAnswerValue(answers[key]);
      if (n === null) continue;
      hasRow = true;
      if (n < 3) frequency[key] = (frequency[key] || 0) + 1;
    }
    if (hasRow) validResponses += 1;
  }

  const mostSelectedGaps = Object.entries(frequency)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalResponses: validResponses,
    frequency,
    mostSelectedGaps
  };
}

function shapeResponsesByType(type, submissions) {
  if (type === 'co') return { type, ...calculateCOSummary(submissions) };
  if (type === 'gap') return { type, ...calculateGapSummary(submissions) };
  return { type, ...calculateTeachingSummary(submissions) };
}

async function resolveSubjectBySheetRef(db, sheetRef) {
  const sheetId = extractSheetId(sheetRef);
  if (!sheetId) return null;

  const subjectsSnap = await db.collection('subjects').get();
  for (const doc of subjectsSnap.docs) {
    const data = doc.data() || {};
    const links = [
      data.sheet_link,
      data.sheetLink,
      data.co_sheet_link,
      data.gap_sheet_link,
      data['co_sheet_link ']
    ].map((v) => normalizeText(v)).filter(Boolean);

    const hit = links.some((link) => extractSheetId(link) === sheetId);
    if (hit) {
      return {
        id: doc.id,
        subject: normalizeText(data.subject_name || data.name || data.subject || doc.id)
      };
    }
  }

  return null;
}

async function fetchSubmissionsForSubject(db, subjectParam, formType) {
  const normalizedSubject = normalizeText(subjectParam);
  const cleanedType = normalizeType(formType);

  const byIdQuery = db.collection('feedback_submissions')
    .where('subject_id', '==', normalizedSubject)
    .where('form_type', '==', cleanedType);
  const byNameQuery = db.collection('feedback_submissions')
    .where('subject', '==', normalizedSubject)
    .where('form_type', '==', cleanedType);

  const [byIdSnap, byNameSnap] = await Promise.all([byIdQuery.get(), byNameQuery.get()]);
  const combined = new Map();

  byIdSnap.docs.forEach((doc) => combined.set(doc.id, { id: doc.id, ...doc.data() }));
  byNameSnap.docs.forEach((doc) => combined.set(doc.id, { id: doc.id, ...doc.data() }));

  if (combined.size > 0 || !normalizedSubject) {
    return Array.from(combined.values());
  }

  // Fallback for subject-id/name mismatches by resolving aliases from subjects collection.
  const aliases = new Set([normalizedSubject.toLowerCase()]);
  const subjectsSnap = await db.collection('subjects').get();
  for (const doc of subjectsSnap.docs) {
    const data = doc.data() || {};
    const labels = [doc.id, data.subject_name, data.name, data.subject]
      .map((v) => normalizeText(v))
      .filter(Boolean);

    const hit = labels.some((label) => label.toLowerCase() === normalizedSubject.toLowerCase());
    if (hit) labels.forEach((label) => aliases.add(label.toLowerCase()));
  }

  const typeSnap = await db.collection('feedback_submissions').where('form_type', '==', cleanedType).get();
  typeSnap.docs.forEach((doc) => {
    const data = doc.data() || {};
    const sid = normalizeText(data.subject_id).toLowerCase();
    const sname = normalizeText(data.subject).toLowerCase();
    if (aliases.has(sid) || aliases.has(sname)) {
      combined.set(doc.id, { id: doc.id, ...data });
    }
  });

  return Array.from(combined.values());
}

function readSubjectTypeLinks(subjectData, formType) {
  if (formType === 'co') {
    return {
      formUrl: normalizeText(subjectData.co_form_link || subjectData.coFormLink),
      sheetUrl: normalizeText(subjectData.co_sheet_link || subjectData['co_sheet_link '] || subjectData.coSheetLink)
    };
  }

  if (formType === 'gap') {
    return {
      formUrl: normalizeText(subjectData.gap_form_link || subjectData.gapFormLink),
      sheetUrl: normalizeText(subjectData.gap_sheet_link || subjectData.gapSheetLink)
    };
  }

  return {
    formUrl: normalizeText(subjectData.form_link || subjectData.formUrl),
    sheetUrl: normalizeText(subjectData.sheet_link || subjectData.sheetUrl)
  };
}

function buildStudentSubmissionIndex(submissions = []) {
  const index = new Map();

  submissions.forEach((item) => {
    if (!hasAnyAnswer(extractSubmissionAnswers(item)) && item.form_opened !== true) return;

    const subjectId = normalizeText(item.subject_id || item.subjectId).toLowerCase();
    const subjectName = normalizeText(item.subject).toLowerCase();
    const type = normalizeType(item.form_type || item.formType);
    const key = `${subjectId || subjectName}::${type}`;
    if (!index.has(key)) {
      index.set(key, item);
    }
  });

  return index;
}

async function buildStudentSubjects(db, params = {}) {
  const semester = normalizeText(params.semester);
  const studentUid = normalizeText(params.uid || params.studentUid);
  const studentEmail = normalizeText(params.email || params.studentEmail).toLowerCase();

  const subjectsSnap = await db.collection('subjects').get();
  const formsSnap = await db.collection('feedback_forms').get();

  const formsIndex = new Map();
  formsSnap.docs.forEach((doc) => {
    const data = doc.data() || {};
    const type = normalizeType(data.formType || data.form_type);
    const keys = [
      normalizeText(data.subjectId || data.subject_id).toLowerCase(),
      normalizeText(data.subject).toLowerCase()
    ].filter(Boolean);

    keys.forEach((key) => {
      if (!formsIndex.has(key)) formsIndex.set(key, { teaching: '', co: '', gap: '' });
      formsIndex.get(key)[type] = normalizeText(data.formUrl || data.form_link || data.formURL);
    });
  });

  let submissions = [];
  if (studentUid) {
    const byUid = await db.collection('feedback_submissions').where('student_uid', '==', studentUid).get();
    submissions.push(...byUid.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  }
  if (studentEmail) {
    const byEmail = await db.collection('feedback_submissions').where('student_email', '==', studentEmail).get();
    submissions.push(...byEmail.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  }

  const dedupedSubmissions = Array.from(new Map(submissions.map((item) => [item.id, item])).values());
  const submissionIndex = buildStudentSubmissionIndex(dedupedSubmissions);

  const subjects = subjectsSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((subject) => {
      if (!semester) return true;
      const subjectSemester = normalizeText(subject.semester);
      return !subjectSemester || subjectSemester === semester;
    })
    .map((subject) => {
      const subjectKey = normalizeText(subject.id).toLowerCase();
      const subjectNameKey = normalizeText(subject.subject_name || subject.name || subject.subject).toLowerCase();
      const forms = formsIndex.get(subjectKey) || formsIndex.get(subjectNameKey) || { teaching: '', co: '', gap: '' };

      // Try both keys independently to avoid missing matches due to || short-circuit
      const findSubmission = (type) => {
        if (subjectKey) {
          const match = submissionIndex.get(`${subjectKey}::${type}`);
          if (match) return match;
        }
        if (subjectNameKey && subjectNameKey !== subjectKey) {
          const match = submissionIndex.get(`${subjectNameKey}::${type}`);
          if (match) return match;
        }
        return null;
      };

      const teachingDoc = findSubmission('teaching');
      const coDoc = findSubmission('co');
      const gapDoc = findSubmission('gap');

      return {
        id: subject.id,
        subject_name: subject.subject_name || subject.name || subject.subject || 'Unknown Subject',
        faculty_name: subject.faculty_name || '',
        subject_code: subject.subject_code || subject.code || '',
        form_link: subject.form_link || subject.formUrl || forms.teaching || '',
        co_form_link: subject.co_form_link || subject.coFormLink || forms.co || '',
        gap_form_link: subject.gap_form_link || subject.gapFormLink || forms.gap || '',
        submitted: {
          teaching: Boolean(teachingDoc),
          co: Boolean(coDoc),
          gap: Boolean(gapDoc)
        },
        submittedData: {
          teaching: teachingDoc,
          co: coDoc,
          gap: gapDoc
        }
      };
    });

  return { subjects, submissions: dedupedSubmissions };
}

function getSubjectUpdatePatch(formType, formUrl, sheetUrl) {
  if (formType === 'co') return { co_form_link: formUrl, co_sheet_link: sheetUrl };
  if (formType === 'gap') return { gap_form_link: formUrl, gap_sheet_link: sheetUrl };
  return { form_link: formUrl, sheet_link: sheetUrl };
}

async function upsertFeedbackForm(db, payload) {
  const docData = {
    facultyId: normalizeText(payload.facultyId),
    subject: normalizeText(payload.subject),
    subjectId: normalizeText(payload.subjectId),
    formType: normalizeType(payload.formType),
    formUrl: normalizeText(payload.formUrl),
    sheetUrl: normalizeText(payload.sheetUrl),
    semester: normalizeText(payload.semester),
    updatedAt: new Date().toISOString(),
    createdAt: payload.createdAt || new Date().toISOString()
  };

  const query = await db.collection('feedback_forms')
    .where('facultyId', '==', docData.facultyId)
    .where('subjectId', '==', docData.subjectId)
    .where('formType', '==', docData.formType)
    .limit(1)
    .get();

  if (!query.empty) {
    const existing = query.docs[0];
    await existing.ref.set(docData, { merge: true });
    return { id: existing.id, ...docData };
  }

  const created = await db.collection('feedback_forms').add(docData);
  return { id: created.id, ...docData };
}

async function collectLegacyFormsForFaculty(db, facultyId) {
  const snap = await db.collection('subjects').where('faculty_id', '==', facultyId).get();
  const out = [];

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const subject = normalizeText(data.subject_name || data.name || data.subject || doc.id);
    ['teaching', 'co', 'gap'].forEach((t) => {
      const links = readSubjectTypeLinks(data, t);
      if (!links.formUrl && !links.sheetUrl) return;
      out.push({
        id: `legacy_${doc.id}_${t}`,
        facultyId,
        subject,
        subjectId: doc.id,
        formType: t,
        formUrl: links.formUrl,
        sheetUrl: links.sheetUrl,
        createdAt: normalizeText(data.createdAt || data.created_at)
      });
    });
  }

  return out;
}

async function postToAppsScript(payload) {
  const scriptRes = await fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    redirect: 'follow'
  });

  const raw = await scriptRes.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON from Google Script: ${raw.slice(0, 200)}`);
  }

  if (!scriptRes.ok || data.success === false) {
    throw new Error(data.error || data.message || 'Google Script request failed');
  }

  return data;
}


async function handleCreateForms(req, res) {
  try {
    const db = getDbOrNull();
    if (!db) return res.status(500).json({ success: false, message: 'Firebase Admin SDK not initialized.' });

    const mode = normalizeText(req.body.mode || 'auto').toLowerCase();
    const requestedType = normalizeText(req.body.formType || req.body.form_type || 'teaching').toLowerCase();
    const createAll = requestedType === 'all';

    const facultyId = normalizeText(req.body.facultyId || req.body.faculty_id);
    const subjectId = normalizeText(req.body.subjectId || req.body.subject_id);
    const subject = normalizeText(req.body.subject || req.body.subjectName);
    const semester = normalizeText(req.body.semester);

    if (!facultyId) return res.status(400).json({ success: false, message: 'facultyId is required.' });
    if (!subject && !subjectId) return res.status(400).json({ success: false, message: 'subject or subjectId is required.' });

    let subjectDoc = null;
    if (subjectId) {
      const snap = await db.collection('subjects').doc(subjectId).get();
      if (snap.exists) subjectDoc = { id: snap.id, ...snap.data() };
    }

    const subjectName = subject || normalizeText(subjectDoc?.subject_name || subjectDoc?.name || subjectDoc?.subject || subjectId);
    const resolvedSubjectId = subjectId || normalizeText(subjectDoc?.id || subjectName);
    const targetTypes = createAll ? ['teaching', 'co', 'gap'] : [normalizeType(requestedType)];
    const storedForms = [];

    if (mode === 'manual') {
      const formUrl = normalizeText(req.body.formUrl || req.body.form_link);
      const sheetUrl = normalizeText(req.body.sheetUrl || req.body.sheet_link);
      if (!formUrl || !sheetUrl) {
        return res.status(400).json({ success: false, message: 'formUrl and sheetUrl are required for manual mode.' });
      }

      const doc = await upsertFeedbackForm(db, {
        facultyId,
        subject: subjectName,
        subjectId: resolvedSubjectId,
        formType: targetTypes[0],
        formUrl,
        sheetUrl,
        semester
      });
      storedForms.push(doc);
    } else {
      if (!GOOGLE_SCRIPT_URL) {
        return res.status(500).json({ success: false, message: 'GOOGLE_SCRIPT_URL is not set in .env file.' });
      }

      const scriptPayload = {
        action: createAll ? 'createAllForms' : 'createForm',
        subject: subjectName,
        semester,
        formType: targetTypes[0]
      };

      const scriptData = await postToAppsScript(scriptPayload);
      
      // Parse response - handle both array format and flat field format from Apps Script
      let formsFromScript = [];
      
      if (Array.isArray(scriptData.forms)) {
        formsFromScript = scriptData.forms;
      } else if (scriptData.teachingFormUrl || scriptData.coFormUrl || scriptData.gapFormUrl) {
        // Apps Script returns flat fields like teachingFormUrl, teachingSheetUrl, etc.
        if (scriptData.teachingFormUrl) {
          formsFromScript.push({ formType: 'teaching', formUrl: scriptData.teachingFormUrl, sheetUrl: scriptData.teachingSheetUrl || '' });
        }
        if (scriptData.coFormUrl) {
          formsFromScript.push({ formType: 'co', formUrl: scriptData.coFormUrl, sheetUrl: scriptData.coSheetUrl || '' });
        }
        if (scriptData.gapFormUrl) {
          formsFromScript.push({ formType: 'gap', formUrl: scriptData.gapFormUrl, sheetUrl: scriptData.gapSheetUrl || '' });
        }
      } else if (scriptData.formUrl) {
        // Single form fallback
        formsFromScript.push({ formType: targetTypes[0], formUrl: scriptData.formUrl, sheetUrl: scriptData.sheetUrl || '' });
      }

      if (formsFromScript.length === 0) {
        console.error('[handleCreateForms] No form URLs in script response:', JSON.stringify(scriptData));
        return res.status(500).json({ success: false, message: 'Google Apps Script did not return any form URLs.' });
      }

      for (const form of formsFromScript) {
        const doc = await upsertFeedbackForm(db, {
          facultyId,
          subject: subjectName,
          subjectId: resolvedSubjectId,
          formType: normalizeType(form.formType),
          formUrl: form.formUrl,
          sheetUrl: form.sheetUrl,
          semester
        });
        storedForms.push(doc);
      }
    }

    if (subjectId) {
      const patch = {
        faculty_id: facultyId,
        subject_name: subjectName,
        semester,
        updatedAt: new Date().toISOString()
      };
      storedForms.forEach((f) => Object.assign(patch, getSubjectUpdatePatch(f.formType, f.formUrl, f.sheetUrl)));
      await db.collection('subjects').doc(subjectId).set(patch, { merge: true });
    }

    return res.json({
      success: true,
      mode,
      forms: storedForms,
      formUrl: storedForms[0]?.formUrl || '',
      sheetUrl: storedForms[0]?.sheetUrl || ''
    });
  } catch (error) {
    console.error('[ERROR] /api/forms/create failed:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function handleGetSheetSummary(req, res) {
  try {
    if (!GOOGLE_SCRIPT_URL) return res.status(500).json({ success: false, message: 'GOOGLE_SCRIPT_URL not configured.' });

    const sheetLink = normalizeText(req.body.sheetLink);
    if (!sheetLink) return res.status(400).json({ success: false, message: 'sheetLink is required.' });

    const data = await postToAppsScript({ action: 'getSummary', sheetLink });
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function handleExport(req, res, typeParam, subjectParam) {
  try {
    const db = getDbOrNull();
    if (!db) return res.status(500).json({ success: false, message: 'Firebase Admin SDK not initialized.' });

    const type = normalizeType(typeParam || req.params.type);
    let subject = normalizeText(subjectParam || req.params.subject || req.query.subject || req.query.subjectName || '');

    const formId = normalizeText(req.query.formId || req.query.formid || '');
if (!subject && formId) {
  if (formId.startsWith('legacy_')) {
    const withoutPrefix = formId.slice('legacy_'.length);
    const parts = withoutPrefix.split('_');
    parts.pop();
    subject = parts.join('_');
  } else {
    const formDoc = await db.collection('feedback_forms').doc(formId).get();
    if (formDoc.exists) {
      const data = formDoc.data() || {};
      subject = normalizeText(data.subjectId || data.subject);
    }
  }
}
    if (!subject) return res.status(400).json({ success: false, message: 'subject or formId is required.' });

    const submissions = await fetchSubmissionsForSubject(db, subject, type);
    const answeredSubmissions = submissions.filter((item) => hasAnyAnswer(extractSubmissionAnswers(item)));
    if (!answeredSubmissions.length) {
      return res.status(404).json({ success: false, message: `No ${type} feedback found for subject: ${subject}` });
    }

    const header = [
      'timestamp', 'subject', 'subject_id', 'form_type', 'student_name', 'student_email',
      'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10', 'Q11', 'Q12', 'overall_average'
    ];

    const rows = answeredSubmissions.map((item) => {
      const answers = extractSubmissionAnswers(item);
      const perQuestion = [];
      let sum = 0;
      let cnt = 0;

      for (let i = 1; i <= 12; i++) {
        const key = `Q${i}`;
        const n = normalizeAnswerValue(answers[key]);
        perQuestion.push(n === null ? '' : n);
        if (n !== null) {
          sum += n;
          cnt += 1;
        }
      }

      const rowAverage = cnt > 0 ? Number((sum / cnt).toFixed(2)) : '';
      return [
        item.timestamp || '',
        item.subject || '',
        item.subject_id || '',
        item.form_type || '',
        item.student_name || '',
        item.student_email || '',
        ...perQuestion,
        rowAverage
      ];
    });

    const csv = [header, ...rows].map((line) => line.map(escapeCsv).join(',')).join('\n');
    const safeSubject = subject.replace(/[^a-zA-Z0-9_-]/g, '_') || 'subject';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_${safeSubject}_feedback.csv`);
    return res.status(200).send(csv);
  } catch (error) {
    console.error('[ERROR] /api/export failed:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ==========================================
// ADMIN API ROUTES
// ==========================================

app.get('/api/admin/users', async (req, res) => {
  try {
    const db = getDbOrNull();
    if (!db) return res.status(500).json({ success: false, message: 'Firebase Admin SDK not initialized.' });

    const usersSnap = await db.collection('users').get();
    const users = usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.json({ success: true, users });
  } catch (error) {
    console.error('[ERROR] /api/admin/users failed:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/add-faculty', async (req, res) => {
  try {
    const db = getDbOrNull();
    if (!db) return res.status(500).json({ success: false, message: 'Firebase Admin SDK not initialized.' });

    const { fullname, username, email, password, semester, branch, subject } = req.body;
    if (!fullname || !email || !password) {
      return res.status(400).json({ success: false, message: 'Full name, email, and password are required.' });
    }

    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: fullname
    });

    // Save to Firestore
    const userData = {
      id: userRecord.uid,
      fullname,
      name: fullname,
      username: username || email.split('@')[0],
      username_lower: (username || email.split('@')[0]).toLowerCase(),
      email,
      email_lower: email.toLowerCase(),
      role: 'faculty',
      semester: semester ? String(semester) : null,
      branch: branch || null,
      subject: subject || null,
      createdAt: new Date().toISOString()
    };

    await db.collection('users').doc(userRecord.uid).set(userData);

    return res.json({ success: true, message: 'Faculty added successfully', userId: userRecord.uid });
  } catch (error) {
    console.error('[ERROR] /api/admin/add-faculty failed:', error);
    let message = error.message;
    if (error.code === 'auth/email-already-exists') message = 'This email is already registered.';
    if (error.code === 'auth/weak-password') message = 'Password is too weak (min 6 characters).';
    return res.status(500).json({ success: false, message });
  }
});

app.post('/api/admin/add-student', async (req, res) => {
  try {
    const db = getDbOrNull();
    if (!db) return res.status(500).json({ success: false, message: 'Firebase Admin SDK not initialized.' });

    const { fullname, username, email, password, semester, branch } = req.body;
    if (!fullname || !email || !password) {
      return res.status(400).json({ success: false, message: 'Full name, email, and password are required.' });
    }

    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: fullname
    });

    // Save to Firestore
    const userData = {
      id: userRecord.uid,
      fullname,
      name: fullname,
      username: username || email.split('@')[0],
      username_lower: (username || email.split('@')[0]).toLowerCase(),
      email,
      email_lower: email.toLowerCase(),
      role: 'student',
      semester: semester ? String(semester) : null,
      branch: branch || null,
      createdAt: new Date().toISOString()
    };

    await db.collection('users').doc(userRecord.uid).set(userData);

    return res.json({ success: true, message: 'Student added successfully', userId: userRecord.uid });
  } catch (error) {
    console.error('[ERROR] /api/admin/add-student failed:', error);
    let message = error.message;
    if (error.code === 'auth/email-already-exists') message = 'This email is already registered.';
    if (error.code === 'auth/weak-password') message = 'Password is too weak (min 6 characters).';
    return res.status(500).json({ success: false, message });
  }
});

app.delete('/api/admin/remove-user/:id', async (req, res) => {
  try {
    const db = getDbOrNull();
    if (!db) return res.status(500).json({ success: false, message: 'Firebase Admin SDK not initialized.' });

    const userId = normalizeText(req.params.id);
    if (!userId) return res.status(400).json({ success: false, message: 'User ID is required.' });

    // Delete from Firebase Auth
    try {
      await admin.auth().deleteUser(userId);
    } catch (authErr) {
      console.warn('Auth user delete failed (may not exist):', authErr.message);
    }

    // Delete from Firestore
    await db.collection('users').doc(userId).delete();

    return res.json({ success: true, message: 'User removed successfully' });
  } catch (error) {
    console.error('[ERROR] /api/admin/remove-user failed:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/assign-subject', async (req, res) => {
  try {
    const db = getDbOrNull();
    if (!db) return res.status(500).json({ success: false, message: 'Firebase Admin SDK not initialized.' });

    const { facultyId, subjectName, semester } = req.body;
    if (!facultyId || !subjectName) {
      return res.status(400).json({ success: false, message: 'Faculty ID and subject name are required.' });
    }

    // Get faculty info
    const facultyDoc = await db.collection('users').doc(facultyId).get();
    const facultyData = facultyDoc.exists ? facultyDoc.data() : {};

    const subjectData = {
      subject_name: subjectName,
      semester: semester ? String(semester) : null,
      faculty_id: facultyId,
      faculty_name: facultyData.fullname || facultyData.name || '',
      faculty_email: facultyData.email || '',
      faculty_username: facultyData.username || '',
      createdAt: new Date().toISOString(),
      status: 'active',
      created_by: 'admin'
    };

    const docRef = await db.collection('subjects').add(subjectData);

    return res.json({ success: true, message: 'Subject assigned successfully', subjectId: docRef.id });
  } catch (error) {
    console.error('[ERROR] /api/admin/assign-subject failed:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'signup.html')));
app.get('/dashboard-student', (req, res) => res.sendFile(path.join(__dirname, 'dashboard-student.html')));
app.get('/dashboard-faculty', (req, res) => res.sendFile(path.join(__dirname, 'dashboard-faculty.html')));
app.get('/dashboard-admin', (req, res) => res.sendFile(path.join(__dirname, 'dashboard-admin.html')));

app.get('/api/health', (req, res) => {
  res.json({ success: true, port: PORT, firebaseReady: isAdminReady(), googleScriptConfigured: Boolean(GOOGLE_SCRIPT_URL) });
});

app.post('/api/forms/create', handleCreateForms);
app.post('/api/create-form', handleCreateForms);

app.get('/api/forms', async (req, res) => {
  try {
    const db = getDbOrNull();
    if (!db) return res.status(500).json({ success: false, message: 'Firebase Admin SDK not initialized.' });

    const facultyId = normalizeText(req.query.facultyId || req.query.faculty_id);
    const subjectFilter = normalizeText(req.query.subject || req.query.subjectId || req.query.subject_id);
    const formType = normalizeText(req.query.formType || req.query.form_type).toLowerCase();

    if (!facultyId) return res.status(400).json({ success: false, message: 'facultyId query is required.' });

    let query = db.collection('feedback_forms').where('facultyId', '==', facultyId);
    if (formType && ['teaching', 'co', 'gap'].includes(formType)) query = query.where('formType', '==', formType);

    const snap = await query.get();
    let forms = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (!forms.length) forms = await collectLegacyFormsForFaculty(db, facultyId);

    if (subjectFilter) {
      forms = forms.filter((f) => {
        const sid = normalizeText(f.subjectId || '');
        const sname = normalizeText(f.subject || '');
        return sid === subjectFilter || sname.toLowerCase() === subjectFilter.toLowerCase();
      });
    }

    return res.json({ success: true, forms });
  } catch (error) {
    console.error('[ERROR] /api/forms failed:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/forms/:id', async (req, res) => {
  try {
    const db = getDbOrNull();
    if (!db) return res.status(500).json({ success: false, message: 'Firebase Admin SDK not initialized.' });

    const id = normalizeText(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Form id is required.' });
    if (id.startsWith('legacy_')) {
      return res.status(400).json({ success: false, message: 'Legacy form cannot be deleted directly. Create managed forms first.' });
    }

    const docRef = db.collection('feedback_forms').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'Form not found.' });

    const data = doc.data() || {};
    await docRef.delete();

    const subjectId = normalizeText(data.subjectId);
    if (subjectId) {
      const patch = getSubjectUpdatePatch(normalizeType(data.formType), '', '');
      patch.updatedAt = new Date().toISOString();
      await db.collection('subjects').doc(subjectId).set(patch, { merge: true });
    }

    return res.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('[ERROR] /api/forms/:id delete failed:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/get-summary', handleGetSheetSummary);
app.post('/api/sheet-summary', handleGetSheetSummary);

app.get('/api/student-dashboard', async (req, res) => {
  try {
    const db = getDbOrNull();
    if (!db) return res.status(500).json({ success: false, message: 'Firebase Admin SDK not initialized.' });

    const payload = await buildStudentSubjects(db, {
      uid: req.query.uid || req.query.studentUid,
      email: req.query.email || req.query.studentEmail,
      semester: req.query.semester || ''
    });

    return res.json({ success: true, ...payload });
  } catch (error) {
    console.error('[ERROR] /api/student-dashboard failed:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/feedback', async (req, res) => {
  try {
    const db = getDbOrNull();
    if (!db) return res.status(500).json({ success: false, message: 'Firebase Admin SDK not initialized.' });

    let subject = normalizeText(req.body.subject || req.body.subject_name);
    let subjectId = normalizeText(req.body.subject_id || req.body.subjectId);
    const formType = normalizeType(req.body.form_type || req.body.formType || 'teaching');
    const timestamp = req.body.timestamp || new Date().toISOString();
    const sheetRef = normalizeText(req.body.sheetLink || req.body.sheetId || req.body.sheet_link);
    
    // Build answers from Q1-Q12 fields OR from the responses object sent by syncToFirebase
    let answers = buildAnswersObject(req.body);
    
    let studentName = req.body.student_name || req.body.studentName || req.body.name || '';
    let studentEmail = req.body.student_email || req.body.studentEmail || req.body.email || '';
    let regNo = req.body.reg_no || '';

    // If no Q1-Q12 found, try to extract from 'responses' object (sent by syncToFirebase in Apps Script)
    if (!hasAnyAnswer(answers) && req.body.responses && typeof req.body.responses === 'object') {
      let qIdx = 1;
      for (const [header, val] of Object.entries(req.body.responses)) {
        const lowerHeader = header.toLowerCase();
        const rawVal = Array.isArray(val) ? val[0] : val;
        
        if (lowerHeader.includes('name')) studentName = rawVal;
        else if (lowerHeader.includes('email')) studentEmail = rawVal;
        else if (lowerHeader.includes('reg') || lowerHeader.includes('roll')) regNo = rawVal;
        else {
          const n = normalizeAnswerValue(rawVal);
          if (n !== null) {
            answers[`Q${qIdx}`] = n;
            qIdx++;
          }
        }
      }
    }

    if ((!subject || !subjectId) && sheetRef) {
      const resolved = await resolveSubjectBySheetRef(db, sheetRef);
      if (resolved) {
        subject = subject || resolved.subject;
        subjectId = subjectId || resolved.id;
      }
    }

    // Resolve subject name to Firestore document ID if we only have the name
    if (subject && !subjectId) {
      const subjectsSnap = await db.collection('subjects').get();
      for (const doc of subjectsSnap.docs) {
        const data = doc.data() || {};
        const names = [
          normalizeText(data.subject_name),
          normalizeText(data.name),
          normalizeText(data.subject)
        ].map(n => n.toLowerCase()).filter(Boolean);
        
        if (names.includes(subject.toLowerCase())) {
          subjectId = doc.id;
          break;
        }
      }
    }

    if (!subject && !subjectId) {
      return res.status(400).json({ success: false, message: 'subject, subject_id, or sheetLink/sheetId is required.' });
    }

    if (!hasAnyAnswer(answers)) {
      return res.status(400).json({ success: false, message: 'answers are required. Provide answers.Q1..Q12 as numeric values.' });
    }

    const docData = {
      subject: subject || subjectId,
      subject_id: subjectId || subject,
      form_type: formType,
      answers,
      timestamp,
      sheet_ref: sheetRef,
      student_name: studentName,
      student_email: studentEmail,
      student_uid: req.body.student_uid || req.body.studentUid || '',
      reg_no: regNo,
      source: req.body.source || 'api/feedback',
      created_at: new Date().toISOString()
    };

    const created = await db.collection('feedback_submissions').add(docData);
    console.log(`[OK] Feedback saved: ${created.id} | subject=${docData.subject} | subject_id=${docData.subject_id} | type=${formType}`);
    return res.status(201).json({ success: true, id: created.id });
  } catch (error) {
    console.error('[ERROR] /api/feedback failed:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/summary/:subject', async (req, res) => {
  try {
    const db = getDbOrNull();
    if (!db) return res.status(500).json({ success: false, message: 'Firebase Admin SDK not initialized.' });

    const subject = normalizeText(req.params.subject);
    const type = normalizeType(req.query.type || 'teaching');

    const submissions = await fetchSubmissionsForSubject(db, subject, type);
    const shaped = shapeResponsesByType(type, submissions);

    return res.json({ success: true, subject, formType: type, totalDocuments: submissions.length, ...shaped });
  } catch (error) {
    console.error('[ERROR] /api/summary failed:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/responses/:formId', async (req, res) => {
  try {
    const db = getDbOrNull();
    if (!db) return res.status(500).json({ success: false, message: 'Firebase Admin SDK not initialized.' });

    const formId = normalizeText(req.params.formId);
    if (!formId) return res.status(400).json({ success: false, message: 'formId is required.' });

    const formDoc = await db.collection('feedback_forms').doc(formId).get();
    if (!formDoc.exists) return res.status(404).json({ success: false, message: 'Form not found.' });

    const form = { id: formDoc.id, ...formDoc.data() };
    const subjectRef = normalizeText(form.subjectId || form.subject);
    const type = normalizeType(form.formType);

    const submissions = await fetchSubmissionsForSubject(db, subjectRef, type);
    const answeredSubmissions = submissions.filter((item) => hasAnyAnswer(extractSubmissionAnswers(item)));
    const shaped = shapeResponsesByType(type, answeredSubmissions);

    return res.json({ success: true, form, submissions: answeredSubmissions, ...shaped });
  } catch (error) {
    console.error('[ERROR] /api/responses/:formId failed:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/export/:type', async (req, res) => handleExport(req, res, req.params.type, req.query.subject || ''));
app.get('/api/export/:type/:subject', async (req, res) => handleExport(req, res, req.params.type, req.params.subject));
app.get('/api/export/teaching/:subject', async (req, res) => handleExport(req, res, 'teaching', req.params.subject));

// Admin: get subject summary directly from Firestore feedback_submissions
app.get('/api/admin/subject-summary/:subjectId', async (req, res) => {
  try {
    const db = getDbOrNull();
    if (!db) return res.status(500).json({ success: false, message: 'Firebase Admin SDK not initialized.' });

    const subjectId = normalizeText(req.params.subjectId);
    if (!subjectId) return res.status(400).json({ success: false, message: 'Subject ID is required.' });

    const submissions = await fetchSubmissionsForSubject(db, subjectId, 'teaching');
    const answeredSubmissions = submissions.filter((item) => hasAnyAnswer(extractSubmissionAnswers(item)));
    const summary = calculateTeachingSummary(answeredSubmissions);

    return res.json({
      success: true,
      subjectId,
      totalResponses: summary.totalResponses,
      averageScore: summary.overallAverage,
      questionAverages: summary.questionAverages,
      weakAreas: summary.weakAreas
    });
  } catch (error) {
    console.error('[ERROR] /api/admin/subject-summary failed:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`GOOGLE_SCRIPT_URL: ${GOOGLE_SCRIPT_URL ? 'configured ✅' : 'NOT SET ❌ - add to .env'}`);
  console.log(`Firebase Admin: ${isAdminReady() ? 'initialized ✅' : 'not initialized ❌'}`);
});
