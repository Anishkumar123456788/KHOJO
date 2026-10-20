import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { firebaseAdmin } from "@/lib/firebase-admin";
import { geohashForLocation } from "geofire-common";

const schema = z.object({ description: z.string().max(1000).optional(), hourlyRate: z.coerce.number().int().min(1).max(100000), dailyRate: z.coerce.number().int().min(1).max(1000000), locality: z.string().trim().min(2).max(100), serviceRadiusKm: z.coerce.number().int().min(1).max(100), availabilityStatus: z.enum(["AVAILABLE", "BUSY", "UNAVAILABLE"]), workingDays: z.array(z.coerce.number().int().min(0).max(6)).max(7), startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), lat: z.coerce.number().min(-90).max(90).optional(), lng: z.coerce.number().min(-180).max(180).optional() });
export async function PATCH(req: Request) {
  const user = await currentUser(); if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  if (user.role !== "WORKER" || !user.worker) return NextResponse.json({ error: "Worker access required." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Invalid profile or weekly schedule." }, { status: 400 });
  const d = parsed.data; const startMinute = Number(d.startTime.slice(0, 2)) * 60 + Number(d.startTime.slice(3)); const endMinute = Number(d.endTime.slice(0, 2)) * 60 + Number(d.endTime.slice(3));
  if (d.availabilityStatus === "AVAILABLE" && (!d.workingDays.length || endMinute <= startMinute)) return NextResponse.json({ error: "Choose working days and an end time after the start time." }, { status: 400 });
  try {
    const { db } = firebaseAdmin(); const ref = db.collection("workers").doc(user.id); const userRef = db.collection("users").doc(user.id);
    const availability = d.workingDays.map(weekday => ({ weekday, startMinute, endMinute, active: true }));
    const locationPatch = d.lat !== undefined && d.lng !== undefined ? { lat: d.lat, lng: d.lng, geohash: geohashForLocation([d.lat, d.lng]) } : {};
    const patch = { description: d.description || "", hourlyRate: d.hourlyRate, dailyRate: d.dailyRate, locality: d.locality, serviceRadiusKm: d.serviceRadiusKm, availabilityStatus: d.availabilityStatus, availability, ...locationPatch, updatedAt: new Date() };
    await db.runTransaction(async tx => { const workerSnap = await tx.get(ref); if (!workerSnap.exists) throw new Error("Worker profile missing"); tx.set(ref, patch, { merge: true }); tx.set(userRef, { worker: { ...workerSnap.data(), ...patch, id: user.id } }, { merge: true }); });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Could not update worker profile in Firestore." }, { status: 503 }); }
}
