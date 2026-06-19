// ==========================================
// GOOGLE APPS SCRIPT - FORM & SHEET CREATOR
// ==========================================
// This script creates Google Forms and Sheets for feedback collection
// Deploy as a Web App with "Execute as: Me" and "Who has access: Anyone"

// Gmail credentials (replace with actual API keys if needed for advanced features)
const SPREADSHEET_PARENT_FOLDER_ID = "YOUR_GOOGLE_DRIVE_FOLDER_ID"; // Optional: create forms in a specific folder

// Predefined feedback questions (1-5 scale)
const FEEDBACK_QUESTIONS = [
    "Has the teacher covered the entire syllabus?",
    "Covered topics beyond syllabus?",
    "Technical Content",
    "Communication Skills",
    "Use of Teaching Aids",
    "Pace of teaching",
    "Motivation",
    "Practical Demonstration",
    "Hands-on Training",
    "Clarity of expectations",
    "Feedback on progress",
    "Help & support"
];

const SCALE_OPTIONS = ["1 - Poor", "2 - Fair", "3 - Good", "4 - Very Good", "5 - Excellent"];

/**
 * Main POST handler - receives requests from the web application
 * @param {Object} e - Event object containing request data
 * @returns {Object} JSON response with form and sheet links
 */
function doPost(e) {
    try {
        // Parse request body
        const requestBody = JSON.parse(e.postData.contents);

        if (requestBody.action === 'getSummary') {
            const summary = getFeedbackSummary(requestBody.sheetLink || requestBody.sheetId || '');
            return ContentService.createTextOutput(
                JSON.stringify(summary)
            ).setMimeType(ContentService.MimeType.JSON);
        }

        const subject = requestBody.subject;
        const semester = requestBody.semester;

        if (!subject || !semester) {
            return ContentService.createTextOutput(
                JSON.stringify({ success: false, error: "Missing subject or semester" })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        // Create Google Form
        const form = createFeedbackForm(subject, semester);
        const formUrl = form.getPublishedUrl();
        const formId = form.getId();

        // Create Google Sheet
        const sheet = createFeedbackSheet(subject, semester, formId);
        const sheetUrl = sheet.getUrl();

        // Link form to sheet (responses go to sheet)
        form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

        // Setup average score calculation in response sheet
        setupAverageScoreForSpreadsheet(sheet.getId());

        // Return success response
        const response = {
            success: true,
            formUrl: formUrl,
            sheetUrl: sheetUrl,
            subject: subject,
            semester: semester,
            createdAt: new Date().toISOString()
        };

        return ContentService.createTextOutput(
            JSON.stringify(response)
        ).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        Logger.log("Error in doPost: " + error.toString());
        return ContentService.createTextOutput(
            JSON.stringify({ success: false, error: error.toString() })
        ).setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * Return summary for a feedback spreadsheet.
 * @param {string} sheetRef - Spreadsheet URL or ID
 * @returns {{success:boolean,totalResponses:number,averageScore:number|null,message?:string}}
 */
function getFeedbackSummary(sheetRef) {
    try {
        const spreadsheetId = extractSpreadsheetId(sheetRef);
        if (!spreadsheetId) {
            return { success: false, message: 'Invalid or missing sheet reference', totalResponses: 0, averageScore: null };
        }

        const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
        const responseSheet = findResponseSheet(spreadsheet);
        if (!responseSheet) {
            return { success: true, totalResponses: 0, averageScore: null };
        }

        ensureAverageColumn(responseSheet);
        recalculateAverageScores(responseSheet);

        const dataRange = responseSheet.getDataRange();
        const values = dataRange.getValues();
        if (values.length <= 1) {
            return { success: true, totalResponses: 0, averageScore: null };
        }

        const headers = values[0];
        const avgCol = headers.indexOf('Average Score');
        if (avgCol === -1) {
            return { success: true, totalResponses: 0, averageScore: null };
        }

        let responseCount = 0;
        let sum = 0;

        for (let i = 1; i < values.length; i++) {
            const avgValue = values[i][avgCol];
            const parsed = Number(avgValue);
            if (!isNaN(parsed) && parsed > 0) {
                responseCount++;
                sum += parsed;
            }
        }

        const overallAvg = responseCount > 0 ? Number((sum / responseCount).toFixed(2)) : null;
        return {
            success: true,
            totalResponses: responseCount,
            averageScore: overallAvg
        };
    } catch (error) {
        return {
            success: false,
            message: error.toString(),
            totalResponses: 0,
            averageScore: null
        };
    }
}

/**
 * Setup average score column and install submit trigger.
 * @param {string} spreadsheetId
 */
function setupAverageScoreForSpreadsheet(spreadsheetId) {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const responseSheet = findResponseSheet(spreadsheet);
    if (!responseSheet) return;

    ensureAverageColumn(responseSheet);
    recalculateAverageScores(responseSheet);
    ensureFormSubmitTrigger(spreadsheetId);
}

/**
 * Trigger handler: calculate average score for submitted row.
 * @param {GoogleAppsScript.Events.SheetsOnFormSubmit} e
 */
function calculateAverageScoreOnSubmit(e) {
    if (!e || !e.range) return;

    const sheet = e.range.getSheet();
    ensureAverageColumn(sheet);

    const row = e.range.getRow();
    if (row <= 1) return;

    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const avgColIndex = headers.indexOf('Average Score') + 1;

    const rowValues = sheet.getRange(row, 1, 1, lastCol).getValues()[0];
    const avg = calculateNumericAverage(rowValues);
    sheet.getRange(row, avgColIndex).setValue(avg !== null ? avg : '');
}

function ensureFormSubmitTrigger(spreadsheetId) {
    const triggers = ScriptApp.getProjectTriggers();
    const exists = triggers.some((trigger) => {
        return trigger.getHandlerFunction() === 'calculateAverageScoreOnSubmit' &&
            trigger.getTriggerSourceId &&
            trigger.getTriggerSourceId() === spreadsheetId;
    });

    if (!exists) {
        ScriptApp.newTrigger('calculateAverageScoreOnSubmit')
            .forSpreadsheet(spreadsheetId)
            .onFormSubmit()
            .create();
    }
}

function findResponseSheet(spreadsheet) {
    const sheets = spreadsheet.getSheets();
    for (let i = 0; i < sheets.length; i++) {
        const name = sheets[i].getName();
        if (name.indexOf('Form Responses') === 0 || name.indexOf('Feedback Responses') >= 0) {
            return sheets[i];
        }
    }
    return sheets[0] || null;
}

function ensureAverageColumn(sheet) {
    const lastCol = sheet.getLastColumn();
    if (lastCol === 0) return;

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    if (headers.indexOf('Average Score') !== -1) return;

    sheet.getRange(1, lastCol + 1).setValue('Average Score');
    sheet.getRange(1, lastCol + 1).setFontWeight('bold');
}

function recalculateAverageScores(sheet) {
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow <= 1 || lastCol === 0) return;

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const avgColIndex = headers.indexOf('Average Score') + 1;
    if (avgColIndex <= 0) return;

    const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    const averages = data.map((row) => {
        const avg = calculateNumericAverage(row);
        return [avg !== null ? avg : ''];
    });

    sheet.getRange(2, avgColIndex, averages.length, 1).setValues(averages);
}

function calculateNumericAverage(rowValues) {
    const ratings = [];

    rowValues.forEach((value) => {
        if (typeof value === 'number') {
            if (value >= 1 && value <= 5) {
                ratings.push(value);
            }
            return;
        }

        if (typeof value !== 'string') return;
        const trimmed = value.trim();
        if (!trimmed) return;

        const prefixed = trimmed.match(/^([1-5])\s*-/);
        if (prefixed) {
            ratings.push(Number(prefixed[1]));
            return;
        }

        // Handles formats like "Agree (4)", "Rating: 5", "Option 3"
        const inParens = trimmed.match(/\(([1-5])\)/);
        if (inParens) {
            ratings.push(Number(inParens[1]));
            return;
        }

        const anyDigit = trimmed.match(/(^|\D)([1-5])(\D|$)/);
        if (anyDigit) {
            ratings.push(Number(anyDigit[2]));
            return;
        }

        const numericOnly = Number(trimmed);
        if (!isNaN(numericOnly) && numericOnly >= 1 && numericOnly <= 5) {
            ratings.push(numericOnly);
        }
    });

    if (ratings.length === 0) return null;
    const sum = ratings.reduce((acc, n) => acc + n, 0);
    return Number((sum / ratings.length).toFixed(2));
}

function extractSpreadsheetId(sheetRef) {
    if (!sheetRef) return '';

    if (sheetRef.indexOf('http') === 0) {
        const match = sheetRef.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        return match && match[1] ? match[1] : '';
    }

    return sheetRef;
}

/**
 * Create a Google Form for feedback
 * @param {string} subject - Subject name
 * @param {string} semester - Semester number
 * @returns {Form} Created form object
 */
function createFeedbackForm(subject, semester) {
    // Create the form
    const form = FormApp.create(`${subject} - Feedback Form (Semester ${semester})`);

    // Configure form settings
    form.setCollectEmail(true); // Collect email addresses
    form.setLimitOneResponsePerUser(true); // One response per user
    form.setShowLinkToRespondAgain(false); // Don't show "respond again" option
    
    // Set form description
    form.setDescription(
        `Feedback Form for ${subject}\n` +
        `Semester: ${semester}\n` +
        `Please rate based on your learning experience. Feedback is valuable for course improvement.`
    );

    // Add email collection item (for identity verification)
    form.addTextItem()
        .setTitle("Email Address (auto-collected)")
        .setRequired(false)
        .setHelpText("Your email will be collected automatically");

    // Add all feedback questions as multiple choice (1-5 scale)
    FEEDBACK_QUESTIONS.forEach((question, index) => {
        const item = form.addMultipleChoiceItem();
        item.setTitle(question)
            .setChoiceValues(SCALE_OPTIONS)
            .setRequired(true)
            .setHelpText(`Rate this aspect on a scale of 1 to 5`);
    });

    // Add optional comment field
    form.addParagraphTextItem()
        .setTitle("Additional Comments")
        .setRequired(false)
        .setHelpText("Please share any additional feedback or suggestions");

    return form;
}

/**
 * Create a Google Sheet for responses
 * @param {string} subject - Subject name
 * @param {string} semester - Semester number
 * @param {string} formId - Google Form ID (to link responses)
 * @returns {Spreadsheet} Created spreadsheet object
 */
function createFeedbackSheet(subject, semester, formId) {
    // Create the spreadsheet
    const spreadsheet = SpreadsheetApp.create(
        `${subject} - Feedback Responses (Semester ${semester})`
    );

    // Get active sheet
    const sheet = spreadsheet.getActiveSheet();

    // Add header row
    const headers = [
        "Timestamp",
        "Email Address",
        ...FEEDBACK_QUESTIONS,
        "Additional Comments"
    ];

    sheet.appendRow(headers);

    // Format header row
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#3498db")
        .setFontColor("#ffffff")
        .setFontWeight("bold")
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle");

    // Set column widths
    sheet.setColumnWidth(1, 150); // Timestamp
    sheet.setColumnWidth(2, 180); // Email
    
    // Set equal width for feedback columns
    for (let i = 3; i <= 2 + FEEDBACK_QUESTIONS.length; i++) {
        sheet.setColumnWidth(i, 100);
    }
    sheet.setColumnWidth(headers.length, 200); // Comments

    // Freeze header row
    sheet.setFrozenRows(1);

    // Add data validation guidelines (optional)
    addSheetNotes(sheet);

    return spreadsheet;
}

/**
 * Add helpful notes to the sheet
 * @param {Sheet} sheet - Spreadsheet sheet object
 */
function addSheetNotes(sheet) {
    try {
        // Add a note to cell A1 with instructions
        const headerRange = sheet.getRange("A1");
        headerRange.setNote(
            "This sheet collects feedback responses.\n" +
            "Responses are automatically added from the Google Form.\n" +
            "Do not manually edit the Timestamp or Email columns to maintain data integrity."
        );
    } catch (error) {
        Logger.log("Could not add notes: " + error);
    }
}

/**
 * Advanced: Create a summary statistics sheet (optional)
 * @param {Spreadsheet} spreadsheet - Spreadsheet object
 * @param {Sheet} dataSheet - Data sheet with responses
 */
function createSummarySheet(spreadsheet, dataSheet) {
    try {
        // Create summary sheet
        const summarySheet = spreadsheet.insertSheet("Summary Statistics");

        // Add title
        summarySheet.getRange("A1").setValue("Feedback Summary").setFontSize(16).setFontWeight("bold");

        // Add average ratings calculation
        let row = 3;
        summarySheet.getRange(`A${row}`).setValue("Question").setFontWeight("bold");
        summarySheet.getRange(`B${row}`).setValue("Average Rating").setFontWeight("bold");
        summarySheet.getRange(`C${row}`).setValue("Responses").setFontWeight("bold");

        row++;

        // Example: Add formulas to calculate averages
        // This would need to be customized based on actual question positions

        return summarySheet;
    } catch (error) {
        Logger.log("Could not create summary sheet: " + error);
        return null;
    }
}

/**
 * Log function for debugging (view logs in Apps Script editor)
 * @param {string} message - Message to log
 */
function logDebug(message) {
    Logger.log(message);
}

/**
 * Test function - call this from the Apps Script editor to test form creation
 * Remove or comment out before deploying
 */
function testCreateForm() {
    try {
        const testResponse = doPost({
            postData: {
                contents: JSON.stringify({
                    subject: "Test Subject - Data Structures",
                    semester: "3"
                })
            }
        });

        Logger.log("Test Response: " + testResponse.getContent());
    } catch (error) {
        Logger.log("Test Error: " + error.toString());
    }
}

/**
 * Get Apps Script deployment info (for debugging)
 */
function showDeploymentInfo() {
    Logger.log("Deployment Info:");
    Logger.log("Script ID: " + ScriptApp.getScriptId());
    Logger.log("Web App URL can be found in:");
    Logger.log("1. Deploy > New deployment");
    Logger.log("2. Select type: Web app");
    Logger.log("3. Copy the deployment URL");
}
