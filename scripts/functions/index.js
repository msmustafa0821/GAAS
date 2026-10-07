const {
  onCall,
  HttpsError
} = require('firebase-functions/v2/https');

const {
  defineSecret
} = require('firebase-functions/params');

const {
  initializeApp
} = require('firebase-admin/app');

const {
  getFirestore
} = require('firebase-admin/firestore');

const {
  GoogleGenAI
} = require('@google/genai');


initializeApp();

const db =
  getFirestore();


const GEMINI_API_KEY =
  defineSecret('GEMINI_API_KEY');


/* =========================================================
   HELPERS
   ========================================================= */

function safeDate(timestamp) {

  if (!timestamp) {
    return null;
  }

  try {

    if (
      typeof timestamp.toDate === 'function'
    ) {

      return timestamp
        .toDate()
        .toISOString();

    }

    if (
      timestamp instanceof Date
    ) {

      return timestamp.toISOString();

    }

  } catch {

    return null;

  }

  return null;
}


function percentage(
  present,
  total
) {

  if (!total) {
    return 0;
  }

  return Number(
    ((present / total) * 100).toFixed(1)
  );

}


/* =========================================================
   GET STUDENT NAMES
   ========================================================= */

async function getStudentNames(
  studentIds
) {

  const result = {};

  const uniqueIds =
    [...new Set(studentIds)]
      .slice(0, 200);


  await Promise.all(
    uniqueIds.map(
      async (studentId) => {

        try {

          const snap =
            await db
              .collection('students')
              .doc(studentId)
              .get();


          if (
            !snap.exists
          ) {

            result[studentId] =
              studentId;

            return;

          }


          const data =
            snap.data() || {};


          result[studentId] =
            data.name ||
            data.fullName ||
            data.displayName ||
            studentId;

        } catch {

          result[studentId] =
            studentId;

        }

      }
    )
  );


  return result;

}


/* =========================================================
   LOAD ONE SESSION'S ATTENDANCE
   ========================================================= */

async function loadSessionAttendance(
  session
) {

  let attendance = {};


  const attendanceSnap =
    await db
      .collection(
        'sessions'
      )
      .doc(session.id)
      .collection('attendance')
      .get();


  attendanceSnap.forEach(
    doc => {

      attendance[doc.id] =
        doc.data();

    }
  );


  /*
   * Older sessions can use
   * attendanceLedger.
   */

  if (
    Object.keys(attendance).length === 0
  ) {

    try {

      const ledgerSnap =
        await db
          .collection(
            'attendanceLedger'
          )
          .where(
            'sessionId',
            '==',
            session.id
          )
          .get();


      ledgerSnap.forEach(
        doc => {

          const data =
            doc.data();

          if (
            data.studentId
          ) {

            attendance[
              data.studentId
            ] = data;

          }

        }
      );

    } catch (error) {

      console.warn(
        'Ledger fallback failed:',
        error.message
      );

    }

  }


  const rosterIds =
    Array.isArray(
      session.rosterIds
    )
      ? session.rosterIds
      : [];


  const attendanceIds =
    Object.keys(
      attendance
    );


  const allStudents =
    rosterIds.length
      ? rosterIds
      : attendanceIds;


  const presentStudents =
    allStudents.filter(
      studentId =>
        attendance[
          studentId
        ]?.status ===
        'present'
    );


  const absentStudents =
    allStudents.filter(
      studentId =>
        attendance[
          studentId
        ]?.status !==
        'present'
    );


  return {

    sessionId:
      session.id,

    courseId:
      session.courseId || 'Unknown',

    status:
      session.status || 'unknown',

    startedAt:
      safeDate(session.startedAt),

    endedAt:
      safeDate(session.endedAt),

    totalStudents:
      allStudents.length,

    presentCount:
      presentStudents.length,

    absentCount:
      absentStudents.length,

    attendancePercentage:
      percentage(
        presentStudents.length,
        allStudents.length
      ),

    presentStudents,

    absentStudents,

    records:
      attendance

  };

}


/* =========================================================
   LOAD TEACHER DATA
   ========================================================= */

async function loadTeacherAttendance(
  teacherId
) {

  const sessionsSnap =
    await db
      .collection('sessions')
      .where(
        'teacherId',
        '==',
        teacherId
      )
      .get();


  const sessions =
    sessionsSnap.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort(
        (a, b) => {

          const aTime =
            a.startedAt?.toMillis?.() || 0;

          const bTime =
            b.startedAt?.toMillis?.() || 0;

          return bTime - aTime;

        }
      );


  const limitedSessions =
    sessions.slice(0, 50);


  const attendanceData =
    await Promise.all(
      limitedSessions.map(
        session =>
          loadSessionAttendance(
            session
          )
      )
    );


  const allStudentIds = [];


  attendanceData.forEach(
    session => {

      allStudentIds.push(
        ...session.presentStudents
      );

      allStudentIds.push(
        ...session.absentStudents
      );

    }
  );


  const studentNames =
    await getStudentNames(
      allStudentIds
    );


  /*
   * Build per-student statistics.
   */

  const studentStats = {};


  attendanceData.forEach(
    session => {

      const studentIds =
        new Set([
          ...session.presentStudents,
          ...session.absentStudents
        ]);


      studentIds.forEach(
        studentId => {

          if (
            !studentStats[studentId]
          ) {

            studentStats[studentId] = {

              studentId,

              name:
                studentNames[
                  studentId
                ] || studentId,

              present: 0,

              absent: 0,

              classes: 0

            };

          }


          studentStats[
            studentId
          ].classes++;


          if (
            session.presentStudents
              .includes(studentId)
          ) {

            studentStats[
              studentId
            ].present++;

          } else {

            studentStats[
              studentId
            ].absent++;

          }

        }
      );

    }
  );


  Object.values(
    studentStats
  ).forEach(
    student => {

      student.percentage =
        percentage(
          student.present,
          student.classes
        );

    }
  );


  return {

    role: 'teacher',

    sessionCount:
      attendanceData.length,

    sessions:
      attendanceData.map(
        session => ({

          ...session,

          presentStudents:
            session.presentStudents
              .map(
                id =>
                  studentNames[id] || id
              ),

          absentStudents:
            session.absentStudents
              .map(
                id =>
                  studentNames[id] || id
              )

        })
      ),

    students:
      Object.values(
        studentStats
      )

  };

}


