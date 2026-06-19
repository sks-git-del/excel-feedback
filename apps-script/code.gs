// ==========================================
// GOOGLE APPS SCRIPT - COMPLETE FEEDBACK SYSTEM
// ==========================================
// Handles: Teaching Feedback, CO Attainment, Curricular Gap forms
// Deploy as Web App: Execute as Me, Access: Anyone
// ==========================================
const BACKEND_FEEDBACK_URL = "https://reshape-unlaced-alias.ngrok-free.dev/api/feedback";

// ==========================================
// TEACHING FEEDBACK QUESTIONS (Scale 1-5)
// ==========================================
const TEACHING_QUESTIONS = [
  "Has the teacher covered the entire syllabus as prescribed by the University/ College/ Board?",
  "Has the teacher covered relevant topics beyond the syllabus?",
  "Effectiveness of the teacher in terms of Technical Content / Course Content",
  "Effectiveness of the teacher in terms of Communication Skills",
  "Effectiveness of the teacher in terms of Use of Teaching Aids",
  "Pace at which contents were covered",
  "Motivation and inspiration provided to students for learning",
  "Support for development of students' skills through Practical Demonstration",
  "Support for development of students' skills through Hands-on Training",
  "Clarity of expectations from students",
  "Feedback provided on students' progress",
  "Willingness to offer help and advice to students"
];

// ==========================================
// CURRICULAR GAP QUESTIONS (Scale 1-5)
// ==========================================
const CURRICULAR_GAP_QUESTIONS = [
  "Depth of knowledge, critical thinking, and intellectual enrichment acquired through the course content",
  "Course added value to your skills",
  "Course content met the course objectives adequately",
  "Course content is relevant to the degree you enrolled for",
  "Course content meets the requirements of the industry",
  "You have learned concepts beyond the course content",
  "You have learned concepts through examples and applications",
  "You could access lecture notes and course materials",
  "Curriculum promotes the use of textbooks, reference books, journals, and e-resources",
  "The curriculum is designed to enhance employability"
];

// ==========================================
// SUBJECT CO DEFINITIONS
// ==========================================
const SUBJECT_CO_MAP = {
  "Theory of Computation": [
    "CO1: Understand Formal Languages, Grammar and Computational Models",
    "CO2: Analyze and Design Finite Automata",
    "CO3: Evaluate Pushdown Automata and Context-Free Languages",
    "CO4: Understand Turing Machines and Computability"
  ],
  "Machine Learning": [
    "CO1: Understand the need of Machine Learning for various problem solving",
    "CO2: Understand a variety of algorithm and evaluate models",
    "CO3: Understand the features of machine learning to apply on real world problems",
    "CO4: Design as well as analyse artificial neural networks and deep learning models"
  ],
  "Software Engineering": [
    "CO1: Understand the software development life cycle and process models",
    "CO2: Apply requirement engineering and system design techniques",
    "CO3: Evaluate software testing strategies and quality assurance",
    "CO4: Understand project management, estimation and software maintenance"
  ],
  "Data Visualization and Analytics": [
    "CO1: Understand data visualization principles and design techniques",
    "CO2: Apply statistical analysis methods on datasets",
    "CO3: Evaluate and build analytical models for real world data",
    "CO4: Understand and use visualization tools and dashboard creation"
  ],
  "Computer Networks": [
    "CO1: Basics of OSI, TCP/IP, transmission",
    "CO2: Channel allocation, error detection",
    "CO3: Protocols & LAN",
    "CO4: Network layer, routing",
    "CO5: Transport + Application layer"
  ],
  "Algorithm Analysis and Design": [
    "CO1: Analyze the efficiency of algorithms including different types of sorting, evaluate their time and space complexity",
    "CO2: Able to understand concepts of algorithm design and principles, learn different algorithm design strategies including divide and conquer methodologies and solve recurrences",
    "CO3: Understand the concept and use of different greedy and dynamic algorithms",
    "CO4: Ability to design, analyze and prove correctness of graph algorithms",
    "CO5: Understand different algorithmic design strategies based on back tracking and branch and bound"
  ]
};

const SCALE_1_5 = ["1", "2", "3", "4", "5"];
const SCALE_1_3 = ["1", "2", "3"];

