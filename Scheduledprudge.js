const { onSchedule } = require('firebase-functions/v2/scheduler');
const { db, FieldValue } = require('./utils/admin');
 
const STALE_AFTER_MS = 3 * 60 * 60 * 1000; // 3 hours
 
// Belt-and-braces: if a lecturer never taps "end session", this force-closes
// anything still marked active well past a normal lecture length, so grid
// data never lingers indefinitely. endSession is still the normal path.
exports.purgeStaleSessions = onSchedule('every 60 minutes', async () => {
  const cutoff = new Date(Date.now() - STALE_AFTER_MS);
  const staleSnap = await db
    .collection('sessions')
    .where('status', '==', 'active')
    .where('startedAt', '<=', cutoff)
    .get();
 
  for (const doc of staleSnap.docs) {
    const sessionRef = doc.ref;
    for (const sub of ['gridAssignments', 'collisions', 'attendance']) {
      const subSnap = await sessionRef.collection(sub).get();
      if (subSnap.empty) continue;
      const batch = db.batch();
      subSnap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    await sessionRef.set({ status: 'ended', endedAt: FieldValue.serverTimestamp(), endedBy: 'auto-purge' }, { merge: true });
  }
});