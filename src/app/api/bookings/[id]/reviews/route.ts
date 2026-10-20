import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { firebaseAdmin } from "@/lib/firebase-admin";
const schema = z.object({ workerId: z.string(), rating: z.coerce.number().int().min(1).max(5), comment: z.string().trim().max(1000).optional() });
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(); if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 }); if (user.role !== "CUSTOMER") return NextResponse.json({ error: "Customer access required." }, { status: 403 });
  const p = schema.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ error: "Choose a rating from 1 to 5." }, { status: 400 }); const { id } = await params;
  try { const { db } = firebaseAdmin(); const bookingRef = db.collection("bookings").doc(id); const workerRef = db.collection("workers").doc(p.data.workerId); const reviewRef = db.collection("reviews").doc(`${id}_${p.data.workerId}`);
    await db.runTransaction(async tx => { const [booking, worker, existing, allReviews] = await Promise.all([tx.get(bookingRef), tx.get(workerRef), tx.get(reviewRef), tx.get(db.collection("reviews").where("workerId", "==", p.data.workerId))]); if (!booking.exists || booking.data()?.customerId !== user.id || booking.data()?.status !== "COMPLETED" || !booking.data()?.workers?.some((w: Record<string, unknown>) => w.workerId === p.data.workerId && w.status === "COMPLETED")) throw new Error("NOT_ELIGIBLE"); if (existing.exists) throw new Error("DUPLICATE"); if (!worker.exists) throw new Error("NOT_FOUND");
      const now = new Date().toISOString(); const ratings = [...allReviews.docs.map(d => Number(d.data().rating)), p.data.rating]; const rating = ratings.reduce((sum, n) => sum + n, 0) / ratings.length;
      tx.create(reviewRef, { bookingId: id, workerId: p.data.workerId, customerId: user.id, rating: p.data.rating, comment: p.data.comment || "", createdAt: now }); tx.update(workerRef, { avgRating: Math.round(rating * 100) / 100, reviewCount: ratings.length, updatedAt: now });
    }); return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) { const reason = e instanceof Error ? e.message : ""; if (reason === "NOT_ELIGIBLE") return NextResponse.json({ error: "Reviews are available after your completed booking." }, { status: 403 }); if (reason === "DUPLICATE") return NextResponse.json({ error: "You have already reviewed this worker for this booking." }, { status: 409 }); return NextResponse.json({ error: "Review could not be saved in Firestore." }, { status: 503 }); }
}