// ==========================================
// MAIN POST HANDLER (FIXED - no more loop!)
// ==========================================
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");

    // 1. Handle Summary Request
    if (body.action === "getSummary") {
      return jsonResponse(getFeedbackSummary(body.sheetLink || body.sheetId || ""));
    }

    // 2. Handle Form Creation Requests FIRST (prevents loop!)
    if (body.action === "createAllForms" || body.action === "createForm" || body.action === "createForms") {
      var subject = body.subject || body.subjectName;
      var semester = body.semester;
      if (!subject || !semester) {
        return jsonResponse({ success: false, error: "Missing subject or semester" });
      }
      return jsonResponse(createAllSubjectForms(subject, semester));
    }

    // 3. If it has subject+semester but NO answers, it is also a creation request
    if (body.subject && body.semester && !body.Q1 && !body.answers && !body.responses) {
      var subject2 = body.subject || body.subjectName;
      var semester2 = body.semester;
      if (subject2 && semester2) {
        return jsonResponse(createAllSubjectForms(subject2, semester2));
      }
    }

    // 4. Handle actual feedback submissions ONLY (must have Q1 or answers or responses)
    if (body.Q1 || body.answers || body.responses) {
      UrlFetchApp.fetch(BACKEND_FEEDBACK_URL, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(body),
        headers: { "ngrok-skip-browser-warning": "true" },
        muteHttpExceptions: true
      });
      return jsonResponse({ success: true, message: "Feedback forwarded" });
    }

    return jsonResponse({ success: false, error: "Unknown action or missing parameters" });

  } catch (err) {
    Logger.log("doPost error: " + err.toString());
    return jsonResponse({ success: false, error: err.toString() });
  }
}


// ==========================================
// CREATE ALL 3 FORMS FOR A SUBJECT
// ==========================================
function createAllSubjectForms(subjectName, semester) {
  try {
    var coQuestions = SUBJECT_CO_MAP[subjectName] || [];

    // 1. Teaching Feedback Form
    var teachingForm = createTeachingForm(subjectName, semester);
    var teachingSheet = createResponseSheet(subjectName, semester, "Teaching", TEACHING_QUESTIONS);
    teachingForm.setDestination(FormApp.DestinationType.SPREADSHEET, teachingSheet.getId());
    setupAverageScoreForSpreadsheet(teachingSheet.getId());

    // 2. CO Attainment Form
    var coForm = createCOAttainmentForm(subjectName, semester, coQuestions);
    var coSheet = createCOResponseSheet(subjectName, semester, coQuestions);
    coForm.setDestination(FormApp.DestinationType.SPREADSHEET, coSheet.getId());
    setupAverageScoreForSpreadsheet(coSheet.getId());

    // 3. Curricular Gap Form
    var gapForm = createCurricularGapForm(subjectName, semester);
    var gapSheet = createResponseSheet(subjectName, semester, "Curricular Gap", CURRICULAR_GAP_QUESTIONS);
    gapForm.setDestination(FormApp.DestinationType.SPREADSHEET, gapSheet.getId());
    setupAverageScoreForSpreadsheet(gapSheet.getId());

    return {
      success: true,
      subject: subjectName,
      semester: semester,
      // Teaching
      teachingFormUrl: teachingForm.getPublishedUrl(),
      teachingSheetUrl: teachingSheet.getUrl(),
      // CO Attainment
      coFormUrl: coForm.getPublishedUrl(),
      coSheetUrl: coSheet.getUrl(),
      // Curricular Gap
      gapFormUrl: gapForm.getPublishedUrl(),
      gapSheetUrl: gapSheet.getUrl(),
      // Legacy fields (backward compatibility)
      formUrl: teachingForm.getPublishedUrl(),
      sheetUrl: teachingSheet.getUrl(),
      createdAt: new Date().toISOString()
    };

  } catch (err) {
    Logger.log("createAllSubjectForms error: " + err.toString());
    return { success: false, error: err.toString() };
  }
}

// ==========================================
// TEACHING FEEDBACK FORM
// ==========================================
function createTeachingForm(subject, semester) {
  var form = FormApp.create(subject + " - Teaching Feedback (Sem " + semester + ")");

  form.setDescription(
    "Teaching Feedback Form\n" +
    "Subject: " + subject + " | Semester: " + semester + "\n" +
    "Feedback Scale: 1 = Poor, 2 = Fair, 3 = Good, 4 = Very Good, 5 = Excellent\n" +
    "Your responses are confidential."
  );
  form.setCollectEmail(true);
  form.setLimitOneResponsePerUser(false);
  form.setShowLinkToRespondAgain(false);

  form.addTextItem().setTitle("Name of Student").setRequired(true);
  form.addTextItem().setTitle("Registration No.").setRequired(true);

  TEACHING_QUESTIONS.forEach(function(q) {
    form.addMultipleChoiceItem()
      .setTitle(q)
      .setChoiceValues(SCALE_1_5)
      .setRequired(true);
  });

  form.addParagraphTextItem().setTitle("Additional Comments").setRequired(false);

  return form;
}

