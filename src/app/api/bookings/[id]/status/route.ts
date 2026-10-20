import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { firebaseAdmin } from "@/lib/firebase-admin";
const schema = z.object({ status: z.enum(["CANCELLED", "IN_PROGRESS", "COMPLETED"]) });
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(); if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 }); const p = schema.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ error: "Invalid booking action." }, { status: 400 }); const { id } = await params;
  try { const { db } = firebaseAdmin(); const ref = db.collection("bookings").doc(id); const now = new Date().toISOString();
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref); if (!snap.exists) throw new Error("NOT_FOUND"); const b = snap.data()!; const next = p.data.status; let workers = [...(b.workers || [])]; let aggregate = b.status;
      if (user.role === "CUSTOMER") { if (b.customerId !== user.id) throw new Error("FORBIDDEN"); if (next !== "CANCELLED" || !["PENDING", "ACCEPTED"].includes(b.status)) throw new Error("INVALID_STATE"); workers = workers.map((w: Record<string, unknown>) => ["PENDING", "ACCEPTED"].includes(String(w.status)) ? { ...w, status: "CANCELLED" } : w); aggregate = "CANCELLED"; }
      else if (user.role === "WORKER") { const own = workers.find((w: Record<string, unknown>) => w.workerId === user.id); if (!own) throw new Error("FORBIDDEN"); if (next === "IN_PROGRESS" && own.status !== "ACCEPTED") throw new Error("INVALID_STATE"); if (next === "COMPLETED" && own.status !== "IN_PROGRESS") throw new Error("INVALID_STATE"); workers = workers.map((w: Record<string, unknown>) => w.workerId === user.id ? { ...w, status: next } : w); const completed = workers.filter((w: Record<string, unknown>) => w.status === "COMPLETED").length; const active = workers.filter((w: Record<string, unknown>) => ["ACCEPTED", "IN_PROGRESS"].includes(String(w.status))).length; aggregate = completed >= b.workersRequired ? "COMPLETED" : active > 0 ? "IN_PROGRESS" : b.status; }
      else throw new Error("FORBIDDEN");
      const userRefs = user.role === "CUSTOMER" ? workers.filter((w: Record<string, unknown>) => ["ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(String(w.status))).map((w: Record<string, unknown>) => db.collection("users").doc(String(w.workerId))) : [db.collection("users").doc(b.customerId)];
      const userSnaps = await Promise.all(userRefs.map(r => tx.get(r)));
      const workerRef = user.role === "WORKER" && next === "COMPLETED" ? db.collection("workers").doc(user.id) : null;
      const workerSnap = workerRef ? await tx.get(workerRef) : null;
      tx.update(ref, { workers, status: aggregate, history: [...(b.history || []), { status: next, actorId: user.id, createdAt: now }], updatedAt: now });
      if (workerRef && workerSnap?.exists) tx.update(workerRef, { completedJobs: Number(workerSnap.data()?.completedJobs || 0) + 1 });
      userSnaps.forEach((s, i) => tx.create(db.collection("notifications").doc(), { userId: userRefs[i].id, type: "BOOKING_UPDATE", title: "Booking status updated", body: `Booking ${next.toLowerCase().replaceAll("_", " ")}.`, createdAt: now, readAt: null }));
    }); return NextResponse.json({ ok: true });
  } catch (e) { const reason = e instanceof Error ? e.message : ""; if (reason === "NOT_FOUND") return NextResponse.json({ error: "Booking not found." }, { status: 404 }); if (reason === "FORBIDDEN") return NextResponse.json({ error: "You are not authorized for this booking." }, { status: 403 }); if (reason === "INVALID_STATE") return NextResponse.json({ error: "This action is not allowed in the current booking state." }, { status: 409 }); return NextResponse.json({ error: "Unable to update booking in Firestore." }, { status: 503 }); }
}
