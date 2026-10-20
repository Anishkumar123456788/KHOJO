import "server-only";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function adminApp() {
  if (getApps().length) return getApps()[0];
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is not configured.");
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST) return initializeApp({ projectId });
  if (serviceAccount) {
    const credentials = JSON.parse(serviceAccount) as { project_id?: string; client_email?: string; private_key?: string };
    return initializeApp({ credential: cert({ projectId, clientEmail: credentials.client_email, privateKey: credentials.private_key?.replace(/\\n/g, "\n") }), projectId });
  }
  return initializeApp({ credential: applicationDefault(), projectId });
}

export function firebaseAdmin() {
  const app = adminApp();
  return { auth: getAuth(app), db: getFirestore(app) };
}