// ==========================================
// CO ATTAINMENT FORM (Scale 1-3)
// ==========================================
function createCOAttainmentForm(subject, semester, coQuestions) {
  var form = FormApp.create(subject + " - CO Attainment Feedback (Sem " + semester + ")");

  form.setDescription(
    "CO Attainment Satisfaction Analysis\n" +
    "Subject: " + subject + " | Semester: " + semester + "\n" +
    "Feedback Scale: Not Satisfactory = 1, Fairly Satisfactory = 2, Very Satisfactory = 3"
  );
  form.setCollectEmail(true);
  form.setLimitOneResponsePerUser(false);
  form.setShowLinkToRespondAgain(false);

  form.addTextItem().setTitle("Name of Student").setRequired(true);
  form.addTextItem().setTitle("Registration No.").setRequired(true);

  if (coQuestions.length === 0) {
    form.addMultipleChoiceItem()
      .setTitle("CO1: Course Outcome 1")
      .setChoiceValues(SCALE_1_3)
      .setRequired(true);
  } else {
    coQuestions.forEach(function(q) {
      form.addMultipleChoiceItem()
        .setTitle(q)
        .setChoiceValues(SCALE_1_3)
        .setRequired(true);
    });
  }

  return form;
}

// ==========================================
// CURRICULAR GAP FORM (Scale 1-5)
// ==========================================
function createCurricularGapForm(subject, semester) {
  var form = FormApp.create(subject + " - Curricular Gap Analysis (Sem " + semester + ")");

  form.setDescription(
    "Curricular Gap Analysis\n" +
    "Subject: " + subject + " | Semester: " + semester + "\n" +
    "Feedback Scale: 1 = Strongly Disagree, 2 = Disagree, 3 = Neutral, 4 = Agree, 5 = Strongly Agree"
  );
  form.setCollectEmail(true);
  form.setLimitOneResponsePerUser(false);
  form.setShowLinkToRespondAgain(false);

  form.addTextItem().setTitle("Name of Student").setRequired(true);
  form.addTextItem().setTitle("Registration No.").setRequired(true);

  CURRICULAR_GAP_QUESTIONS.forEach(function(q) {
    form.addMultipleChoiceItem()
      .setTitle(q)
      .setChoiceValues(SCALE_1_5)
      .setRequired(true);
  });

  return form;
}

// ==========================================
// CREATE RESPONSE SHEET (Teaching & Gap)
// ==========================================
function createResponseSheet(subject, semester, type, questions) {
  var spreadsheet = SpreadsheetApp.create(
    subject + " - " + type + " Responses (Sem " + semester + ")"
  );
  var sheet = spreadsheet.getActiveSheet();
  sheet.setName(type + " Responses");

  var headers = ["Timestamp", "Email", "Name", "Registration No."]
    .concat(questions)
    .concat(["Average Score"]);

  sheet.appendRow(headers);

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange
    .setBackground("#1a73e8")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 130);

  sheet.getRange("A1").setNote(
    type + " Feedback\n" +
    "Scale: 1-5\n" +
    "Average Score is auto-calculated."
  );

  return spreadsheet;
}

// ==========================================
// CREATE CO RESPONSE SHEET
// ==========================================
function createCOResponseSheet(subject, semester, coQuestions) {
  var spreadsheet = SpreadsheetApp.create(
    subject + " - CO Attainment Responses (Sem " + semester + ")"
  );
  var sheet = spreadsheet.getActiveSheet();
  sheet.setName("CO Responses");

  // Use short labels CO1, CO2... as column headers
  var coLabels = coQuestions.length > 0
    ? coQuestions.map(function(q) { return q.split(":")[0].trim(); })
    : ["CO1", "CO2", "CO3", "CO4", "CO5"];

  var headers = ["Timestamp", "Email", "Name", "Registration No."]
    .concat(coLabels)
    .concat(["Total", "Average", "Attainment %"]);

  sheet.appendRow(headers);

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange
    .setBackground("#0f9d58")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 130);

  sheet.getRange("A1").setNote(
    "CO Attainment Scale:\n" +
    "1 = Not Satisfactory\n" +
    "2 = Fairly Satisfactory\n" +
    "3 = Very Satisfactory\n\n" +
    "Attainment % = (Average / 3) * 100"
  );

  return spreadsheet;
}

