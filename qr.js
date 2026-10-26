/* =========================================================
   GAAS QR SYSTEM
   Teacher  -> Generates session QR
   Student  -> Scans session QR
   ========================================================= */

import QRCode from
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm';


/* =========================================================
   ESCAPE
   ========================================================= */

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


/* =========================================================
   TEACHER QR CARD
   ========================================================= */

function createTeacherQrCard() {

  if (
    document.getElementById('gaasQrCard')
  ) {
    return;
  }

  const liveSection =
    document.getElementById('liveSection');

  if (!liveSection) {
    return;
  }

  const card =
    document.createElement('div');

  card.id =
    'gaasQrCard';

  card.className =
    'gaas-qr-card';

  card.innerHTML = `

    <div class="gaas-qr-header">

      <div>

        <span class="gaas-qr-eyebrow">
          QUICK JOIN
        </span>

        <h3>
          Scan to Join Session
        </h3>

        <p>
          Students can scan this QR code
          to automatically enter the session ID.
        </p>

      </div>

      <div class="gaas-qr-icon">
        QR
      </div>

    </div>


    <div class="gaas-qr-body">

      <div class="gaas-qr-code-wrap">

        <canvas
          id="gaasQrCanvas"
          width="260"
          height="260"
        ></canvas>

      </div>


      <div class="gaas-qr-info">

        <span>
          SESSION ID
        </span>

        <strong id="gaasQrSessionId">
          —
        </strong>

        <small>
          Keep this QR visible while
          students join the class.
        </small>

      </div>

    </div>

  `;


  const classroomCard =
    document.getElementById(
      'classroomGrid'
    )?.closest('.card');


  if (classroomCard) {

    liveSection.insertBefore(
      card,
      classroomCard
    );

  } else {

    liveSection.prepend(card);

  }


  watchTeacherSession();

}


/* =========================================================
   GENERATE QR
   ========================================================= */

async function generateTeacherQr(
  sessionId
) {

  const canvas =
    document.getElementById(
      'gaasQrCanvas'
    );

  const sessionDisplay =
    document.getElementById(
      'gaasQrSessionId'
    );

  if (
    !canvas ||
    !sessionDisplay ||
    !sessionId
  ) {
    return;
  }


  try {

    const payload =
      `GAAS_SESSION:${sessionId}`;


    await QRCode.toCanvas(
      canvas,
      payload,
      {
        width: 260,

        margin: 3,

        errorCorrectionLevel: 'H',

        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      }
    );


    sessionDisplay.textContent =
      sessionId;


    console.log(
      'GAAS QR generated:',
      payload
    );


  } catch (error) {

    console.error(
      'GAAS QR generation error:',
      error
    );


    sessionDisplay.textContent =
      'QR generation failed';

  }

}


/* =========================================================
   WATCH TEACHER SESSION ID
   ========================================================= */

function watchTeacherSession() {

  const sessionDisplay =
    document.getElementById(
      'sessionIdDisplay'
    );

  if (!sessionDisplay) {
    return;
  }


  let lastSessionId =
    '';


  function checkSession() {

    const sessionId =
      sessionDisplay.textContent
        .trim();


    if (
      sessionId &&
      sessionId !== '—' &&
      sessionId !== lastSessionId
    ) {

      lastSessionId =
        sessionId;

      generateTeacherQr(
        sessionId
      );

    }

  }


  checkSession();


  const observer =
    new MutationObserver(
      checkSession
    );


  observer.observe(
    sessionDisplay,
    {
      childList: true,
      characterData: true,
      subtree: true
    }
  );


  setInterval(
    checkSession,
    500
  );

}


/* =========================================================
   STUDENT QR CARD
   ========================================================= */

function createStudentScanner() {

  const sessionInput =
    document.getElementById(
      'sessionId'
    );

  if (!sessionInput) {
    return;
  }


  if (
    document.getElementById(
      'gaasStudentQrCard'
    )
  ) {
    return;
  }


  const formCard =
    sessionInput.closest('.card');


  if (!formCard) {
    return;
  }


  const card =
    document.createElement('div');


  card.id =
    'gaasStudentQrCard';

  card.className =
    'gaas-student-qr-card';


  card.innerHTML = `

    <div class="gaas-student-qr-header">

      <div>

        <span class="gaas-qr-eyebrow">
          QUICK JOIN
        </span>

        <h3>
          Scan Session QR
        </h3>

        <p>
          Scan the QR shown by your teacher
          to fill the Session ID automatically.
        </p>

      </div>

      <span class="gaas-scan-badge">
        QR
      </span>

    </div>


    <button
      id="gaasStartScanner"
      class="gaas-scan-button"
      type="button"
    >
      Scan Session QR
    </button>


    <div
      id="gaasScannerArea"
      class="gaas-scanner-area"
      style="display:none;"
    >

      <div
        id="gaasQrReader"
        class="gaas-qr-reader"
      ></div>

      <button
        id="gaasStopScanner"
        class="gaas-stop-scanner"
        type="button"
      >
        Stop Camera
      </button>

    </div>


    <div
      id="gaasQrScanStatus"
      class="gaas-scan-status"
    >
      Ready to scan.
    </div>

  `;


  formCard.parentElement.insertBefore(
    card,
    formCard
  );


  document
    .getElementById('gaasStartScanner')
    .addEventListener(
      'click',
      startStudentScanner
    );


  document
    .getElementById('gaasStopScanner')
    .addEventListener(
      'click',
      stopStudentScanner
    );

}


