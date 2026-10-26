// ============================================================
// GAAS FIREBASE CLIENT
// Firebase SDK v12.19.0
// No npm / bundler required.
// ============================================================


/* ============================================================
   FIREBASE APP
   ============================================================ */

import {
  initializeApp
} from
'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';


/* ============================================================
   FIREBASE APP CHECK
   ============================================================ */

import {
  initializeAppCheck,
  ReCaptchaV3Provider
} from
'https://www.gstatic.com/firebasejs/12.19.0/firebase-app-check.js';


/* ============================================================
   FIREBASE AUTH
   ============================================================ */

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from
'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';


/* ============================================================
   FIREBASE FIRESTORE
   ============================================================ */

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch
} from
'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';


/* ============================================================
   APP CHECK DEBUG MODE
   IMPORTANT:
   This is for LOCAL DEVELOPMENT only.
   ============================================================ */

self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;


/* ============================================================
   FIREBASE CONFIG
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyDHefj3qQNgFo8pfY0iFJ20BE1V1DKO0Uk",
  authDomain: "synhack-de582.firebaseapp.com",
  databaseURL: "https://synhack-de582-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "synhack-de582",
  storageBucket: "synhack-de582.firebasestorage.app",
  messagingSenderId: "483255458499",
  appId: "1:483255458499:web:1a8bb64f97426564766076",
  measurementId: "G-PLGH1FKG82"
};


/* ============================================================
   INITIALIZE FIREBASE APP
   ============================================================ */

export const app =
  initializeApp(
    firebaseConfig
  );


/* ============================================================
   INITIALIZE APP CHECK
   ============================================================ */

self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;

export const appCheck =
  initializeAppCheck(
    app,
    {
      provider:
        new ReCaptchaV3Provider(
          'none'
        ),

      isTokenAutoRefreshEnabled:
        true
    }
  );


/* ============================================================
   INITIALIZE AUTH
   ============================================================ */

export const auth =
  getAuth(
    app
  );


/* ============================================================
   INITIALIZE FIRESTORE
   ============================================================ */

export const db =
  getFirestore(
    app
  );



/* ============================================================
   AUTH
   ============================================================ */

export async function login(
  email,
  password
) {

  const cred =
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );


  const tokenResult =
    await cred.user.getIdTokenResult();


  return {

    user:
      cred.user,

    role:
      tokenResult.claims.role ||
      null

  };

}


export function logout() {

  return signOut(
    auth
  );

}


export function watchAuth(
  callback
) {

  return onAuthStateChanged(
    auth,

    async user => {

      if (!user) {

        callback(
          null,
          null
        );

        return;

      }


      try {

        const tokenResult =
          await user.getIdTokenResult();


        callback(
          user,

          tokenResult.claims.role ||
          null
        );

      } catch (error) {

        console.error(
          'Auth role error:',
          error
        );


        callback(
          user,
          null
        );

      }

    }

  );

}



/* ============================================================
   STUDENT — HANDSHAKE
   ============================================================ */

export async function submitHandshake(
  sessionId,
  gridId,
  deviceSignature =
    'manual-entry'
) {

  if (
    !auth.currentUser
  ) {

    throw new Error(
      'You must be signed in.'
    );

  }


  const uid =
    auth.currentUser.uid;


  await setDoc(

    doc(
      db,
      'sessions',
      sessionId,
      'gridClaims',
      uid
    ),

    {

      studentId:
        uid,

      gridId,

      deviceSignature,

      updatedAt:
        serverTimestamp()

    },

    {

      merge:
        true

    }

  );

}



/* ============================================================
   STUDENT — MY ATTENDANCE
   ============================================================ */

export function listenToMyAttendance(
  sessionId,
  callback
) {

  if (
    !auth.currentUser
  ) {

    callback(
      null
    );

    return () => {};

  }


  const uid =
    auth.currentUser.uid;


  return onSnapshot(

    doc(
      db,
      'sessions',
      sessionId,
      'attendance',
      uid
    ),

    snapshot => {

      callback(

        snapshot.exists()
          ? snapshot.data()
          : null

      );

    },

    error => {

      console.error(
        'My attendance listener error:',
        error
      );

    }

  );

}



