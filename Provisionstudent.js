// Run locally — no deployment, no billing account needed:
//   node scripts/provisionStudent.js <email> <name> <regNo>
// Same service account key as setRole.js.

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const [, , email, name, regNo] = process.argv;
if (!email || !name || !regNo) {
  console.error('Usage: node provisionStudent.js <email> <name> <regNo>');
  process.exit(1);
}

(async () => {
  const tempPassword = Math.random().toString(36).slice(2) + 'Aa1!';
  const user = await admin.auth().createUser({ email, password: tempPassword });
  await admin.auth().setCustomUserClaims(user.uid, { role: 'student' });
  await admin
    .firestore()
    .collection('students')
    .doc(user.uid)
    .set({ name, regNo, collisionCount: 0, createdAt: admin.firestore.FieldValue.serverTimestamp() });

  console.log(`Created student ${name} (uid: ${user.uid})`);
  console.log(`Temp password: ${tempPassword} — have them reset it, or send a password-reset email instead.`);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});