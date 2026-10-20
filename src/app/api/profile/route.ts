import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { firebaseAdmin } from "@/lib/firebase-admin";
import { geohashForLocation } from "geofire-common";

const skills = ["Mistri / Mason", "Carpenter", "Electrician", "Plumber", "Painter", "Tiles & Flooring", "Welder"];
const schema = z.object({ role: z.enum(["CUSTOMER", "WORKER"]), name: z.string().trim().min(2).max(100), skill: z.string().optional(), city: z.string().trim().max(100).optional(), locality: z.string().trim().max(100).optional(), experience: z.coerce.number().int().min(0).max(60).optional(), hourly: z.coerce.number().int().positive().max(100000).optional(), daily: z.coerce.number().int().positive().max(1000000).optional(), lat: z.coerce.number().min(-90).max(90).optional(), lng: z.coerce.number().min(-180).max(180).optional() });

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the profile fields and try again." }, { status: 400 });
  const d = parsed.data;
  if (user.name) return NextResponse.json({ error: "Profile has already been created. Edit it from your dashboard." }, { status: 409 });
  if (d.role === "WORKER" && (!d.skill || !skills.includes(d.skill) || !d.city || !d.hourly || !d.daily)) return NextResponse.json({ error: "Complete all worker fields and choose a supported skill." }, { status: 400 });
  try {
    const { db } = firebaseAdmin(); const userRef = db.collection("users").doc(user.id); const now = new Date();
    if (d.role === "CUSTOMER") {
      await userRef.update({ name: d.name, role: "CUSTOMER", customer: { city: d.city || null, locality: d.locality || null, lat: d.lat ?? null, lng: d.lng ?? null }, updatedAt: now });
    } else {
      const worker = { id: user.id, userId: user.id, name: d.name, skill: d.skill!, skills: [d.skill!], city: d.city!, cityKey: d.city!.toLocaleLowerCase("en-IN"), locality: d.locality || d.city!, experienceYears: d.experience || 0, hourlyRate: d.hourly!, dailyRate: d.daily!, serviceRadiusKm: 15, lat: d.lat ?? null, lng: d.lng ?? null, geohash: d.lat !== undefined && d.lng !== undefined ? geohashForLocation([d.lat, d.lng]) : null, availabilityStatus: "UNAVAILABLE", verificationStatus: "PENDING", avgRating: 0, reviewCount: 0, completedJobs: 0, availability: [], createdAt: now, updatedAt: now };
      const batch = db.batch(); batch.update(userRef, { name: d.name, role: "WORKER", worker, updatedAt: now }); batch.set(db.collection("workers").doc(user.id), worker); await batch.commit();
    }
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Could not save profile. Check Firebase Admin configuration and Firestore access." }, { status: 503 }); }
}
