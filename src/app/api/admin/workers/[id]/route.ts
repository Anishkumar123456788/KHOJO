import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { firebaseAdmin } from "@/lib/firebase-admin";
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser(); if (!actor) return NextResponse.json({ error: "Login required." }, { status: 401 });
  if (actor.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const parsed = z.object({ status: z.enum(["VERIFIED", "REJECTED"]) }).safeParse(await req.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  const { id } = await params;
  try { const { db } = firebaseAdmin(); const workerRef = db.collection("workers").doc(id); const userRef = db.collection("users").doc(id); await db.runTransaction(async tx => { const snap = await tx.get(workerRef); if (!snap.exists) throw new Error("Worker missing"); tx.set(workerRef, { verificationStatus: parsed.data.status, updatedAt: new Date() }, { merge: true }); tx.set(userRef, { worker: { ...snap.data(), verificationStatus: parsed.data.status, updatedAt: new Date() } }, { merge: true }); const audit = db.collection("auditLogs").doc(); tx.create(audit, { actorId: actor.id, action: `WORKER_${parsed.data.status}`, entity: "WorkerProfile", entityId: id, createdAt: new Date() }); }); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Unable to update worker in Firestore." }, { status: 404 }); }
}
