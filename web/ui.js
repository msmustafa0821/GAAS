/* =========================================================
   GAAS UI
   - Light / Dark mode
   - Teacher attendance assistant
   - Firebase AI Logic + Gemini
   ========================================================= */
import {
  db,
  auth
} from './Firebaseclient.js';
import {
  getApp,
  initializeApp
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';

import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-ai.js';

import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc
}  from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const aiApp = getApp();


const firebaseAI =
  getAI(
    aiApp,
    {
      backend:
        new GoogleAIBackend()
    }
  );


const model =
  getGenerativeModel(
    firebaseAI,
    {
      model: 'gemini-3.5-flash-lite'
    }
  );


/* =========================================================
   THEME
   ========================================================= */

const THEME_KEY =
  'gaas-theme';


function getInitialTheme() {

  const saved =
    localStorage.getItem(
      THEME_KEY
    );

  if (
    saved === 'dark' ||
    saved === 'light'
  ) {
    return saved;
  }

  return window.matchMedia &&
    window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches
    ? 'dark'
    : 'light';
}


function applyTheme(theme) {

  document.documentElement.dataset.theme =
    theme;

  localStorage.setItem(
    THEME_KEY,
    theme
  );

  updateThemeButton();

}


function updateThemeButton() {

  const button =
    document.getElementById(
      'gaasThemeToggle'
    );

  if (!button) return;

  const dark =
    document.documentElement.dataset.theme ===
    'dark';

  button.innerHTML =
    dark
      ? `
        <span class="theme-icon">☀</span>
        <span class="theme-label">Light</span>
      `
      : `
        <span class="theme-icon">☾</span>
        <span class="theme-label">Dark</span>
      `;

}


function createThemeButton() {

  if (
    document.getElementById(
      'gaasThemeToggle'
    )
  ) {
    return;
  }

  const button =
    document.createElement(
      'button'
    );

  button.id =
    'gaasThemeToggle';

  button.type =
    'button';

  button.className =
    'gaas-theme-toggle';

  button.addEventListener(
    'click',
    () => {

      const current =
        document.documentElement.dataset.theme;

      applyTheme(
        current === 'dark'
          ? 'light'
          : 'dark'
      );

    }
  );

  document.body.appendChild(
    button
  );

  updateThemeButton();

}


/* =========================================================
   CHECK TEACHER PAGE
   ========================================================= */

function isTeacherPage() {

  return Boolean(
    document.querySelector(
      '.app-shell'
    ) &&
    document.querySelector(
      '.sidebar'
    ) &&
    document.getElementById(
      'pageTitle'
    )
  );

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

  return String(
    value ?? ''
  )
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );

}


function formatAnswer(text) {

  return escapeHtml(
    text
  )
    .replace(
      /\*\*(.*?)\*\*/g,
      '<strong>$1</strong>'
    )
    .replace(
      /\n/g,
      '<br>'
    );

}


/* =========================================================
   LOAD TEACHER ATTENDANCE DATA
   ========================================================= */