/* =========================================================
   STUDENT SCANNER
   ========================================================= */

let studentScanner =
  null;


async function loadScannerLibrary() {

  if (
    window.Html5Qrcode
  ) {
    return;
  }


  await new Promise(
    (resolve, reject) => {

      const script =
        document.createElement(
          'script'
        );


      script.src =
        'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';

      script.async = true;


      script.onload =
        resolve;


      script.onerror =
        reject;


      document.head.appendChild(
        script
      );

    }
  );

}


/* =========================================================
   START SCANNER
   ========================================================= */

async function startStudentScanner() {

  const area =
    document.getElementById(
      'gaasScannerArea'
    );

  const startButton =
    document.getElementById(
      'gaasStartScanner'
    );

  const status =
    document.getElementById(
      'gaasQrScanStatus'
    );


  try {

    await loadScannerLibrary();


    area.style.display =
      'block';

    startButton.disabled =
      true;


    status.textContent =
      'Starting camera...';


    studentScanner =
      new Html5Qrcode(
        'gaasQrReader'
      );


    await studentScanner.start(

      {
        facingMode:
          'environment'
      },

      {
        fps: 10,

        qrbox: {
          width: 240,
          height: 240
        },

        aspectRatio: 1

      },

      decodedText => {

        handleStudentQr(
          decodedText
        );

      },

      () => {
        /* Ignore failed frame reads. */
      }

    );


    status.textContent =
      'Point the camera at the teacher QR code.';


  } catch (error) {

    console.error(
      'GAAS scanner error:',
      error
    );


    area.style.display =
      'none';

    startButton.disabled =
      false;


    status.textContent =
      'Camera could not start. Check browser camera permission.';

  }

}


/* =========================================================
   STOP SCANNER
   ========================================================= */

async function stopStudentScanner() {

  const area =
    document.getElementById(
      'gaasScannerArea'
    );

  const startButton =
    document.getElementById(
      'gaasStartScanner'
    );

  const status =
    document.getElementById(
      'gaasQrScanStatus'
    );


  try {

    if (
      studentScanner
    ) {

      await studentScanner.stop();

      await studentScanner.clear();

      studentScanner =
        null;

    }

  } catch (error) {

    console.warn(
      'Scanner stop warning:',
      error
    );

    studentScanner =
      null;

  }


  area.style.display =
    'none';

  startButton.disabled =
    false;

  status.textContent =
    'Scanner stopped.';

}


/* =========================================================
   HANDLE QR SCAN
   ========================================================= */

function handleStudentQr(
  decodedText
) {

  const sessionInput =
    document.getElementById(
      'sessionId'
    );

  const status =
    document.getElementById(
      'gaasQrScanStatus'
    );


  if (!sessionInput) {
    return;
  }


  let sessionId =
    '';


  if (
    decodedText.startsWith(
      'GAAS_SESSION:'
    )
  ) {

    sessionId =
      decodedText
        .substring(
          'GAAS_SESSION:'.length
        )
        .trim();

  } else {

    sessionId =
      decodedText.trim();

  }


  if (!sessionId) {

    status.textContent =
      'Invalid GAAS QR code.';

    return;

  }


  sessionInput.value =
    sessionId;


  sessionInput.dispatchEvent(
    new Event(
      'input',
      {
        bubbles: true
      }
    )
  );


  sessionInput.classList.add(
    'qr-filled'
  );


  status.textContent =
    '✓ Session ID added successfully.';


  status.classList.add(
    'success'
  );


  stopStudentScanner();


  setTimeout(
    () => {

      sessionInput.classList.remove(
        'qr-filled'
      );

    },
    1200
  );

}


/* =========================================================
   INITIALIZE
   ========================================================= */

function initializeQrSystem() {

  const isTeacher =
    Boolean(
      document.getElementById(
        'sessionIdDisplay'
      ) &&
      document.getElementById(
        'liveSection'
      )
    );


  const isStudent =
    Boolean(
      document.getElementById(
        'sessionId'
      ) &&
      document.getElementById(
        'gridId'
      )
    );


  if (isTeacher) {

    createTeacherQrCard();

  }


  if (isStudent) {

    createStudentScanner();

  }

}


if (
  document.readyState ===
  'loading'
) {

  document.addEventListener(
    'DOMContentLoaded',
    initializeQrSystem
  );

} else {

  initializeQrSystem();

}