/* ============================================================
   ALL ATTENDANCE LISTENER
   ============================================================ */

export function listenToSessionAttendance(
  sessionId,
  callback
) {

  const attendanceRef =
    collection(
      db,
      'sessions',
      sessionId,
      'attendance'
    );


  return onSnapshot(

    attendanceRef,

    snapshot => {

      const attendance =
        {};


      snapshot.forEach(
        item => {

          attendance[
            item.id
          ] = {

            id:
              item.id,

            ...item.data()

          };

        }
      );


      callback(
        attendance
      );

    },

    error => {

      console.error(
        'Attendance listener error:',
        error
      );

    }

  );

}



/* ============================================================
   TEACHER — CLAIMS LISTENER
   ============================================================ */

export function listenForClaims(
  sessionId,
  callback
) {

  const claimsRef =
    collection(
      db,
      'sessions',
      sessionId,
      'gridClaims'
    );


  return onSnapshot(

    claimsRef,

    snapshot => {

      const claimsByGrid =
        {};


      snapshot.forEach(
        docSnap => {

          const data =
            docSnap.data();


          const studentId =
            data.studentId ||
            docSnap.id;


          if (
            !data.gridId ||
            !studentId
          ) {

            return;

          }


          if (
            !claimsByGrid[
              data.gridId
            ]
          ) {

            claimsByGrid[
              data.gridId
            ] = [];

          }


          claimsByGrid[
            data.gridId
          ].push({

            studentId,

            gridId:
              data.gridId,

            deviceSignature:
              data.deviceSignature ||
              null,

            updatedAt:
              data.updatedAt ||
              null

          });

        }

      );


      console.log(
        'REALTIME CLAIMS:',
        claimsByGrid
      );


      callback(
        claimsByGrid
      );

    },

    error => {

      console.error(
        'Claims listener error:',
        error
      );

    }

  );

}



/* ============================================================
   TEACHER — MARK PROVISIONAL PRESENT
   ============================================================ */

export async function markProvisionalPresent(
  sessionId,
  studentId,
  gridId
) {

  await setDoc(

    doc(
      db,
      'sessions',
      sessionId,
      'attendance',
      studentId
    ),

    {

      status:
        'present',

      gridId,

      source:
        'grid-sweep',

      updatedAt:
        serverTimestamp()

    },

    {

      merge:
        true

    }

  );

}



/* ============================================================
   TEACHER — MANUAL ATTENDANCE
   ============================================================ */

export async function markManualAttendance(
  sessionId,
  studentId,
  status
) {

  await setDoc(

    doc(
      db,
      'sessions',
      sessionId,
      'attendance',
      studentId
    ),

    {

      status,

      source:
        'teacher-manual',

      updatedAt:
        serverTimestamp()

    },

    {

      merge:
        true

    }

  );

}



/* ============================================================
   TEACHER — RESOLVE COLLISION
   ============================================================ */

export async function resolveCollision(
  sessionId,
  gridId,
  studentIds,
  action
) {

  const status =
    action ===
    'dismiss'
      ? 'present'
      : 'absent';


  const batch =
    writeBatch(
      db
    );


  studentIds.forEach(
    studentId => {

      batch.set(

        doc(
          db,
          'sessions',
          sessionId,
          'attendance',
          studentId
        ),

        {

          status,

          gridId,

          resolution:
            action,

          updatedAt:
            serverTimestamp()

        },

        {

          merge:
            true

        }

      );


      if (
        action ===
        'penalize'
      ) {

        batch.set(

          doc(
            db,
            'students',
            studentId
          ),

          {

            collisionCount:
              increment(1)

          },

          {

            merge:
              true

          }

        );

      }

    }
  );


  await batch.commit();

}