// ==========================================
// AVERAGE SCORE SETUP & SYNC TRIGGER
// ==========================================
function setupAverageScoreForSpreadsheet(spreadsheetId) {
  try {
    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    var sheet = spreadsheet.getSheets()[0];
    ensureAverageColumn(sheet);
    ensureFormSubmitTrigger(spreadsheetId);
  } catch (err) {
    Logger.log("setupAverageScore error: " + err.toString());
  }
}

function ensureAverageColumn(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return;
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (headers.indexOf("Average Score") !== -1) return;
  var newCol = lastCol + 1;
  sheet.getRange(1, newCol).setValue("Average Score").setFontWeight("bold");
}

function ensureFormSubmitTrigger(spreadsheetId) {
  var triggers = ScriptApp.getProjectTriggers();
  var exists = triggers.some(function(t) {
    return t.getHandlerFunction() === "calculateAverageScoreOnSubmit" &&
      t.getTriggerSourceId && t.getTriggerSourceId() === spreadsheetId;
  });
  if (!exists) {
    ScriptApp.newTrigger("calculateAverageScoreOnSubmit")
      .forSpreadsheet(spreadsheetId)
      .onFormSubmit()
      .create();
  }
}

function calculateAverageScoreOnSubmit(e) {
  try {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    ensureAverageColumn(sheet);
    var row = e.range.getRow();
    if (row <= 1) return;
    var lastCol = sheet.getLastColumn();
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var avgColIndex = headers.indexOf("Average Score") + 1;
    
    // Calculate and set the average score
    if (avgColIndex > 0) {
      var rowValues = sheet.getRange(row, 1, 1, lastCol).getValues()[0];
      var avg = calculateNumericAverage(rowValues);
      sheet.getRange(row, avgColIndex).setValue(avg !== null ? avg : "");
    }
    
    // SYNC THE DATA TO BACKEND
    syncToFirebase(e);
    
  } catch (err) {
    Logger.log("calculateAverageScoreOnSubmit error: " + err.toString());
  }
}

// ==========================================
// SYNC DATA TO BACKEND (FIREBASE)
// ==========================================
function syncToFirebase(e) {
  try {
    if (!BACKEND_FEEDBACK_URL) {
      Logger.log("BACKEND_FEEDBACK_URL is not set. Skipping sync.");
      return;
    }

    var sheet = e.range.getSheet();
    var spreadsheet = sheet.getParent();
    var ssName = spreadsheet.getName(); 
    
    // Parse subject and form type from the spreadsheet name
    var subjectName = "Unknown";
    var formType = "teaching";
    
    if (ssName.indexOf(" - Teaching Responses") !== -1) {
      subjectName = ssName.split(" - Teaching Responses")[0];
      formType = "teaching";
    } else if (ssName.indexOf(" - CO Attainment Responses") !== -1) {
      subjectName = ssName.split(" - CO Attainment Responses")[0];
      formType = "co";
    } else if (ssName.indexOf(" - Curricular Gap Responses") !== -1) {
      subjectName = ssName.split(" - Curricular Gap Responses")[0];
      formType = "gap";
    }
    
    var lastCol = sheet.getLastColumn();
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    
    // Get values robustly
    var values = e.values;
    if (!values) {
       values = sheet.getRange(e.range.getRow(), 1, 1, lastCol).getValues()[0];
    }
    
    // Build the data payload required by the backend
    var data = {
      timestamp: values[0] || new Date().toISOString(),
      email: values[1] || "",
      name: values[2] || "",
      reg_no: values[3] || "",
      student_email: values[1] || "",
      student_name: values[2] || "",
      subject: subjectName,
      subject_name: subjectName,
      form_type: formType,
      responses: {}
    };
    
    // Dynamically map all questions and answers
    var qIndex = 1;
    for (var i = 4; i < headers.length; i++) {
      var header = headers[i];
      var val = values[i];
      
      // Skip calculation columns
      if (header === "Average Score" || header === "Total" || header === "Average" || header === "Attainment %") {
         continue;
      }
      
      data["Q" + qIndex] = val;
      data.responses[header] = val;
      qIndex++;
    }

    // Send to the Node.js backend
    var response = UrlFetchApp.fetch(BACKEND_FEEDBACK_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(data),
      headers: { "ngrok-skip-browser-warning": "true" },
      muteHttpExceptions: true
    });
    Logger.log("Backend Response: " + response.getContentText());

  } catch (err) {
    Logger.log("ERROR in syncToFirebase: " + err.toString());
  }
}

