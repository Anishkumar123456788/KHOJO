import { cookies } from "next/headers";
import { firebaseAdmin } from "@/lib/firebase-admin";

const cookieName = "khojo_session";
export type AppUser = {
  id: string;
  phone: string;
  role: "CUSTOMER" | "WORKER" | "ADMIN";
  name?: string | null;
  customer?: Record<string, unknown> | null;
  worker?: (Record<string, unknown> & { id: string }) | null;
  [key: string]: unknown;
};

export async function startSession(idToken: string) {
  const { auth, db } = firebaseAdmin();
  const decoded = await auth.verifyIdToken(idToken, true);
  const ref = db.collection("users").doc(decoded.uid);
  const snap = await ref.get();
  const needsProfile = !snap.exists || !snap.data()?.name;
  if (!snap.exists) {
    await ref.create({ id: decoded.uid, phone: decoded.phone_number, role: "CUSTOMER", name: null, createdAt: new Date(), updatedAt: new Date() });
  } else if (snap.data()?.phone !== decoded.phone_number) {
    await ref.update({ phone: decoded.phone_number, updatedAt: new Date() });
  }
  const token = await auth.createSessionCookie(idToken, { expiresIn: 5 * 24 * 60 * 60 * 1000 });
  (await cookies()).set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 5 * 24 * 60 * 60 });
  return needsProfile;
}

export async function endSession() {
  (await cookies()).delete(cookieName);
}

export async function currentUser(): Promise<AppUser | null> {
  try {
    const token = (await cookies()).get(cookieName)?.value;
    if (!token) return null;
    const { auth, db } = firebaseAdmin();
    const decoded = await auth.verifySessionCookie(token, true);
    const snap = await db.collection("users").doc(decoded.uid).get();
    return snap.exists ? ({ id: decoded.uid, ...snap.data() } as AppUser) : null;
  } catch {
    return null;
  }
}
