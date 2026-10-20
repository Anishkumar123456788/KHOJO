"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
const emulatorConnected = new WeakSet<Auth>();

export function getFirebaseClient() {
  if (Object.values(config).some((value) => !value)) {
    throw new Error("Firebase client is not configured. Add the NEXT_PUBLIC_FIREBASE_* values to .env.local.");
  }
  const app = getApps().length ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
  if (process.env.NODE_ENV === "development" && emulatorHost && !emulatorConnected.has(auth)) {
    connectAuthEmulator(auth, emulatorHost, { disableWarnings: true });
    emulatorConnected.add(auth);
  }
  return { app, auth };
}