// ==========================================
// SUMMARY (for dashboard)
// ==========================================
function getFeedbackSummary(sheetRef) {
  try {
    var id = extractSpreadsheetId(sheetRef);
    if (!id) {
      return { success: false, message: "Invalid sheet reference", totalResponses: 0, averageScore: null };
    }

    var spreadsheet = SpreadsheetApp.openById(id);
    var sheet = findResponseSheet(spreadsheet);
    if (!sheet) return { success: true, totalResponses: 0, averageScore: null };

    ensureAverageColumn(sheet);
    recalculateAverageScores(sheet);

    var values = sheet.getDataRange().getValues();
    if (values.length <= 1) return { success: true, totalResponses: 0, averageScore: null };

    var headers = values[0];
    var avgCol = headers.indexOf("Average Score");
    if (avgCol === -1) return { success: true, totalResponses: 0, averageScore: null };

    var count = 0, sum = 0;
    for (var i = 1; i < values.length; i++) {
      var v = Number(values[i][avgCol]);
      if (!isNaN(v) && v > 0) { count++; sum += v; }
    }

    return {
      success: true,
      totalResponses: count,
      averageScore: count > 0 ? Number((sum / count).toFixed(2)) : null
    };

  } catch (err) {
    return { success: false, message: err.toString(), totalResponses: 0, averageScore: null };
  }
}

// ==========================================
// ADD THIS FUNCTION TO THE BOTTOM OF YOUR code.gs
// ==========================================
function manualSyncSpecificSheet() {
  // Replace this with the URL of the Google Sheet you want to sync
  var url = "https://docs.google.com/spreadsheets/d/1GdigvLnnLEmrCiV2zQ51RbvSzWdDzpVqW5OXTuz8mXQ/edit"; 
  
  var spreadsheet = SpreadsheetApp.openByUrl(url);
  var sheet = findResponseSheet(spreadsheet);
  if (!sheet) {
    Logger.log("No response sheet found!");
    return;
  }
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  // Start from row 2 (skip headers)
  for (var i = 1; i < data.length; i++) {
    var rowValues = data[i];
    var payload = {
      range: { getSheet: function() { return sheet; }, getRow: function() { return i + 1; } },
      values: rowValues
    };
    
    Logger.log("Syncing row " + (i+1) + ": " + rowValues[2]);
    syncToFirebase(payload);
    Utilities.sleep(500); // Small delay to avoid overloading
  }
  Logger.log("Done! All rows synced.");
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function findResponseSheet(spreadsheet) {
  var sheets = spreadsheet.getSheets();
  // First priority: Look for the sheet Google Forms automatically creates
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().toLowerCase().indexOf("form responses") >= 0) {
      return sheets[i];
    }
  }
  // Second priority: Look for our custom Responses sheet
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().toLowerCase().indexOf("responses") >= 0) {
      return sheets[i];
    }
  }
  return sheets[0] || null;
}

function recalculateAverageScores(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return;

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var avgColIndex = headers.indexOf("Average Score") + 1;
  if (avgColIndex <= 0) return;

  var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var averages = data.map(function(row) {
    var avg = calculateNumericAverage(row);
    return [avg !== null ? avg : ""];
  });

  sheet.getRange(2, avgColIndex, averages.length, 1).setValues(averages);
}