/* =========================================================
   LOAD STUDENT DATA
   ========================================================= */

async function loadStudentAttendance(
  studentId
) {

  const sessionsSnap =
    await db
      .collection('sessions')
      .where(
        'rosterIds',
        'array-contains',
        studentId
      )
      .get();


  const sessions =
    sessionsSnap.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort(
        (a, b) => {

          const aTime =
            a.startedAt?.toMillis?.() || 0;

          const bTime =
            b.startedAt?.toMillis?.() || 0;

          return bTime - aTime;

        }
      );


  const limitedSessions =
    sessions.slice(0, 50);


  const records = [];


  for (
    const session
    of limitedSessions
  ) {

    const sessionData =
      await loadSessionAttendance(
        session
      );


    const record =
      sessionData.records[
        studentId
      ];


    /*
     * For an active session,
     * absence can simply mean
     * not yet marked present.
     */

    const present =
      record?.status === 'present';


    records.push({

      sessionId:
        sessionData.sessionId,

      courseId:
        sessionData.courseId,

      status:
        sessionData.status,

      startedAt:
        sessionData.startedAt,

      attendance:
        present
          ? 'present'
          : 'absent'

    });

  }


  const presentCount =
    records.filter(
      record =>
        record.attendance === 'present'
    ).length;


  const total =
    records.length;


  return {

    role: 'student',

    studentId,

    totalClasses:
      total,

    present:
      presentCount,

    absent:
      total - presentCount,

    percentage:
      percentage(
        presentCount,
        total
      ),

    records

  };

}


/* =========================================================
   MAIN AI FUNCTION
   ========================================================= */

exports.attendanceChat =
  onCall(
    {
      region: 'asia-southeast1',
      secrets: [GEMINI_API_KEY],
      timeoutSeconds: 60,
      memory: '256MiB'
    },

    async request => {

      /* ---------------------------------------------------
         AUTH
      --------------------------------------------------- */

      if (
        !request.auth
      ) {

        throw new HttpsError(
          'unauthenticated',
          'You must be signed in.'
        );

      }


      const question =
        String(
          request.data?.question || ''
        ).trim();


      if (!question) {

        throw new HttpsError(
          'invalid-argument',
          'Enter a question.'
        );

      }


      if (
        question.length > 500
      ) {

        throw new HttpsError(
          'invalid-argument',
          'Question is too long.'
        );

      }


      const uid =
        request.auth.uid;


      const role =
        request.auth.token?.role ||
        null;


      if (
        role !== 'teacher' &&
        role !== 'student'
      ) {

        throw new HttpsError(
          'permission-denied',
          'Your account does not have a GAAS role.'
        );

      }


      /* ---------------------------------------------------
         LOAD ATTENDANCE DATA
      --------------------------------------------------- */

      let attendanceData;


      if (
        role === 'teacher'
      ) {

        attendanceData =
          await loadTeacherAttendance(
            uid
          );

      } else {

        attendanceData =
          await loadStudentAttendance(
            uid
          );

      }


      /* ---------------------------------------------------
         AI PROMPT
      --------------------------------------------------- */

      const systemInstruction = `You are GAAS Attendance Assistant.

GAAS means Grid Attendance System.

Your ONLY job is to answer questions about
the attendance data supplied to you.

IMPORTANT RULES:

1. Use ONLY the supplied GAAS DATA.
2. Never invent students, classes, percentages,
   dates, attendance records, or other facts.
3. If the supplied data cannot answer the question,
   clearly say that the required information is not
   available.
4. Never use general knowledge to fill missing
   attendance information.
5. When calculating percentages, use:
   present / total * 100.
6. Keep answers concise and professional.
7. When listing students, use their stored name
   when available.
8. For active sessions, explain that an "absent"
   count represents students who are not currently
   marked present and is not necessarily a finalized
   absence.
9. The authenticated user's role is:
   ${role}.
10. ${
        role === 'student'
          ? 'This user may only receive information about their own attendance. Do not reveal other students.'
          : 'This user is a teacher and may ask about attendance records belonging to their own sessions.'
      }

ANSWER FORMAT:

Give a direct answer first.

For lists, use clean short lines.

For percentages, include the numbers used
when helpful.

GAAS DATA:
${JSON.stringify(
  attendanceData,
  null,
  2
)}
`;


      /* ---------------------------------------------------
         GEMINI
      --------------------------------------------------- */

      const ai =
        new GoogleGenAI({
          apiKey:
            GEMINI_API_KEY.value()
        });


      try {

        const interaction =
          await ai.interactions.create(
            {
              model:
                'gemini-3.8-flash',

              store:
                false,

              input:
                `${systemInstruction}

USER QUESTION:
${question}`
            }
          );


        const answer =
          interaction.output_text;


        if (
          !answer
        ) {

          throw new Error(
            'Gemini returned an empty response.'
          );

        }


        return {
          answer:
            answer.trim()
        };


      } catch (error) {

        console.error(
          'Gemini error:',
          error
        );


        throw new HttpsError(
          'internal',
          'The attendance assistant could not process your question.'
        );

      }

    }
  );