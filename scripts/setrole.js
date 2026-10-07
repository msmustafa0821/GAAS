// Run locally — no deployment, no billing account needed:
//   node scripts/setRole.js <uid> <teacher|student>
//
// Needs a service account key first:
//   Firebase console → Project settings → Service accounts →
//   Generate new private key → save as scripts/serviceAccountKey.json
//   (never commit this file — it's a full admin credential).

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const [, , uid, role] = process.argv;
if (!uid || !['teacher', 'student'].includes(role)) {
  console.error('Usage: node setRole.js <uid> <teacher|student>');
  process.exit(1);
}

admin
  .auth()
  .setCustomUserClaims(uid, { role })
  .then(() => {
    console.log(`Set role=${role} for ${uid}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });