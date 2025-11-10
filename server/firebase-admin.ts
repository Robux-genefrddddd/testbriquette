import admin from "firebase-admin";

let initialized = false;

export function getAdminApp() {
  if (!initialized) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
      const cred = admin.credential.cert(JSON.parse(serviceAccountJson));
      admin.initializeApp({ credential: cred });
    } else {
      // Will try default credentials (GOOGLE_APPLICATION_CREDENTIALS) if available
      admin.initializeApp();
    }
    initialized = true;
  }
  return admin.app();
}

export function getFirestore() {
  return getAdminApp().firestore();
}

export async function verifyIdToken(idToken: string) {
  const auth = getAdminApp().auth();
  return auth.verifyIdToken(idToken);
}