/* ============================================================
   TEACHER — START SESSION
   ============================================================ */

export async function startSession(
  courseId,
  rows,
  benches
) {

  if (
    !auth.currentUser
  ) {

    throw new Error(
      'You must be signed in.'
    );

  }


  const teacherId =
    auth.currentUser.uid;


  const activeQuery =
    query(

      collection(
        db,
        'sessions'
      ),

      where(
        'teacherId',
        '==',
        teacherId
      ),

      where(
        'status',
        '==',
        'active'
      )

    );


  const activeSnap =
    await getDocs(
      activeQuery
    );


  if (
    !activeSnap.empty
  ) {

    return activeSnap
      .docs[0]
      .id;

  }


  let rosterIds =
    [];


  try {

    const rosterSnap =
      await getDocs(

        collection(
          db,
          'courses',
          courseId,
          'roster'
        )

      );


    rosterIds =
      rosterSnap.docs.map(
        item =>
          item.id
      );

  } catch (error) {

    console.warn(
      'Course roster could not be loaded:',
      error
    );


    rosterIds =
      [];

  }


  const ref =
    await addDoc(

      collection(
        db,
        'sessions'
      ),

      {

        courseId,

        teacherId,

        status:
          'active',

        rosterIds,

        rows,

        benches,

        startedAt:
          serverTimestamp()

      }

    );


  return ref.id;

}



/* ============================================================
   TEACHER — END SESSION
   ============================================================ */

export async function endSession(
  sessionId
) {

  const sessionRef =
    doc(
      db,
      'sessions',
      sessionId
    );


  const sessionSnap =
    await getDoc(
      sessionRef
    );


  if (
    !sessionSnap.exists()
  ) {

    throw new Error(
      'Session not found.'
    );

  }


  const session =
    sessionSnap.data();


  const rosterIds =
    Array.isArray(
      session.rosterIds
    )
      ? session.rosterIds
      : [];


  const attendanceSnap =
    await getDocs(

      collection(
        db,
        'sessions',
        sessionId,
        'attendance'
      )

    );


  const attendanceMap =
    {};


  attendanceSnap.forEach(
    item => {

      attendanceMap[
        item.id
      ] =
        item.data();

    }

  );


  const allStudents =
    new Set([

      ...rosterIds,

      ...Object.keys(
        attendanceMap
      )

    ]);


  const batch =
    writeBatch(
      db
    );


  allStudents.forEach(
    studentId => {

      const record =
        attendanceMap[
          studentId
        ];


      batch.set(

        doc(
          db,
          'attendanceLedger',
          `${sessionId}_${studentId}`
        ),

        {

          sessionId,

          studentId,

          status:
            record?.status ===
            'present'
              ? 'present'
              : 'absent',

          gridId:
            record?.gridId ||
            null,

          source:
            record?.source ||
            'session-finalized',

          finalizedAt:
            serverTimestamp()

        },

        {

          merge:
            true

        }

      );

    }

  );


  await batch.commit();


  await setDoc(

    sessionRef,

    {

      status:
        'ended',

      endedAt:
        serverTimestamp()

    },

    {

      merge:
        true

    }

  );

}



/* ============================================================
   TEACHER — GET SESSIONS
   ============================================================ */

export async function getTeacherSessions() {

  if (
    !auth.currentUser
  ) {

    return [];

  }


  const teacherId =
    auth.currentUser.uid;


  const sessionsSnap =
    await getDocs(

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

      )

    );


  const sessions =
    sessionsSnap.docs.map(
      item => ({

        id:
          item.id,

        ...item.data()

      })

    );


  sessions.sort(
    (
      a,
      b
    ) => {

      const aTime =
        a.startedAt?.toMillis?.() ||
        0;


      const bTime =
        b.startedAt?.toMillis?.() ||
        0;


      return (
        bTime -
        aTime
      );

    }

  );


  return sessions;

}