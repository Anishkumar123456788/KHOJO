import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { firebaseAdmin } from "@/lib/firebase-admin";
import { priceEstimate, scheduleCovers } from "@/lib/pricing";

const schema = z.object({ skill: z.string().trim().min(2).max(80), workerIds: z.array(z.string()).min(1).max(10), serviceType: z.enum(["HOURLY", "FULL_DAY"]), date: z.string().datetime(), hours: z.coerce.number().int().min(1).max(16).default(1), days: z.coerce.number().int().min(1).max(30).default(1), address: z.string().trim().min(8).max(400), locality: z.string().trim().min(2).max(100), city: z.string().trim().min(2).max(100), description: z.string().max(2000).optional() });
export async function POST(req: Request) {
  const user = await currentUser(); if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 }); if (user.role !== "CUSTOMER") return NextResponse.json({ error: "Only customers can request bookings." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Check the booking details." }, { status: 400 }); const d = parsed.data; const startAt = new Date(d.date); if (startAt < new Date()) return NextResponse.json({ error: "Choose a future booking date." }, { status: 400 });
  try {
    const { db } = firebaseAdmin(); const settingSnap = await db.collection("settings").doc("platform").get(); const settings = settingSnap.data() || {}; const minHours = Number(settings.minimumHourlyHours || 1); const fullDayHours = Number(settings.fullDayHours || 8);
    if (d.serviceType === "HOURLY" && d.hours < minHours) return NextResponse.json({ error: `Booking is shorter than the ${minHours}-hour minimum.` }, { status: 400 });
    type WorkerRecord = { id: string; availabilityStatus: string; verificationStatus: string; cityKey?: string; city: string; skill?: string; skills?: string[]; availability?: Array<{ weekday: number; startMinute: number; endMinute: number; active: boolean }>; hourlyRate: number; dailyRate: number; name?: string };
    const workersSnap = await Promise.all(d.workerIds.map(id => db.collection("workers").doc(id).get())); const workers = workersSnap.map(s => s.exists ? s.data() as WorkerRecord : null);
    if (workers.some(w => !w || w.availabilityStatus !== "AVAILABLE" || w.verificationStatus !== "VERIFIED" || String(w.cityKey || w.city).toLocaleLowerCase("en-IN") !== d.city.toLocaleLowerCase("en-IN") || !(w.skills || [w.skill]).some(s => String(s).toLocaleLowerCase("en-IN") === d.skill.toLocaleLowerCase("en-IN")))) return NextResponse.json({ error: "One or more selected workers are not currently available for this service and city." }, { status: 409 });
    const validWorkers = workers as WorkerRecord[];
    const requiredMinutes = d.serviceType === "HOURLY" ? d.hours * 60 : fullDayHours; if (!validWorkers.every(w => scheduleCovers(w.availability || [], startAt, requiredMinutes, d.serviceType === "FULL_DAY" ? d.days : 1))) return NextResponse.json({ error: "A selected worker is not scheduled for the requested time or dates." }, { status: 409 });
    const endAt = new Date(startAt.getTime() + (d.serviceType === "HOURLY" ? d.hours : d.days * 24) * 3600000); const perWorker = validWorkers.map(w => priceEstimate({ serviceType: d.serviceType, hourlyRate: Number(w.hourlyRate), dailyRate: Number(w.dailyRate), hours: d.hours, days: d.days, workers: 1 }));
    const labour = perWorker.reduce((sum, item) => sum + item.labour, 0); const fee = Math.round(labour * Number(settings.platformFeePercent || 0) / 100); const tax = Math.round((labour + fee) * Number(settings.taxPercent || 0) / 100); const bookingRef = db.collection("bookings").doc(); const now = new Date();
    await db.runTransaction(async tx => {
      const workerReads = await Promise.all(d.workerIds.map(workerId => tx.get(db.collection("workers").doc(workerId))));
      if (workerReads.some(current => !current.exists || current.data()?.availabilityStatus !== "AVAILABLE")) throw new Error("WORKER_UNAVAILABLE");
      const conflicts = await Promise.all(d.workerIds.map(workerId => tx.get(db.collection("bookings").where("workerIds", "array-contains", workerId).where("status", "in", ["ACCEPTED", "IN_PROGRESS"]))));
      if (conflicts.some(existing => existing.docs.some(doc => { const b = doc.data(); return new Date(b.startAt) < endAt && new Date(b.endAt) > startAt; }))) throw new Error("SCHEDULE_CONFLICT");
      workerReads.forEach((current, i) => tx.update(db.collection("workers").doc(d.workerIds[i]), { bookingRevision: Number(current.data()?.bookingRevision || 0) + 1 }));
      tx.create(bookingRef, { id: bookingRef.id, customerId: user.id, customerName: user.name || "KHOJO customer", skill: d.skill, serviceType: d.serviceType, workersRequired: validWorkers.length, workerIds: d.workerIds, workers: validWorkers.map((w, i) => ({ workerId: w.id, name: w.name, status: "PENDING", hourlyRateSnapshot: w.hourlyRate, dailyRateSnapshot: w.dailyRate, labourEstimate: perWorker[i].labour })), startAt: startAt.toISOString(), endAt: endAt.toISOString(), days: d.days, address: d.address, locality: d.locality, city: d.city, description: d.description || "", labourEstimate: labour, platformFee: fee, taxEstimate: tax, totalEstimate: labour + fee + tax, status: "PENDING", history: [{ status: "PENDING", actorId: user.id, note: "Booking request sent to workers", createdAt: now.toISOString() }], createdAt: now.toISOString(), updatedAt: now.toISOString() });
    });
    return NextResponse.json({ id: bookingRef.id, status: "PENDING", totalEstimate: labour + fee + tax }, { status: 201 });
  } catch (e) { const reason = e instanceof Error ? e.message : ""; if (reason === "SCHEDULE_CONFLICT") return NextResponse.json({ error: "A selected worker has an accepted booking conflict." }, { status: 409 }); if (reason === "WORKER_UNAVAILABLE") return NextResponse.json({ error: "A selected worker is no longer available. Refresh and try again." }, { status: 409 }); return NextResponse.json({ error: "Could not create booking. Check Firebase/Firestore setup." }, { status: 503 }); }
}

export async function GET() {
  const user = await currentUser(); if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 }); if (user.role === "ADMIN") return NextResponse.json({ error: "Use the admin dashboard." }, { status: 403 });
  try { const { db } = firebaseAdmin(); const query = user.role === "WORKER" ? db.collection("bookings").where("workerIds", "array-contains", user.id) : db.collection("bookings").where("customerId", "==", user.id); const snap = await query.limit(100).get(); const data = snap.docs.map(d => d.data()).sort((a, b) => user.role === "WORKER" ? a.startAt.localeCompare(b.startAt) : b.startAt.localeCompare(a.startAt)).map(b => { const ownStatus = b.workers?.find((w: {workerId:string}) => w.workerId === user.id)?.status; const ownAccepted = ["ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(String(ownStatus)); return { ...b, address: user.role === "WORKER" && !ownAccepted ? null : b.address, workerStatus: ownStatus, workers: b.workers?.map((w: Record<string, unknown>) => ({ ...w, phone: null })) }; }); return NextResponse.json({ data }); }
  catch { return NextResponse.json({ error: "Booking database unavailable. Check Firestore setup." }, { status: 503 }); }
}