function calculateNumericAverage(rowValues) {
  var ratings = [];
  rowValues.forEach(function(value) {
    if (typeof value === "number") {
      if (value >= 1 && value <= 5) ratings.push(value);
      return;
    }
    if (typeof value !== "string") return;
    var trimmed = value.trim();
    if (!trimmed) return;
    var n = Number(trimmed);
    if (!isNaN(n) && n >= 1 && n <= 5) { ratings.push(n); return; }
    var prefixed = trimmed.match(/^([1-5])\s*-/);
    if (prefixed) { ratings.push(Number(prefixed[1])); return; }
    var inParens = trimmed.match(/\(([1-5])\)/);
    if (inParens) { ratings.push(Number(inParens[1])); return; }
    var anyDigit = trimmed.match(/(^|\D)([1-5])(\D|$)/);
    if (anyDigit) ratings.push(Number(anyDigit[2]));
  });
  if (ratings.length === 0) return null;
  return Number((ratings.reduce(function(a, b) { return a + b; }, 0) / ratings.length).toFixed(2));
}

function extractSpreadsheetId(sheetRef) {
  if (!sheetRef) return "";
  if (sheetRef.indexOf("http") === 0) {
    var match = sheetRef.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : "";
  }
  return sheetRef;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// RUN THIS ONCE FROM APPS SCRIPT EDITOR
// To auto-create all 6 subjects' 3 forms each
// ==========================================
function createAllSubjectsOneTime() {
  var subjects = [
    { name: "Theory of Computation",          semester: "5" },
    { name: "Machine Learning",               semester: "5" },
    { name: "Software Engineering",           semester: "5" },
    { name: "Data Visualization and Analytics", semester: "5" },
    { name: "Computer Networks",              semester: "5" },
    { name: "Algorithm Analysis and Design",  semester: "5" }
  ];

  subjects.forEach(function(s) {
    Logger.log("Creating forms for: " + s.name);
    var result = createAllSubjectForms(s.name, s.semester);
    Logger.log(JSON.stringify(result));
    Utilities.sleep(3000); // pause to avoid quota limit
  });

  Logger.log("=== DONE. Copy the URLs from above into Firestore. ===");
}

// ==========================================
// TEST FUNCTION (optional)
// ==========================================
function testCreateForm() {
  try {
    var result = createAllSubjectForms("Computer Networks", "5");
    Logger.log("Test Result: " + JSON.stringify(result));
  } catch (error) {
    Logger.log("Test Error: " + error.toString());
  }
}

// ==========================================
// RESTORE FULLY AUTOMATIC PIPELINE
// ==========================================
function fixAllMyTriggers() {
  // 1. Delete ALL old broken triggers to free up quota
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  Logger.log("Deleted " + triggers.length + " old broken triggers.");

  // 2. Exact Google Sheet IDs directly from your Firebase backend
  var activeSheetIds = [
    '1chRWACBjPtwyViq5GD-F1Xiky1lkR6JRzktw9CFQSwg',
    '19VgYVIrJK3p6yyKYm3yUT2ZxS_TkWyue7lXp-aLafms',
    '1VZpZYCcsnhdf9AfjFDt8KxtHTD_-XDWs9btp0BzIFTQ',
    '1syt359B9sX5l1YRdsgQDzX0TojT6qEWy9-Pp8uri90g',
    '1WNE0um5_qXrtHrOzSdBb4JwBhhOL3_4O2vy3Jp7Ynmo',
    '1zJjgjL-pUxhZSbSHLLJP7SP-nCURqVTiduQx7gKRfDY',
    '1GdigvLnnLEmrCiV2zQ51RbvSzWdDzpVqW5OXTuz8mXQ',
    '1onfTNKtQJJR6_0F8WwfLhCqfyIbiFmmWvdAXnOAinm8',
    '1k_zt035Va-gm3Zjwnt84jckYQbanvxF82ijR9AGQjIw',
    '1lfUjYxg13ynlwzpOa5BDhacqdUWV7AhzQkiEzZsiIac',
    '1k7BQhYtdzjM-j8SVgRbNd6nlwuA_ah8-4ppzPwh4vuc',
    '1cUG5WLgL8UeOMsx_9fVKvcTKe92Z1_-lW1NyUp1Y1ok'
  ];

  // 3. Create fresh, clean triggers ONLY for your 12 active sheets
  var successCount = 0;
  for (var j = 0; j < activeSheetIds.length; j++) {
    try {
      ScriptApp.newTrigger("calculateAverageScoreOnSubmit")
        .forSpreadsheet(activeSheetIds[j])
        .onFormSubmit()
        .create();
      successCount++;
    } catch(e) {
      Logger.log("Could not attach trigger for ID: " + activeSheetIds[j] + " - " + e.message);
    }
  }
  
  Logger.log("🎉 Successfully created " + successCount + " fresh automatic triggers! Your system is fully automatic again.");
}

