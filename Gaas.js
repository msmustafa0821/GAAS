// Free-plan (Spark) version: no Cloud Functions, no billing account needed.
// This runs inside your student app and teacher dashboard directly, calling
// Firestore with the Firebase JS SDK. Security lives in firestore.rules.

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore, doc, setDoc, getDoc, getDocs, addDoc, collection,
  onSnapshot, serverTimestamp, increment, writeBatch,
} from 'firebase/firestore';

// Paste this from: Firebase console → Project settings → General → Your apps → SDK config
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// ---------- STUDENT ----------

// Called the instant the transmitter handshake completes on-device.
// One doc per student per session — Component B can only ever hold one
// grid number, so overwriting this doc *is* the "exactly one at a time"
// rule, no extra cleanup needed.
export async function submitHandshake(sessionId, gridId, deviceSignature) {
  const uid = auth.currentUser.uid;
  await setDoc(doc(db, 'sessions', sessionId, 'gridClaims', uid), {
    gridId,
    deviceSignature,
    updatedAt: serverTimestamp(),
  });
}

// ---------- TEACHER ----------

// Live collision detection — replaces the old onGridAssignmentWrite trigger.
// Call this once when the dashboard opens; it fires `onCollisions` every
// time the set of claims changes. Returns an unsubscribe function.
export function listenForCollisions(sessionId, onCollisions) {
  const claimsRef = collection(db, 'sessions', sessionId, 'gridClaims');
  return onSnapshot(claimsRef, (snap) => {
    const byGrid = {};
    snap.forEach((d) => {
      const { gridId } = d.data();
      (byGrid[gridId] ||= []).push({ studentId: d.id, ...d.data() });
    });
    const collisions = Object.entries(byGrid)
      .filter(([, claims]) => claims.length > 1)
      .map(([gridId, claims]) => ({ gridId, claims }));
    onCollisions(collisions);
  });
}

// Dismiss (both present) / Penalize (both absent + fraud counter) button handlers.
export async function resolveCollision(sessionId, gridId, studentIds, action) {
  const status = action === 'dismiss' ? 'present' : 'absent';
  const batch = writeBatch(db);
  studentIds.forEach((studentId) => {
    batch.set(
      doc(db, 'sessions', sessionId, 'attendance', studentId),
      { status, gridId, resolution: action, updatedAt: serverTimestamp() },
      { merge: true }
    );
    if (action === 'penalize') {
      batch.set(doc(db, 'students', studentId), { collisionCount: increment(1) }, { merge: true });
    }
  });
  await batch.commit();
}

// A grid claim that never collided is a provisional present — call this from
// the same onSnapshot listener above for any claim whose gridId currently
// has exactly one claimant.
export async function markProvisionalPresent(sessionId, studentId, gridId) {
  await setDoc(
    doc(db, 'sessions', sessionId, 'attendance', studentId),
    { status: 'present', gridId, source: 'grid-sweep', updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function startSession(courseId) {
  const teacherId = auth.currentUser.uid;
  const rosterSnap = await getDocs(collection(db, 'courses', courseId, 'roster'));
  const rosterIds = rosterSnap.docs.map((d) => d.id);
  const ref = await addDoc(collection(db, 'sessions'), {
    courseId,
    teacherId,
    status: 'active',
    rosterIds,
    startedAt: serverTimestamp(),
  });
  return ref.id;
}

// Finalizes the permanent ledger, then wipes every volatile subcollection.
export async function endSession(sessionId) {
  const sessionRef = doc(db, 'sessions', sessionId);
  const sessionSnap = await getDoc(sessionRef);
  const { rosterIds = [] } = sessionSnap.data();

  const attendanceSnap = await getDocs(collection(db, 'sessions', sessionId, 'attendance'));
  const present = new Set(attendanceSnap.docs.map((d) => d.id));

  const ledgerBatch = writeBatch(db);
  attendanceSnap.forEach((d) => {
    ledgerBatch.set(doc(db, 'attendanceLedger', `${sessionId}_${d.id}`), {
      sessionId,
      studentId: d.id,
      status: d.data().status,
      finalizedAt: serverTimestamp(),
    });
  });
  rosterIds.forEach((studentId) => {
    if (!present.has(studentId)) {
      ledgerBatch.set(doc(db, 'attendanceLedger', `${sessionId}_${studentId}`), {
        sessionId,
        studentId,
        status: 'absent',
        finalizedAt: serverTimestamp(),
      });
    }
  });
  await ledgerBatch.commit();

  for (const sub of ['gridClaims', 'attendance']) {
    const subSnap = await getDocs(collection(db, 'sessions', sessionId, sub));
    const delBatch = writeBatch(db);
    subSnap.forEach((d) => delBatch.delete(d.ref));
    await delBatch.commit();
  }

  await setDoc(sessionRef, { status: 'ended', endedAt: serverTimestamp() }, { merge: true });
}