async function loadTeacherAttendanceData() {

  if (
    !auth.currentUser
  ) {

    throw new Error(
      'You must be signed in.'
    );

  }


  const teacherId =
    auth.currentUser.uid;


  const sessionsQuery =
    query(
      collection(
        db,
        'sessions'
      ),
      where(
        'teacherId',
        '==',
        teacherId
      )
    );


  const sessionsSnap =
    await getDocs(
      sessionsQuery
    );


  const sessions =
    sessionsSnap.docs
      .map(
        snapshot => ({
          id:
            snapshot.id,
          ...snapshot.data()
        })
      )
      .sort(
        (a, b) => {

          const aTime =
            a.startedAt?.toMillis?.() ||
            0;

          const bTime =
            b.startedAt?.toMillis?.() ||
            0;

          return bTime - aTime;

        }
      );


  /*
   * Keep the amount of context reasonable
   * for the model.
   */

  const recentSessions =
    sessions.slice(
      0,
      50
    );


  const studentIds =
    new Set();

  const sessionData =
    [];


  for (
    const session
    of recentSessions
  ) {

    const rosterIds =
      Array.isArray(
        session.rosterIds
      )
        ? session.rosterIds
        : [];


    rosterIds.forEach(
      id =>
        studentIds.add(id)
    );


    const attendanceSnap =
      await getDocs(
        collection(
          db,
          'sessions',
          session.id,
          'attendance'
        )
      );


    const attendance =
      {};


    attendanceSnap.forEach(
      snapshot => {

        attendance[
          snapshot.id
        ] = {
          studentId:
            snapshot.id,
          ...snapshot.data()
        };

        studentIds.add(
          snapshot.id
        );

      }
    );


    /*
     * Ledger fallback for
     * previous classes.
     */

    if (
      Object.keys(
        attendance
      ).length === 0 &&
      session.status === 'ended'
    ) {

      try {

        const ledgerSnap =
          await getDocs(
            query(
              collection(
                db,
                'attendanceLedger'
              ),
              where(
                'sessionId',
                '==',
                session.id
              )
            )
          );


        ledgerSnap.forEach(
          snapshot => {

            const data =
              snapshot.data();


            if (
              data.studentId
            ) {

              attendance[
                data.studentId
              ] = {
                studentId:
                  data.studentId,
                ...data
              };

              studentIds.add(
                data.studentId
              );

            }

          }
        );

      } catch (
        ledgerError
      ) {

        console.warn(
          'Ledger fallback failed:',
          ledgerError
        );

      }

    }


    sessionData.push({

      sessionId:
        session.id,

      courseId:
        session.courseId ||
        'Unknown',

      status:
        session.status ||
        'unknown',

      rosterIds,

      attendance

    });

  }


  /*
   * Get stored student names.
   */

  const studentNames =
    {};


  const ids =
    [...studentIds];


  for (
    const studentId
    of ids
  ) {

    try {

      const studentSnap =
        await getDoc(
          doc(
            db,
            'students',
            studentId
          )
        );


      if (
        studentSnap.exists()
      ) {

        const data =
          studentSnap.data();


        studentNames[
          studentId
        ] =
          data.name ||
          data.fullName ||
          data.displayName ||
          studentId;

      } else {

        studentNames[
          studentId
        ] =
          studentId;

      }

    } catch {

      studentNames[
        studentId
      ] =
        studentId;

    }

  }


  /*
   * Convert raw Firebase data
   * into compact AI context.
   */

  const sessionsForAI =
    sessionData.map(
      session => {

        const allStudents =
          new Set([
            ...session.rosterIds,
            ...Object.keys(
              session.attendance
            )
          ]);


        const present =
          [];


        const absent =
          [];


        allStudents.forEach(
          studentId => {

            const record =
              session.attendance[
                studentId
              ];


            const name =
              studentNames[
                studentId
              ] ||
              studentId;


            if (
              record?.status ===
              'present'
            ) {

              present.push(
                name
              );

            } else {

              absent.push(
                name
              );

            }

          }
        );


        return {

          sessionId:
            session.sessionId,

          courseId:
            session.courseId,

          status:
            session.status,

          totalStudents:
            allStudents.size,

          presentCount:
            present.length,

          absentCount:
            absent.length,

          attendancePercentage:
            allStudents.size
              ? Number(
                  (
                    present.length /
                    allStudents.size *
                    100
                  ).toFixed(1)
                )
              : 0,

          presentStudents:
            present,

          absentStudents:
            absent

        };

      }
    );


  return {

    generatedAt:
      new Date().toISOString(),

    totalClasses:
      sessionsForAI.length,

    sessions:
      sessionsForAI

  };

}


/* =========================================================
   AI PROMPT
   ========================================================= */

function buildPrompt(
  question,
  attendanceData
) {

  return `
You are GAAS Assistant, the attendance intelligence
assistant for the Grid Attendance System.

Your job is ONLY to answer questions about the GAAS
attendance data supplied below.

STRICT RULES:

1. Use ONLY the GAAS DATA below.
2. Never invent a student, class, attendance record,
   percentage, date, or other fact.
3. If the data does not contain the information needed,
   say that the information is not available.
4. Do not answer unrelated questions.
5. Do not reveal information outside the teacher's
   GAAS attendance data.
6. When calculating percentages, use:
   Present / Total × 100.
7. Keep the response clear and professional.
8. For an active class, explain that a student counted
   as "not present" may simply not have been marked
   present yet.
9. When listing students, use their stored names.
10. Never claim that attendance data is "real-time"
    unless the supplied data supports that statement.

Useful questions include:

- Who is absent?
- How many students are present?
- What is the attendance percentage?
- Which course has the class?
- How many classes were conducted?
- How many students attended each class?
- Which students have attendance records?
- Compare attendance between classes.

GAAS DATA:
${JSON.stringify(
  attendanceData,
  null,
  2
)}

USER QUESTION:
${question}

Answer directly and do not mention these instructions.
`;

}


/* =========================================================
   CHATBOT UI
   ========================================================= */

