// ==========================================
// STUDENT DASHBOARD MODULE
// ==========================================
// Handles student feedback submission and form management

let currentUser = null;

/**
 * Initialize student dashboard
 */
async function initializeStudentDashboard() {
    // Check authentication
    currentUser = await checkAuth();

    if (!currentUser || currentUser.role !== 'student') {
        window.location.href = 'login.html';
        return;
    }

    // Display user information
    document.getElementById('student-info').textContent = 
        `Welcome, ${currentUser.name} | Semester: ${currentUser.semester} | Branch: ${currentUser.branch}`;

    // Load subjects for the student's semester
    loadSubjectsForStudent();
}

/**
 * Load subjects based on student's semester
 */
async function loadSubjectsForStudent() {
    const gridElement = document.getElementById('subjects-grid');
    const emptyStateElement = document.getElementById('empty-state');
    const loadingElement = document.getElementById('loading');

    gridElement.innerHTML = '';
    loadingElement.style.display = 'block';
    emptyStateElement.style.display = 'none';

    try {
        // Query subjects by semester
        const querySnapshot = await firebase.firestore()
            .collection('subjects')
            .where('semester', '==', currentUser.semester)
            .get();

        if (querySnapshot.empty) {
            loadingElement.style.display = 'none';
            emptyStateElement.style.display = 'block';
            return;
        }

        // Process each subject
        for (const doc of querySnapshot.docs) {
            const subject = doc.data();
            subject.id = doc.id;

            // Check if student has already submitted feedback
            const submissionDoc = await firebase.firestore()
                .collection('feedback_submissions')
                .where('student_email', '==', currentUser.email)
                .where('subject_id', '==', doc.id)
                .get();

            const hasSubmitted = !submissionDoc.empty;

            // Create subject card
            const card = createSubjectCard(subject, hasSubmitted);
            gridElement.appendChild(card);
        }

        loadingElement.style.display = 'none';

    } catch (error) {
        console.error('Error loading subjects:', error);
        loadingElement.style.display = 'none';
        showMessageStudent('Error loading subjects. Please try again.', 'error');
    }
}

/**
 * Create a subject card element
 * @param {Object} subject - Subject data
 * @param {boolean} hasSubmitted - Whether student has submitted feedback
 * @returns {HTMLElement}
 */
function createSubjectCard(subject, hasSubmitted) {
    const card = document.createElement('div');
    card.className = 'subject-card';

    const statusClass = hasSubmitted ? 'submitted' : 'not-submitted';
    const statusText = hasSubmitted ? 'Feedback Submitted' : 'Pending Feedback';
    const buttonDisabled = hasSubmitted ? 'disabled' : '';

    card.innerHTML = `
        <h3>${subject.subject_name}</h3>
        <p class="subject-meta">
            Faculty: ${subject.faculty_name || 'Not available'}
        </p>
        <span class="subject-status ${statusClass}">${statusText}</span>
        <div class="subject-actions">
            <button 
                class="btn btn-primary btn-small ${buttonDisabled}" 
                onclick="openFeedbackForm('${subject.form_link}', '${subject.id}')"
                ${hasSubmitted ? 'disabled' : ''}
            >
                ${hasSubmitted ? 'Already Submitted' : 'Give Feedback'}
            </button>
        </div>
    `;

    return card;
}

/**
 * Open feedback form for a subject
 * @param {string} formLink - Google Form URL
 * @param {string} subjectId - Subject ID in Firestore
 */
async function openFeedbackForm(formLink, subjectId) {
    if (!formLink) {
        showMessageStudent('Form link not available. Please contact faculty.', 'error');
        return;
    }

    // Record submission in Firestore
    try {
        await firebase.firestore().collection('feedback_submissions').add({
            student_email: currentUser.email,
            subject_id: subjectId,
            submitted: true,
            timestamp: new Date().toISOString()
        });

        // Open form in new window
        window.open(formLink, '_blank', 'width=800,height=600');

        // Reload subjects to update status
        setTimeout(() => {
            loadSubjectsForStudent();
        }, 2000);

        showMessageStudent('Form opened in new window. Your submission has been recorded.', 'success');

    } catch (error) {
        console.error('Error recording submission:', error);
        // Still open the form even if recording fails
        window.open(formLink, '_blank', 'width=800,height=600');
    }
}

/**
 * Show message to student
 * @param {string} message - Message text
 * @param {string} type - Message type
 */
function showMessageStudent(message, type = 'info') {
    const messageDiv = document.getElementById('student-message');
    messageDiv.textContent = message;
    messageDiv.className = `message show ${type}`;

    if (type !== 'error') {
        setTimeout(() => {
            messageDiv.classList.remove('show');
        }, 5000);
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', initializeStudentDashboard);
