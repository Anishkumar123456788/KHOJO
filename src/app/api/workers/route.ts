import { NextResponse } from "next/server";
import { z } from "zod";
import { firebaseAdmin } from "@/lib/firebase-admin";
import { haversineKm } from "@/lib/pricing";
import { geohashQueryBounds } from "geofire-common";

const querySchema = z.object({ q: z.string().max(80).optional(), city: z.string().max(100).optional(), radius: z.coerce.number().min(1).max(100).default(15), lat: z.coerce.number().min(-90).max(90).optional(), lng: z.coerce.number().min(-180).max(180).optional(), sort: z.enum(["distance", "rating", "price", "experience"]).default("distance"), page: z.coerce.number().int().min(1).default(1) });

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams; const parsed = querySchema.safeParse(Object.fromEntries(params));
  if (!parsed.success) return NextResponse.json({ error: "Invalid search filters." }, { status: 400 });
  const p = parsed.data;
  try {
    const { db } = firebaseAdmin();
    const base = db.collection("workers").where("availabilityStatus", "==", "AVAILABLE").where("verificationStatus", "==", "VERIFIED");
    let documents: FirebaseFirestore.QueryDocumentSnapshot[];
    if (p.lat !== undefined && p.lng !== undefined) {
      const ranges = geohashQueryBounds([p.lat, p.lng], p.radius * 1000);
      const snapshots = await Promise.all(ranges.map(([start, end]) => {
        let query = base.where("geohash", ">=", start).where("geohash", "<=", end);
        if (p.city) query = query.where("cityKey", "==", p.city.trim().toLocaleLowerCase("en-IN"));
        return query.get();
      }));
      documents = [...new Map(snapshots.flatMap(s => s.docs).map(doc => [doc.id, doc])).values()];
    } else {
      let query = base;
      if (p.city) query = query.where("cityKey", "==", p.city.trim().toLocaleLowerCase("en-IN"));
      const snapshot = await query.limit(500).get(); documents = snapshot.docs;
    }
    const term = p.q?.toLocaleLowerCase("en-IN");
    const found = documents.map(doc => doc.data()).filter(w => !term || [w.skill, ...(w.skills || [])].some((s: string) => String(s).toLocaleLowerCase("en-IN").includes(term))).map(w => {
      const distance = p.lat !== undefined && p.lng !== undefined && typeof w.lat === "number" && typeof w.lng === "number" ? haversineKm(p.lat, p.lng, w.lat, w.lng) : null;
      return { id: w.id, name: w.name || "KHOJO worker", skill: (w.skills || [w.skill]).filter(Boolean).join(" · "), locality: w.locality, city: w.city, rating: w.avgRating || 0, reviews: w.reviewCount || 0, experience: w.experienceYears || 0, hourly: w.hourlyRate, daily: w.dailyRate, distance, serviceRadiusKm: w.serviceRadiusKm || 15, available: true, verified: true };
    }).filter(w => p.lat === undefined || p.lng === undefined || (w.distance !== null && w.distance <= Math.min(p.radius, w.serviceRadiusKm)));
    found.sort((a, b) => p.sort === "rating" ? b.rating - a.rating : p.sort === "price" ? a.hourly - b.hourly : p.sort === "experience" ? b.experience - a.experience : (a.distance ?? Number.MAX_SAFE_INTEGER) - (b.distance ?? Number.MAX_SAFE_INTEGER));
    const total = found.length; return NextResponse.json({ items: found.slice((p.page - 1) * 20, p.page * 20), total, page: p.page, pages: Math.ceil(total / 20) });
  } catch { return NextResponse.json({ error: "Worker search is unavailable. Check Firebase configuration and Firestore rules." }, { status: 503 }); }
}