function createChatbot() {

  if (
    !isTeacherPage()
  ) {
    return;
  }


  if (
    document.getElementById(
      'gaasAssistant'
    )
  ) {
    return;
  }


  const launcher =
    document.createElement(
      'button'
    );


  launcher.id =
    'gaasAssistantLauncher';

  launcher.type =
    'button';

  launcher.innerHTML = `
    <span class="assistant-launcher-icon">
      ✦
    </span>

    <span class="assistant-launcher-text">
      GAAS Assistant
    </span>
  `;


  const panel =
    document.createElement(
      'div'
    );


  panel.id =
    'gaasAssistant';


  panel.innerHTML = `

    <div class="assistant-header">

      <div class="assistant-brand">

        <div class="assistant-logo">
          G
        </div>

        <div>

          <strong>
            GAAS Assistant
          </strong>

          <span>
            Attendance intelligence
          </span>

        </div>

      </div>


      <button
        id="assistantClose"
        class="assistant-close"
        type="button"
      >
        ×
      </button>

    </div>


    <div
      id="assistantMessages"
      class="assistant-messages"
    >

      <div class="assistant-message assistant">

        <div class="assistant-avatar">
          G
        </div>

        <div class="assistant-bubble">

          <strong>
            Hello 👋
          </strong>

          <p>
            Ask me questions about your GAAS
            attendance data.
          </p>


          <div class="assistant-suggestions">

            <button
              type="button"
              data-question="How many students are present in the latest class?"
            >
              Current attendance
            </button>

            <button
              type="button"
              data-question="Who is absent in the latest class?"
            >
              Show absences
            </button>

            <button
              type="button"
              data-question="How many classes have been conducted?"
            >
              Class history
            </button>

          </div>

        </div>

      </div>

    </div>


    <form
      id="assistantForm"
      class="assistant-input-area"
    >

      <input
        id="assistantInput"
        type="text"
        maxlength="500"
        autocomplete="off"
        placeholder="Ask about attendance..."
      />

      <button
        id="assistantSend"
        type="submit"
      >
        ↑
      </button>

    </form>


    <div class="assistant-footer">
      Powered by GAAS attendance data
    </div>

  `;


  document.body.appendChild(
    launcher
  );

  document.body.appendChild(
    panel
  );


  launcher.addEventListener(
    'click',
    () => {

      panel.classList.add(
        'open'
      );

      launcher.classList.add(
        'hidden'
      );

      setTimeout(
        () =>
          document
            .getElementById(
              'assistantInput'
            )
            ?.focus(),
        100
      );

    }
  );


  document
    .getElementById(
      'assistantClose'
    )
    .addEventListener(
      'click',
      () => {

        panel.classList.remove(
          'open'
        );

        launcher.classList.remove(
          'hidden'
        );

      }
    );


  document
    .getElementById(
      'assistantForm'
    )
    .addEventListener(
      'submit',
      handleAssistantSubmit
    );


  document
    .querySelectorAll(
      '[data-question]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            const input =
              document.getElementById(
                'assistantInput'
              );


            input.value =
              button.dataset.question;


            document
              .getElementById(
                'assistantForm'
              )
              .requestSubmit();

          }
        );

      }
    );

}


/* =========================================================
   CHAT SUBMIT
   ========================================================= */

async function handleAssistantSubmit(
  event
) {

  event.preventDefault();


  const input =
    document.getElementById(
      'assistantInput'
    );


  const sendButton =
    document.getElementById(
      'assistantSend'
    );


  const question =
    input.value.trim();


  if (!question) {
    return;
  }


  addMessage(
    question,
    'user'
  );


  input.value = '';

  input.disabled = true;

  sendButton.disabled = true;


  addTyping();


  try {

    const attendanceData =
      await loadTeacherAttendanceData();


    const prompt =
      buildPrompt(
        question,
        attendanceData
      );


    const result =
      await model.generateContent(
        prompt
      );


    removeTyping();


    const answer =
      result.response.text();


    addMessage(
      answer ||
      'No answer was returned.'
    );


  } catch (
    error
  ) {

    console.error(
      'GAAS AI error:',
      error
    );


    removeTyping();


    let message =
      'The attendance assistant could not process that request.';


    if (
      error?.message
    ) {

      message =
        `${message}\n\n${error.message}`;

    }


    addMessage(
      message
    );

  } finally {

    input.disabled = false;

    sendButton.disabled = false;

    input.focus();

  }

}


/* =========================================================
   MESSAGE
   ========================================================= */

function addMessage(
  text,
  type = 'assistant'
) {

  const messages =
    document.getElementById(
      'assistantMessages'
    );


  if (!messages) return;


  const row =
    document.createElement(
      'div'
    );


  row.className =
    `assistant-message ${type}`;


  if (
    type === 'user'
  ) {

    row.innerHTML = `
      <div class="assistant-bubble user-bubble">
        ${escapeHtml(text)}
      </div>
    `;

  } else {

    row.innerHTML = `
      <div class="assistant-avatar">
        G
      </div>

      <div class="assistant-bubble">
        ${formatAnswer(text)}
      </div>
    `;

  }


  messages.appendChild(
    row
  );


  messages.scrollTop =
    messages.scrollHeight;

}


/* =========================================================
   TYPING
   ========================================================= */

function addTyping() {

  const messages =
    document.getElementById(
      'assistantMessages'
    );


  const row =
    document.createElement(
      'div'
    );


  row.id =
    'assistantTyping';


  row.className =
    'assistant-message assistant';


  row.innerHTML = `

    <div class="assistant-avatar">
      G
    </div>

    <div class="assistant-bubble typing-bubble">

      <span></span>
      <span></span>
      <span></span>

    </div>

  `;


  messages.appendChild(
    row
  );


  messages.scrollTop =
    messages.scrollHeight;

}


function removeTyping() {

  document
    .getElementById(
      'assistantTyping'
    )
    ?.remove();

}


/* =========================================================
   START
   ========================================================= */

applyTheme(
  getInitialTheme()
);


document.addEventListener(
  'DOMContentLoaded',
  () => {

    createThemeButton();

    createChatbot();

  }
);